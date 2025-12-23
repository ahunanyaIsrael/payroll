import { MdDeleteForever } from "react-icons/md";
import { GrUpdate } from "react-icons/gr";
import { useEffect, useState } from "react";
import { useLucid } from '../../contexts/LucidContext';
import "./ListEmployee.css";
import UpdateEmployeeModal from "../UpdateEmployee/UpdateEmployeeModal";
import { usePayroll } from '../../hooks/usePayroll';
import { hexToString } from "../../utils/utils-backup/hexToString";

const ListEmployee = () => {
  const { lucid, isConnected } = useLucid();
  const { getAllEmployee, deleteEmployee } = usePayroll();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const handleDelete = async (emp: any) => {
    if (!confirm(`Are you sure you want to delete employee:\n${emp.empPkh}?`)) {
      return;
    }

    setError(null);
    setDeleting(emp.empPkh);

    try {
      const txHash = await deleteEmployee(emp.empPkh);
      alert(`✅ Employee deleted successfully!\nTransaction: ${txHash}`);
      refreshEmployees();
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete employee");
      alert(`❌ ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateClick = (emp: any) => {
    setSelectedEmployee(emp);
    setShowUpdateModal(true);
  };

  const handleUpdateSuccess = () => {
    refreshEmployees();
  };

  const refreshEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await getAllEmployee();
      setEmployees(list);
    } catch (err: any) {
      setError("Failed to load employees: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && lucid) {
      refreshEmployees();
    }
  }, [isConnected, lucid]);

  return (
    <div className="employee-list flex">
      <div className="header-row">
        <h2>Employee List ({employees.length} employees)</h2>
        <button
          onClick={refreshEmployees}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="list-table">
        {/* Table Header */}
        <div className="list-table-header">
          <p>Name</p>
          <p>PubKeyHash</p>
          <p>Salary</p>
          <p>Last Paid</p>
          <p>Next Pay</p>
          <p>Actions</p>
        </div>

        {/* Table Rows */}
        {employees.length === 0 ? (
          <div className="empty-state">
            <p>No employees in payroll</p>
          </div>
        ) : (
          employees.map((emp, index) => (
            <div className={`list-table-row ${deleting === emp.empPkh ? 'deleting' : ''}`} key={index}>
              <p>{hexToString(emp.empName)}</p>
              <p className="pkh-cell" title={emp.empPkh}>
                {emp.empPkh.substring(0, 12)}...
              </p>
              <p>{Number(emp.empSalary) / 1_000_000} ADA</p>
              <p>
                {emp.empLastPay && Number(emp.empLastPay) > 0 ?
                  new Date(Number(emp.empLastPay) * 1000).toLocaleDateString() :
                  "Never"
                }
              </p>
              <p>
                {new Date(Number(emp.empNextPay) * 1000).toLocaleDateString()}
              </p>
              <p className="actions-cell">
                {deleting === emp.empPkh ? (
                  <span className="deleting-text">Deleting...</span>
                ) : (
                  <>
                    <GrUpdate
                      className="update-icon"
                      size={22}
                      onClick={() => handleUpdateClick(emp)}
                      title="Update employee"
                    />
                    <MdDeleteForever
                      className="delete-icon"
                      size={25}
                      onClick={() => handleDelete(emp)}
                      title="Delete employee"
                    />
                  </>
                )}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Update Employee Modal */}
      {selectedEmployee && (
        <UpdateEmployeeModal
          employee={selectedEmployee}
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false);
            setSelectedEmployee(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default ListEmployee;