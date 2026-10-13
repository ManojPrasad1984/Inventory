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
  getProducts: (search = '', lowStockOnly = false) =>
    request(`/api/products?search=${encodeURIComponent(search)}&lowStockOnly=${lowStockOnly}`),
  getProduct: (id) => request(`/api/products/${id}`),
  createProduct: (payload) => request('/api/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: 'PUT', body: payload }),
  adjustStock: (id, delta, reason) => request(`/api/products/${id}/adjust-stock`, { method: 'POST', body: { delta, reason } }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (search = '') => request(`/api/customers?search=${encodeURIComponent(search)}`),
  getCustomer: (id) => request(`/api/customers/${id}`),
  getCustomerInvoices: (id) => request(`/api/customers/${id}/invoices`),
  createCustomer: (payload) => request('/api/customers', { method: 'POST', body: payload }),
  updateCustomer: (id, payload) => request(`/api/customers/${id}`, { method: 'PUT', body: payload }),
  deleteCustomer: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/invoices${qs ? `?${qs}` : ''}`);
  },
  getInvoice: (id) => request(`/api/invoices/${id}`),
  createInvoice: (payload) => request('/api/invoices', { method: 'POST', body: payload }),
  recordPayment: (id, amount) => request(`/api/invoices/${id}/record-payment`, { method: 'POST', body: amount }),
  cancelInvoice: (id) => request(`/api/invoices/${id}/cancel`, { method: 'POST' }),

  // Dashboard
  getDashboardSummary: () => request('/api/dashboard/summary'),
  getLowStock: () => request('/api/dashboard/low-stock'),
};
