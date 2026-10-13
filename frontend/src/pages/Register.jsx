import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', shopName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create your shop account</h1>
        {error && <div className="error-banner">{error}</div>}
        <label>Your name</label>
        <input value={form.fullName} onChange={e => update('fullName', e.target.value)} required />
        <label>Shop name</label>
        <input value={form.shopName} onChange={e => update('shopName', e.target.value)} placeholder="Optional" />
        <label>Email</label>
        <input type="email" value={form.email} onChange={e => update('email', e.target.value)} required />
        <label>Password</label>
        <input type="password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} />
        <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
