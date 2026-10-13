// Central API client. Set VITE_API_URL in a .env file (see .env.example) to point at your backend.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.title || data?.message || (typeof data === 'string' ? data : message);
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload, auth: false }),

  // Products
  getProducts: (search = '', lowStockOnly = false, brandCategory = '') =>
    request(`/api/products?search=${encodeURIComponent(search)}&lowStockOnly=${lowStockOnly}&brandCategory=${encodeURIComponent(brandCategory)}`),
  getProductCategories: () => request('/api/products/categories'),
  getProduct: (id) => request(`/api/products/${id}`),
  createProduct: (payload) => request('/api/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: 'PUT', body: payload }),
  adjustStock: (id, deltaUnits, reason) => request(`/api/products/${id}/adjust-stock`, { method: 'POST', body: { deltaUnits, reason } }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: (search = '') => request(`/api/suppliers?search=${encodeURIComponent(search)}`),
  createSupplier: (payload) => request('/api/suppliers', { method: 'POST', body: payload }),
  updateSupplier: (id, payload) => request(`/api/suppliers/${id}`, { method: 'PUT', body: payload }),
  deleteSupplier: (id) => request(`/api/suppliers/${id}`, { method: 'DELETE' }),

  // Purchases (GRN - stock in from supplier)
  getPurchases: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/purchases${qs ? `?${qs}` : ''}`);
  },
  getPurchase: (id) => request(`/api/purchases/${id}`),
  createPurchase: (payload) => request('/api/purchases', { method: 'POST', body: payload }),
  deletePurchase: (id) => request(`/api/purchases/${id}`, { method: 'DELETE' }),

  // Vehicles
  getVehicles: (activeOnly = true) => request(`/api/vehicles?activeOnly=${activeOnly}`),
  getVehicle: (id) => request(`/api/vehicles/${id}`),
  getVehicleStock: (id) => request(`/api/vehicles/${id}/stock`),
  createVehicle: (payload) => request('/api/vehicles', { method: 'POST', body: payload }),
  updateVehicle: (id, payload) => request(`/api/vehicles/${id}`, { method: 'PUT', body: payload }),
  deleteVehicle: (id) => request(`/api/vehicles/${id}`, { method: 'DELETE' }),

  // Trips (Godown Out -> Vehicle Sales -> Close/reconcile)
  getTrips: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/trips${qs ? `?${qs}` : ''}`);
  },
  getTrip: (id) => request(`/api/trips/${id}`),
  createTrip: (payload) => request('/api/trips', { method: 'POST', body: payload }),
  loadTrip: (id, items) => request(`/api/trips/${id}/load`, { method: 'POST', body: { items } }),
  closeTrip: (id, returns) => request(`/api/trips/${id}/close`, { method: 'POST', body: { returns } }),

  // Shops (the distributor's customers - credit-ledger retailers)
  getShops: (search = '') => request(`/api/shops?search=${encodeURIComponent(search)}`),
  getShop: (id) => request(`/api/shops/${id}`),
  getShopLedger: (id) => request(`/api/shops/${id}/ledger`),
  getShopSales: (id) => request(`/api/shops/${id}/sales`),
  createShop: (payload) => request('/api/shops', { method: 'POST', body: payload }),
  updateShop: (id, payload) => request(`/api/shops/${id}`, { method: 'PUT', body: payload }),
  recordShopPayment: (id, amount, notes) => request(`/api/shops/${id}/payments`, { method: 'POST', body: { amount, notes } }),
  deleteShop: (id) => request(`/api/shops/${id}`, { method: 'DELETE' }),

  // Vehicle Sales (retail sale to a shop, made against an open trip)
  getVehicleSales: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/vehiclesales${qs ? `?${qs}` : ''}`);
  },
  getVehicleSale: (id) => request(`/api/vehiclesales/${id}`),
  createVehicleSale: (payload) => request('/api/vehiclesales', { method: 'POST', body: payload }),
  recordSalePayment: (id, amount) => request(`/api/vehiclesales/${id}/record-payment`, { method: 'POST', body: amount }),
  cancelVehicleSale: (id) => request(`/api/vehiclesales/${id}/cancel`, { method: 'POST' }),

  // Dashboard
  getDashboardSummary: () => request('/api/dashboard/summary'),
  getLowStock: () => request('/api/dashboard/low-stock'),
};
