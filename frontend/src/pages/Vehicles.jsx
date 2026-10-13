import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const emptyForm = { vehicleNumber: '', executiveName: '', driverName: '', driverPhone: '', helperName: '' };

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    api.getVehicles().then(setVehicles).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, []);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function startEdit(v) {
    setEditingId(v.id);
    setForm({
      vehicleNumber: v.vehicleNumber, executiveName: v.executiveName || '',
      driverName: v.driverName || '', driverPhone: v.driverPhone || '', helperName: v.helperName || ''
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
      if (editingId) await api.updateVehicle(editingId, form);
      else await api.createVehicle(form);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this vehicle?')) return;
    try {
      await api.deleteVehicle(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Vehicles</h1>
        <button onClick={startNew}>+ Add Vehicle</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <table className="data-table">
        <thead><tr><th>Vehicle #</th><th>Executive</th><th>Driver</th><th>Helper</th><th></th></tr></thead>
        <tbody>
          {vehicles.map(v => (
            <tr key={v.id}>
              <td>{v.vehicleNumber}</td>
              <td>{v.executiveName}</td>
              <td>{v.driverName} {v.driverPhone && `(${v.driverPhone})`}</td>
              <td>{v.helperName}</td>
              <td>
                <Link to="/trips"><button>Trips</button></Link>
                <button onClick={() => startEdit(v)}>Edit</button>
                <button onClick={() => handleDelete(v.id)} className="btn-danger">Delete</button>
              </td>
            </tr>
          ))}
          {vehicles.length === 0 && <tr><td colSpan={5}>No vehicles yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
            <label>Vehicle Number</label>
            <input value={form.vehicleNumber} onChange={e => update('vehicleNumber', e.target.value)} required />
            <label>Executive Name</label>
            <input value={form.executiveName} onChange={e => update('executiveName', e.target.value)} />
            <label>Driver Name</label>
            <input value={form.driverName} onChange={e => update('driverName', e.target.value)} />
            <label>Driver Phone</label>
            <input value={form.driverPhone} onChange={e => update('driverPhone', e.target.value)} />
            <label>Helper Name</label>
            <input value={form.helperName} onChange={e => update('helperName', e.target.value)} />
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">{editingId ? 'Save Changes' : 'Add Vehicle'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
