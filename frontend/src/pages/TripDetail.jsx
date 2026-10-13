import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function TripDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null); // { trip, sales, currentStock }
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load stock form
  const [loadLines, setLoadLines] = useState([{ productId: '', cases: 1 }]);

  // Sale form
  const [shopId, setShopId] = useState('');
  const [cart, setCart] = useState([]); // { productId, name, unitPrice, taxPercent, qty, available }
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Close trip form
  const [returns, setReturns] = useState({}); // productId -> returned qty
  const [showClose, setShowClose] = useState(false);

  function load() {
    api.getTrip(id).then(setData).catch(err => setError(err.message));
  }

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
    api.getShops().then(setShops).catch(() => {});
  }, []);

  if (error && !data) return <div className="error-banner">{error}</div>;
  if (!data) return <p>Loading…</p>;

  const { trip, sales, currentStock } = data;
  const isOpen = trip.status === 'Open';

  // ---- Load stock ----
  function updateLoadLine(idx, field, value) {
    setLoadLines(l => l.map((line, i) => i === idx ? { ...line, [field]: value } : line));
  }
  function addLoadLine() { setLoadLines(l => [...l, { productId: '', cases: 1 }]); }
  function removeLoadLine(idx) { setLoadLines(l => l.filter((_, i) => i !== idx)); }

  async function handleLoad(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const items = loadLines
      .filter(l => l.productId && Number(l.cases) > 0)
      .map(l => {
        const product = products.find(p => p.id === Number(l.productId));
        return { productId: Number(l.productId), quantityUnits: Number(l.cases) * (product?.unitsPerCase || 1) };
      });
    if (items.length === 0) { setError('Add at least one product to load.'); return; }
    try {
      await api.loadTrip(id, items);
      setSuccess('Stock loaded onto vehicle.');
      setLoadLines([{ productId: '', cases: 1 }]);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---- Sale ----
  function addToCart(stockItem) {
    const product = products.find(p => p.id === stockItem.productId);
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.qty >= stockItem.quantityUnits) return prev;
        return prev.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, {
        productId: product.id, name: product.name, unitPrice: product.sellingPricePerUnit,
        taxPercent: product.taxPercent, qty: 1, available: stockItem.quantityUnits
      }];
    });
  }
  function updateCartQty(productId, qty) {
    setCart(prev => prev.map(c => c.productId === productId
      ? { ...c, qty: Math.max(1, Math.min(qty, c.available)) }
      : c));
  }
  function removeFromCart(productId) {
    setCart(prev => prev.filter(c => c.productId !== productId));
  }

  const subTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
  const taxTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty * (c.taxPercent / 100), 0);
  const total = subTotal + taxTotal - Number(discount || 0);

  async function handleSale() {
    setError(''); setSuccess('');
    if (!shopId) { setError('Select a shop.'); return; }
    if (cart.length === 0) { setError('Add at least one product.'); return; }
    try {
      const sale = await api.createVehicleSale({
        tripId: Number(id),
        shopId: Number(shopId),
        items: cart.map(c => ({ productId: c.productId, quantityUnits: c.qty })),
        discountAmount: Number(discount || 0),
        amountPaid: amountPaid === '' ? total : Number(amountPaid),
        paymentMethod,
        notes: null
      });
      setSuccess(`Sale ${sale.invoiceNumber} recorded.`);
      setCart([]); setDiscount(0); setAmountPaid(''); setShopId('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  // ---- Close trip ----
  function updateReturn(productId, value) {
    setReturns(r => ({ ...r, [productId]: value }));
  }

  async function handleClose(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const returnPayload = currentStock.map(s => ({
      productId: s.productId,
      returnedQuantityUnits: returns[s.productId] !== undefined ? Number(returns[s.productId]) : s.quantityUnits
    }));
    try {
      await api.closeTrip(id, returnPayload);
      setSuccess('Trip closed — unsold stock returned to godown.');
      setShowClose(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Trip {trip.tripNumber} — {trip.vehicle?.vehicleNumber}</h1>
        <span className={`badge badge-${isOpen ? 'partial' : 'paid'}`}>{trip.status}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {isOpen && (
        <div className="billing-cart" style={{ marginBottom: '1.5rem' }}>
          <h3>Godown Out — Load Stock onto Vehicle</h3>
          <form onSubmit={handleLoad}>
            {loadLines.map((line, idx) => (
              <div className="form-row" key={idx}>
                <div style={{ flex: 2 }}>
                  <select value={line.productId} onChange={e => updateLoadLine(idx, 'productId', e.target.value)}>
                    <option value="">Select product…</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (godown: {p.godownStockUnits} units)</option>)}
                  </select>
                </div>
                <div>
                  <input type="number" min="1" placeholder="Cases" value={line.cases} onChange={e => updateLoadLine(idx, 'cases', e.target.value)} />
                </div>
                <button type="button" className="btn-danger" onClick={() => removeLoadLine(idx)}>✕</button>
              </div>
            ))}
            <button type="button" onClick={addLoadLine}>+ Add Line</button>
            <button type="submit" style={{ marginLeft: '0.5rem' }}>Load Vehicle</button>
          </form>
        </div>
      )}

      <h3>Current Vehicle Stock</h3>
      <table className="data-table">
        <thead><tr><th>Product</th><th>Units on board</th>{isOpen && <th></th>}</tr></thead>
        <tbody>
          {currentStock.map(s => (
            <tr key={s.productId}>
              <td>{s.productName}</td>
              <td>{s.quantityUnits}</td>
              {isOpen && <td><button onClick={() => addToCart(s)}>Add to sale</button></td>}
            </tr>
          ))}
          {currentStock.length === 0 && <tr><td colSpan={isOpen ? 3 : 2}>No stock loaded on this vehicle yet.</td></tr>}
        </tbody>
      </table>

      {isOpen && (
        <div className="billing-cart" style={{ margin: '1.5rem 0' }}>
          <h3>Record a Sale (Retail Sale to Shop)</h3>
          <label>Shop</label>
          <select value={shopId} onChange={e => setShopId(e.target.value)}>
            <option value="">Select shop…</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <table className="cart-table">
            <thead><tr><th>Item</th><th>Qty</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {cart.map(c => (
                <tr key={c.productId}>
                  <td>{c.name}</td>
                  <td><input type="number" min={1} max={c.available} value={c.qty} className="qty-input" onChange={e => updateCartQty(c.productId, Number(e.target.value))} /></td>
                  <td>₹{(c.unitPrice * c.qty * (1 + c.taxPercent / 100)).toFixed(2)}</td>
                  <td><button className="btn-danger" onClick={() => removeFromCart(c.productId)}>✕</button></td>
                </tr>
              ))}
              {cart.length === 0 && <tr><td colSpan={4}>Use "Add to sale" above to build this invoice.</td></tr>}
            </tbody>
          </table>

          <div className="totals">
            <div><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
            <div><span>Tax</span><span>₹{taxTotal.toFixed(2)}</span></div>
            <div><span>Discount</span><input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="discount-input" /></div>
            <div className="totals-final"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>

          <label>Amount Paid (blank = full amount)</label>
          <input type="number" step="0.01" placeholder={total.toFixed(2)} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />

          <label>Payment Method</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option>Cash</option>
            <option>Online</option>
            <option>UPI</option>
            <option>Cheque</option>
            <option>Credit</option>
          </select>

          <button className="checkout-btn" onClick={handleSale}>Record Sale — ₹{total.toFixed(2)}</button>
        </div>
      )}

      <h3>Sales on this Trip</h3>
      <table className="data-table">
        <thead><tr><th>Invoice #</th><th>Shop</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {sales.map(s => (
            <tr key={s.id}>
              <td>{s.invoiceNumber}</td>
              <td>{s.shop?.name}</td>
              <td>₹{s.totalAmount.toFixed(2)}</td>
              <td><span className={`badge badge-${s.paymentStatus.toLowerCase()}`}>{s.paymentStatus}</span></td>
            </tr>
          ))}
          {sales.length === 0 && <tr><td colSpan={4}>No sales recorded yet.</td></tr>}
        </tbody>
      </table>

      {isOpen && (
        <div style={{ marginTop: '1.5rem' }}>
          {!showClose
            ? <button onClick={() => setShowClose(true)}>Close Trip (Return Unsold Stock)</button>
            : (
              <form className="billing-cart" onSubmit={handleClose}>
                <h3>Close Trip — Count Returned Stock</h3>
                <p>Enter what physically came back. Defaults to the full remaining balance on the vehicle.</p>
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Expected (on board)</th><th>Returned</th></tr></thead>
                  <tbody>
                    {currentStock.map(s => (
                      <tr key={s.productId}>
                        <td>{s.productName}</td>
                        <td>{s.quantityUnits}</td>
                        <td>
                          <input
                            type="number" min={0} max={s.quantityUnits} className="qty-input"
                            value={returns[s.productId] ?? s.quantityUnits}
                            onChange={e => updateReturn(s.productId, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowClose(false)}>Cancel</button>
                  <button type="submit">Confirm Close</button>
                </div>
              </form>
            )}
        </div>
      )}

      {!isOpen && (
        <div className="alert-banner">
          This trip is closed. See the Return items below for the reconciliation that happened at close-out.
        </div>
      )}
      {!isOpen && trip.returnItems?.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Product</th><th>Expected</th><th>Returned</th><th>Variance</th></tr></thead>
          <tbody>
            {trip.returnItems.map(r => (
              <tr key={r.id} className={r.varianceUnits !== 0 ? 'row-warn' : ''}>
                <td>{r.productName}</td>
                <td>{r.expectedQuantityUnits}</td>
                <td>{r.returnedQuantityUnits}</td>
                <td>{r.varianceUnits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p><Link to="/trips">← Back to Trips</Link></p>
    </div>
  );
}
