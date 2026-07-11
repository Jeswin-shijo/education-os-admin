import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { cn } from '../lib/cn';
import { commandItems } from '../layout/navigation';

// ⌘K / Ctrl+K jump-to-page palette. Fuzzy-ish substring match over page label and
// section, full keyboard control (↑ ↓ Enter Esc), and mouse hover selection.
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commandItems;
    return commandItems.filter(
      (it) => it.label.toLowerCase().includes(q) || (it.section?.toLowerCase().includes(q) ?? false),
    );
  }, [query]);

  // Reset each time it opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clamp selection when the result set shrinks as the user types.
  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view during arrow-key navigation.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.to);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(9,26,71,0.55)] p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Icon name="search" size={18} className="text-ink-soft" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages…"
            className="w-full bg-transparent py-3.5 text-body text-ink outline-none placeholder:text-ink-soft"
          />
          <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-caption text-ink-soft sm:block">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-small text-ink-muted">No pages match “{query}”.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.to}
                ref={i === active ? activeRef : undefined}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.to)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  i === active ? 'bg-surface-alt' : '',
                )}
              >
                <Icon name={r.icon} size={17} className="text-ink-muted" />
                <span className="flex-1 text-body text-ink">{r.label}</span>
                {r.section && <span className="text-caption text-ink-soft">{r.section}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
