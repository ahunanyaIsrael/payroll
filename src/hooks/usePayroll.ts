import { useLucid } from '../contexts/LucidContext';
import { deleteEmployee as deleteEmployeeUtil } from '../utils/utils-backup/deleteEmployee';
import { getAllEmployee as getAllEmployeeUtil } from '../utils/utils-backup/listEmployee';
import { updateEmployee as updateEmployeeUtil } from '../utils/utils-backup/updateEmployee';
import { withdrawSalary as withdrawSalaryUtil } from '../utils/utils-backup/withdrawSalary';
import { fundPayroll as fundPayrollUtil } from '../utils/utils-backup/fundPayrollUtil';

export const usePayroll = () => {
  const { lucid, isConnected } = useLucid();

  const deleteEmployee = async (empPKH: string) => {
    if (!lucid) throw new Error("Wallet not connected");
    return deleteEmployeeUtil(lucid, empPKH);
  };

  const getAllEmployee = async () => {
    if (!lucid) throw new Error("Wallet not connected");
    return getAllEmployeeUtil(lucid);
  };

  const updateEmployee = async (params: any) => {
    if (!lucid) throw new Error("Wallet not connected");
    return updateEmployeeUtil(lucid, params);
  };

  const withdrawSalary = async () => {
    if (!lucid) throw new Error("Wallet not connected");
    return withdrawSalaryUtil(lucid);
  };
  const fundPayroll = async (amount: number) => {
    if (!lucid) throw new Error("Wallet not connected");
    return fundPayrollUtil(lucid, amount);
  };

  return {
    deleteEmployee,
    getAllEmployee,
    updateEmployee,
    withdrawSalary,
    fundPayroll,
    isConnected,
    hasLucid: !!lucid
  };
};