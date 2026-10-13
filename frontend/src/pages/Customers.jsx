import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', phone: '', email: '', address: '', gstNumber: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    try {
      setCustomers(await api.getCustomers(search));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [search]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function startEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', gstNumber: c.gstNumber || '' });
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
      if (editingId) {
        await api.updateCustomer(editingId, form);
      } else {
        await api.createCustomer(form);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this customer?')) return;
    try {
      await api.deleteCustomer(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button onClick={startNew}>+ Add Customer</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <input className="search-box" placeholder="Search by name or phone…" value={search} onChange={e => setSearch(e.target.value)} />

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Email</th><th>Outstanding</th><th></th></tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id} className={c.outstandingBalance > 0 ? 'row-warn' : ''}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.email}</td>
              <td>₹{c.outstandingBalance.toFixed(2)}</td>
              <td>
                <button onClick={() => startEdit(c)}>Edit</button>
                <button onClick={() => handleDelete(c.id)} className="btn-danger">Delete</button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && <tr><td colSpan={5}>No customers yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Customer' : 'Add Customer'}</h2>
            <label>Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} required />
            <label>Phone</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} />
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} />
            <label>Address</label>
            <textarea value={form.address} onChange={e => update('address', e.target.value)} />
            <label>GST Number (optional)</label>
            <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} />
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">{editingId ? 'Save Changes' : 'Add Customer'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
