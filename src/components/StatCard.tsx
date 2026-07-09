import { Icon, type IconName } from './Icon';

type Tone = 'navy' | 'accent' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'teal' | 'pink';

const toneClasses: Record<Tone, string> = {
  navy: 'bg-navy-soft text-navy',
  accent: 'bg-accent-soft text-accent-dark',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
  purple: 'bg-purple-soft text-purple',
  teal: 'bg-teal-soft text-teal',
  pink: 'bg-pink-soft text-pink',
};

export function StatCard({
  label,
  value,
  icon,
  tone = 'navy',
}: {
  label: string;
  value: string | number;
  icon: IconName;
  tone?: Tone;
}) {
  return (
    <div className="flex min-w-[150px] flex-1 items-center gap-3 rounded-lg border border-line bg-surface p-4 shadow-[0_4px_10px_rgba(10,31,77,0.06)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneClasses[tone]}`}>
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-h2 text-ink leading-tight">{value}</div>
        <div className="truncate text-small text-ink-muted">{label}</div>
      </div>
    </div>
  );
}
