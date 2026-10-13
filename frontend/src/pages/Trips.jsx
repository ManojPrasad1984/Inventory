import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { Badge, EmptyState, ErrorNote, Field, Loading, PageHeader, Segmented, statusTone, useUi } from '../components/ui';
import { fmtDate } from '../utils/format';

export default function Trips() {
  const navigate = useNavigate();
  const { toast } = useUi();
  const [trips, setTrips] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [status, setStatus] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  function load() {
    setError('');
    api.getTrips(status ? { status } : {}).then(setTrips).catch(err => { setError(err.message); setTrips([]); });
  }
  useEffect(load, [status]);
  useEffect(() => { api.getVehicles().then(setVehicles).catch(() => {}); }, []);

  async function startTrip(e) {
    e.preventDefault();
    if (!vehicleId) return;
    setStarting(true);
    try {
      const trip = await api.createTrip({ vehicleId: Number(vehicleId), tripDate: new Date().toISOString(), notes: null });
      toast(`Trip ${trip.tripNumber} started. Load stock, then start selling.`);
      navigate(`/trips/${trip.id}`);
    } catch (err) {
      // "Already has an open trip" is the common case: take them straight to it.
      const open = (trips || []).find(t => t.vehicleId === Number(vehicleId) && t.status === 'Open');
      setError(err.message);
      if (open) navigate(`/trips/${open.id}`);
    } finally {
      setStarting(false);
    }
  }

  const openTrips = (trips || []).filter(t => t.status === 'Open');

  return (
    <div>
      <PageHeader title="Trips" subtitle="One trip is one vehicle's round: load stock, sell to shops, then close and count what came back." />
      <ErrorNote>{error}</ErrorNote>

      <form className="card stack" onSubmit={startTrip} style={{ marginBottom: '1.5rem' }}>
        <h3>Start a new trip</h3>
        {vehicles.length === 0 ? (
          <p className="muted">Add a vehicle first. <Link to="/vehicles">Go to Vehicles</Link></p>
        ) : (
          <div className="trip-start">
            <Field label="Vehicle">
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} required>
                <option value="">Choose a vehicle…</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber}{v.driverName ? ` · ${v.driverName}` : ''}</option>
                ))}
              </select>
            </Field>
            <button className="btn btn-primary" type="submit" disabled={!vehicleId || starting}>
              <Icon name="plus" /> {starting ? 'Starting…' : 'Start trip'}
            </button>
          </div>
        )}
      </form>

      {openTrips.length > 0 && (
        <div className="note note-info">
          <Icon name="truck" size={18} />
          <span>
            {openTrips.length === 1 ? '1 vehicle is' : `${openTrips.length} vehicles are`} out. Open a trip below and tap Sell to bill a shop.
          </span>
        </div>
      )}

      <div className="toolbar">
        <Segmented
          label="Filter trips"
          value={status}
          onChange={setStatus}
          options={[{ value: '', label: 'All' }, { value: 'Open', label: 'Open' }, { value: 'Closed', label: 'Closed' }]}
        />
      </div>

      <div className="card card-flush">
        {trips === null ? <Loading /> : trips.length === 0 ? (
          <EmptyState icon="truck" title={status ? `No ${status.toLowerCase()} trips` : 'No trips yet'}>
            Choose a vehicle above and start your first trip.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Trip</th><th>Vehicle</th><th>Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id}>
                    <td data-label="Trip" className="cell-title">{t.tripNumber}</td>
                    <td data-label="Vehicle">{t.vehicle?.vehicleNumber}</td>
                    <td data-label="Date">{fmtDate(t.tripDate)}</td>
                    <td data-label="Status"><Badge tone={statusTone(t.status)}>{t.status === 'Open' ? 'Out on round' : 'Closed'}</Badge></td>
                    <td className="actions">
                      <Link className={`btn btn-sm ${t.status === 'Open' ? 'btn-primary' : 'btn-quiet'}`} to={`/trips/${t.id}`}>
                        {t.status === 'Open' ? 'Sell' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
