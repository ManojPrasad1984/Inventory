import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Trips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [error, setError] = useState('');

  function load() {
    const params = statusFilter ? { status: statusFilter } : {};
    api.getTrips(params).then(setTrips).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { api.getVehicles().then(setVehicles).catch(() => {}); }, []);

  async function startTrip() {
    setError('');
    if (!vehicleId) { setError('Select a vehicle first.'); return; }
    try {
      const trip = await api.createTrip({ vehicleId: Number(vehicleId), tripDate: new Date().toISOString(), notes: null });
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Trips</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="billing-cart" style={{ marginBottom: '1.5rem' }}>
        <h3>Start a New Trip (Godown Out)</h3>
        <div className="form-row">
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
            <option value="">Select vehicle…</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} — {v.driverName}</option>)}
          </select>
          <button onClick={startTrip}>Start Trip</button>
        </div>
      </div>

      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="search-box">
        <option value="">All Trips</option>
        <option value="Open">Open</option>
        <option value="Closed">Closed</option>
      </select>

      <table className="data-table">
        <thead><tr><th>Trip #</th><th>Vehicle</th><th>Date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {trips.map(t => (
            <tr key={t.id}>
              <td>{t.tripNumber}</td>
              <td>{t.vehicle?.vehicleNumber}</td>
              <td>{new Date(t.tripDate).toLocaleDateString()}</td>
              <td><span className={`badge badge-${t.status === 'Open' ? 'partial' : 'paid'}`}>{t.status}</span></td>
              <td><Link to={`/trips/${t.id}`}><button>Open</button></Link></td>
            </tr>
          ))}
          {trips.length === 0 && <tr><td colSpan={5}>No trips yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
