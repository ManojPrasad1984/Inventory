import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = status ? { status } : {};
    api.getInvoices(params).then(setInvoices).catch(err => setError(err.message));
  }, [status]);

  return (
    <div>
      <h1>Invoices</h1>
      {error && <div className="error-banner">{error}</div>}

      <select value={status} onChange={e => setStatus(e.target.value)} className="search-box">
        <option value="">All</option>
        <option value="Paid">Paid</option>
        <option value="Partial">Partial</option>
        <option value="Unpaid">Unpaid</option>
      </select>

      <table className="data-table">
        <thead>
          <tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id}>
              <td><Link to={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link></td>
              <td>{new Date(inv.invoiceDate).toLocaleDateString()}</td>
              <td>{inv.customer?.name || inv.walkInCustomerName || 'Walk-in'}</td>
              <td>₹{inv.totalAmount.toFixed(2)}</td>
              <td><span className={`badge badge-${inv.paymentStatus.toLowerCase()}`}>{inv.paymentStatus}</span></td>
            </tr>
          ))}
          {invoices.length === 0 && <tr><td colSpan={5}>No invoices found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
