import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function TextField({ label, value, onChangeText, error, className, id, ...rest }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      {label && <span className="text-label uppercase tracking-wide text-ink-muted">{label}</span>}
      <input
        id={inputId}
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        className={cn(
          'rounded-md border bg-surface px-3 py-2.5 text-body text-ink outline-none transition-colors',
          'focus:border-navy focus:ring-2 focus:ring-navy-soft',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...rest}
      />
      {error && <span className="text-caption text-danger">{error}</span>}
    </label>
  );
}
