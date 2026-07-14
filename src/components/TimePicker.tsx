import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

// Time is stored as 24h "HH:MM" (unambiguous + sortable, matches the backend
// CharField) but presented as friendly 12h "h:mm AM/PM" in the trigger.

const POPUP_WIDTH = 260;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59
type Meridiem = 'AM' | 'PM';

/** Parse "HH:MM" (24h) / "h:mm AM|PM" into 24h parts, or null. */
function parse(v: string): { h: number; min: number } | null {
  const s = (v || '').trim();
  const m = /(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = /pm/i.test(s) ? 'PM' : /am/i.test(s) ? 'AM' : null;
  if (mer) {
    if (h === 12) h = mer === 'PM' ? 12 : 0;
    else if (mer === 'PM') h += 12;
  }
  if (h > 23 || min > 59) return null;
  return { h, min };
}

type Sel = { h12: number; min: number; mer: Meridiem };

function toSel(v: string): Sel {
  const p = parse(v);
  const h = p ? p.h : 9; // default 9:00 AM
  const min = p ? p.min : 0;
  const mer: Meridiem = h >= 12 ? 'PM' : 'AM';
  return { h12: h % 12 === 0 ? 12 : h % 12, min, mer };
}

function compose({ h12, min, mer }: Sel): string {
  let h = h12 % 12;
  if (mer === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Friendly 12h label for the trigger; '' when unset/unparseable. */
export function formatTime(v: string): string {
  const p = parse(v);
  if (!p) return '';
  const mer: Meridiem = p.h >= 12 ? 'PM' : 'AM';
  const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${h12}:${String(p.min).padStart(2, '0')} ${mer}`;
}

export function TimePicker({
  label,
  value,
  onChange,
  placeholder = 'Select time',
  error,
  required,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [sel, setSel] = useState<Sel>(() => toSel(value));

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  function reposition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPUP_WIDTH - 8);
    setCoords({ top: rect.bottom + 6, left });
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popupRef.current?.contains(t)) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Scroll the selected hour/minute into view when the popover opens.
  useLayoutEffect(() => {
    if (!open) return;
    popupRef.current?.querySelectorAll<HTMLElement>('[data-sel="true"]').forEach((el) => {
      el.scrollIntoView({ block: 'center' });
    });
  }, [open]);

  function openPicker() {
    setSel(toSel(value));
    setOpen(true);
  }

  function update(next: Sel) {
    setSel(next);
    onChange(compose(next));
  }

  const hasValue = !!parse(value);

  const colBtn = (active: boolean) =>
    cn(
      'w-full rounded-md px-2 py-1.5 text-center text-small transition-colors',
      active ? 'bg-navy font-semibold text-white' : 'text-ink hover:bg-navy-soft',
    );

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      {label && (
        <span className="text-label uppercase tracking-wide text-ink-muted">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-required={required}
        aria-invalid={!!error}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={cn(
          'flex items-center justify-between gap-2 rounded-md border bg-surface px-3 py-2.5 text-left text-body outline-none transition-colors',
          'hover:border-navy-muted focus:border-navy focus:ring-2 focus:ring-navy-soft',
          error ? 'border-danger' : 'border-line',
          hasValue ? 'text-ink' : 'text-ink-soft',
        )}
      >
        {hasValue ? formatTime(value) : placeholder}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-soft">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPUP_WIDTH }}
          className="z-[60] rounded-lg border border-line bg-surface p-3 shadow-xl"
        >
          <div className="flex gap-2">
            {/* Hours */}
            <div className="flex-1">
              <div className="mb-1 text-center text-caption font-semibold text-ink-soft">Hour</div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-sel={sel.h12 === h}
                    onClick={() => update({ ...sel, h12: h })}
                    className={colBtn(sel.h12 === h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            {/* Minutes */}
            <div className="flex-1">
              <div className="mb-1 text-center text-caption font-semibold text-ink-soft">Min</div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto pr-1">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-sel={sel.min === m}
                    onClick={() => update({ ...sel, min: m })}
                    className={colBtn(sel.min === m)}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            {/* AM / PM */}
            <div className="flex flex-col gap-1">
              <div className="mb-1 text-center text-caption font-semibold text-ink-soft">&nbsp;</div>
              {(['AM', 'PM'] as Meridiem[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update({ ...sel, mer: m })}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-small font-semibold transition-colors',
                    sel.mer === m ? 'bg-navy text-white' : 'text-ink hover:bg-navy-soft',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-small font-semibold text-ink-muted hover:text-danger"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-navy px-3 py-1 text-small font-semibold text-white hover:bg-navy-deep"
            >
              Done
            </button>
          </div>
        </div>
      )}
      {error && <span className="text-caption text-danger">{error}</span>}
    </div>
  );
}
