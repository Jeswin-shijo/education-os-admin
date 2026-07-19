import { useState } from 'react';
import * as complaintService from '../../services/complaintService';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../state/ToastContext';
import type { Complaint } from '../../data/types';
import { formatDate } from '../../lib';
import { PageHeader, Table, type Column, Select, StatusPill, StatCard, Loading, EmptyState, DetailModal } from '../../components';

const STATUSES: Complaint['status'][] = ['open', 'in_progress', 'resolved'];

const statusTone: Record<Complaint['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  open: 'danger',
  in_progress: 'warning',
  resolved: 'success',
};

export function ComplaintsPage() {
  const { data: rows, loading, reload } = useAsync(() => complaintService.list(), []);
  const toast = useToast();

  const [detailTarget, setDetailTarget] = useState<Complaint | null>(null);

  const openCount = rows?.filter((c) => c.status === 'open').length ?? 0;
  const inProgressCount = rows?.filter((c) => c.status === 'in_progress').length ?? 0;
  const resolvedCount = rows?.filter((c) => c.status === 'resolved').length ?? 0;

  async function handleStatusChange(complaint: Complaint, status: Complaint['status']) {
    try {
      await complaintService.updateStatus(complaint.id, status);
      reload();
      toast.success('Complaint updated', complaint.subject);
    } catch (err) {
      toast.error('Could not update complaint', err instanceof Error ? err.message : undefined);
    }
  }

  const columns: Column<Complaint>[] = [
    { key: 'student', header: 'Student', render: (c) => c.studentName || <span className="text-ink-soft">—</span> },
    { key: 'category', header: 'Category', render: (c) => c.category },
    { key: 'subject', header: 'Subject', render: (c) => <span className="font-semibold text-ink">{c.subject}</span> },
    { key: 'status', header: 'Status', render: (c) => <StatusPill status={statusTone[c.status]} label={c.status} /> },
    { key: 'createdOn', header: 'Created', render: (c) => formatDate(c.createdOn) },
    {
      key: 'actions',
      header: 'Update status',
      width: '170px',
      render: (c) => (
        <Select
          value={c.status}
          onChange={(v) => handleStatusChange(c, v as Complaint['status'])}
          options={STATUSES.map((s) => ({ label: s, value: s }))}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Complaints" subtitle={rows ? `${rows.length} complaints` : undefined} />

      <div className="mb-6 flex flex-wrap gap-3">
        <StatCard label="Open" value={openCount} icon="alert" tone="danger" />
        <StatCard label="In progress" value={inProgressCount} icon="refresh" tone="warning" />
        <StatCard label="Resolved" value={resolvedCount} icon="check" tone="success" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="alert" title="No complaints found" />
      ) : (
        <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
      )}

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Complaint details"
        fields={
          detailTarget
            ? [
                { label: 'Student', value: detailTarget.studentName },
                { label: 'Category', value: detailTarget.category },
                { label: 'Subject', value: detailTarget.subject },
                { label: 'Status', value: <StatusPill status={statusTone[detailTarget.status]} label={detailTarget.status} /> },
                { label: 'Created', value: formatDate(detailTarget.createdOn) },
                { label: 'Description', value: detailTarget.description, full: true },
              ]
            : []
        }
      />
    </div>
  );
}
