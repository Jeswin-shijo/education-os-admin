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

export function offsetDays(n: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
}
