type DateLike = Date | string | number;

function toDate(d: DateLike): Date {
  return d instanceof Date ? d : new Date(d);
}

export function formatDate(d: DateLike): string {
  return toDate(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(d: DateLike): string {
  return toDate(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatRelative(d: DateLike): string {
  const date = toDate(d);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function toISODate(d: DateLike): string {
  return toDate(d).toISOString().slice(0, 10);
}

/** Parses a 'YYYY-MM-DD' string as a LOCAL date (avoids the UTC-midnight
 * off-by-one-day bug you get from `new Date('YYYY-MM-DD')` in timezones
 * behind UTC). Returns null for anything that isn't a clean date string. */
export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats a Date as a LOCAL 'YYYY-MM-DD' string (the inverse of parseISODate). */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function offsetDays(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
}
