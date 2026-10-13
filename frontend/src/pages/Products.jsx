import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = {
  name: '', sku: '', brandCategory: '', packSize: '', unitsPerCase: 24,
  mrpPerUnit: 0, purchasePricePerCase: 0, sellingPricePerCase: 0, taxPercent: 0,
  godownStockUnits: 0, lowStockThresholdUnits: 24
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    try {
      setProducts(await api.getProducts(search, false, categoryFilter));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [search, categoryFilter]);
  useEffect(() => { api.getProductCategories().then(setCategories).catch(() => {}); }, []);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name, sku: p.sku || '', brandCategory: p.brandCategory || '', packSize: p.packSize || '',
      unitsPerCase: p.unitsPerCase, mrpPerUnit: p.mrpPerUnit, purchasePricePerCase: p.purchasePricePerCase,
      sellingPricePerCase: p.sellingPricePerCase, taxPercent: p.taxPercent,
      godownStockUnits: p.godownStockUnits, lowStockThresholdUnits: p.lowStockThresholdUnits
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
        unitsPerCase: Number(form.unitsPerCase),
        mrpPerUnit: Number(form.mrpPerUnit),
        purchasePricePerCase: Number(form.purchasePricePerCase),
        sellingPricePerCase: Number(form.sellingPricePerCase),
        taxPercent: Number(form.taxPercent),
        godownStockUnits: Number(form.godownStockUnits),
        lowStockThresholdUnits: Number(form.lowStockThresholdUnits),
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

  const casesInStock = (p) => (p.unitsPerCase > 0 ? (p.godownStockUnits / p.unitsPerCase).toFixed(1) : p.godownStockUnits);

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button onClick={startNew}>+ Add Product</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-row">
        <input className="search-box" placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ maxWidth: 220 }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Category</th><th>Pack</th><th>Units/Case</th>
            <th>Case Price (sell)</th><th>MRP/Unit</th><th>Godown Stock</th><th></th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className={p.godownStockUnits <= p.lowStockThresholdUnits ? 'row-warn' : ''}>
              <td>{p.name}</td>
              <td>{p.brandCategory}</td>
              <td>{p.packSize}</td>
              <td>{p.unitsPerCase}</td>
              <td>₹{p.sellingPricePerCase.toFixed(2)}</td>
              <td>₹{p.mrpPerUnit.toFixed(2)}</td>
              <td>{p.godownStockUnits} units ({casesInStock(p)} cases)</td>
              <td>
                <button onClick={() => startEdit(p)}>Edit</button>
                <button onClick={() => handleDelete(p.id)} className="btn-danger">Delete</button>
              </td>
            </tr>
          ))}
          {products.length === 0 && <tr><td colSpan={8}>No products yet.</td></tr>}
        </tbody>
      </table>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <form className="modal-card" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <label>Name</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. 250 ml CSD Cock Zero" required />
            <div className="form-row">
              <div>
                <label>Brand Category</label>
                <input value={form.brandCategory} onChange={e => update('brandCategory', e.target.value)} placeholder="SODA, CSD PET, CAN…" />
              </div>
              <div>
                <label>Pack Size</label>
                <input value={form.packSize} onChange={e => update('packSize', e.target.value)} placeholder="250 ml" />
              </div>
            </div>
            <label>SKU</label>
            <input value={form.sku} onChange={e => update('sku', e.target.value)} />

            <div className="form-row">
              <div>
                <label>Units per Case</label>
                <input type="number" min="1" value={form.unitsPerCase} onChange={e => update('unitsPerCase', e.target.value)} required />
              </div>
              <div>
                <label>MRP per Unit (₹)</label>
                <input type="number" step="0.01" value={form.mrpPerUnit} onChange={e => update('mrpPerUnit', e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Purchase Price / Case (₹)</label>
                <input type="number" step="0.01" value={form.purchasePricePerCase} onChange={e => update('purchasePricePerCase', e.target.value)} />
              </div>
              <div>
                <label>Selling Price / Case (₹)</label>
                <input type="number" step="0.01" value={form.sellingPricePerCase} onChange={e => update('sellingPricePerCase', e.target.value)} required />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label>Tax %</label>
                <input type="number" step="0.01" value={form.taxPercent} onChange={e => update('taxPercent', e.target.value)} />
              </div>
              <div>
                <label>Godown Stock (units)</label>
                <input type="number" value={form.godownStockUnits} onChange={e => update('godownStockUnits', e.target.value)} />
              </div>
              <div>
                <label>Low Stock Alert At (units)</label>
                <input type="number" value={form.lowStockThresholdUnits} onChange={e => update('lowStockThresholdUnits', e.target.value)} />
              </div>
            </div>

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
