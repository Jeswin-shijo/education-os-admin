import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

export type ToastTone = 'success' | 'error' | 'info' | 'warning' | 'update' | 'delete';

export interface ToastRecord {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  duration: number;
}

const toneMeta: Record<ToastTone, { icon: IconName; card: string; iconWrap: string }> = {
  success: { icon: 'check', card: 'bg-success-soft border-success/25', iconWrap: 'bg-success text-white' },
  // Action-coloured success variants (match the row-action button colours):
  update: { icon: 'edit', card: 'bg-warning-soft border-warning/30', iconWrap: 'bg-warning text-white' },
  delete: { icon: 'trash', card: 'bg-danger-soft border-danger/25', iconWrap: 'bg-danger text-white' },
  error: { icon: 'alert', card: 'bg-danger-soft border-danger/25', iconWrap: 'bg-danger text-white' },
  warning: { icon: 'alert', card: 'bg-warning-soft border-warning/30', iconWrap: 'bg-warning text-white' },
  info: { icon: 'notification', card: 'bg-info-soft border-info/25', iconWrap: 'bg-info text-white' },
};

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const meta = toneMeta[toast.tone];
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const close = () => {
    setLeaving(true);
    window.setTimeout(() => onDismiss(toast.id), 220);
  };

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = window.setTimeout(close, toast.duration);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto relative flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border p-3.5 pr-9 shadow-lg transition-all duration-300 ease-out',
        meta.card,
        entered && !leaving ? 'translate-x-0 opacity-100' : 'translate-x-[115%] opacity-0',
      )}
    >
      {/* tone icon */}
      <span className={cn('mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.iconWrap)}>
        <Icon name={meta.icon} size={18} />
      </span>
      {/* text */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-small font-semibold leading-snug text-ink">{toast.title}</div>
        {toast.message && (
          <div className="mt-0.5 wrap-break-word text-caption leading-snug text-ink-muted">{toast.message}</div>
        )}
      </div>
      {/* close */}
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-black/5 hover:text-ink"
      >
        <span className="text-base leading-none">&times;</span>
      </button>
    </div>
  );
}

/** Fixed, bottom-right stack of toasts. Rendered once by ToastProvider. */
export function ToastViewport({ toasts, onDismiss }: { toasts: ToastRecord[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-100 flex flex-col gap-2.5">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
