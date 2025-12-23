import { Data, Constr } from "lucid-cardano";
import { Lucid } from "lucid-cardano";
import { getValidatorAddress, validator } from "./validator";

export async function deleteEmployee(lucidInstance: Lucid, empPKH: string) {
  if (!lucidInstance) throw new Error("Lucid not initialized.");

  try {
    const scriptAddress = await getValidatorAddress(lucidInstance);
    const allUtxos = await lucidInstance.utxosAt(scriptAddress);

    if (allUtxos.length === 0) {
      throw new Error("No payroll contract found.");
    }

    // Get the payroll UTXO (should be only one)
    const payrollUtxo = allUtxos[0];

    if (!payrollUtxo.datum) {
      throw new Error("Payroll UTXO has no datum");
    }

    // Decode the payroll datum
    const datumConstr = Data.from(payrollUtxo.datum) as Constr<any>;
    const ownerPKH = datumConstr.fields[0];
    const employeesList = datumConstr.fields[1];

    console.log("Payroll Owner:", ownerPKH);
    console.log("Employees before deletion:", employeesList);

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
        `Only the owner can remove employees.\n` +
        `Owner: ${ownerPKH}\n` +
        `Your wallet: ${walletPKH}\n` +
        `Please connect the owner's wallet.`
      );
    }

    // Check if employees list is valid
    if (!Array.isArray(employeesList)) {
      throw new Error("Invalid employees list structure");
    }

    // Find the employee to delete - CHECK FIELD[1] FOR PKH
    const employeeIndex = employeesList.findIndex((emp: Constr<any>) => {
      return emp instanceof Constr && emp.fields[1] === empPKH;  // Changed from fields[0] to fields[1]
    });

    if (employeeIndex === -1) {
      throw new Error(`Employee with PKH ${empPKH} not found in payroll`);
    }

    // Create updated employees list (remove the employee)
    const updatedEmployees = employeesList.filter((emp: Constr<any>) => {
      return emp.fields[1] !== empPKH;  // Changed from fields[0] to fields[1]
    });

    console.log("Employees after deletion:", updatedEmployees);

    // Build the redeemer: RemoveEmployee PubKeyHash
    // Based on your Plutus script: RemoveEmployee is constructor index 2
    const redeemer = Data.to(
      new Constr(2, [empPKH]) // Index 2 = RemoveEmployee
    );

    // Build new datum with updated employees
    const newDatum = Data.to(
      new Constr(0, [
        ownerPKH,          // Same owner
        updatedEmployees   // Updated list without the removed employee
      ])
    );

    console.log("New datum:", newDatum);
    console.log("Redeemer:", redeemer);

    // Calculate ADA to keep in contract
    const contractAda = payrollUtxo.assets.lovelace;

    // Get the employee being deleted to calculate their salary
    const employeeToDelete = employeesList[employeeIndex] as Constr<any>;
    const employeeSalary = BigInt(employeeToDelete.fields[2]); // Field[2] is salary

    console.log("Employee salary to remove:", employeeSalary);

    // Build the transaction
    const tx = await lucidInstance
      .newTx()
      .collectFrom([payrollUtxo], redeemer)
      .attachSpendingValidator({
        type: "PlutusV2",
        script: validator.script
      })
      // Create new UTXO with updated datum and reduced ADA
      .payToContract(
        scriptAddress,
        { inline: newDatum },
        {
          lovelace: contractAda - employeeSalary  // Remove the employee's salary from contract
        }
      )
      .addSigner(walletAddress) // Owner must sign
      .complete();

    console.log("Transaction built successfully");

    const signedTx = await tx.sign().complete();
    console.log("Transaction signed");

    const txHash = await signedTx.submit();
    console.log("Transaction submitted:", txHash);

    return txHash;

  } catch (error: any) {
    console.error("Delete failed:", error);
    throw error;
  }
}