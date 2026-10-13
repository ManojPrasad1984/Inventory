import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const emptyForm = { name: '', phone: '', address: '', gstNumber: '', creditLimit: '' };

export default function Shops() {
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    api.getShops(search).then(setShops).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, [search]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name, phone: s.phone || '', address: s.address || '',
      gstNumber: s.gstNumber || '', creditLimit: s.creditLimit ?? ''
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, creditLimit: form.creditLimit === '' ? null : Number(form.creditLimit) };
      if (editingId) await api.updateShop(editingId, payload);
      else await api.createShop(payload);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this shop?')) return;
    try {
      await api.deleteShop(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Shops</h1>
        <button onClick={startNew}>+ Add Shop</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <input className="search-box" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />

      <table className="data-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Outstanding</th><th>Credit Limit</th><th></th></tr></thead>
        <tbody>
          {shops.map(s => (
            <tr key={s.id} className={s.creditLimit && s.outstandingBalance > s.creditLimit ? 'row-warn' : (s.outstandingBalance > 0 ? 'row-warn' : '')}>
              <td><Link to={`/shops/${s.id}`}>{s.name}</Link></td>
              <td>{s.phone}</td>
              <td>₹{s.outstandingBalance.toFixed(2)}</td>
              <td>{s.creditLimit != null ? `₹${s.creditLimit.toFixed(2)}` : '—'}</td>
              <td>
                <button onClick={() => startEdit(s)}>Edit</button>
                <button onClick={() => handleDelete(s.id)} className="btn-danger">Delete</button>
              </td>
            </tr>
          ))}
          {shops.length === 0 && <tr><td colSpan={5}>No shops yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Shop' : 'Add Shop'}</h2>
            <label>Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} required />
            <label>Phone</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} />
            <label>Address</label>
            <textarea value={form.address} onChange={e => update('address', e.target.value)} />
            <label>GST Number (optional)</label>
            <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} />
            <label>Credit Limit (optional, ₹)</label>
            <input type="number" step="0.01" value={form.creditLimit} onChange={e => update('creditLimit', e.target.value)} />
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">{editingId ? 'Save Changes' : 'Add Shop'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
