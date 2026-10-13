import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Billing() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState([]); // { productId, name, unitPrice, taxPercent, qty, availableStock }
  const [customerId, setCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getProducts(productSearch).then(setProducts).catch(err => setError(err.message));
  }, [productSearch]);

  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stockQuantity) return prev; // don't exceed stock
        return prev.map(c => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      if (product.stockQuantity <= 0) return prev;
      return [...prev, {
        productId: product.id, name: product.name, unitPrice: product.sellingPrice,
        taxPercent: product.taxPercent, qty: 1, availableStock: product.stockQuantity, unit: product.unit
      }];
    });
  }

  function updateQty(productId, qty) {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      const clamped = Math.max(1, Math.min(qty, c.availableStock));
      return { ...c, qty: clamped };
    }));
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(c => c.productId !== productId));
  }

  const subTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
  const taxTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.qty * (c.taxPercent / 100), 0);
  const total = subTotal + taxTotal - Number(discount || 0);

  async function handleCheckout() {
    setError('');
    setSuccess('');
    if (cart.length === 0) {
      setError('Add at least one product to the bill.');
      return;
    }
    try {
      const payload = {
        customerId: customerId ? Number(customerId) : null,
        walkInCustomerName: customerId ? null : (walkInName || 'Walk-in Customer'),
        items: cart.map(c => ({ productId: c.productId, quantity: c.qty })),
        discountAmount: Number(discount || 0),
        amountPaid: amountPaid === '' ? total : Number(amountPaid),
        paymentMethod,
        notes: null
      };
      const invoice = await api.createInvoice(payload);
      setSuccess(`Invoice ${invoice.invoiceNumber} created.`);
      setCart([]);
      setDiscount(0);
      setAmountPaid('');
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="billing-layout">
      <div className="billing-products">
        <h2>Products</h2>
        <input className="search-box" placeholder="Search products…" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
        <div className="product-grid">
          {products.map(p => (
            <button
              key={p.id}
              className={`product-tile ${p.stockQuantity <= 0 ? 'disabled' : ''}`}
              onClick={() => addToCart(p)}
              disabled={p.stockQuantity <= 0}
            >
              <div className="product-tile-name">{p.name}</div>
              <div className="product-tile-price">₹{p.sellingPrice.toFixed(2)}</div>
              <div className="product-tile-stock">{p.stockQuantity} {p.unit} left</div>
            </button>
          ))}
        </div>
      </div>

      <div className="billing-cart">
        <h2>Bill</h2>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <label>Customer</label>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">Walk-in Customer</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {!customerId && (
          <input placeholder="Walk-in customer name (optional)" value={walkInName} onChange={e => setWalkInName(e.target.value)} />
        )}

        <table className="cart-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {cart.map(c => (
              <tr key={c.productId}>
                <td>{c.name}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={c.availableStock}
                    value={c.qty}
                    onChange={e => updateQty(c.productId, Number(e.target.value))}
                    className="qty-input"
                  />
                </td>
                <td>₹{(c.unitPrice * c.qty * (1 + c.taxPercent / 100)).toFixed(2)}</td>
                <td><button className="btn-danger" onClick={() => removeFromCart(c.productId)}>✕</button></td>
              </tr>
            ))}
            {cart.length === 0 && <tr><td colSpan={4}>Tap a product to add it to the bill.</td></tr>}
          </tbody>
        </table>

        <div className="totals">
          <div><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
          <div><span>Tax</span><span>₹{taxTotal.toFixed(2)}</span></div>
          <div>
            <span>Discount</span>
            <input type="number" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="discount-input" />
          </div>
          <div className="totals-final"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
        </div>

        <label>Amount Paid (blank = full amount)</label>
        <input type="number" step="0.01" placeholder={total.toFixed(2)} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />

        <label>Payment Method</label>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
          <option>Cash</option>
          <option>Card</option>
          <option>UPI</option>
          <option>BankTransfer</option>
          <option>Credit</option>
        </select>

        <button className="checkout-btn" onClick={handleCheckout}>Complete Sale — ₹{total.toFixed(2)}</button>
      </div>
    </div>
  );
}
