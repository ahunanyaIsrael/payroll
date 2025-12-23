import { useState } from "react";
import "./AddEmployee.css";
import { useLucid } from '../../contexts/LucidContext';
import { getValidatorAddress, validator } from "../../utils/validator";
import { Data, Constr } from "lucid-cardano";

const AddEmployee = () => {
  const { lucid, isConnected } = useLucid();
  const [empName, setEmpName] = useState("");
  const [empAddress, setEmpAddress] = useState("");
  const [salary, setSalary] = useState(0);
  const [loading, setLoading] = useState(false);

  // Or if you can't use Buffer in browser:
  const stringToHex = (str: string): string => {
    let hex = '';
    for (let i = 0; i < str.length; i++) {
      hex += str.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return hex;
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lucid || !isConnected) return alert("Connect your wallet first!");

    try {
      setLoading(true);

      // 1. Get current wallet info (must be the owner)
      const walletAddress = await lucid.wallet.address();
      const addressDetails = lucid.utils.getAddressDetails(walletAddress);
      const ownerPKH = addressDetails.paymentCredential?.hash;
      if (!ownerPKH) throw new Error("Could not get wallet PKH");

      // 2. Extract employee PKH from address
      const empDetails = lucid.utils.getAddressDetails(empAddress);
      const employeePKH = empDetails.paymentCredential?.hash;
      if (!employeePKH) throw new Error("Invalid employee address!");

      // Debug log to see what we're getting
      console.log("Employee PKH:", employeePKH);
      console.log("Employee PKH type:", typeof employeePKH);
      console.log("Employee PKH length:", employeePKH.length);


      const scriptAddress = await getValidatorAddress(lucid);
      console.log("Script address:", scriptAddress);

      const allUtxos = await lucid.utxosAt(scriptAddress);
      console.log("Found UTXOs:", allUtxos.length);

      // 3. Check if payroll already exists
      if (allUtxos.length === 0) {
        // Create new payroll with first employee
        const now = BigInt(Math.floor(Date.now() / 1000));
        // const nextPayment = BigInt(
        //   Math.floor((Date.now() + 2 * 60 * 1000) / 1000)
        // );

        const nextPayment = BigInt(
          Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days
        );

        console.log("name", stringToHex(empName), "employeePHK", employeePKH, "SAL", BigInt(Math.floor(salary * 1_000_000)), "now", now, "nextPayment", nextPayment);
        // Create Employee object
        const newEmployee = new Constr(0, [
          stringToHex(empName),
          employeePKH,
          BigInt(Math.floor(salary * 1_000_000)),
          now,
          nextPayment
        ]);

        const payrollDatum = Data.to(
          new Constr(0, [
            ownerPKH,              // Owner
            [newEmployee]          // List with one employee
          ])
        );

        const tx = await lucid
          .newTx()
          .payToContract(
            scriptAddress,
            { inline: payrollDatum },
            {
              lovelace: BigInt(Math.floor(salary * 1_000_000)) + 2000000n // Salary + min ADA
            }
          )
          .complete();

        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();

        alert(`Payroll created with first employee! Tx Hash: ${txHash}`);
      } else {
        // 4. Update existing payroll (add employee to existing list)
        const payrollUtxo = allUtxos[0];

        if (!payrollUtxo.datum) throw new Error("Payroll UTXO has no datum");

        // Decode existing datum
        const datumConstr = Data.from(payrollUtxo.datum) as Constr<any>;
        const existingOwner = datumConstr.fields[0];
        const existingEmployees = datumConstr.fields[1];

        // Check ownership
        if (existingOwner !== ownerPKH) {
          throw new Error("Only the payroll owner can add employees!");
        }

        // Check if employee already exists
        let employeesArray: any[] = [];
        if (Array.isArray(existingEmployees)) {
          employeesArray = existingEmployees;
          const alreadyExists = employeesArray.some((emp: Constr<any>) =>
            emp.fields[0] === employeePKH
          );
          if (alreadyExists) {
            throw new Error("Employee already exists in payroll!");
          }
        }

        // Create new employee
        const now = BigInt(Math.floor(Date.now() / 1000));
        const nextPayment = BigInt(
          Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) // 30 days
        );
        // const nextPayment = BigInt(
        //   Math.floor((Date.now() + 2 * 60 * 1000) / 1000)
        // );

        const newEmployee = new Constr(0, [
          stringToHex(empName),
          employeePKH,
          BigInt(Math.floor(salary * 1_000_000)),
          now,
          nextPayment
        ]);

        // Add to existing employees
        const updatedEmployees = [...employeesArray, newEmployee];

        // Create new datum
        const newDatum = Data.to(
          new Constr(0, [
            existingOwner,
            updatedEmployees
          ])
        );

        // Create redeemer: AddEmployee Employee
        const redeemer = Data.to(
          new Constr(0, [newEmployee]) // Index 0 = AddEmployee
        );

        // Build transaction
        const tx = await lucid
          .newTx()
          .collectFrom([payrollUtxo], redeemer)
          .attachSpendingValidator({
            type: "PlutusV2",
            script: validator.script
          })
          .payToContract(
            scriptAddress,
            { inline: newDatum },
            {
              lovelace: payrollUtxo.assets.lovelace +
                BigInt(Math.floor(salary * 1_000_000))
            }
          )
          .addSigner(walletAddress) // Owner must sign
          .complete();

        const signedTx = await tx.sign().complete();
        const txHash = await signedTx.submit();

        alert(`Employee added to payroll! Tx Hash: ${txHash}`);
      }
    } catch (err: any) {
      console.error("Error adding employee:", err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
      setEmpAddress("");
      setSalary(0);
    }
  };

  return (
    <div className="add">
      <h2>Add Employee</h2>

      {!isConnected ? (
        <div className="connect-prompt">
          <p>Please connect your wallet to add employees</p>
        </div>
      ) :
        <form className="flex-col" onSubmit={handleAddEmployee}>
          <div className="add-employee-pubkeyhash flex-col">
            <p>Employee Name</p>
            <input
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              type="text"
              placeholder="John Doe"
              required
            />
          </div>
          <div className="add-employee-pubkeyhash flex-col">
            <p>Employee Wallet Address</p>
            <input
              value={empAddress}
              onChange={(e) => setEmpAddress(e.target.value)}
              type="text"
              placeholder="addr1..."
              required
            />
          </div>

          <div className="add-employee-salary flex-col">
            <p>Salary (ADA)</p>
            <input
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              type="number"
              placeholder="Salary (ADA)"
              min="1"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Adding..." : "ADD EMPLOYEE"}
          </button>
        </form>
      }
    </div>
  );
};

export default AddEmployee;