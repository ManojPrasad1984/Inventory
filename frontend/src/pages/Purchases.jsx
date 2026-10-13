import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('AdvanceFull');
  const [amountPaid, setAmountPaid] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantityCases: 1, unitCostPerCase: 0 }]);

  function load() {
    api.getPurchases().then(setPurchases).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api.getSuppliers().then(setSuppliers).catch(() => {});
    api.getProducts().then(setProducts).catch(() => {});
  }, []);

  function addLine() {
    setLines(l => [...l, { productId: '', quantityCases: 1, unitCostPerCase: 0 }]);
  }

  function updateLine(idx, field, value) {
    setLines(l => l.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      if (field === 'productId') {
        const product = products.find(p => p.id === Number(value));
        if (product) updated.unitCostPerCase = product.purchasePricePerCase;
      }
      return updated;
    }));
  }

  function removeLine(idx) {
    setLines(l => l.filter((_, i) => i !== idx));
  }

  const total = lines.reduce((sum, l) => sum + Number(l.quantityCases || 0) * Number(l.unitCostPerCase || 0), 0);

  function resetForm() {
    setSupplierId(''); setSupplierInvoiceNumber(''); setPaymentMode('AdvanceFull');
    setAmountPaid(''); setLines([{ productId: '', quantityCases: 1, unitCostPerCase: 0 }]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!supplierId) { setError('Select a supplier.'); return; }
    const validLines = lines.filter(l => l.productId && Number(l.quantityCases) > 0);
    if (validLines.length === 0) { setError('Add at least one product line.'); return; }

    try {
      const purchase = await api.createPurchase({
        supplierId: Number(supplierId),
        supplierInvoiceNumber: supplierInvoiceNumber || null,
        invoiceDate: new Date().toISOString(),
        items: validLines.map(l => ({
          productId: Number(l.productId),
          quantityCases: Number(l.quantityCases),
          unitCostPerCase: Number(l.unitCostPerCase)
        })),
        amountPaid: amountPaid === '' ? total : Number(amountPaid),
        paymentMode,
        notes: null
      });
      setSuccess(`Purchase ${purchase.purchaseNumber} recorded — godown stock updated.`);
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Purchases (Stock In)</h1>
        <button onClick={() => setShowForm(true)}>+ Record Purchase</button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      <table className="data-table">
        <thead>
          <tr><th>GRN #</th><th>Date</th><th>Supplier</th><th>Invoice #</th><th>Total</th><th>Paid</th><th>Mode</th></tr>
        </thead>
        <tbody>
          {purchases.map(p => (
            <tr key={p.id}>
              <td>{p.purchaseNumber}</td>
              <td>{new Date(p.invoiceDate).toLocaleDateString()}</td>
              <td>{p.supplier?.name}</td>
              <td>{p.supplierInvoiceNumber}</td>
              <td>₹{p.totalAmount.toFixed(2)}</td>
              <td>₹{p.amountPaid.toFixed(2)}</td>
              <td>{p.paymentMode}</td>
            </tr>
          ))}
          {purchases.length === 0 && <tr><td colSpan={7}>No purchases recorded yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>Record Purchase (Stock In)</h2>

            <div className="form-row">
              <div>
                <label>Supplier</label>
                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label>Supplier Invoice #</label>
                <input value={supplierInvoiceNumber} onChange={e => setSupplierInvoiceNumber(e.target.value)} />
              </div>
            </div>

            <label>Line Items</label>
            {lines.map((line, idx) => (
              <div className="form-row" key={idx}>
                <div style={{ flex: 2 }}>
                  <select value={line.productId} onChange={e => updateLine(idx, 'productId', e.target.value)}>
                    <option value="">Select product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unitsPerCase}/case)</option>)}
                  </select>
                </div>
                <div>
                  <input type="number" min="1" placeholder="Cases" value={line.quantityCases} onChange={e => updateLine(idx, 'quantityCases', e.target.value)} />
                </div>
                <div>
                  <input type="number" step="0.01" placeholder="₹/case" value={line.unitCostPerCase} onChange={e => updateLine(idx, 'unitCostPerCase', e.target.value)} />
                </div>
                <button type="button" className="btn-danger" onClick={() => removeLine(idx)}>✕</button>
              </div>
            ))}
            <button type="button" onClick={addLine}>+ Add Line</button>

            <div className="totals" style={{ marginTop: '1rem' }}>
              <div className="totals-final"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
            </div>

            <div className="form-row">
              <div>
                <label>Amount Paid (blank = full)</label>
                <input type="number" step="0.01" placeholder={total.toFixed(2)} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
              </div>
              <div>
                <label>Payment Mode</label>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                  <option value="Online">Online</option>
                  <option value="AdvanceFull">Advance (Full)</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit">Credit</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">Save Purchase</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
