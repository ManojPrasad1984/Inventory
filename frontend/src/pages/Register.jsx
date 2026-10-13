import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorNote, Field } from '../components/ui';
import { AuthArt } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', shopName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

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
    <div className="auth">
      <AuthArt />
      <div className="auth-form-side">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Create your account</h1>
          <p className="muted">Owner accounts can close trips and cancel sales.</p>
          <ErrorNote>{error}</ErrorNote>
          <Field label="Your name">
            <input value={form.fullName} onChange={e => update('fullName', e.target.value)} required autoFocus />
          </Field>
          <Field label="Business name" hint="Shown in the menu and on invoices. You can leave it blank.">
            <input value={form.shopName} onChange={e => update('shopName', e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" autoComplete="email" value={form.email} onChange={e => update('email', e.target.value)} required />
          </Field>
          <Field label="Password" hint="At least 6 characters.">
            <input type="password" autoComplete="new-password" value={form.password} onChange={e => update('password', e.target.value)} required minLength={6} />
          </Field>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
          <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
