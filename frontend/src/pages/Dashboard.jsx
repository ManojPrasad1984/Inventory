import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { EmptyState, ErrorNote, Loading, PageHeader } from '../components/ui';
import { greeting, inr } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  function load() {
    setError('');
    api.getDashboardSummary().then(setSummary).catch(err => setError(err.message));
  }
  useEffect(load, []);

  if (error) return <ErrorNote onRetry={load}>{error}</ErrorNote>;
  if (!summary) return <Loading />;

  const firstName = (user.fullName || '').split(' ')[0];
  const maxRevenue = Math.max(1, ...summary.topProducts.map(p => p.revenue));
  const firstOpen = summary.openTrips[0];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
      />

      <section className="today">
        <div className="today-main">
          <div>
            <div className="today-label">Sold today</div>
            <div className="today-amount num">{inr(summary.todaySales, 0)}</div>
            <div className="today-sub">
              {summary.todaySaleCount} {summary.todaySaleCount === 1 ? 'invoice' : 'invoices'} today · {inr(summary.monthSales, 0)} this month
            </div>
          </div>
          <div className="today-actions">
            {firstOpen ? (
              <Link className="btn btn-accent btn-lg" to={`/trips/${firstOpen.id}`}>
                <Icon name="receipt" /> Sell from {firstOpen.vehicleNumber}
              </Link>
            ) : (
              <Link className="btn btn-accent btn-lg" to="/trips">
                <Icon name="truck" /> Start a trip to sell
              </Link>
            )}
            <Link className="btn btn-quiet btn-lg" to="/sales">View all sales</Link>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Vehicles out now</h3>
            <Link to="/trips" className="muted">All trips</Link>
          </div>
          {summary.openTrips.length === 0 ? (
            <p className="muted">No vehicle is on a round. Start a trip, load stock, then sell.</p>
          ) : (
            <div className="out-list">
              {summary.openTrips.map(t => (
                <Link key={t.id} to={`/trips/${t.id}`} className="out-item">
                  <span className="badge-ico"><Icon name="truck" /></span>
                  <span className="grow">
                    <span className="cell-title">{t.vehicleNumber}</span>
                    <span className="cell-sub" style={{ display: 'block' }}>{t.tripNumber}</span>
                  </span>
                  <span className="btn btn-primary btn-sm">Sell</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="kpis">
        <Link to="/shops" className={`kpi ${summary.totalOutstanding > 0 ? 'kpi-warn kpi-bad' : ''}`}>
          <div className="kpi-value num">{inr(summary.totalOutstanding, 0)}</div>
          <div className="kpi-label">Shops owe you</div>
        </Link>
        <Link to="/products" className={`kpi ${summary.lowStockCount > 0 ? 'kpi-warn' : ''}`}>
          <div className="kpi-value num">{summary.lowStockCount}</div>
          <div className="kpi-label">Products low in godown</div>
        </Link>
        <Link to="/purchases" className="kpi">
          <div className="kpi-value num">{inr(summary.todayPurchases, 0)}</div>
          <div className="kpi-label">Bought today</div>
        </Link>
        <div className="kpi">
          <div className="kpi-value num">{summary.totalProducts} · {summary.totalShops}</div>
          <div className="kpi-label">Products · Shops</div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>Best sellers this month</h3>
        </div>
        {summary.topProducts.length === 0 ? (
          <EmptyState icon="receipt" title="No sales this month yet">
            Your best sellers will show up here after the first sale.
          </EmptyState>
        ) : (
          <div className="bars">
            {summary.topProducts.map(p => (
              <div key={p.productName}>
                <div className="bar-row-top">
                  <span>{p.productName}</span>
                  <span className="num">{inr(p.revenue, 0)} <span className="muted">· {p.totalQtyUnits} units</span></span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(p.revenue / maxRevenue) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
