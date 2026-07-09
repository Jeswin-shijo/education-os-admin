import { useState } from 'react';
import { adminService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { PageHeader, SearchBar, Card, Badge, Loading, EmptyState, Button } from '../components';
import { formatRelative } from '../lib/date';
import type { AuditLog } from '../data/types';

const badgeTone: Record<AuditLog['action'], 'create' | 'update' | 'delete' | 'broadcast'> = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  broadcast: 'broadcast',
};

export function AuditLogsPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.audit.list(), []);

  const filtered = rows?.filter((log) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [log.actor, log.entity, log.detail, log.action].some((v) => v.toLowerCase().includes(needle));
  });

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Every create, update, delete, and broadcast made in this console"
        action={<Button label="Refresh" icon="refresh" variant="outline" onClick={reload} />}
      />

      <div className="mb-4">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by actor, entity, action…" />
      </div>

      {loading ? (
        <Loading />
      ) : !filtered || filtered.length === 0 ? (
        <EmptyState icon="audit" title="No audit entries found" />
      ) : (
        <Card padded={false}>
          <div className="divide-y divide-line-soft">
            {filtered.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Badge label={log.action} tone={badgeTone[log.action]} />
                <div className="min-w-0 flex-1">
                  <div className="text-body text-ink">{log.detail}</div>
                  <div className="text-caption text-ink-soft">
                    {log.entity} · {log.actor}
                  </div>
                </div>
                <div className="shrink-0 text-caption text-ink-soft">{formatRelative(log.at)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
