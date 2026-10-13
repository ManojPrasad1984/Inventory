import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  name: '', sku: '', description: '', category: '', unit: 'pcs',
  purchasePrice: 0, sellingPrice: 0, taxPercent: 0, stockQuantity: 0, lowStockThreshold: 5
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    try {
      setProducts(await api.getProducts(search));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [search]);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name, sku: p.sku || '', description: p.description || '', category: p.category || '',
      unit: p.unit, purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, taxPercent: p.taxPercent,
      stockQuantity: p.stockQuantity, lowStockThreshold: p.lowStockThreshold
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        taxPercent: Number(form.taxPercent),
        stockQuantity: Number(form.stockQuantity),
        lowStockThreshold: Number(form.lowStockThreshold),
      };
      if (editingId) {
        await api.updateProduct(editingId, payload);
      } else {
        await api.createProduct(payload);
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this product?')) return;
    try {
      await api.deleteProduct(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button onClick={startNew}>+ Add Product</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <input
        className="search-box"
        placeholder="Search by name or SKU…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Tax %</th><th>Stock</th><th></th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className={p.stockQuantity <= p.lowStockThreshold ? 'row-warn' : ''}>
              <td>{p.name}</td>
              <td>{p.sku}</td>
              <td>{p.category}</td>
              <td>₹{p.sellingPrice.toFixed(2)}</td>
              <td>{p.taxPercent}%</td>
              <td>{p.stockQuantity} {p.unit}</td>
              <td>
                <button onClick={() => startEdit(p)}>Edit</button>
                <button onClick={() => handleDelete(p.id)} className="btn-danger">Delete</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan={7}>No products yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <label>Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} required />
            <label>SKU</label>
            <input value={form.sku} onChange={e => update('sku', e.target.value)} />
            <label>Category</label>
            <input value={form.category} onChange={e => update('category', e.target.value)} />
            <label>Unit (pcs, kg, ltr…)</label>
            <input value={form.unit} onChange={e => update('unit', e.target.value)} />
            <div className="form-row">
              <div>
                <label>Purchase Price</label>
                <input type="number" step="0.01" value={form.purchasePrice} onChange={e => update('purchasePrice', e.target.value)} />
              </div>
              <div>
                <label>Selling Price</label>
                <input type="number" step="0.01" value={form.sellingPrice} onChange={e => update('sellingPrice', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label>Tax %</label>
                <input type="number" step="0.01" value={form.taxPercent} onChange={e => update('taxPercent', e.target.value)} />
              </div>
              <div>
                <label>Stock Qty</label>
                <input type="number" value={form.stockQuantity} onChange={e => update('stockQuantity', e.target.value)} />
              </div>
              <div>
                <label>Low Stock Alert At</label>
                <input type="number" value={form.lowStockThreshold} onChange={e => update('lowStockThreshold', e.target.value)} />
              </div>
            </div>
            <label>Description</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} />
            <div className="modal-actions">
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit">{editingId ? 'Save Changes' : 'Add Product'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
