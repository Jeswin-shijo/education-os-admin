import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './Icon';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function Banner({
  tone,
  title,
  message,
  action,
}: {
  tone: Tone;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn('flex items-start gap-3 rounded-lg px-4 py-3', toneClasses[tone])}>
      <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-title">{title}</div>
        {message && <div className="mt-0.5 text-small opacity-90">{message}</div>}
      </div>
      {action}
    </div>
  );
}
