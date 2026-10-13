import { useEffect, useState } from 'react';
import { api } from '../api';
import Icon from '../components/Icon';
import { EmptyState, ErrorNote, Field, Loading, Modal, PageHeader, SearchBox, useUi } from '../components/ui';

const emptyForm = { name: '', phone: '', address: '', gstNumber: '' };

export default function Suppliers() {
  const { toast, confirm } = useUi();
  const [suppliers, setSuppliers] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.getSuppliers(search).then(s => { setSuppliers(s); setError(''); }).catch(err => { setError(err.message); setSuppliers([]); });
  }
  useEffect(load, [search]);

  const update = (f, v) => setForm(x => ({ ...x, [f]: v }));

  function startNew() { setForm(emptyForm); setFormError(''); setEditing('new'); }
  function startEdit(s) {
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '', gstNumber: s.gstNumber || '' });
    setFormError('');
    setEditing(s.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing === 'new') await api.createSupplier(form);
      else await api.updateSupplier(editing, form);
      toast(editing === 'new' ? `${form.name} added.` : `${form.name} updated.`);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s) {
    const ok = await confirm({ title: `Remove ${s.name}?`, message: 'Past purchases from this supplier stay on record.', confirmLabel: 'Remove supplier', danger: true });
    if (!ok) return;
    try {
      await api.deleteSupplier(s.id);
      toast(`${s.name} removed.`);
      load();
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Companies you buy stock from.">
        <button className="btn btn-primary" onClick={startNew}><Icon name="plus" /> Add supplier</button>
      </PageHeader>
      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search suppliers" /></div>

      <div className="card card-flush">
        {suppliers === null ? <Loading /> : suppliers.length === 0 ? (
          <EmptyState icon="factory" title={search ? 'No suppliers match' : 'No suppliers yet'}
            action={!search && <button className="btn btn-primary" onClick={startNew}>Add your first supplier</button>}>
            {search ? 'Try a different name.' : 'Add the company you buy from, then record purchases against it.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Supplier</th><th>Phone</th><th>GST number</th><th></th></tr></thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td data-label="Supplier"><div className="cell-title">{s.name}</div>{s.address && <div className="cell-sub">{s.address}</div>}</td>
                    <td data-label="Phone">{s.phone}</td>
                    <td data-label="GST number">{s.gstNumber}</td>
                    <td className="actions">
                      <button className="btn btn-quiet btn-sm" onClick={() => startEdit(s)}>Edit</button>
                      <button className="btn btn-ghost-danger btn-sm" onClick={() => handleDelete(s)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <Modal as="form" title={editing === 'new' ? 'Add supplier' : 'Edit supplier'} onClose={() => setEditing(null)} onSubmit={handleSubmit}
          footer={<>
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add supplier' : 'Save changes'}</button>
          </>}>
          <ErrorNote>{formError}</ErrorNote>
          <Field label="Supplier name"><input value={form.name} onChange={e => update('name', e.target.value)} required /></Field>
          <div className="grid-2">
            <Field label="Phone"><input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} /></Field>
            <Field label="GST number (optional)"><input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} /></Field>
          </div>
          <Field label="Address"><textarea value={form.address} onChange={e => update('address', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}
