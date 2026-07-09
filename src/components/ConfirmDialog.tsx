import { Modal } from './Modal';
import { Button } from './Button';
import { Banner } from './Banner';

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Remove',
  danger = true,
  loading = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  error?: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={420}>
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink-muted">{message}</p>
        {error && <Banner tone="danger" title="Can't remove this record" message={error} />}
        <div className="flex justify-end gap-2">
          <Button label="Cancel" variant="outline" size="sm" onClick={onClose} />
          <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} size="sm" loading={loading} onClick={onConfirm} />
        </div>
      </div>
    </Modal>
  );
}
