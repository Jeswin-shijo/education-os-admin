import { useState } from 'react';
import * as leaveService from '../../services/leaveService';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../state/ToastContext';
import type { LeaveRequest } from '../../data/types';
import { formatDate } from '../../lib';
import { PageHeader, Table, type Column, Button, Badge, StatusPill, Loading, EmptyState, DetailModal } from '../../components';

const statusTone: Record<LeaveRequest['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pending: 'info',
  approved: 'success',
  rejected: 'danger',
};

// Badge only offers create/update/delete/broadcast/neutral tones — mapped to something
// visually distinct per leave type since there's no dedicated tone set for this.
const typeTone: Record<LeaveRequest['type'], 'create' | 'update' | 'delete' | 'broadcast' | 'neutral'> = {
  sick: 'delete',
  casual: 'neutral',
  event: 'broadcast',
};

export function LeavePage() {
  const { data: rows, loading, reload } = useAsync(() => leaveService.list(), []);
  const toast = useToast();

  const [detailTarget, setDetailTarget] = useState<LeaveRequest | null>(null);

  async function handleDecision(leave: LeaveRequest, status: 'approved' | 'rejected') {
    try {
      await leaveService.updateStatus(leave.id, status);
      reload();
      toast.success(status === 'approved' ? 'Leave approved' : 'Leave rejected', leave.studentName || undefined);
    } catch (err) {
      toast.error('Could not update leave request', err instanceof Error ? err.message : undefined);
    }
  }

  const columns: Column<LeaveRequest>[] = [
    { key: 'student', header: 'Student', render: (l) => <span className="font-semibold text-ink">{l.studentName || '—'}</span> },
    { key: 'type', header: 'Type', render: (l) => <Badge tone={typeTone[l.type]} label={l.type} /> },
    {
      key: 'dates',
      header: 'From — To',
      render: (l) => (
        <span>
          {formatDate(l.fromDate)} – {formatDate(l.toDate)}
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', render: (l) => l.reason },
    { key: 'status', header: 'Status', render: (l) => <StatusPill status={statusTone[l.status]} label={l.status} /> },
    {
      key: 'actions',
      header: '',
      width: '190px',
      render: (l) =>
        l.status === 'pending' ? (
          <div className="flex justify-end gap-1.5">
            <Button label="Approve" variant="outline" size="sm" onClick={() => handleDecision(l, 'approved')} />
            <Button label="Reject" variant="danger" size="sm" onClick={() => handleDecision(l, 'rejected')} />
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader title="Leave requests" subtitle={rows ? `${rows.length} requests` : undefined} />

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="student" title="No leave requests found" />
      ) : (
        <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
      )}

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Leave request details"
        fields={
          detailTarget
            ? [
                { label: 'Student', value: detailTarget.studentName },
                { label: 'Type', value: <Badge tone={typeTone[detailTarget.type]} label={detailTarget.type} /> },
                { label: 'From', value: formatDate(detailTarget.fromDate) },
                { label: 'To', value: formatDate(detailTarget.toDate) },
                { label: 'Status', value: <StatusPill status={statusTone[detailTarget.status]} label={detailTarget.status} /> },
                { label: 'Applied on', value: formatDate(detailTarget.appliedOn) },
                { label: 'Reason', value: detailTarget.reason, full: true },
              ]
            : []
        }
      />
    </div>
  );
}
