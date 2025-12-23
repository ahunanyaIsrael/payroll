import "./NavBar.css"
import { Link } from 'react-router-dom'
import { useLucid } from '../../contexts/LucidContext' // Update path as needed
import { getValidatorAddress } from '../../utils/validator'

interface NavBarProps {
  name: string
}
export const NavBar = ({ name }: NavBarProps) => {
  const { lucid, address, isConnected, connectWallet, disconnectWallet, loading } = useLucid()

  const handleConnect = async () => {
    try {
      await connectWallet('lace');
      if (lucid) {
        console.log(getValidatorAddress(lucid))
      }
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }

  const handleDisconnect = () => {
    disconnectWallet()
  }

  return (
    <div className="navbar">
      <h1 className="logo-name">{name}</h1>
      <div className="navigate">
        {!isConnected ?
          (<button
            className="nav-btn"
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>)
          :
          (<div className="wallet-info">
            <span>{address?.slice(0, 6)}...{address?.slice(-6)}</span>
            <button
              className="disconnect-btn"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>)
        }

        <Link to={"/"}><button className="nav-btn">Home</button></Link>
      </div>
    </div>
  )
}