import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">{user.shopName || 'My Distribution'}</div>
      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
        <Link to="/trips">Trips</Link>
        <Link to="/sales">Sales</Link>
        <Link to="/products">Products</Link>
        <Link to="/purchases">Purchases</Link>
        <Link to="/vehicles">Vehicles</Link>
        <Link to="/shops">Shops</Link>
        <Link to="/suppliers">Suppliers</Link>
      </div>
      <div className="navbar-user">
        <span>{user.fullName}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
