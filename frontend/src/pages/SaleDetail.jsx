import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { Badge, ErrorNote, Field, Loading, PageHeader, statusTone, useUi } from '../components/ui';
import { fmtDateTime, inr } from '../utils/format';

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast, confirm } = useUi();
  const [sale, setSale] = useState(null);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setError('');
    api.getVehicleSale(id).then(setSale).catch(err => setError(err.message));
  }
  useEffect(load, [id]);

  async function recordPayment(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.recordSalePayment(id, Number(amount));
      toast(`Payment of ${inr(Number(amount))} recorded.`);
      setAmount('');
      load();
    } catch (err) {
      toast(err.message, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function cancelSale() {
    const ok = await confirm({
      title: 'Cancel this invoice?',
      message: 'The stock goes back on the vehicle and the shop balance is reduced. This cannot be undone.',
      confirmLabel: 'Cancel invoice',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.cancelVehicleSale(id);
      toast('Invoice cancelled and stock returned to the vehicle.');
      navigate('/sales');
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  if (error && !sale) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!sale) return <Loading />;

  const balanceDue = sale.totalAmount - sale.amountPaid;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="no-print">
        <PageHeader title={sale.invoiceNumber} back={{ to: '/sales', label: 'All sales' }}>
          <button className="btn btn-quiet" onClick={() => window.print()}><Icon name="printer" /> Print</button>
          {user.role === 'Owner' && (
            <button className="btn btn-ghost-danger" onClick={cancelSale}>Cancel invoice</button>
          )}
        </PageHeader>
      </div>

      <div className="invoice">
        <div className="invoice-head">
          <div>
            <h1>Invoice</h1>
            <div className="muted">{sale.invoiceNumber}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="cell-title">{user.shopName || 'My Distribution'}</div>
            <div className="muted">{fmtDateTime(sale.saleDate)}</div>
          </div>
        </div>

        <div className="invoice-meta">
          <div><div className="l">Billed to</div><div className="v">{sale.shop?.name}</div>{sale.shop?.phone && <div className="muted">{sale.shop.phone}</div>}</div>
          <div><div className="l">Vehicle</div><div className="v">{sale.vehicle?.vehicleNumber}</div></div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th className="right">Units</th><th className="right">Rate</th><th className="right">Tax</th><th className="right">Amount</th></tr></thead>
            <tbody>
              {sale.items.map(item => (
                <tr key={item.id}>
                  <td className="cell-title">{item.productName}</td>
                  <td className="num right">{item.quantityUnits}</td>
                  <td className="num right">{inr(item.unitPrice)}</td>
                  <td className="num right">{item.taxPercent}%</td>
                  <td className="num right strong">{inr(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="invoice-totals">
          <div className="sum"><span>Subtotal</span><span className="num">{inr(sale.subTotal)}</span></div>
          <div className="sum"><span>Tax</span><span className="num">{inr(sale.taxAmount)}</span></div>
          {sale.discountAmount > 0 && <div className="sum"><span>Discount</span><span className="num">− {inr(sale.discountAmount)}</span></div>}
          <div className="sum-total"><span>Total</span><span className="amount num">{inr(sale.totalAmount)}</span></div>
          <div className="sum"><span>Paid ({sale.paymentMethod})</span><span className="num">{inr(sale.amountPaid)}</span></div>
          <div className={`balance-line ${balanceDue > 0 ? 'owes' : ''}`}>
            <span>Balance due</span><span className="num">{inr(balanceDue)}</span>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <Badge tone={statusTone(sale.paymentStatus)}>
              {sale.paymentStatus === 'Unpaid' ? 'On credit' : sale.paymentStatus === 'Partial' ? 'Part paid' : 'Paid in full'}
            </Badge>
          </div>
        </div>
      </div>

      {balanceDue > 0 && (
        <form className="card no-print" onSubmit={recordPayment} style={{ marginTop: '1.25rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Collect payment</h3>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <Field label={`Amount (up to ${inr(balanceDue)})`} className="grow">
              <input type="number" step="0.01" min="0.01" max={balanceDue} value={amount} onChange={e => setAmount(e.target.value)} required style={{ marginBottom: 0 }} />
            </Field>
            <button type="button" className="btn btn-quiet" onClick={() => setAmount(balanceDue.toFixed(2))}>Full balance</button>
            <button className="btn btn-primary" disabled={saving || !amount}>{saving ? 'Saving…' : 'Record payment'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
