import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', phone: '', address: '', gstNumber: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    try {
      setSuppliers(await api.getSuppliers(search));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [search]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '', gstNumber: s.gstNumber || '' });
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
      if (editingId) await api.updateSupplier(editingId, form);
      else await api.createSupplier(form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this supplier?')) return;
    try {
      await api.deleteSupplier(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Suppliers</h1>
        <button onClick={startNew}>+ Add Supplier</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <input className="search-box" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />

      <table className="data-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>GST</th><th></th></tr></thead>
        <tbody>
          {suppliers.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.phone}</td>
              <td>{s.address}</td>
              <td>{s.gstNumber}</td>
              <td>
                <button onClick={() => startEdit(s)}>Edit</button>
                <button onClick={() => handleDelete(s.id)} className="btn-danger">Delete</button>
              </td>
            </tr>
          ))}
          {suppliers.length === 0 && <tr><td colSpan={5}>No suppliers yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <label>Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} required />
            <label>Phone</label>
            <input value={form.phone} onChange={e => update('phone', e.target.value)} />
            <label>Address</label>
            <textarea value={form.address} onChange={e => update('address', e.target.value)} />
            <label>GST Number</label>
            <input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} />
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">{editingId ? 'Save Changes' : 'Add Supplier'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
