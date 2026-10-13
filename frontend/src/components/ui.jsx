import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

/* ---------- Toasts + confirm dialog (available everywhere via useUi) ---------- */

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);

  // toast('Saved') | toast('Failed', { type: 'error' }) | toast('Sale saved', { action: { label: 'View invoice', to: '/sales/3' } })
  const toast = useCallback((message, { type = 'success', action } = {}) => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, message, type, action }]);
    setTimeout(() => dismiss(id), type === 'error' ? 8000 : 5000);
  }, [dismiss]);

  const confirm = useCallback(
    opts => new Promise(resolve => setConfirmState({ ...opts, resolve })),
    []
  );

  function answer(value) {
    confirmState?.resolve(value);
    setConfirmState(null);
  }

  return (
    <UiContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon name={t.type === 'error' ? 'alert' : 'check'} size={18} />
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <Link className="toast-action" to={t.action.to} onClick={() => dismiss(t.id)}>{t.action.label}</Link>
            )}
            <button className="icon-btn toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
      {confirmState && (
        <Modal
          title={confirmState.title || 'Are you sure?'}
          onClose={() => answer(false)}
          size="sm"
          footer={
            <>
              <button className="btn btn-quiet" onClick={() => answer(false)}>Cancel</button>
              <button className={`btn ${confirmState.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => answer(true)}>
                {confirmState.confirmLabel || 'Confirm'}
              </button>
            </>
          }
        >
          <p className="muted">{confirmState.message}</p>
        </Modal>
      )}
    </UiContext.Provider>
  );
}

export function useUi() {
  return useContext(UiContext);
}

/* ---------- Building blocks ---------- */

export function Modal({ title, onClose, children, footer, size = 'md', as = 'div', onSubmit }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const first = ref.current?.querySelector('input:not([type=hidden]), select, textarea');
    first?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const Wrapper = as === 'form' ? 'form' : 'div';
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <Wrapper
        ref={ref}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={onSubmit}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </Wrapper>
    </div>
  );
}

export function PageHeader({ title, subtitle, children, back }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        {back && (
          <Link to={back.to} className="back-link"><Icon name="back" size={16} /> {back.label}</Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function statusTone(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid': case 'closed': return 'good';
    case 'partial': return 'warn';
    case 'unpaid': return 'bad';
    case 'open': return 'info';
    default: return 'neutral';
  }
}

export function EmptyState({ icon = 'box', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h3>{title}</h3>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorNote({ children, onRetry }) {
  if (!children) return null;
  return (
    <div className="note note-bad" role="alert">
      <Icon name="alert" size={18} />
      <span>{children}</span>
      {onRetry && <button className="btn btn-quiet btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="searchbox">
      <Icon name="search" size={16} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
