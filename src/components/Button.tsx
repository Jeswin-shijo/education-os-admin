import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: IconName;
  full?: boolean;
  children?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-deep disabled:bg-navy-muted',
  accent: 'bg-accent text-navy-dark hover:bg-accent-dark disabled:opacity-50',
  outline: 'bg-transparent text-navy border border-line hover:bg-navy-soft disabled:opacity-50',
  ghost: 'bg-transparent text-navy hover:bg-navy-soft disabled:opacity-50',
  danger: 'bg-danger text-white hover:opacity-90 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'text-small px-3 py-1.5 gap-1.5',
  md: 'text-body px-4 py-2.5 gap-2',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  full = false,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        full && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon && <Icon name={icon} size={16} />
      )}
      {label ?? children}
    </button>
  );
}
