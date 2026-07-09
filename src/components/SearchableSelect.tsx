import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './Icon';

const POPUP_WIDTH = 320;

export type SearchableOption = { label: string; value: string; sub?: string };

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Search…',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return o.label.toLowerCase().includes(needle) || o.sub?.toLowerCase().includes(needle);
  });

  function reposition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPUP_WIDTH - 8);
    setCoords({ top: rect.bottom + 6, left });
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);

    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-label uppercase tracking-wide text-ink-muted">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-left text-body outline-none transition-colors',
          'hover:border-navy-muted focus:border-navy focus:ring-2 focus:ring-navy-soft',
          selected ? 'text-ink' : 'text-ink-soft',
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <Icon name="search" size={15} className="shrink-0 text-ink-soft" />
      </button>

      {open && (
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPUP_WIDTH }}
          className="z-[60] flex max-h-80 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-xl"
        >
          <div className="border-b border-line-soft p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-line px-2.5 py-2 text-small outline-none focus:border-navy"
            />
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 && <div className="px-3 py-3 text-small text-ink-soft">No matches</div>}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full flex-col items-start px-3 py-2 text-left text-small hover:bg-navy-soft',
                  o.value === value && 'bg-navy-soft',
                )}
              >
                <span className="text-ink">{o.label}</span>
                {o.sub && <span className="text-caption text-ink-soft">{o.sub}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
