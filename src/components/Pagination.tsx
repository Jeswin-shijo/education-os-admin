import { cn } from '../lib/cn';
import { Icon } from './Icon';

/** Build a compact page window like [1, '…', 4, 5, 6, '…', 12]. */
function pageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

export function Pagination({
  page,
  totalPages,
  count,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  count: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  // Nothing to page through — the backend paginates at 25, so this only shows
  // once a list exceeds one page.
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, count);
  const pages = pageWindow(page, totalPages);

  const navBtn = 'flex h-8 min-w-8 items-center justify-center rounded-md border border-line px-2 text-small text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-caption text-ink-soft">
        Showing {from}–{to} of {count}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" className={navBtn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <Icon name="chevron-right" size={16} className="rotate-180" />
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-caption text-ink-soft">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={cn(navBtn, p === page && 'border-navy bg-navy text-white hover:bg-navy')}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className={navBtn} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
}
