import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { EmptyState, ErrorNote, Field, Loading, Modal, PageHeader, useUi } from '../components/ui';

const emptyForm = { vehicleNumber: '', executiveName: '', driverName: '', driverPhone: '', helperName: '' };

export default function Vehicles() {
  const { toast, confirm } = useUi();
  const [vehicles, setVehicles] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.getVehicles().then(v => { setVehicles(v); setError(''); }).catch(err => { setError(err.message); setVehicles([]); });
  }
  useEffect(load, []);

  const update = (f, v) => setForm(x => ({ ...x, [f]: v }));

  function startNew() { setForm(emptyForm); setFormError(''); setEditing('new'); }
  function startEdit(v) {
    setForm({
      vehicleNumber: v.vehicleNumber, executiveName: v.executiveName || '',
      driverName: v.driverName || '', driverPhone: v.driverPhone || '', helperName: v.helperName || '',
    });
    setFormError('');
    setEditing(v.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') await api.createVehicle(form);
      else await api.updateVehicle(editing, form);
      toast(editing === 'new' ? `${form.vehicleNumber} added.` : `${form.vehicleNumber} updated.`);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(v) {
    const ok = await confirm({ title: `Remove ${v.vehicleNumber}?`, message: 'Past trips keep their history. The vehicle will no longer be offered for new trips.', confirmLabel: 'Remove vehicle', danger: true });
    if (!ok) return;
    try {
      await api.deleteVehicle(v.id);
      toast(`${v.vehicleNumber} removed.`);
      load();
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  return (
    <div>
      <PageHeader title="Vehicles" subtitle="The vans and trucks that carry stock to shops, with their crew.">
        <button className="btn btn-primary" onClick={startNew}><Icon name="plus" /> Add vehicle</button>
      </PageHeader>
      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="card card-flush">
        {vehicles === null ? <Loading /> : vehicles.length === 0 ? (
          <EmptyState icon="truck" title="No vehicles yet" action={<button className="btn btn-primary" onClick={startNew}>Add your first vehicle</button>}>
            Add each vehicle once. You pick it when you start a trip.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Vehicle</th><th>Executive</th><th>Driver</th><th>Helper</th><th></th></tr></thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td data-label="Vehicle" className="cell-title">{v.vehicleNumber}</td>
                    <td data-label="Executive">{v.executiveName}</td>
                    <td data-label="Driver">{v.driverName}{v.driverPhone && <div className="cell-sub">{v.driverPhone}</div>}</td>
                    <td data-label="Helper">{v.helperName}</td>
                    <td className="actions">
                      <Link className="btn btn-quiet btn-sm" to="/trips">Trips</Link>
                      <button className="btn btn-quiet btn-sm" onClick={() => startEdit(v)}>Edit</button>
                      <button className="btn btn-ghost-danger btn-sm" onClick={() => handleDelete(v)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <Modal as="form" title={editing === 'new' ? 'Add vehicle' : 'Edit vehicle'} onClose={() => setEditing(null)} onSubmit={handleSubmit}
          footer={<>
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add vehicle' : 'Save changes'}</button>
          </>}>
          <ErrorNote>{formError}</ErrorNote>
          <Field label="Vehicle number"><input value={form.vehicleNumber} onChange={e => update('vehicleNumber', e.target.value)} required placeholder="TN 01 AB 1234" /></Field>
          <Field label="Sales executive"><input value={form.executiveName} onChange={e => update('executiveName', e.target.value)} /></Field>
          <div className="grid-2">
            <Field label="Driver"><input value={form.driverName} onChange={e => update('driverName', e.target.value)} /></Field>
            <Field label="Driver phone"><input type="tel" value={form.driverPhone} onChange={e => update('driverPhone', e.target.value)} /></Field>
          </div>
          <Field label="Helper"><input value={form.helperName} onChange={e => update('helperName', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
