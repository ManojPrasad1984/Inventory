import { useEffect, useState } from 'react';
import { api } from '../api';
import Icon from '../components/Icon';
import { Badge, EmptyState, ErrorNote, Field, Loading, Modal, PageHeader, SearchBox, useUi } from '../components/ui';
import { casesLabel, inr } from '../utils/format';

const emptyForm = {
  name: '', sku: '', brandCategory: '', packSize: '', unitsPerCase: 24,
  mrpPerUnit: 0, purchasePricePerCase: 0, sellingPricePerCase: 0, taxPercent: 0,
  godownStockUnits: 0, lowStockThresholdUnits: 24,
};

export default function Products() {
  const { toast, confirm } = useUi();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.getProducts(search, false, category)
      .then(p => { setProducts(p); setError(''); })
      .catch(err => { setError(err.message); setProducts([]); });
  }
  useEffect(load, [search, category]);
  useEffect(() => { api.getProductCategories().then(setCategories).catch(() => {}); }, [products?.length]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function startNew() { setForm(emptyForm); setFormError(''); setEditing('new'); }
  function startEdit(p) {
    setForm({
      name: p.name, sku: p.sku || '', brandCategory: p.brandCategory || '', packSize: p.packSize || '',
      unitsPerCase: p.unitsPerCase, mrpPerUnit: p.mrpPerUnit, purchasePricePerCase: p.purchasePricePerCase,
      sellingPricePerCase: p.sellingPricePerCase, taxPercent: p.taxPercent,
      godownStockUnits: p.godownStockUnits, lowStockThresholdUnits: p.lowStockThresholdUnits,
    });
    setFormError('');
    setEditing(p.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
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
      if (editing === 'new') await api.createProduct(payload);
      else await api.updateProduct(editing, payload);
      toast(editing === 'new' ? `${form.name} added.` : `${form.name} updated.`);
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    const ok = await confirm({
      title: `Remove ${p.name}?`,
      message: 'It will no longer appear in lists. Past invoices keep their history.',
      confirmLabel: 'Remove product',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteProduct(p.id);
      toast(`${p.name} removed.`);
      load();
    } catch (err) {
      toast(err.message, { type: 'error' });
    }
  }

  const perUnit = Number(form.unitsPerCase) > 0 ? Number(form.sellingPricePerCase) / Number(form.unitsPerCase) : 0;
  const margin = Number(form.sellingPricePerCase) - Number(form.purchasePricePerCase);

  return (
    <div>
      <PageHeader title="Products" subtitle="Your price list. Stock is counted in units and shown in cases.">
        <button className="btn btn-primary" onClick={startNew}><Icon name="plus" /> Add product</button>
      </PageHeader>
      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="toolbar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search by name or SKU" />
        <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card card-flush">
        {products === null ? <Loading /> : products.length === 0 ? (
          <EmptyState icon="box" title={search || category ? 'No products match' : 'No products yet'}
            action={!search && !category && <button className="btn btn-primary" onClick={startNew}>Add your first product</button>}>
            {search || category ? 'Try a different search or category.' : 'Add the drinks you sell, with their case size and prices.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr><th>Product</th><th>Category</th><th className="right">Units / case</th><th className="right">Sell price / case</th><th className="right">MRP / unit</th><th>In godown</th><th></th></tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const low = p.godownStockUnits <= p.lowStockThresholdUnits;
                  return (
                    <tr key={p.id} className={low ? 'row-warn' : ''}>
                      <td data-label="Product">
                        <div className="cell-title">{p.name}</div>
                        {(p.packSize || p.sku) && <div className="cell-sub">{[p.packSize, p.sku].filter(Boolean).join(' · ')}</div>}
                      </td>
                      <td data-label="Category">{p.brandCategory}</td>
                      <td data-label="Units / case" className="num right">{p.unitsPerCase}</td>
                      <td data-label="Sell price / case" className="num right">
                        {p.sellingPricePerCase > 0 ? inr(p.sellingPricePerCase) : <Badge tone="bad">No price</Badge>}
                      </td>
                      <td data-label="MRP / unit" className="num right">{inr(p.mrpPerUnit)}</td>
                      <td data-label="In godown">
                        {casesLabel(p.godownStockUnits, p.unitsPerCase)} {low && <Badge tone="warn">Low</Badge>}
                      </td>
                      <td className="actions">
                        <button className="btn btn-quiet btn-sm" onClick={() => startEdit(p)}>Edit</button>
                        <button className="btn btn-ghost-danger btn-sm" onClick={() => handleDelete(p)}>Remove</button>
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
        <Modal
          as="form"
          size="lg"
          title={editing === 'new' ? 'Add product' : 'Edit product'}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
          footer={
            <>
              <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing === 'new' ? 'Add product' : 'Save changes'}</button>
            </>
          }
        >
          <ErrorNote>{formError}</ErrorNote>
          <Field label="Product name">
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="250 ml CSD Cock Zero" required />
          </Field>
          <div className="grid-3">
            <Field label="Category"><input value={form.brandCategory} onChange={e => update('brandCategory', e.target.value)} placeholder="SODA, CSD PET, CAN" /></Field>
            <Field label="Pack size"><input value={form.packSize} onChange={e => update('packSize', e.target.value)} placeholder="250 ml" /></Field>
            <Field label="SKU (optional)"><input value={form.sku} onChange={e => update('sku', e.target.value)} /></Field>
          </div>
          <div className="grid-3">
            <Field label="Units in one case"><input type="number" min="1" value={form.unitsPerCase} onChange={e => update('unitsPerCase', e.target.value)} required /></Field>
            <Field label="Buying price per case (₹)"><input type="number" step="0.01" min="0" value={form.purchasePricePerCase} onChange={e => update('purchasePricePerCase', e.target.value)} /></Field>
            <Field label="Selling price per case (₹)" hint={perUnit > 0 ? `${inr(perUnit)} per unit · ${margin >= 0 ? 'earns' : 'loses'} ${inr(Math.abs(margin))} per case` : 'Shops are billed at this price.'}>
              <input type="number" step="0.01" min="0" value={form.sellingPricePerCase} onChange={e => update('sellingPricePerCase', e.target.value)} required />
            </Field>
          </div>
          <div className="grid-3">
            <Field label="MRP per unit (₹)"><input type="number" step="0.01" min="0" value={form.mrpPerUnit} onChange={e => update('mrpPerUnit', e.target.value)} /></Field>
            <Field label="Tax (%)"><input type="number" step="0.01" min="0" value={form.taxPercent} onChange={e => update('taxPercent', e.target.value)} /></Field>
            <Field label="Warn when godown has (units)"><input type="number" min="0" value={form.lowStockThresholdUnits} onChange={e => update('lowStockThresholdUnits', e.target.value)} /></Field>
          </div>
          <Field label="Godown stock now (units)" hint="Use Purchases to add stock. Edit this only to correct a count.">
            <input type="number" min="0" value={form.godownStockUnits} onChange={e => update('godownStockUnits', e.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
