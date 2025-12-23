// import { Data, Constr } from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";
// import { Lucid } from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";
import { Data, Constr } from "lucid-cardano";
import { Lucid } from "lucid-cardano";
import { getValidatorAddress, validator } from "./utils-backup/validator";

export async function withdrawSalary(lucidInstance: Lucid) {
  if (!lucidInstance) throw new Error("Lucid not initialized.");

  try {
    // Get current wallet's PKH (employee)
    const walletAddress = await lucidInstance.wallet.address();
    const addressDetails = lucidInstance.utils.getAddressDetails(walletAddress);
    const employeePKH = addressDetails.paymentCredential?.hash;

    if (!employeePKH) {
      throw new Error("Could not get payment credential from wallet");
    }

    const scriptAddress = await getValidatorAddress(lucidInstance);
    const allUtxos = await lucidInstance.utxosAt(scriptAddress);

    if (allUtxos.length === 0) {
      throw new Error("No payroll contract found");
    }

    // Get the payroll UTXO
    const payrollUtxo = allUtxos[0];

    if (!payrollUtxo.datum) {
      throw new Error("Payroll UTXO has no datum");
    }

    // Decode the payroll datum to verify employee exists
    const datumConstr = Data.from(payrollUtxo.datum) as Constr<any>;
    const ownerPKH = datumConstr.fields[0];
    const employeesList = datumConstr.fields[1];

    if (!Array.isArray(employeesList)) {
      throw new Error("Invalid employees list structure");
    }

    // Find the employee - FIXED: check field[1]
    const employeeIndex = employeesList.findIndex((emp: Constr<any>) => {
      return emp.fields[1] === employeePKH;  // Fixed from fields[0] to fields[1]
    });

    if (employeeIndex === -1) {
      throw new Error("You are not listed as an employee in this payroll");
    }

    const employee = employeesList[employeeIndex] as Constr<any>;
    const employeeSalary = BigInt(employee.fields[2]);  // Fixed: field 2 is salary
    const nextPay = BigInt(employee.fields[4]);        // Fixed: field 4 is nextPay

    // Check if it's time to withdraw
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (nextPay > now) {
      throw new Error(`You can withdraw on: ${new Date(Number(nextPay) * 1000).toLocaleString()}`);
    }

    // Build the redeemer: WithdrawSalary (index 3)
    const redeemer = Data.to(
      new Constr(3, []) // Index 3 = WithdrawSalary
    );

    console.log("Withdrawing salary for employee:", employeePKH);
    console.log("Salary amount:", employeeSalary, "lovelace");

    // Calculate updated employee data (reset next pay date)
    const updatedNextPay = BigInt(
      Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days
    );

    // Create updated employee - FIXED FIELD INDICES
    const updatedEmployee = new Constr(0, [
      employee.fields[0],        // empName (field 0)
      employeePKH,               // Same PKH (field 1)
      employeeSalary,            // Same salary (field 2)
      now,                       // Update last paid to now (field 3)
      updatedNextPay             // Set next pay date (field 4)
    ]);

    // Update employees list
    const updatedEmployees = [...employeesList];
    updatedEmployees[employeeIndex] = updatedEmployee;

    // Build new datum
    const newDatum = Data.to(
      new Constr(0, [
        ownerPKH,          // Same owner
        updatedEmployees   // Updated list
      ])
    );

    // Calculate how much ADA to send to employee vs keep in contract
    const contractBalance = payrollUtxo.assets.lovelace;
    const nowMs = Date.now();

    // Build transaction
    const tx = await lucidInstance
      .newTx()
      .collectFrom([payrollUtxo], redeemer)
      .attachSpendingValidator({
        type: "PlutusV2",
        script: validator.script
      })
      // Send salary to employee
      .payToAddress(walletAddress, {
        lovelace: employeeSalary
      })
      // Update contract with remaining ADA and new datum
      .payToContract(
        scriptAddress,
        { inline: newDatum },
        {
          lovelace: contractBalance - employeeSalary
        }
      )
      .addSigner(walletAddress) // Employee must sign
      .validFrom(nowMs - 1000)
      .complete();

    console.log("Withdrawal transaction built successfully");

    const signedTx = await tx.sign().complete();
    console.log("Transaction signed");

    const txHash = await signedTx.submit();
    console.log("Transaction submitted:", txHash);

    return txHash;

  } catch (error: any) {
    console.error("Withdraw failed:", error);
    throw error;
  }
}