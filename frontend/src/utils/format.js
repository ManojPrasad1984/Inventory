// Display helpers shared by every page.

export function inr(value, decimals = 2) {
  return '₹' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// The API returns UTC timestamps; SQL Server round-trips drop the "Z", so add it back before parsing.
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
}

export function fmtDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
}

export function fmtDateTime(value) {
  const d = toDate(value);
  return d
    ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';
}

// 53 units at 24/case -> "2 cases 5 units"
export function casesLabel(units, perCase) {
  const u = Number(units || 0);
  const per = Number(perCase || 1);
  if (per <= 1) return `${u} ${u === 1 ? 'unit' : 'units'}`;
  const cases = Math.floor(u / per);
  const loose = u % per;
  const parts = [];
  if (cases > 0) parts.push(`${cases} ${cases === 1 ? 'case' : 'cases'}`);
  if (loose > 0 || cases === 0) parts.push(`${loose} ${loose === 1 ? 'unit' : 'units'}`);
  return parts.join(' ');
}

export function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
