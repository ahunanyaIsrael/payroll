import { useLucid } from '../contexts/LucidContext';
import { deleteEmployee as deleteEmployeeUtil } from '../utils/deleteEmployee';
import { getAllEmployee as getAllEmployeeUtil } from '../utils/listEmployee';
import { updateEmployee as updateEmployeeUtil } from '../utils/updateEmployee';
import { withdrawSalary as withdrawSalaryUtil } from '../utils/withdrawSalary';
import { fundPayroll as fundPayrollUtil } from '../utils/fundPayrollUtil';

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