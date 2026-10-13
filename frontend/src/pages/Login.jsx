import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorNote, Field } from '../components/ui';

export function AuthArt() {
  return (
    <section className="auth-art">
      <div className="brand" style={{ padding: 0 }}>
        <div>
          <div className="brand-name" style={{ fontSize: '1.2rem' }}>Inventory & Billing</div>
          <div className="brand-sub">For beverage distributors</div>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2>From godown to shop counter, every case accounted for.</h2>
        <p>Load the vehicle, sell to shops on credit or cash, and close the trip knowing exactly what came back.</p>
      </div>
      <div className="auth-flow">
        <div><span className="dot" /> Stock in from the supplier</div>
        <div><span className="dot" /> Load the vehicle</div>
        <div><span className="dot" /> Sell to shops, track what they owe</div>
        <div><span className="dot" /> Close the trip and reconcile</div>
      </div>
    </section>
  );
}

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
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
          <h1>Welcome back</h1>
          <p className="muted">Sign in to continue to your distribution dashboard.</p>
          <ErrorNote>{error}</ErrorNote>
          <Field label="Email">
            <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password">
            <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
          </Field>
          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}
