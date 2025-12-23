// import { useLucid } from "../contexts/LucidContext";
import { getValidatorAddress } from "./validator";
// import { Data, Constr } from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";
// import { Lucid } from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";
import { Data, Constr } from "lucid-cardano";
import { Lucid } from "lucid-cardano";

// const { lucid } = useLucid();
const EmployeeDatumType = Data.Object({
  empPubKeyHash: Data.Bytes(),
  empSalary: Data.Integer(),
  empLastPaid: Data.Integer(),
  empNextPay: Data.Integer(),
});

export type EmployeeDatum = Data.Static<typeof EmployeeDatumType>;

export async function getAllEmployee(lucidInstance: Lucid) {
  if (!lucidInstance) throw new Error("Lucid not initialized.");

  const scriptAddress = await getValidatorAddress(lucidInstance);
  const allUtxos = await lucidInstance.utxosAt(scriptAddress);

  console.log("Found UTXOs at script:", allUtxos.length);

  if (allUtxos.length === 0) {
    console.log("No payroll UTXO found");
    return [];
  }

  const payrollUtxo = allUtxos[0];
  console.log("Payroll UTXO:", payrollUtxo);

  if (!payrollUtxo.datum) {
    console.log("UTXO has no datum");
    return [];
  }

  const datumConstr = Data.from(payrollUtxo.datum) as Constr<any>;
  console.log("Full datum structure:", datumConstr);
  console.log("Datum fields length:", datumConstr.fields.length);

  // The datum should have: [owner, employeesList]
  if (datumConstr.fields.length < 2) {
    console.log("Datum doesn't have enough fields");
    return [];
  }

  const owner = datumConstr.fields[0];
  const employeesList = datumConstr.fields[1];

  console.log("Owner PKH:", owner);
  console.log("Employees list:", employeesList);
  console.log("Type of employeesList:", typeof employeesList);
  console.log("Is array?", Array.isArray(employeesList));

  let employees: any[] = [];

  if (Array.isArray(employeesList)) {
    console.log("Processing", employeesList.length, "employees");

    employees = employeesList.map((empConstr: Constr<any>, index: number) => {
      console.log(`Employee ${index}:`, empConstr);
      console.log(`Employee ${index} fields:`, empConstr.fields);

      // Make sure we have enough fields
      if (empConstr.fields.length < 4) {
        console.warn(`Employee ${index} has insufficient fields:`, empConstr.fields);
        return null;
      }

      const emp = {
        empName: empConstr.fields[0],    // Employee name
        empPkh: empConstr.fields[1],     // Employee PKH
        empSalary: BigInt(empConstr.fields[2]),
        empLastPay: BigInt(empConstr.fields[3]),
        empNextPay: BigInt(empConstr.fields[4]),
      };

      console.log(`Employee ${index} parsed:`, emp);
      return emp;
    }).filter(emp => emp !== null);
  } else {
    console.log("Employees list is not an array:", employeesList);
  }

  console.log("Final employees array:", employees);
  return employees;
}