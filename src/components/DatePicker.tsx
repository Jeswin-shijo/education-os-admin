import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './Icon';
import { parseISODate, toLocalISODate, formatDate } from '../lib/date';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const POPUP_WIDTH = 288; // px, matches w-72

type Cell = { date: Date; inMonth: boolean };

function buildGrid(year: number, month: number): Cell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Cell[] = [];
  for (let i = startOffset; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  return cells;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const selected = value ? parseISODate(value) : null;
  const min = minDate ? parseISODate(minDate) : null;
  const max = maxDate ? parseISODate(maxDate) : null;
  const today = new Date();

  const [viewYear, setViewYear] = useState(() => (selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? today).getMonth());

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  function reposition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - POPUP_WIDTH - 8);
    const top = rect.bottom + 6;
    setCoords({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    reposition();
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) return;
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
    // capture:true so this also catches scroll on the Modal's internal scroll container
    document.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('scroll', onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openPicker() {
    const base = selected ?? today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  }

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function isDisabled(date: Date): boolean {
    if (min && date < min) return true;
    if (max && date > max) return true;
    return false;
  }

  function pick(date: Date) {
    if (isDisabled(date)) return;
    onChange(toLocalISODate(date));
    setOpen(false);
  }

  const cells = buildGrid(viewYear, viewMonth);

  return (
    <div className="flex flex-col gap-1.5" ref={rootRef}>
      {label && <span className="text-label uppercase tracking-wide text-ink-muted">{label}</span>}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={cn(
          'flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-left text-body outline-none transition-colors',
          'hover:border-navy-muted focus:border-navy focus:ring-2 focus:ring-navy-soft',
          value ? 'text-ink' : 'text-ink-soft',
        )}
      >
        {value && selected ? formatDate(selected) : placeholder}
        <Icon name="timetable" size={16} className="shrink-0 text-ink-soft" />
      </button>

      {open && (
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: POPUP_WIDTH }}
          className="z-[60] rounded-lg border border-line bg-surface p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-title text-ink">
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt"
                aria-label="Previous month"
              >
                <Icon name="chevron-right" size={16} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-alt"
                aria-label="Next month"
              >
                <Icon name="chevron-right" size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w, i) => (
              <div key={i} className="text-caption font-semibold text-ink-soft">
                {w}
              </div>
            ))}
            {cells.map(({ date, inMonth }, i) => {
              const disabled = isDisabled(date);
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = isSameDay(date, today);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={cn(
                    'mx-auto flex h-8 w-8 items-center justify-center rounded-full text-small transition-colors',
                    !inMonth && 'text-ink-soft/50',
                    inMonth && !isSelected && 'text-ink hover:bg-navy-soft',
                    isSelected && 'bg-navy font-semibold text-white',
                    !isSelected && isToday && 'ring-1 ring-navy-muted',
                    disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-small font-semibold text-ink-muted hover:text-danger">
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="text-small font-semibold text-navy hover:text-navy-deep"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
