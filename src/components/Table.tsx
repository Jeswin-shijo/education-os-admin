import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
};

export function Table<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line bg-surface-alt">
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }} className="px-4 py-3 text-label uppercase tracking-wide text-ink-muted">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={(e) => {
                // Ignore clicks on the inline row controls (edit/delete buttons, links, inputs)
                // so those still work while a bare row-click opens the detail view.
                if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="button"]')) return;
                onRowClick?.(row);
              }}
              className={`border-b border-line-soft last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-surface-alt' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-body text-ink align-middle">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
