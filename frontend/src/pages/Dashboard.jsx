import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboardSummary().then(setSummary).catch(err => setError(err.message));
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!summary) return <p>Loading…</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stat-grid">
        <StatCard label="Today's Sales" value={`₹${summary.todaySales.toFixed(2)}`} />
        <StatCard label="This Month" value={`₹${summary.monthSales.toFixed(2)}`} />
        <StatCard label="Sales Today" value={summary.todaySaleCount} />
        <StatCard label="Outstanding (Shops)" value={`₹${summary.totalOutstanding.toFixed(2)}`} warn={summary.totalOutstanding > 0} />
        <StatCard label="Low Stock Items" value={summary.lowStockCount} warn={summary.lowStockCount > 0} />
        <StatCard label="Open Trips" value={summary.openTripsCount} />
        <StatCard label="Today's Purchases" value={`₹${summary.todayPurchases.toFixed(2)}`} />
        <StatCard label="Total Products" value={summary.totalProducts} />
        <StatCard label="Total Shops" value={summary.totalShops} />
      </div>

      {summary.lowStockCount > 0 && (
        <div className="alert-banner">
          ⚠ {summary.lowStockCount} product(s) are low on godown stock. <Link to="/products">Review stock</Link>
        </div>
      )}

      {summary.openTripsCount > 0 && (
        <div className="alert-banner">
          🚚 {summary.openTripsCount} vehicle(s) currently out on a round: {summary.openTrips.map(t => t.vehicleNumber).join(', ')}.{' '}
          <Link to="/trips">View trips</Link>
        </div>
      )}

      <h2>Top Selling Products (This Month)</h2>
      <table className="data-table">
        <thead>
          <tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr>
        </thead>
        <tbody>
          {summary.topProducts.map((p, i) => (
            <tr key={i}>
              <td>{p.productName}</td>
              <td>{p.totalQtyUnits}</td>
              <td>₹{p.revenue.toFixed(2)}</td>
            </tr>
          ))}
          {summary.topProducts.length === 0 && (
            <tr><td colSpan={3}>No sales yet — start a trip and record your first sale.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, warn }) {
  return (
    <div className={`stat-card ${warn ? 'stat-card-warn' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
