import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import Icon from '../components/Icon';
import { Badge, EmptyState, ErrorNote, Field, Loading, PageHeader, useUi } from '../components/ui';
import { fmtDateTime, inr } from '../utils/format';

export default function ShopDetail() {
  const { id } = useParams();
  const { toast } = useUi();
  const [shop, setShop] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setError('');
    api.getShop(id).then(setShop).catch(err => setError(err.message));
    api.getShopLedger(id).then(setLedger).catch(err => { setError(err.message); setLedger([]); });
  }
  useEffect(load, [id]);

  async function handlePayment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.recordShopPayment(id, Number(amount), notes || null);
      toast(`Received ${inr(Number(amount))} from ${shop.name}.`);
      setAmount(''); setNotes('');
      load();
    } catch (err) {
      toast(err.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (error && !shop) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!shop) return <Loading />;

  const owes = shop.outstandingBalance > 0;

  return (
    <div>
      <PageHeader
        title={shop.name}
        subtitle={[shop.phone, shop.address].filter(Boolean).join(' · ')}
        back={{ to: '/shops', label: 'All shops' }}
      />
      <ErrorNote>{error}</ErrorNote>

      <div className="kpis">
        <div className={`kpi ${owes ? 'kpi-warn kpi-bad' : ''}`}>
          <div className="kpi-value num">{inr(shop.outstandingBalance)}</div>
          <div className="kpi-label">{owes ? 'Owes you' : 'Nothing due'}</div>
        </div>
        {shop.creditLimit != null && (
          <div className="kpi">
            <div className="kpi-value num">{inr(shop.creditLimit, 0)}</div>
            <div className="kpi-label">Credit limit</div>
          </div>
        )}
      </div>

      <form className="card" onSubmit={handlePayment} style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Collect a payment</h3>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <Field label="Amount received (₹)">
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required style={{ width: 170, marginBottom: 0 }} />
          </Field>
          <Field label="Note (optional)" className="grow">
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cash, UPI reference…" style={{ marginBottom: 0 }} />
          </Field>
          {owes && <button type="button" className="btn btn-quiet" onClick={() => setAmount(String(shop.outstandingBalance))}>Full balance</button>}
          <button className="btn btn-primary" disabled={saving || !amount}><Icon name="wallet" /> {saving ? 'Saving…' : 'Record payment'}</button>
        </div>
      </form>

      <div className="card card-flush">
        <div className="card-head" style={{ padding: '1.1rem 1.25rem 0', marginBottom: '0.75rem' }}><h3>Ledger</h3></div>
        {ledger === null ? <Loading /> : ledger.length === 0 ? (
          <EmptyState icon="receipt" title="No transactions yet">Sales and payments for this shop will be listed here.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>When</th><th>What</th><th className="right">Billed</th><th className="right">Received</th><th className="right">Balance</th><th>Note</th></tr></thead>
              <tbody>
                {ledger.map(l => (
                  <tr key={l.id}>
                    <td data-label="When">{fmtDateTime(l.entryDate)}</td>
                    <td data-label="What"><Badge tone={l.type === 'Sale' ? 'info' : 'good'}>{l.type === 'Sale' ? 'Sale' : 'Payment'}</Badge></td>
                    <td data-label="Billed" className="num right">{l.debit > 0 ? inr(l.debit) : ''}</td>
                    <td data-label="Received" className="num right">{l.credit > 0 ? inr(l.credit) : ''}</td>
                    <td data-label="Balance" className="num right strong">{inr(l.runningBalance)}</td>
                    <td data-label="Note" className="muted">{l.notes}</td>
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
