import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
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

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
          <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
          <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
          <Route path="/trips/:id" element={<ProtectedRoute><TripDetail /></ProtectedRoute>} />
          <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
          <Route path="/shops/:id" element={<ProtectedRoute><ShopDetail /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
          <Route path="/sales/:id" element={<ProtectedRoute><SaleDetail /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  );
}
