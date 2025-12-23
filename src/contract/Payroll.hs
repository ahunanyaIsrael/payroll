{-# LANGUAGE DataKinds #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE NoImplicitPrelude #-}

module Main where

-- Plutus

-- Prelude for off-chain parts only

import Cardano.Api (PlutusScriptV2, displayError, writeFileTextEnvelope)
import Cardano.Api.Shelley (PlutusScript (..))
import Codec.Serialise (serialise)
import qualified Data.ByteString.Lazy as LBS
import qualified Data.ByteString.Short as SBS
import qualified Plutus.V1.Ledger.Interval as Interval
import qualified Plutus.V1.Ledger.Value as Value
import Plutus.V2.Ledger.Api
import Plutus.V2.Ledger.Contexts
import PlutusTx
import PlutusTx.Prelude hiding (Semigroup (..), unless)
import Prelude (FilePath, IO, print, putStrLn, (<>))

--------------------------------------------------------------------------------
-- Types
--------------------------------------------------------------------------------

data Employee = Employee
  { empName :: BuiltinByteString,
    empPkh :: PubKeyHash,
    empSalary :: Integer, -- Lovelace
    empLastPay :: POSIXTime,
    empNextPay :: POSIXTime
  }

PlutusTx.unstableMakeIsData ''Employee

data PayrollDatum = PayrollDatum
  { owner :: PubKeyHash,
    employees :: [Employee]
  }

PlutusTx.unstableMakeIsData ''PayrollDatum

data PayrollAction
  = AddEmployee Employee
  | UpdateEmployee Employee
  | RemoveEmployee PubKeyHash
  | WithdrawSalary
  | FundPayroll

PlutusTx.unstableMakeIsData ''PayrollAction

--------------------------------------------------------------------------------
-- Small helpers
--------------------------------------------------------------------------------

{-# INLINEABLE findEmployee #-}
findEmployee :: PubKeyHash -> [Employee] -> Maybe Employee
findEmployee _ [] = Nothing
findEmployee pkh (e : es) =
  if empPkh e == pkh then Just e else findEmployee pkh es

--------------------------------------------------------------------------------
-- TxInfo-based helpers for tests/examples
--------------------------------------------------------------------------------

{-# INLINEABLE findOwnInput #-}
findOwnInput :: TxInfo -> Maybe TxInInfo
findOwnInput info = findInput (txInfoInputs info)
  where
    findInput [] = Nothing
    findInput (i : is) =
      case txOutAddress (txInInfoResolved i) of
        Address (ScriptCredential _) _ -> Just i
        _ -> findInput is

{-# INLINEABLE getContinuingOutputs #-}
getContinuingOutputs :: TxInfo -> [TxOut]
getContinuingOutputs info = filter isScriptOut (txInfoOutputs info)
  where
    isScriptOut o =
      case txOutAddress o of
        Address (ScriptCredential _) _ -> True
        _ -> False

{-# INLINEABLE geq #-}
geq :: Value -> Value -> Bool
geq = Value.geq

--------------------------------------------------------------------------------
-- ScriptContext-based helpers
--------------------------------------------------------------------------------

{-# INLINEABLE findScriptInput #-}
findScriptInput :: ScriptContext -> TxInInfo
findScriptInput ctx =
  case scriptContextPurpose ctx of
    Spending outRef -> findInputByRef outRef (txInfoInputs info)
    _ -> traceError "not spending script"
  where
    info = scriptContextTxInfo ctx
    findInputByRef _ [] = traceError "script input not found"
    findInputByRef ref (i : is) =
      if txInInfoOutRef i == ref then i else findInputByRef ref is

{-# INLINEABLE getScriptOutputs #-}
getScriptOutputs :: ScriptContext -> [TxOut]
getScriptOutputs ctx =
  let info = scriptContextTxInfo ctx
      vh = ownHash ctx
   in filter
        ( \o -> case txOutAddress o of
            Address (ScriptCredential vh') _ -> vh' == vh
            _ -> False
        )
        (txInfoOutputs info)

{-# INLINEABLE scriptInputValue #-}
scriptInputValue :: ScriptContext -> Value
scriptInputValue ctx = txOutValue . txInInfoResolved $ findScriptInput ctx

{-# INLINEABLE scriptOutputValue #-}
scriptOutputValue :: ScriptContext -> Value
scriptOutputValue ctx =
  case getScriptOutputs ctx of
    [o] -> txOutValue o
    _ -> traceError "expected exactly one continuing output"

--------------------------------------------------------------------------------
-- Salary enforcement helpers
--------------------------------------------------------------------------------

{-# INLINEABLE salaryValue #-}
salaryValue :: Employee -> Value
salaryValue emp = Value.singleton Value.adaSymbol Value.adaToken (empSalary emp)

-- using Value.singleton avoids depending on Plutus.V1.Ledger.Ada

-- RENAMED helper to avoid ambiguity with library symbol
{-# INLINEABLE valuePaidToPkh #-}
valuePaidToPkh :: TxInfo -> PubKeyHash -> Value
valuePaidToPkh info pkh =
  foldr
    ( \o acc ->
        case txOutAddress o of
          Address (PubKeyCredential pkh') _
            | pkh' == pkh ->
              acc <> txOutValue o
          _ -> acc
    )
    mempty
    (txInfoOutputs info)

{-# INLINEABLE payPeriod #-}
payPeriod :: POSIXTime
payPeriod = POSIXTime (30 * 24 * 60 * 60 * 1000) -- 30 days in milliseconds

{-# INLINEABLE getNewDatum #-}
getNewDatum :: ScriptContext -> PayrollDatum
getNewDatum ctx =
  case getScriptOutputs ctx of
    [o] ->
      case txOutDatum o of
        OutputDatum (Datum d) -> unsafeFromBuiltinData d
        _ -> traceError "missing inline datum"
    _ -> traceError "expected exactly one script output"

{-# INLINEABLE validEmployeeUpdate #-}
validEmployeeUpdate :: Employee -> PayrollDatum -> Bool
validEmployeeUpdate emp newDat =
  case findEmployee (empPkh emp) (employees newDat) of
    Nothing -> traceError "employee removed"
    Just emp' ->
      empLastPay emp' == empNextPay emp
        && empNextPay emp' == empNextPay emp + payPeriod
        && empSalary emp' == empSalary emp
        && empPkh emp' == empPkh emp
        && empName emp' == empName emp

{-# INLINEABLE scriptPaysSalary #-}
scriptPaysSalary :: ScriptContext -> Employee -> Bool
scriptPaysSalary ctx emp =
  scriptInputValue ctx
    `Value.geq` (scriptOutputValue ctx <> salaryValue emp)

--------------------------------------------------------------------------------
-- Validator
--------------------------------------------------------------------------------

{-# INLINEABLE mkPayrollValidator #-}
mkPayrollValidator :: PayrollDatum -> PayrollAction -> ScriptContext -> Bool
mkPayrollValidator dat action ctx =
  case action of
    -- Owner-only actions
    AddEmployee emp ->
      traceIfFalse "not owner" isOwner
        && traceIfFalse
          "employee already exists"
          (isNothing $ findEmployee (empPkh emp) (employees dat))
    UpdateEmployee emp ->
      traceIfFalse "not owner" isOwner
        && traceIfFalse
          "employee not found"
          (isJust $ findEmployee (empPkh emp) (employees dat))
    RemoveEmployee pkh ->
      traceIfFalse "not owner" isOwner
        && traceIfFalse
          "employee not found"
          (isJust $ findEmployee pkh (employees dat))
    -- Employee withdraws salary
    WithdrawSalary ->
      let signer =
            case txInfoSignatories info of
              [s] -> s
              _ -> traceError "expected exactly one signer"
       in case findEmployee signer (employees dat) of
            Nothing -> traceError "not an employee"
            Just emp ->
              traceIfFalse
                "too early"
                ( Interval.from (empNextPay emp)
                    `Interval.contains` txInfoValidRange info
                )
                && traceIfFalse
                  "salary not paid"
                  (valuePaidToPkh info signer `Value.geq` salaryValue emp)
                && traceIfFalse
                  "script balance incorrect"
                  (scriptPaysSalary ctx emp)
                && traceIfFalse
                  "invalid datum update"
                  (validEmployeeUpdate emp (getNewDatum ctx))
    -- Fund payroll: ensure script value does not decrease (owner must fund)
    FundPayroll ->
      traceIfFalse "not owner" isOwner
        && traceIfFalse
          "script not funded"
          (scriptOutputValue ctx `Value.geq` scriptInputValue ctx)
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

    isOwner :: Bool
    isOwner = owner dat `elem` txInfoSignatories info

--------------------------------------------------------------------------------
-- Boilerplate & write
--------------------------------------------------------------------------------

{-# INLINEABLE wrapper #-}
wrapper :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrapper d r c =
  let dat = unsafeFromBuiltinData d
      red = unsafeFromBuiltinData r
      ctx = unsafeFromBuiltinData c
   in if mkPayrollValidator dat red ctx
        then ()
        else traceError "validation failed"

validator :: Validator
validator =
  mkValidatorScript
    $$(PlutusTx.compile [||wrapper||])

writeValidator :: FilePath -> Validator -> IO ()
writeValidator file val = do
  let bs = serialise val
      sh = SBS.toShort (LBS.toStrict bs)
      scr = PlutusScriptSerialised sh :: PlutusScript PlutusScriptV2
  result <- writeFileTextEnvelope file Nothing scr
  case result of
    Left err -> print (displayError err)
    Right () -> putStrLn ("Wrote script to: " <> file)

main :: IO ()
main =
  writeValidator "./assets/payrollUpdated.plutus" validator
