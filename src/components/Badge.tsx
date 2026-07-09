import { cn } from '../lib/cn';

const toneClasses: Record<string, string> = {
  create: 'bg-success-soft text-success',
  update: 'bg-info-soft text-info',
  delete: 'bg-danger-soft text-danger',
  broadcast: 'bg-purple-soft text-purple',
  neutral: 'bg-line-soft text-ink-muted',
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof toneClasses }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-caption font-bold uppercase tracking-wide', toneClasses[tone])}>
      {label}
    </span>
  );
}

export function Chip({ label, selected, onClick }: { label: string; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-small font-semibold transition-colors',
        selected ? 'border-navy bg-navy text-white' : 'border-line bg-surface text-ink-muted hover:border-navy-muted',
      )}
    >
      {label}
    </button>
  );
}
