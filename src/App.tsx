import { Routes, Route, Outlet } from 'react-router-dom'
import Home from './pages/Home/Home'
import { NavBar } from './components/NavBar/NavBar'
import SideBar from './components/SideBar/SideBar'
import ListEmployee from './pages/ListEmployee/ListEmployee'
import AddEmployee from './pages/AddEmployee/AddEmployee'
import Employee from './pages/Employee/Employee'
import FundPayroll from './pages/FundPayroll/FundPayroll'

const EmployerLayout = () => {
  return (
    <div className="dashboard">
      <NavBar name={"Payroll Admin"} />
      <div className="dashboard-body">
        <SideBar />
        <div className="dashboard-content">
          <Outlet /> {/* Nested pages will render here */}
        </div>
      </div>
    </div>
  )
}

const EmployeeLayout = () => {
  return (
    <div className="employee-dashboard">
      <NavBar name={"Payroll Employee"} />
      <Outlet />
    </div>
  )
}

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Employer dashboard with nested routes */}
      <Route path="/employer/*" element={<EmployerLayout />}>
        {/* Default page when visiting /employer */}
        <Route index element={<ListEmployee />} />
        {/* Nested pages */}
        <Route path="list" element={<ListEmployee />} />      {/* /employer/list */}
        <Route path="add" element={<AddEmployee />} />       {/* /employer/add */}
        <Route path="fund" element={<FundPayroll />} />       {/* /employer/fund */}
      </Route>
      <Route element={<EmployeeLayout />}>
        <Route path='/employee' element={<Employee />} />
      </Route>
    </Routes>
  )
}

export default App
