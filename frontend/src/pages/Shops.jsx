import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { Badge, EmptyState, ErrorNote, Field, Loading, Modal, PageHeader, SearchBox, useUi } from '../components/ui';
import { inr } from '../utils/format';

const emptyForm = { name: '', phone: '', address: '', gstNumber: '', creditLimit: '' };

export default function Shops() {
  const { toast, confirm } = useUi();
  const [shops, setShops] = useState(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.getShops(search).then(s => { setShops(s); setError(''); }).catch(err => { setError(err.message); setShops([]); });
  }
  useEffect(load, [search]);

  const update = (f, v) => setForm(x => ({ ...x, [f]: v }));

  function startNew() { setForm(emptyForm); setFormError(''); setEditing('new'); }
  function startEdit(s) {
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '', gstNumber: s.gstNumber || '', creditLimit: s.creditLimit ?? '' });
    setFormError('');
    setEditing(s.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, creditLimit: form.creditLimit === '' ? null : Number(form.creditLimit) };
      if (editing === 'new') await api.createShop(payload);
      else await api.updateShop(editing, payload);
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
    const ok = await confirm({
      title: `Remove ${s.name}?`,
      message: s.outstandingBalance > 0 ? `${s.name} still owes ${inr(s.outstandingBalance)}. Collect it before removing the shop.` : 'The shop is hidden from lists. Its invoices stay on record.',
      confirmLabel: 'Remove shop',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteShop(s.id);
      toast(`${s.name} removed.`);
      load();
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  const totalOwed = (shops || []).reduce((s, x) => s + x.outstandingBalance, 0);

  return (
    <div>
      <PageHeader title="Shops" subtitle="The retailers you bill. Each has a running balance of what they owe.">
        <button className="btn btn-primary" onClick={startNew}><Icon name="plus" /> Add shop</button>
      </PageHeader>
      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name or phone" />
        {shops && totalOwed > 0 && <span className="muted num">Total owed to you: <strong>{inr(totalOwed)}</strong></span>}
      </div>

      <div className="card card-flush">
        {shops === null ? <Loading /> : shops.length === 0 ? (
          <EmptyState icon="store" title={search ? 'No shops match' : 'No shops yet'}
            action={!search && <button className="btn btn-primary" onClick={startNew}>Add your first shop</button>}>
            {search ? 'Try a different name or phone number.' : 'Add the shops you deliver to. You choose one every time you bill.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Shop</th><th>Phone</th><th className="right">Owes you</th><th className="right">Credit limit</th><th></th></tr></thead>
              <tbody>
                {shops.map(s => {
                  const over = s.creditLimit != null && s.outstandingBalance > s.creditLimit;
                  return (
                    <tr key={s.id} className={over ? 'row-bad' : s.outstandingBalance > 0 ? 'row-warn' : ''}>
                      <td data-label="Shop">
                        <Link className="cell-title" to={`/shops/${s.id}`}>{s.name}</Link>
                        {s.address && <div className="cell-sub">{s.address}</div>}
                      </td>
                      <td data-label="Phone">{s.phone}</td>
                      <td data-label="Owes you" className="num right strong">
                        {s.outstandingBalance > 0 ? inr(s.outstandingBalance) : <span className="muted">Clear</span>}
                        {over && <> <Badge tone="bad">Over limit</Badge></>}
                      </td>
                      <td data-label="Credit limit" className="num right">{s.creditLimit != null ? inr(s.creditLimit, 0) : '—'}</td>
                      <td className="actions">
                        <Link className="btn btn-quiet btn-sm" to={`/shops/${s.id}`}>Ledger</Link>
                        <button className="btn btn-quiet btn-sm" onClick={() => startEdit(s)}>Edit</button>
                        <button className="btn btn-ghost-danger btn-sm" onClick={() => handleDelete(s)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing !== null && (
        <Modal as="form" title={editing === 'new' ? 'Add shop' : 'Edit shop'} onClose={() => setEditing(null)} onSubmit={handleSubmit}
          footer={<>
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add shop' : 'Save changes'}</button>
          </>}>
          <ErrorNote>{formError}</ErrorNote>
          <Field label="Shop name"><input value={form.name} onChange={e => update('name', e.target.value)} required /></Field>
          <div className="grid-2">
            <Field label="Phone"><input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} /></Field>
            <Field label="GST number (optional)"><input value={form.gstNumber} onChange={e => update('gstNumber', e.target.value)} /></Field>
          </div>
          <Field label="Address"><textarea value={form.address} onChange={e => update('address', e.target.value)} /></Field>
          <Field label="Credit limit (₹, optional)" hint="You will be warned at billing time if a sale takes the shop over this amount.">
            <input type="number" step="0.01" min="0" value={form.creditLimit} onChange={e => update('creditLimit', e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
