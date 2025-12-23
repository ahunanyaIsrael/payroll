import "./SideBar.css"
import { NavLink } from 'react-router-dom'
import { IoAddCircleOutline } from 'react-icons/io5'
import { FaRegCalendarCheck } from 'react-icons/fa'
import { FaMoneyCheckAlt } from 'react-icons/fa';

const SideBar = () => {
  return (
    <div className='sidebar'>
      <div className="sidebar-options">
        <NavLink to={"/employer/list"} className="sidebar-option">
          <IoAddCircleOutline size={30} />
          <p>List Employee</p>
        </NavLink>
        <NavLink to={"/employer/add"} className="sidebar-option">
          <FaRegCalendarCheck size={30} />
          <p>Add Emplyee</p>
        </NavLink>

        <NavLink to={"/employer/fund"} className="sidebar-option">
          <FaMoneyCheckAlt size={30} />
          <p>Fund Payroll</p>
        </NavLink>
      </div>
    </div>
  )
}

export default SideBar