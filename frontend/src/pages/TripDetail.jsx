import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { Badge, EmptyState, ErrorNote, Field, Loading, PageHeader, Segmented, statusTone, useUi } from '../components/ui';
import { casesLabel, fmtDateTime, inr } from '../utils/format';

const METHODS = ['Cash', 'UPI', 'Online', 'Cheque'];

export default function TripDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast, confirm } = useUi();

  const [data, setData] = useState(null); // { trip, sales, currentStock }
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(null);

  // sell
  const [shopId, setShopId] = useState('');
  const [cart, setCart] = useState([]); // { productId, qty }
  const [discount, setDiscount] = useState('');
  const [payMode, setPayMode] = useState('full'); // full | part | credit
  const [method, setMethod] = useState('Cash');
  const [partAmount, setPartAmount] = useState('');
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');

  // load
  const [loadLines, setLoadLines] = useState([{ productId: '', cases: '', units: '' }]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  // close
  const [counted, setCounted] = useState({});
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  function load() {
    return api.getTrip(id)
      .then(d => { setData(d); setError(''); return d; })
      .catch(err => setError(err.message));
  }

  useEffect(() => {
    setData(null);
    setTab(null);
    load().then(d => {
      if (!d) return;
      const open = d.trip.status === 'Open';
      setTab(!open ? 'invoices' : d.currentStock.length === 0 ? 'load' : 'sell');
    });
  }, [id]);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
    api.getShops().then(setShops).catch(() => {});
  }, []);

  // Hide the floating "View bill" bar while the bill itself is on screen.
  const [ticketVisible, setTicketVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById('bill-ticket');
    if (!el || !('IntersectionObserver' in window)) { setTicketVisible(false); return; }
    const io = new IntersectionObserver(([entry]) => setTicketVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [tab, data]);

  const productById = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);
  const shop = shops.find(s => s.id === Number(shopId));
  const noGodownStock = products.every(p => p.godownStockUnits <= 0);

  if (error && !data) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!data || !tab) return <Loading />;

  const { trip, sales, currentStock } = data;
  const isOpen = trip.status === 'Open';
  const stockByProduct = Object.fromEntries(currentStock.map(s => [s.productId, s.quantityUnits]));

  /* ---------------- Sell ---------------- */

  const cartLines = cart
    .map(c => {
      const p = productById[c.productId];
      if (!p) return null;
      const sub = p.sellingPricePerUnit * c.qty;
      const tax = sub * (p.taxPercent / 100);
      return { ...c, product: p, sub, tax, total: sub + tax, available: stockByProduct[c.productId] || 0 };
    })
    .filter(Boolean);

  const subTotal = cartLines.reduce((s, l) => s + l.sub, 0);
  const taxTotal = cartLines.reduce((s, l) => s + l.tax, 0);
  const discountValue = Number(discount || 0);
  const total = Math.round((subTotal + taxTotal - discountValue) * 100) / 100;

  const paid =
    payMode === 'credit' ? 0 :
    payMode === 'part' ? Math.min(Math.max(Number(partAmount || 0), 0), Math.max(total, 0)) :
    Math.max(total, 0);
  const owedNow = Math.max(total - paid, 0);
  const balanceAfter = (shop?.outstandingBalance || 0) + owedNow;
  const overLimit = shop?.creditLimit != null && balanceAfter > shop.creditLimit;

  let blocker = '';
  if (!shopId) blocker = 'Choose the shop you are billing.';
  else if (cartLines.length === 0) blocker = 'Tap products to add them to the bill.';
  else if (total < 0) blocker = 'The discount is larger than the bill.';
  else if (payMode === 'part' && !(Number(partAmount) > 0)) blocker = 'Enter the amount received, or choose On credit.';

  function addToCart(productId, units) {
    setSellError('');
    const available = stockByProduct[productId] || 0;
    setCart(prev => {
      const existing = prev.find(c => c.productId === productId);
      const next = Math.min((existing?.qty || 0) + units, available);
      if (next <= 0) return prev;
      return existing
        ? prev.map(c => (c.productId === productId ? { ...c, qty: next } : c))
        : [...prev, { productId, qty: next }];
    });
  }
  function setQty(productId, qty) {
    const available = stockByProduct[productId] || 0;
    setCart(prev => prev.map(c => (c.productId === productId ? { ...c, qty: Math.max(1, Math.min(qty, available)) } : c)));
  }
  function removeLine(productId) {
    setCart(prev => prev.filter(c => c.productId !== productId));
  }

  async function handleSale() {
    if (blocker || selling) return;
    setSelling(true);
    setSellError('');
    try {
      const sale = await api.createVehicleSale({
        tripId: Number(id),
        shopId: Number(shopId),
        items: cartLines.map(l => ({ productId: l.productId, quantityUnits: l.qty })),
        discountAmount: discountValue,
        amountPaid: paid,
        paymentMethod: payMode === 'credit' ? 'Credit' : method,
        notes: null,
      });
      toast(`${sale.invoiceNumber} saved for ${shop.name}.`, { action: { label: 'View invoice', to: `/sales/${sale.id}` } });
      setCart([]); setDiscount(''); setPartAmount(''); setPayMode('full'); setShopId('');
      await load();
      // shop balances changed
      api.getShops().then(setShops).catch(() => {});
    } catch (err) {
      setSellError(err.message);
    } finally {
      setSelling(false);
    }
  }

  /* ---------------- Load ---------------- */

  const updateLoadLine = (idx, field, value) =>
    setLoadLines(l => l.map((line, i) => (i === idx ? { ...line, [field]: value } : line)));

  const loadItems = loadLines
    .filter(l => l.productId)
    .map(l => {
      const p = productById[Number(l.productId)];
      const units = Number(l.cases || 0) * (p?.unitsPerCase || 1) + Number(l.units || 0);
      return { productId: Number(l.productId), quantityUnits: units, product: p };
    })
    .filter(i => i.quantityUnits > 0);
  const overLoaded = loadItems.find(i => i.quantityUnits > (i.product?.godownStockUnits || 0));

  async function handleLoad(e) {
    e.preventDefault();
    setLoadError('');
    if (loadItems.length === 0) { setLoadError('Choose a product and enter how many cases or units to load.'); return; }
    if (overLoaded) { setLoadError(`The godown only has ${casesLabel(overLoaded.product.godownStockUnits, overLoaded.product.unitsPerCase)} of ${overLoaded.product.name}.`); return; }
    setLoading(true);
    try {
      await api.loadTrip(id, loadItems.map(i => ({ productId: i.productId, quantityUnits: i.quantityUnits })));
      toast('Stock loaded onto the vehicle. You can start selling.');
      setLoadLines([{ productId: '', cases: '', units: '' }]);
      const [, fresh] = await Promise.all([load(), api.getProducts().then(setProducts)]);
      setTab('sell');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Close ---------------- */

  const countedFor = s => (counted[s.productId] !== undefined && counted[s.productId] !== '' ? Number(counted[s.productId]) : s.quantityUnits);

  async function handleClose() {
    setCloseError('');
    const bad = currentStock.find(s => countedFor(s) < 0 || countedFor(s) > s.quantityUnits);
    if (bad) { setCloseError(`Count for ${bad.productName} must be between 0 and ${bad.quantityUnits}.`); return; }
    const missing = currentStock.reduce((n, s) => n + (s.quantityUnits - countedFor(s)), 0);
    const ok = await confirm({
      title: 'Close this trip?',
      message: missing > 0
        ? `${missing} units will be recorded as missing or broken. The counted stock goes back to the godown. You cannot sell from this trip afterwards.`
        : 'All remaining stock goes back to the godown. You cannot sell from this trip afterwards.',
      confirmLabel: 'Close trip',
    });
    if (!ok) return;
    setClosing(true);
    try {
      await api.closeTrip(id, currentStock.map(s => ({ productId: s.productId, returnedQuantityUnits: countedFor(s) })));
      toast('Trip closed. Counted stock is back in the godown.');
      await load();
      setTab('invoices');
    } catch (err) {
      setCloseError(err.message);
    } finally {
      setClosing(false);
    }
  }

  /* ---------------- Summary ---------------- */

  const soldTotal = sales.reduce((s, x) => s + x.totalAmount, 0);
  const collected = sales.reduce((s, x) => s + x.amountPaid, 0);
  const onBoardUnits = currentStock.reduce((s, x) => s + x.quantityUnits, 0);

  return (
    <div>
      <PageHeader
        title={trip.vehicle?.vehicleNumber || trip.tripNumber}
        subtitle={`${trip.tripNumber} · started ${fmtDateTime(trip.tripDate)}`}
        back={{ to: '/trips', label: 'All trips' }}
      >
        <Badge tone={statusTone(trip.status)}>{isOpen ? 'Out on round' : 'Closed'}</Badge>
      </PageHeader>

      <ErrorNote>{error}</ErrorNote>

      <div className="trip-summary">
        <div className="item"><div className="v num">{inr(soldTotal, 0)}</div><div className="l">Billed on this trip</div></div>
        <div className="item"><div className="v num">{inr(collected, 0)}</div><div className="l">Collected</div></div>
        <div className="item"><div className="v num">{inr(soldTotal - collected, 0)}</div><div className="l">Given on credit</div></div>
        <div className="item"><div className="v num">{onBoardUnits}</div><div className="l">Units on the vehicle</div></div>
      </div>

      <div className="steps" role="tablist">
        <button className={`step ${tab === 'load' ? 'on' : ''} ${currentStock.length || !isOpen ? 'done' : ''}`} role="tab" aria-selected={tab === 'load'} onClick={() => setTab('load')} disabled={!isOpen}>
          <span className="step-n">1</span> Load vehicle
        </button>
        <button className={`step ${tab === 'sell' ? 'on' : ''} ${sales.length ? 'done' : ''}`} role="tab" aria-selected={tab === 'sell'} onClick={() => setTab('sell')} disabled={!isOpen}>
          <span className="step-n">2</span> Sell to shops
        </button>
        <button className={`step ${tab === 'close' ? 'on' : ''} ${!isOpen ? 'done' : ''}`} role="tab" aria-selected={tab === 'close'} onClick={() => setTab('close')} disabled={!isOpen}>
          <span className="step-n">3</span> Close trip
        </button>
        <button className={`step ${tab === 'invoices' ? 'on' : ''}`} role="tab" aria-selected={tab === 'invoices'} onClick={() => setTab('invoices')}>
          <span className="step-n"><Icon name="receipt" size={13} /></span> Invoices ({sales.length})
        </button>
      </div>

      {/* ---------------- SELL ---------------- */}
      {tab === 'sell' && isOpen && (
        currentStock.length === 0 ? (
          <div className="card">
            <EmptyState icon="truck" title="The vehicle is empty"
              action={<button className="btn btn-primary" onClick={() => setTab('load')}>Load stock</button>}>
              Load products from the godown onto this vehicle, then you can bill shops.
            </EmptyState>
          </div>
        ) : (
          <div className="pos">
            <div>
              <div className="card shop-pick">
                <Field label="Who are you billing?" className="" >
                  <select value={shopId} onChange={e => { setShopId(e.target.value); setSellError(''); }} style={{ marginBottom: 0 }}>
                    <option value="">Choose a shop…</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                {shops.length === 0 && (
                  <div className="note note-warn" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                    <Icon name="alert" size={18} />
                    <span>No shops yet. <Link to="/shops">Add a shop</Link> before billing.</span>
                  </div>
                )}
                {shop && (
                  <div className="shop-chip">
                    <Badge tone={shop.outstandingBalance > 0 ? 'warn' : 'good'}>
                      {shop.outstandingBalance > 0 ? `Owes ${inr(shop.outstandingBalance)}` : 'No balance due'}
                    </Badge>
                    {shop.creditLimit != null && <span className="muted">Credit limit {inr(shop.creditLimit, 0)}</span>}
                  </div>
                )}
              </div>

              <h3 style={{ margin: '1.25rem 0 0.75rem' }}>On the vehicle</h3>
              <div className="tiles">
                {currentStock.map(s => {
                  const p = productById[s.productId];
                  const perCase = p?.unitsPerCase || 1;
                  const inCart = cart.find(c => c.productId === s.productId);
                  const noPrice = !p || !(p.sellingPricePerUnit > 0);
                  return (
                    <div key={s.productId} className={`tile ${inCart ? 'in-cart' : ''}`}>
                      <div>
                        <div className="tile-name">{s.productName}</div>
                        <div className="tile-meta">{casesLabel(s.quantityUnits, perCase)} left</div>
                      </div>
                      {noPrice ? (
                        <div className="note note-warn" style={{ margin: 0, padding: '0.5rem 0.65rem', fontSize: '0.8rem' }}>
                          <span>No selling price. <Link to="/products">Set it in Products</Link></span>
                        </div>
                      ) : (
                        <div className="tile-price num">
                          {inr(p.sellingPricePerCase, 0)} <small>{perCase > 1 ? `per case of ${perCase}` : 'each'}</small>
                        </div>
                      )}
                      <div className="tile-actions">
                        {perCase > 1 && (
                          <button className="btn btn-primary" disabled={noPrice || (inCart?.qty || 0) + perCase > s.quantityUnits}
                            onClick={() => addToCart(s.productId, perCase)}>+ Case</button>
                        )}
                        <button className="btn btn-quiet" disabled={noPrice || (inCart?.qty || 0) >= s.quantityUnits}
                          onClick={() => addToCart(s.productId, 1)}>+ Unit</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* The ticket */}
            <aside className="ticket" id="bill-ticket" aria-label="Current bill">
              <div className="ticket-title">
                <h2>{shop ? shop.name : 'Current bill'}</h2>
                <span className="muted num">{cartLines.length} {cartLines.length === 1 ? 'item' : 'items'}</span>
              </div>

              {cartLines.length === 0 ? (
                <div className="ticket-empty">Tap + Case or + Unit on a product to start the bill.</div>
              ) : (
                <div>
                  {cartLines.map(l => (
                    <div className="line" key={l.productId}>
                      <div>
                        <div className="line-name">{l.product.name}</div>
                        <div className="line-sub">{casesLabel(l.qty, l.product.unitsPerCase)} × {inr(l.product.sellingPricePerUnit)}</div>
                      </div>
                      <div className="line-total num">{inr(l.total)}</div>
                      <div className="line-tools">
                        <div className="stepper">
                          <button type="button" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="One less"><Icon name="minus" size={14} /></button>
                          <input type="number" min="1" max={l.available} value={l.qty} aria-label={`Units of ${l.product.name}`}
                            onFocus={e => e.target.select()} onChange={e => setQty(l.productId, parseInt(e.target.value, 10) || 1)} />
                          <button type="button" onClick={() => setQty(l.productId, l.qty + 1)} aria-label="One more"><Icon name="plus" size={14} /></button>
                        </div>
                        {l.product.unitsPerCase > 1 && (
                          <>
                            <button type="button" className="linkish" onClick={() => setQty(l.productId, l.qty - l.product.unitsPerCase)}>− case</button>
                            <button type="button" className="linkish" onClick={() => setQty(l.productId, l.qty + l.product.unitsPerCase)}>+ case</button>
                          </>
                        )}
                        <button type="button" className="icon-btn remove" onClick={() => removeLine(l.productId)} aria-label={`Remove ${l.product.name}`}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <hr />
              <div className="sum"><span>Subtotal</span><span className="num">{inr(subTotal)}</span></div>
              {taxTotal > 0 && <div className="sum"><span>Tax</span><span className="num">{inr(taxTotal)}</span></div>}
              <div className="sum">
                <span>Discount</span>
                <input type="number" min="0" step="0.01" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} aria-label="Discount in rupees" />
              </div>
              <div className="sum-total"><span>Total</span><span className="amount num">{inr(Math.max(total, 0))}</span></div>
              <hr />

              <Segmented
                label="How is the shop paying?"
                value={payMode}
                onChange={setPayMode}
                options={[
                  { value: 'full', label: 'Paid now' },
                  { value: 'part', label: 'Part paid' },
                  { value: 'credit', label: 'On credit' },
                ]}
              />
              <div style={{ height: '0.75rem' }} />

              {payMode !== 'credit' && (
                <div className={payMode === 'part' ? 'grid-2' : ''}>
                  {payMode === 'part' && (
                    <Field label="Received now (₹)">
                      <input type="number" min="0" step="0.01" max={total} value={partAmount} onChange={e => setPartAmount(e.target.value)} />
                    </Field>
                  )}
                  <Field label="Payment method">
                    <select value={method} onChange={e => setMethod(e.target.value)}>
                      {METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              {shop && cartLines.length > 0 && (
                <div className={`balance-line ${owedNow > 0 ? 'owes' : ''}`}>
                  <span>{owedNow > 0 ? 'Goes on their balance' : 'Nothing goes on balance'}</span>
                  <span className="num">{inr(owedNow)}</span>
                </div>
              )}
              {overLimit && (
                <div className="note note-warn" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
                  <Icon name="alert" size={18} />
                  <span>This takes {shop.name} to {inr(balanceAfter, 0)}, over their {inr(shop.creditLimit, 0)} limit.</span>
                </div>
              )}

              <ErrorNote>{sellError}</ErrorNote>
              <button className="btn btn-accent btn-lg btn-block" style={{ marginTop: '0.9rem' }} onClick={handleSale} disabled={!!blocker || selling}>
                {selling ? 'Saving…' : `Save bill · ${inr(Math.max(total, 0))}`}
              </button>
              {blocker && <p className="muted" style={{ textAlign: 'center', fontSize: '0.84rem', marginTop: '0.5rem' }}>{blocker}</p>}
            </aside>

            {cartLines.length > 0 && !ticketVisible && (
              <button type="button" className="bill-bar"
                onClick={() => document.getElementById('bill-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                <span>{cartLines.length} {cartLines.length === 1 ? 'item' : 'items'}</span>
                <strong className="num">{inr(Math.max(total, 0))}</strong>
                <span>View bill</span>
              </button>
            )}
          </div>
        )
      )}

      {/* ---------------- LOAD ---------------- */}
      {tab === 'load' && isOpen && noGodownStock && (
        <div className="card">
          <EmptyState icon="inbox" title={products.length === 0 ? 'No products yet' : 'The godown is empty'}
            action={products.length === 0
              ? <Link className="btn btn-primary" to="/products">Add products</Link>
              : <Link className="btn btn-primary" to="/purchases">Record a purchase</Link>}>
            {products.length === 0
              ? 'Add the products you sell first, then record a purchase to bring stock into the godown.'
              : 'Stock reaches the godown through a purchase from your supplier. Record one, then come back to load the vehicle.'}
          </EmptyState>
        </div>
      )}
      {tab === 'load' && isOpen && !noGodownStock && (
        <form className="card" onSubmit={handleLoad}>
          <div className="card-head">
            <div>
              <h3>Load stock onto {trip.vehicle?.vehicleNumber}</h3>
              <p className="muted">Moves stock out of the godown. You can load more any time during the trip.</p>
            </div>
          </div>
          <ErrorNote>{loadError}</ErrorNote>

          {loadLines.map((line, idx) => {
            const p = productById[Number(line.productId)];
            return (
              <div className="row" key={idx} style={{ alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                <Field label={idx === 0 ? 'Product' : 'Another product'} className="grow" >
                  <select value={line.productId} onChange={e => updateLoadLine(idx, 'productId', e.target.value)} style={{ marginBottom: 0 }}>
                    <option value="">Choose a product…</option>
                    {products.map(pr => (
                      <option key={pr.id} value={pr.id} disabled={pr.godownStockUnits <= 0}>
                        {pr.name} — {pr.godownStockUnits > 0 ? `${casesLabel(pr.godownStockUnits, pr.unitsPerCase)} in godown` : 'out of stock'}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cases" className="" >
                  <input type="number" min="0" style={{ width: 90, marginBottom: 0 }} value={line.cases} onChange={e => updateLoadLine(idx, 'cases', e.target.value)} />
                </Field>
                {(p?.unitsPerCase || 1) > 1 && (
                  <Field label="Loose units">
                    <input type="number" min="0" style={{ width: 100, marginBottom: 0 }} value={line.units} onChange={e => updateLoadLine(idx, 'units', e.target.value)} />
                  </Field>
                )}
                {loadLines.length > 1 && (
                  <button type="button" className="icon-btn" onClick={() => setLoadLines(l => l.filter((_, i) => i !== idx))} aria-label="Remove line" style={{ marginBottom: 4 }}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            );
          })}

          <div className="row" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-quiet" onClick={() => setLoadLines(l => [...l, { productId: '', cases: '', units: '' }])}>
              <Icon name="plus" /> Add another product
            </button>
            <span className="grow" />
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Loading…' : 'Load onto vehicle'}</button>
          </div>

          {trip.loadItems?.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Already loaded on this trip</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Product</th><th>Quantity</th><th>When</th></tr></thead>
                  <tbody>
                    {trip.loadItems.map(i => (
                      <tr key={i.id}>
                        <td className="cell-title">{i.productName}</td>
                        <td>{casesLabel(i.quantityUnits, productById[i.productId]?.unitsPerCase)}</td>
                        <td className="muted">{fmtDateTime(i.loadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ---------------- CLOSE ---------------- */}
      {tab === 'close' && isOpen && (
        <div className="card">
          <h3>Count what came back</h3>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Enter what is physically on the vehicle. Anything short is recorded as missing or broken. Counted stock returns to the godown.
          </p>
          {user.role !== 'Owner' && (
            <div className="note note-warn"><Icon name="alert" size={18} /><span>Only the owner account can close a trip.</span></div>
          )}
          <ErrorNote>{closeError}</ErrorNote>

          {currentStock.length === 0 ? (
            <p className="muted" style={{ marginBottom: '1rem' }}>Nothing is left on the vehicle. You can close the trip.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Product</th><th className="right">Expected</th><th className="right">Counted</th><th className="right">Difference</th></tr></thead>
                <tbody>
                  {currentStock.map(s => {
                    const diff = s.quantityUnits - countedFor(s);
                    const perCase = productById[s.productId]?.unitsPerCase;
                    return (
                      <tr key={s.productId} className={diff !== 0 ? 'row-warn' : ''}>
                        <td className="cell-title">{s.productName}</td>
                        <td className="num right">{s.quantityUnits}<div className="cell-sub">{casesLabel(s.quantityUnits, perCase)}</div></td>
                        <td className="right">
                          <input type="number" min="0" max={s.quantityUnits} style={{ width: 90, marginBottom: 0, textAlign: 'right' }}
                            value={counted[s.productId] ?? s.quantityUnits}
                            onFocus={e => e.target.select()}
                            onChange={e => setCounted(c => ({ ...c, [s.productId]: e.target.value }))} />
                        </td>
                        <td className="num right">{diff === 0 ? <span className="muted">Matches</span> : <Badge tone="warn">{diff} short</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleClose} disabled={closing || user.role !== 'Owner'}>
              {closing ? 'Closing…' : 'Close trip and return stock'}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- INVOICES ---------------- */}
      {tab === 'invoices' && (
        <div className="stack">
          <div className="card card-flush">
            {sales.length === 0 ? (
              <EmptyState icon="receipt" title="No invoices on this trip yet"
                action={isOpen && <button className="btn btn-primary" onClick={() => setTab(currentStock.length ? 'sell' : 'load')}>
                  {currentStock.length ? 'Start selling' : 'Load stock'}</button>}>
                Bills you save from the Sell step appear here.
              </EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="table responsive">
                  <thead><tr><th>Invoice</th><th>Shop</th><th className="right">Total</th><th>Payment</th></tr></thead>
                  <tbody>
                    {sales.map(s => (
                      <tr key={s.id}>
                        <td data-label="Invoice"><Link className="cell-title" to={`/sales/${s.id}`}>{s.invoiceNumber}</Link></td>
                        <td data-label="Shop">{s.shop?.name}</td>
                        <td data-label="Total" className="num right strong">{inr(s.totalAmount)}</td>
                        <td data-label="Payment">
                          <Badge tone={statusTone(s.paymentStatus)}>
                            {s.paymentStatus === 'Unpaid' ? 'On credit' : s.paymentStatus === 'Partial' ? 'Part paid' : 'Paid'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!isOpen && trip.returnItems?.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '0.75rem' }}>Stock count at close</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Product</th><th className="right">Expected</th><th className="right">Returned</th><th className="right">Difference</th></tr></thead>
                  <tbody>
                    {trip.returnItems.map(r => (
                      <tr key={r.id} className={r.varianceUnits !== 0 ? 'row-warn' : ''}>
                        <td className="cell-title">{r.productName}</td>
                        <td className="num right">{r.expectedQuantityUnits}</td>
                        <td className="num right">{r.returnedQuantityUnits}</td>
                        <td className="num right">{r.varianceUnits === 0 ? <span className="muted">Matches</span> : <Badge tone="warn">{r.varianceUnits} short</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
