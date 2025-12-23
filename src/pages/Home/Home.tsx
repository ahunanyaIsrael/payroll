import { Link } from "react-router-dom"
import "./Home.css"

const Home = () => {
    return (
        <div className="home">
            <div className="navbar">
                <h1 className="logo-name">Payroll</h1>
                <div className="navigate">
                    <Link to={"/employer"}> <button className="nav-btn selected">Employer</button></Link>
                    <Link to={"/employee"}><button className="nav-btn">Employee</button></Link>
                </div>
            </div>
            <div className="main">
                <div className="content-area">
                    <div className="app-description">
                        <h2>Employer Dashboard</h2>
                        <p>Manage your employees and payroll here.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home