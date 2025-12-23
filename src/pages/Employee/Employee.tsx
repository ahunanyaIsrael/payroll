import { useState, useEffect } from 'react';
import "./Employee.css";
import { useLucid } from '../../contexts/LucidContext';
import { getValidatorAddress } from '../../utils/utils-backup/validator';
import { Data, Constr } from "lucid-cardano";
import { withdrawSalary } from '../../utils/utils-backup/withdrawSalary';
import { hexToString } from '../../utils/utils-backup/hexToString';

interface EmployeeData {
  empName: string;
  empPkh: string;
  empSalary: bigint;
  empLastPay: bigint;
  empNextPay: bigint;
}

const Employee = () => {
  const { lucid, isConnected } = useLucid();
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletPKH, setWalletPKH] = useState<string | null>(null);

  // Get current wallet's PKH
  useEffect(() => {
    const getWalletInfo = async () => {
      if (!lucid || !isConnected) {
        setLoading(false);
        return;
      }

      try {
        const walletAddress = await lucid.wallet.address();
        const addressDetails = lucid.utils.getAddressDetails(walletAddress);
        const pkh = addressDetails.paymentCredential?.hash;
        setWalletPKH(pkh || null);

        if (pkh) {
          await loadEmployeeData(pkh);
        }
      } catch (err) {
        console.error("Error getting wallet info:", err);
        setError("Failed to connect wallet");
        setLoading(false);
      }
    };

    getWalletInfo();
  }, [lucid, isConnected]);

  const loadEmployeeData = async (employeePKH: string) => {
    if (!lucid) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const scriptAddress = await getValidatorAddress(lucid);
      const allUtxos = await lucid.utxosAt(scriptAddress);

      if (allUtxos.length === 0) {
        setError("No payroll contract found");
        return;
      }

      // Get the payroll UTXO
      const payrollUtxo = allUtxos[0];

      if (!payrollUtxo.datum) {
        setError("Payroll data not found");
        return;
      }

      // Decode the payroll datum
      const datumConstr = Data.from(payrollUtxo.datum) as Constr<any>;
      const employeesList = datumConstr.fields[1];

      if (!Array.isArray(employeesList)) {
        setError("Invalid payroll data structure");
        return;
      }

      // Find the employee in the list - FIXED: check field[1]
      const employeeConstr = employeesList.find((emp: Constr<any>) =>
        emp.fields[1] === employeePKH  // Fixed from fields[0] to fields[1]
      );

      if (!employeeConstr) {
        setError("You are not listed as an employee in this payroll");
        return;
      }

      // Parse employee data
      const employee: EmployeeData = {
        empName: hexToString(employeeConstr.fields[0]),  // Convert hex to string
        empPkh: employeeConstr.fields[1],
        empSalary: BigInt(employeeConstr.fields[2]),
        empLastPay: BigInt(employeeConstr.fields[3]),
        empNextPay: BigInt(employeeConstr.fields[4]),
      };

      setEmployeeData(employee);
      console.log("Employee data loaded:", employee);

    } catch (err: any) {
      console.error("Error loading employee data:", err);
      setError(err.message || "Failed to load employee data");
    } finally {
      setLoading(false);
    }
  };
  const handleWithdrawSalary = async () => {
    if (!employeeData || !walletPKH) return;



    // Check if it's time to withdraw
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (employeeData.empNextPay > now) {
      const nextPayDate = new Date(Number(employeeData.empNextPay) * 1000);
      const timeUntilNextPay = Number(employeeData.empNextPay) - Number(now);

      if (timeUntilNextPay > 0) {
        const hours = Math.floor(timeUntilNextPay / 3600);
        const minutes = Math.floor((timeUntilNextPay % 3600) / 60);

        alert(`You can withdraw your salary on:\n${nextPayDate.toLocaleString()}\n\nTime remaining: ${hours}h ${minutes}m`);
        return;
      }
    }

    if (!confirm(`Withdraw ${Number(employeeData.empSalary) / 1_000_000} ADA?\n\nThis will send the salary to your wallet.`)) {
      return;
    }

    try {
      setLoading(true)
      setWithdrawing(true);
      setError(null);

      const txHash = await withdrawSalary(lucid as any);

      alert(`✅ Salary withdrawn successfully!\nTransaction: ${txHash}`);

      // Refresh employee data
      await loadEmployeeData(walletPKH);

    } catch (err: any) {
      console.error("Withdraw error:", err);
      setError(err.message || "Failed to withdraw salary");
      alert(`❌ ${err.message}`);
    } finally {
      setWithdrawing(false);
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (walletPKH) {
      await loadEmployeeData(walletPKH);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const num = Number(timestamp);
    if (num <= 0) return "Never";
    return new Date(num * 1000).toLocaleString();
  };

  const formatTimeRemaining = (nextPay: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (nextPay <= now) return "Available now!";

    const seconds = Number(nextPay - now);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
  };

  const canWithdraw = employeeData &&
    Number(employeeData.empNextPay) <= Math.floor(Date.now() / 1000);

  return (
    <div className='employee'>
      <div className="employee-header">
        <h2>Employee Dashboard</h2>
        <button
          onClick={refreshData}
          disabled={loading || withdrawing}
          className="refresh-btn"
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading employee data...</p>
        </div>
      ) : employeeData ? (
        <>
          <div className="employee-info-card">
            <div className="info-row">
              <span className="info-label">Employee Name:</span>
              <span className="info-value">
                {employeeData.empName}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Employee ID:</span>
              <span className="info-value pkh-display" title={employeeData.empPkh}>
                {employeeData.empPkh.substring(0, 16)}...
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Monthly Salary:</span>
              <span className="info-value salary-amount">
                {Number(employeeData.empSalary) / 1_000_000} ADA
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Last Payment:</span>
              <span className="info-value">
                {formatDate(employeeData.empLastPay)}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Next Payment Date:</span>
              <span className="info-value">
                {formatDate(employeeData.empNextPay)}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">Time Remaining:</span>
              <span className={`info-value ${canWithdraw ? 'available' : 'pending'}`}>
                {formatTimeRemaining(employeeData.empNextPay)}
              </span>
            </div>
          </div>

          <div className="withdraw-section">
            <div className="withdraw-info">
              <h3>Salary Withdrawal</h3>
              <p>Available amount: <strong>{Number(employeeData.empSalary) / 1_000_000} ADA</strong></p>
              <p className="withdraw-status">
                Status: {canWithdraw ? '✅ Ready to withdraw' : '⏳ Not yet available'}
              </p>
            </div>

            <button
              onClick={handleWithdrawSalary}
              disabled={!canWithdraw || withdrawing || loading}
              className={`withdraw-btn ${canWithdraw ? 'enabled' : 'disabled'}`}
            >
              {withdrawing ? (
                <>
                  <span className="spinner-small"></span>
                  Processing...
                </>
              ) : (
                `Withdraw ${Number(employeeData.empSalary) / 1_000_000} ADA`
              )}
            </button>

            {!canWithdraw && (
              <div className="withdraw-hint">
                ⏳ You can withdraw on: {formatDate(employeeData.empNextPay)}
              </div>
            )}
          </div>
        </>
      ) : walletPKH ? (
        <div className="no-data">
          <p>No employee data found for your wallet.</p>
          <p className="small">Make sure you're connected with the correct wallet address.</p>
        </div>
      ) : (
        <div className="connect-wallet">
          <p>Please connect your wallet to view your employee dashboard</p>
        </div>
      )}
    </div>
  );
};

export default Employee;