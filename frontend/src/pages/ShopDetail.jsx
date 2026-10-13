import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function ShopDetail() {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  function load() {
    api.getShop(id).then(setShop).catch(err => setError(err.message));
    api.getShopLedger(id).then(setLedger).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, [id]);

  async function handlePayment(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await api.recordShopPayment(id, Number(paymentAmount), paymentNotes || null);
      setSuccess('Payment recorded.');
      setPaymentAmount(''); setPaymentNotes('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!shop) return <p>Loading…</p>;

  return (
    <div>
      <h1>{shop.name}</h1>
      <p>{shop.phone} {shop.address && `• ${shop.address}`}</p>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <div className="stat-grid">
        <div className={`stat-card ${shop.outstandingBalance > 0 ? 'stat-card-warn' : ''}`}>
          <div className="stat-value">₹{shop.outstandingBalance.toFixed(2)}</div>
          <div className="stat-label">Outstanding Balance</div>
        </div>
        {shop.creditLimit != null && (
          <div className="stat-card">
            <div className="stat-value">₹{shop.creditLimit.toFixed(2)}</div>
            <div className="stat-label">Credit Limit</div>
          </div>
        )}
      </div>

      <h3>Record Payment</h3>
      <form onSubmit={handlePayment} className="form-row">
        <input type="number" step="0.01" placeholder="Amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
        <input placeholder="Notes (optional)" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} />
        <button type="submit">Record Payment</button>
      </form>

      <h3>Ledger</h3>
      <table className="data-table">
        <thead><tr><th>Date</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Notes</th></tr></thead>
        <tbody>
          {ledger.map(l => (
            <tr key={l.id}>
              <td>{new Date(l.entryDate).toLocaleString()}</td>
              <td>{l.type}</td>
              <td>{l.debit > 0 ? `₹${l.debit.toFixed(2)}` : ''}</td>
              <td>{l.credit > 0 ? `₹${l.credit.toFixed(2)}` : ''}</td>
              <td>₹{l.runningBalance.toFixed(2)}</td>
              <td>{l.notes}</td>
            </tr>
          ))}
          {ledger.length === 0 && <tr><td colSpan={6}>No transactions yet.</td></tr>}
        </tbody>
      </table>

      <p><Link to="/shops">← Back to Shops</Link></p>
    </div>
  );
}
