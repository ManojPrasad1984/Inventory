import { useEffect, useState } from 'react';
import { api } from '../api';
import Icon from '../components/Icon';
import { EmptyState, ErrorNote, Field, Loading, Modal, PageHeader, useUi } from '../components/ui';
import { fmtDate, inr } from '../utils/format';

const blankLine = () => ({ productId: '', quantityCases: 1, unitCostPerCase: 0 });

export default function Purchases() {
  const { toast } = useUi();
  const [purchases, setPurchases] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('AdvanceFull');
  const [amountPaid, setAmountPaid] = useState('');
  const [lines, setLines] = useState([blankLine()]);

  function load() {
    api.getPurchases().then(p => { setPurchases(p); setError(''); }).catch(err => { setError(err.message); setPurchases([]); });
  }
  useEffect(load, []);
  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  function updateLine(idx, field, value) {
    setLines(ls => ls.map((line, i) => {
      if (i !== idx) return line;
      const next = { ...line, [field]: value };
      if (field === 'productId') {
        const p = products.find(x => x.id === Number(value));
        if (p) next.unitCostPerCase = p.purchasePricePerCase;
      }
      return next;
    }));
  }

  const total = lines.reduce((s, l) => s + Number(l.quantityCases || 0) * Number(l.unitCostPerCase || 0), 0);

  function openForm() {
    setSupplierId(''); setInvoiceNo(''); setPaymentMode('AdvanceFull'); setAmountPaid(''); setLines([blankLine()]); setFormError('');
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const valid = lines.filter(l => l.productId && Number(l.quantityCases) > 0);
    if (!supplierId) { setFormError('Choose the supplier.'); return; }
    if (valid.length === 0) { setFormError('Add at least one product with cases received.'); return; }
    setSaving(true);
    try {
      const purchase = await api.createPurchase({
        supplierId: Number(supplierId),
        supplierInvoiceNumber: invoiceNo || null,
        invoiceDate: new Date().toISOString(),
        items: valid.map(l => ({ productId: Number(l.productId), quantityCases: Number(l.quantityCases), unitCostPerCase: Number(l.unitCostPerCase) })),
        amountPaid: amountPaid === '' ? total : Number(amountPaid),
        paymentMode,
        notes: null,
      });
      toast(`${purchase.purchaseNumber} saved. Godown stock is updated.`);
      setOpen(false);
      load();
      api.getProducts().then(setProducts).catch(() => {});
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Purchases" subtitle="Stock received from suppliers. Saving a purchase adds the cases to your godown.">
        <button className="btn btn-primary" onClick={openForm}><Icon name="plus" /> Record purchase</button>
      </PageHeader>
      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="card card-flush">
        {purchases === null ? <Loading /> : purchases.length === 0 ? (
          <EmptyState icon="inbox" title="No purchases yet" action={<button className="btn btn-primary" onClick={openForm}>Record your first purchase</button>}>
            When a delivery arrives from your supplier, record it here so the godown count stays right.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Receipt</th><th>Date</th><th>Supplier</th><th>Supplier invoice</th><th className="right">Total</th><th className="right">Paid</th><th>Mode</th></tr></thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td data-label="Receipt" className="cell-title">{p.purchaseNumber}</td>
                    <td data-label="Date">{fmtDate(p.invoiceDate)}</td>
                    <td data-label="Supplier">{p.supplier?.name}</td>
                    <td data-label="Supplier invoice">{p.supplierInvoiceNumber}</td>
                    <td data-label="Total" className="num right strong">{inr(p.totalAmount)}</td>
                    <td data-label="Paid" className="num right">{inr(p.amountPaid)}</td>
                    <td data-label="Mode">{p.paymentMode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal
          as="form" size="lg" title="Record purchase" onClose={() => setOpen(false)} onSubmit={handleSubmit}
          footer={
            <>
              <span className="grow strong num" style={{ alignSelf: 'center' }}>Total {inr(total)}</span>
              <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save purchase'}</button>
            </>
          }
        >
          <ErrorNote>{formError}</ErrorNote>
          {suppliers.length === 0 && (
            <div className="note note-warn"><Icon name="alert" size={18} /><span>No suppliers yet. Add one under Suppliers first.</span></div>
          )}
          <div className="grid-2">
            <Field label="Supplier">
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="">Choose a supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Supplier invoice number (optional)">
              <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
            </Field>
          </div>

          <div className="field-label" style={{ marginBottom: '0.4rem' }}>Products received</div>
          {lines.map((line, idx) => (
            <div className="row" key={idx} style={{ marginBottom: '0.6rem', flexWrap: 'nowrap' }}>
              <select style={{ flex: 3 }} value={line.productId} onChange={e => updateLine(idx, 'productId', e.target.value)} aria-label="Product">
                <option value="">Choose a product…</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unitsPerCase} per case)</option>)}
              </select>
              <input style={{ flex: 1, minWidth: 70 }} type="number" min="1" placeholder="Cases" aria-label="Cases" value={line.quantityCases} onChange={e => updateLine(idx, 'quantityCases', e.target.value)} />
              <input style={{ flex: 1.2, minWidth: 90 }} type="number" step="0.01" min="0" placeholder="₹ per case" aria-label="Cost per case" value={line.unitCostPerCase} onChange={e => updateLine(idx, 'unitCostPerCase', e.target.value)} />
              {lines.length > 1 && (
                <button type="button" className="icon-btn" aria-label="Remove line" onClick={() => setLines(ls => ls.filter((_, i) => i !== idx))}><Icon name="trash" size={16} /></button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setLines(ls => [...ls, blankLine()])}><Icon name="plus" size={14} /> Add product</button>

          <div className="grid-2" style={{ marginTop: '1.25rem' }}>
            <Field label="Amount paid (₹)" hint="Leave blank if paid in full.">
              <input type="number" step="0.01" min="0" placeholder={total.toFixed(2)} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            </Field>
            <Field label="Payment mode">
              <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                <option value="AdvanceFull">Advance, paid in full</option>
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
                <option value="Credit">Credit</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
