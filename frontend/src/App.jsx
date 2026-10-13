import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Suppliers from './pages/Suppliers';
import Purchases from './pages/Purchases';
import Vehicles from './pages/Vehicles';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import Shops from './pages/Shops';
import ShopDetail from './pages/ShopDetail';
import Sales from './pages/Sales';
import SaleDetail from './pages/SaleDetail';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/products" element={<Protected><Products /></Protected>} />
      <Route path="/suppliers" element={<Protected><Suppliers /></Protected>} />
      <Route path="/purchases" element={<Protected><Purchases /></Protected>} />
      <Route path="/vehicles" element={<Protected><Vehicles /></Protected>} />
      <Route path="/trips" element={<Protected><Trips /></Protected>} />
      <Route path="/trips/:id" element={<Protected><TripDetail /></Protected>} />
      <Route path="/shops" element={<Protected><Shops /></Protected>} />
      <Route path="/shops/:id" element={<Protected><ShopDetail /></Protected>} />
      <Route path="/sales" element={<Protected><Sales /></Protected>} />
      <Route path="/sales/:id" element={<Protected><SaleDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
