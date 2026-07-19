import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export type DetailField = {
  label: string;
  value: ReactNode;
  /** Span both columns (e.g. long text like an address). */
  full?: boolean;
};

/**
 * Read-only detail popup for a list row. Renders a labelled grid of fields plus
 * Edit (orange) / Delete (red) actions in the footer. Open it from `Table`'s
 * `onRowClick`; wire `onEdit`/`onDelete` to the page's existing edit modal and
 * delete confirm.
 */
export function DetailModal({
  open,
  onClose,
  title,
  header,
  fields,
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  width = 540,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional custom header block (e.g. an avatar + name) shown above the fields. */
  header?: ReactNode;
  fields: DetailField[];
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  width?: number;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={width}>
      {header && <div className="mb-5">{header}</div>}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map((f, i) => (
          <div key={i} className={f.full ? 'sm:col-span-2' : undefined}>
            <dt className="text-label uppercase tracking-wide text-ink-muted">{f.label}</dt>
            <dd className="mt-0.5 wrap-break-word text-body text-ink">
              {f.value === null || f.value === undefined || f.value === '' ? '—' : f.value}
            </dd>
          </div>
        ))}
      </dl>
      {(onEdit || onDelete) && (
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          {onDelete && (
            <Button variant="ghost" size="sm" icon="trash" label={deleteLabel} onClick={onDelete} />
          )}
          {onEdit && <Button variant="ghost" size="sm" icon="edit" label={editLabel} onClick={onEdit} />}
        </div>
      )}
    </Modal>
  );
}
