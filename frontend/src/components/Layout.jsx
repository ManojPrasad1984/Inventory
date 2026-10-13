import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import { initials } from '../utils/format';

const GROUPS = [
  { title: null, items: [{ to: '/', label: 'Dashboard', icon: 'home', end: true }] },
  {
    title: 'Selling',
    items: [
      { to: '/trips', label: 'Trips', icon: 'truck' },
      { to: '/sales', label: 'Sales', icon: 'receipt' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { to: '/products', label: 'Products', icon: 'box' },
      { to: '/purchases', label: 'Purchases', icon: 'inbox' },
    ],
  },
  {
    title: 'People & vehicles',
    items: [
      { to: '/shops', label: 'Shops', icon: 'store' },
      { to: '/vehicles', label: 'Vehicles', icon: 'truck' },
      { to: '/suppliers', label: 'Suppliers', icon: 'factory' },
    ],
  },
];

const TABS = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/trips', label: 'Trips', icon: 'truck' },
  { to: '/sales', label: 'Sales', icon: 'receipt' },
  { to: '/shops', label: 'Shops', icon: 'store' },
];

// Crown-cap mark: scalloped disc (the thing on top of every bottle this business sells).
function Mark() {
  const teeth = 12;
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? 15 : 12.6;
    const a = (Math.PI * 2 * i) / (teeth * 2);
    pts.push(`${(16 + r * Math.sin(a)).toFixed(2)},${(16 - r * Math.cos(a)).toFixed(2)}`);
  }
  return (
    <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
      <polygon points={pts.join(' ')} fill="#e3a72f" />
      <circle cx="16" cy="16" r="8.5" fill="#0d2b22" />
      <path d="M12.5 16.5l2.5 2.5 4.5-5" fill="none" stroke="#e3a72f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => setDrawer(false), [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const nav = (
    <>
      <div className="brand">
        <Mark />
        <div>
          <div className="brand-name">{user.shopName || 'My Distribution'}</div>
          <div className="brand-sub">Inventory & billing</div>
        </div>
      </div>
      <nav className="nav" aria-label="Main">
        {GROUPS.map((g, i) => (
          <div className="nav-group" key={i}>
            {g.title && <div className="nav-title">{g.title}</div>}
            {g.items.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="nav-user">
        <div className="avatar">{initials(user.fullName)}</div>
        <div className="nav-user-text">
          <div className="nav-user-name">{user.fullName}</div>
          <div className="nav-user-role">{user.role}</div>
        </div>
        <button className="icon-btn on-dark" onClick={handleLogout} aria-label="Sign out" title="Sign out">
          <Icon name="logout" />
        </button>
      </div>
    </>
  );

  return (
    <div className="shell">
      <aside className="sidebar">{nav}</aside>

      <div className="mobile-top">
        <button className="icon-btn on-dark" onClick={() => setDrawer(true)} aria-label="Open menu"><Icon name="menu" size={22} /></button>
        <div className="mobile-brand"><Mark /> <span>{user.shopName || 'My Distribution'}</span></div>
      </div>

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <aside className="sidebar sidebar-drawer" onClick={e => e.stopPropagation()}>{nav}</aside>
        </div>
      )}

      <main className="main">
        <div className="main-inner">{children}</div>
      </main>

      <nav className="tabbar" aria-label="Quick">
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} end={t.end} className="tab">
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </NavLink>
        ))}
        <button className="tab" onClick={() => setDrawer(true)}>
          <Icon name="more" size={22} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
