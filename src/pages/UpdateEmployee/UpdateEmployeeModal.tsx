import { useState } from "react";
import { updateEmployee } from "../../utils/utils-backup/updateEmployee";
import "./UpdateEmployeeModal.css";
import { useLucid } from "../../contexts/LucidContext";

interface UpdateEmployeeModalProps {
  employee: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UpdateEmployeeModal: React.FC<UpdateEmployeeModalProps> = ({
  employee,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [newSalary, setNewSalary] = useState<number>(
    employee ? Number(employee.empSalary) / 1_000_000 : 0
  );
  const [updateNextPay, setUpdateNextPay] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { lucid } = useLucid()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employee || !lucid) return;

    setLoading(true);
    setError(null);

    try {
      const result = await updateEmployee(lucid, {
        empPKH: employee.empPkh,
        newSalary,
        updateNextPay
      });

      alert(`✅ Employee updated successfully!\nTransaction: ${result.txHash}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Update error:", err);
      setError(err.message || "Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNewSalary(Number(employee.empSalary) / 1_000_000);
    setUpdateNextPay(false);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Employee</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="employee-info">
          <p><strong>Employee PKH:</strong></p>
          <code className="pkh-display">{employee.empPkh.substring(0, 20)}...</code>
          <p><strong>Current Salary:</strong> {Number(employee.empSalary) / 1_000_000} ADA</p>
          <p><strong>Last Paid:</strong> {
            employee.empLastPay && Number(employee.empLastPay) > 0 ?
              new Date(Number(employee.empLastPay) * 1000).toLocaleString() :
              "Never"
          }</p>
          <p><strong>Next Pay:</strong> {
            new Date(Number(employee.empNextPay) * 1000).toLocaleString()
          }</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="salary">
              New Salary (ADA)
            </label>
            <input
              id="salary"
              type="number"
              step="0.1"
              min="1"
              value={newSalary}
              onChange={(e) => setNewSalary(parseFloat(e.target.value) || 0)}
              placeholder="Enter new salary"
              required
            />
            <small>Current: {Number(employee.empSalary) / 1_000_000} ADA</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={updateNextPay}
                onChange={(e) => setUpdateNextPay(e.target.checked)}
              />
              Update next payment date (set to 2 minutes from now for testing)
            </label>
            <small className="hint">
              If checked, the next payment date will be reset to 2 minutes from now.
              Useful for testing withdrawal functionality.
            </small>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="btn-reset"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || newSalary <= 0}
              className="btn-update"
            >
              {loading ? "Updating..." : "Update Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateEmployeeModal;