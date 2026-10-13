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
      <div className="navbar-brand">{user.shopName || 'My Shop'}</div>
      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
        <Link to="/billing">New Bill</Link>
        <Link to="/invoices">Invoices</Link>
        <Link to="/products">Products</Link>
        <Link to="/customers">Customers</Link>
      </div>
      <div className="navbar-user">
        <span>{user.fullName}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
