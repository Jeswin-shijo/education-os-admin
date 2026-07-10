import { cn } from '../lib/cn';
import { Icon } from './Icon';

type Option = { label: string; value: string };

export function Select({
  label,
  value,
  onChange,
  options,
  error,
  required,
  className,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && (
        <span className="text-label uppercase tracking-wide text-ink-muted">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
      )}
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none rounded-md border bg-surface px-3 py-2.5 pr-9 text-body text-ink outline-none transition-colors',
            'focus:border-navy focus:ring-2 focus:ring-navy-soft',
            error ? 'border-danger' : 'border-line',
            className,
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
      </span>
      {error && <span className="text-caption text-danger">{error}</span>}
    </label>
  );
}
