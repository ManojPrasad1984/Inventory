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
        <StatCard label="Invoices Today" value={summary.todayInvoiceCount} />
        <StatCard label="Outstanding" value={`₹${summary.totalOutstanding.toFixed(2)}`} warn={summary.totalOutstanding > 0} />
        <StatCard label="Low Stock Items" value={summary.lowStockCount} warn={summary.lowStockCount > 0} />
        <StatCard label="Total Products" value={summary.totalProducts} />
        <StatCard label="Total Customers" value={summary.totalCustomers} />
      </div>

      {summary.lowStockCount > 0 && (
        <div className="alert-banner">
          ⚠ {summary.lowStockCount} product(s) are low on stock. <Link to="/products">Review stock</Link>
        </div>
      )}

      <h2>Top Selling Products</h2>
      <table className="data-table">
        <thead>
          <tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr>
        </thead>
        <tbody>
          {summary.topProducts.map((p, i) => (
            <tr key={i}>
              <td>{p.productName}</td>
              <td>{p.totalQty}</td>
              <td>₹{p.revenue.toFixed(2)}</td>
            </tr>
          ))}
          {summary.topProducts.length === 0 && (
            <tr><td colSpan={3}>No sales yet — create your first invoice.</td></tr>
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
