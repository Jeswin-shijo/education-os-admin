import { cn } from '../lib/cn';

type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const styles: Record<Status, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-line-soft text-ink-muted',
};

export function StatusPill({ label, status }: { label: string; status: Status }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-caption font-semibold uppercase tracking-wide', styles[status])}>
      {label}
    </span>
  );
}
