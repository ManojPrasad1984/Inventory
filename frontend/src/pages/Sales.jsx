import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = status ? { status } : {};
    api.getVehicleSales(params).then(setSales).catch(err => setError(err.message));
  }, [status]);

  return (
    <div>
      <h1>Sales</h1>
      {error && <div className="error-banner">{error}</div>}

      <select value={status} onChange={e => setStatus(e.target.value)} className="search-box">
        <option value="">All</option>
        <option value="Paid">Paid</option>
        <option value="Partial">Partial</option>
        <option value="Unpaid">Unpaid</option>
      </select>

      <table className="data-table">
        <thead>
          <tr><th>Invoice #</th><th>Date</th><th>Vehicle</th><th>Shop</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {sales.map(s => (
            <tr key={s.id}>
              <td><Link to={`/sales/${s.id}`}>{s.invoiceNumber}</Link></td>
              <td>{new Date(s.saleDate).toLocaleDateString()}</td>
              <td>{s.vehicle?.vehicleNumber}</td>
              <td>{s.shop?.name}</td>
              <td>₹{s.totalAmount.toFixed(2)}</td>
              <td><span className={`badge badge-${s.paymentStatus.toLowerCase()}`}>{s.paymentStatus}</span></td>
            </tr>
          ))}
          {sales.length === 0 && <tr><td colSpan={6}>No sales found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
