import { Data, Constr, Lucid } from "lucid-cardano";
import { getValidatorAddress, validator } from "./validator";

export async function fundPayroll(lucidInstance: Lucid, amount: number) {
    if (!lucidInstance) throw new Error("Lucid not initialized.");

    try {
        const scriptAddress = await getValidatorAddress(lucidInstance);
        const allUtxos = await lucidInstance.utxosAt(scriptAddress);

        if (allUtxos.length === 0) {
            throw new Error("No payroll contract found");
        }

        const payrollUtxo = allUtxos[0];

        if (!payrollUtxo.datum) {
            throw new Error("Payroll UTXO has no datum");
        }

        // Get wallet address for signing
        const walletAddress = await lucidInstance.wallet.address();

        // FundPayroll redeemer (index 4)
        const redeemer = Data.to(
            new Constr(4, []) // Index 4 = FundPayroll
        );

        // Amount to add in lovelace
        const additionalFunds = BigInt(Math.floor(amount * 1_000_000));

        // Build transaction
        const tx = await lucidInstance
            .newTx()
            .collectFrom([payrollUtxo], redeemer)
            .attachSpendingValidator({
                type: "PlutusV2",
                script: validator.script
            })
            // Return UTXO with added funds
            .payToContract(
                scriptAddress,
                { inline: payrollUtxo.datum },
                {
                    lovelace: payrollUtxo.assets.lovelace + additionalFunds
                }
            )
            .addSigner(walletAddress) // Owner must sign
            .complete();

        console.log("Funding transaction built");

        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();

        console.log("Payroll funded:", txHash);
        return txHash;

    } catch (error: any) {
        console.error("Fund payroll failed:", error);
        throw error;
    }
}