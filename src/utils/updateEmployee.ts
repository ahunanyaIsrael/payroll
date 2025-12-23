import { Data, Constr } from "lucid-cardano";
import { Lucid } from "lucid-cardano";
import { getValidatorAddress, validator } from "./validator";

interface UpdateEmployeeParams {
  empPKH: string;           // Employee to update
  newSalary?: number;       // New salary in ADA
  updateNextPay?: boolean;  // Whether to update next payment date
}

export async function updateEmployee(lucidInstance: Lucid, params: UpdateEmployeeParams) {
  if (!lucidInstance) throw new Error("Lucid not initialized.");

  try {
    const { empPKH, newSalary, updateNextPay } = params;
    const scriptAddress = await getValidatorAddress(lucidInstance);
    const allUtxos = await lucidInstance.utxosAt(scriptAddress);

    if (allUtxos.length === 0) {
      throw new Error("No payroll contract found.");
    }

    // Get the payroll UTXO
    const payrollUtxo = allUtxos[0];

    if (!payrollUtxo.datum) {
      throw new Error("Payroll UTXO has no datum");
    }

    // Decode the payroll datum
    const datumConstr = Data.from(payrollUtxo.datum) as Constr<any>;
    const ownerPKH = datumConstr.fields[0];
    const employeesList = datumConstr.fields[1];

    console.log("Payroll Owner:", ownerPKH);
    console.log("Employees before update:", employeesList);

    // Get current wallet's PKH
    const walletAddress = await lucidInstance.wallet.address();
    const addressDetails = lucidInstance.utils.getAddressDetails(walletAddress);
    const walletPKH = addressDetails.paymentCredential?.hash;

    if (!walletPKH) {
      throw new Error("Could not get payment credential from wallet");
    }

    // Verify ownership
    if (ownerPKH !== walletPKH) {
      throw new Error(
        `Only the owner can update employees.\n` +
        `Owner: ${ownerPKH}\n` +
        `Your wallet: ${walletPKH}\n` +
        `Please connect the owner's wallet.`
      );
    }

    // Check if employees list is valid
    if (!Array.isArray(employeesList)) {
      throw new Error("Invalid employees list structure");
    }

    // Find the employee to update - FIXED: check field[1] for PKH
    const employeeIndex = employeesList.findIndex((emp: Constr<any>) => {
      return emp instanceof Constr && emp.fields[1] === empPKH;  // Fixed from fields[0] to fields[1]
    });

    console.log("Looking for employee PKH:", empPKH);
    console.log("Found at index:", employeeIndex);

    if (employeeIndex === -1) {
      throw new Error(`Employee with PKH ${empPKH} not found in payroll`);
    }

    // Get the current employee data
    const currentEmployee = employeesList[employeeIndex] as Constr<any>;
    const currentFields = currentEmployee.fields;

    console.log("Current employee fields:", currentFields);
    console.log("Field 0 (empName):", currentFields[0]);
    console.log("Field 1 (empPkh):", currentFields[1]);
    console.log("Field 2 (empSalary):", currentFields[2]);
    console.log("Field 3 (empLastPay):", currentFields[3]);
    console.log("Field 4 (empNextPay):", currentFields[4]);

    // Prepare updated fields - FIXED INDICES
    let updatedSalary = currentFields[2]; // Field 2 is empSalary
    let updatedLastPaid = currentFields[3]; // Field 3 is empLastPay
    let updatedNextPay = currentFields[4]; // Field 4 is empNextPay

    // Update salary if provided
    if (newSalary !== undefined && newSalary > 0) {
      updatedSalary = BigInt(Math.floor(newSalary * 1_000_000));
      console.log(`Updating salary to: ${newSalary} ADA (${updatedSalary} lovelace)`);
    }

    // Update next payment date if requested
    if (updateNextPay) {
      const thirtyDaysFromNow = BigInt(
        Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days
      );

      updatedNextPay = thirtyDaysFromNow;
      console.log("Updated next payment date to:", new Date(Number(updatedNextPay) * 1000));
    }

    // Create updated employee object - FIXED INDICES
    const updatedEmployee = new Constr(0, [
      currentFields[0],        // empName (keep existing)
      empPKH,                  // Same PKH
      updatedSalary,           // Updated salary (field 2)
      updatedLastPaid,         // Keep or update last paid (field 3)
      updatedNextPay           // Updated next pay (field 4)
    ]);

    console.log("Updated employee:", updatedEmployee);

    // Create updated employees list
    const updatedEmployees = [...employeesList];
    updatedEmployees[employeeIndex] = updatedEmployee;

    console.log("Employees after update:", updatedEmployees);

    // Build the redeemer: UpdateEmployee Employee
    // Based on your Plutus script: UpdateEmployee is constructor index 1
    const redeemer = Data.to(
      new Constr(1, [updatedEmployee]) // Index 1 = UpdateEmployee
    );

    // Build new datum with updated employee
    const newDatum = Data.to(
      new Constr(0, [
        ownerPKH,          // Same owner
        updatedEmployees   // Updated list with modified employee
      ])
    );

    console.log("New datum:", newDatum);
    console.log("Redeemer:", redeemer);

    // Build the transaction
    const tx = await lucidInstance
      .newTx()
      .collectFrom([payrollUtxo], redeemer)
      .attachSpendingValidator({
        type: "PlutusV2",
        script: validator.script
      })
      // Create new UTXO with updated datum
      .payToContract(
        scriptAddress,
        { inline: newDatum },
        { lovelace: payrollUtxo.assets.lovelace } // Keep ADA in contract
      )
      .addSigner(walletAddress) // Owner must sign
      .complete();

    console.log("Update transaction built successfully");

    const signedTx = await tx.sign().complete();
    console.log("Transaction signed");

    const txHash = await signedTx.submit();
    console.log("Transaction submitted:", txHash);

    return {
      txHash,
      updatedEmployee: {
        empName: currentFields[0],  // Add empName to return
        empPkh: empPKH,
        empSalary: updatedSalary,
        empLastPay: updatedLastPaid,
        empNextPay: updatedNextPay
      }
    };

  } catch (error: any) {
    console.error("Update failed:", error);
    throw error;
  }
}