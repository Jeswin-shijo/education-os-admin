import { Icon, type IconName } from './Icon';
import { Button } from './Button';

export function EmptyState({
  icon = 'search',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-soft text-navy">
        <Icon name={icon} size={24} />
      </div>
      <div className="text-title text-ink">{title}</div>
      {message && <div className="max-w-sm text-small text-ink-muted">{message}</div>}
      {actionLabel && onAction && <Button label={actionLabel} size="sm" onClick={onAction} />}
    </div>
  );
}
