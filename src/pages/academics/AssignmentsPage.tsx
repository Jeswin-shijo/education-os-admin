import { useState } from 'react';
import { adminService } from '../../services';
import * as assignmentService from '../../services/assignmentService';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { Assignment, AssignmentStatus } from '../../data/types';
import { formatDate } from '../../lib';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  DatePicker,
  StatusPill,
  ConfirmDialog,
  DetailModal,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

const statusTone: Record<AssignmentStatus, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pending: 'info',
  submitted: 'warning',
  graded: 'success',
  late: 'danger',
};

const emptyForm = {
  subjectId: '',
  title: '',
  description: '',
  dueDate: '',
  maxMarks: '100',
};

export function AssignmentsPage() {
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => assignmentService.listPage(p), []);
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Assignment | null>(null);
  const toast = useToast();

  const subjectOptions = (subjects ?? []).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));

  function subjectLabel(a: Assignment): string {
    if (a.subjectCode || a.subjectName) return `${a.subjectCode ?? ''} ${a.subjectName ?? ''}`.trim();
    const subject = subjects?.find((s) => s.id === a.subjectId);
    return subject ? `${subject.code} ${subject.name}` : a.subjectId;
  }

  function openCreate() {
    setForm({ ...emptyForm, subjectId: subjects?.[0]?.id ?? '' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.subjectId) e.subjectId = 'Subject is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.dueDate) e.dueDate = 'Due date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const subject = subjects?.find((s) => s.id === form.subjectId);
      const payload = {
        subjectId: form.subjectId,
        subjectCode: subject?.code,
        subjectName: subject?.name,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        maxMarks: Number(form.maxMarks) || 0,
      };
      await assignmentService.create(payload);
      toast.success('Assignment added', payload.title);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save assignment');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const removed = deleteTarget.title;
    setDeleting(true);
    try {
      await assignmentService.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast.success('Assignment removed', removed);
    } catch (err) {
      setDeleteTarget(null);
      toast.error('Could not remove assignment', err instanceof Error ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Assignment>[] = [
    { key: 'subject', header: 'Subject', render: (a) => <span className="font-semibold text-ink">{subjectLabel(a)}</span> },
    { key: 'title', header: 'Title', render: (a) => a.title },
    { key: 'dueDate', header: 'Due date', render: (a) => formatDate(a.dueDate) },
    { key: 'maxMarks', header: 'Max marks', render: (a) => a.maxMarks },
    { key: 'status', header: 'Status', render: (a) => <StatusPill status={statusTone[a.status]} label={a.status} /> },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (a) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(a)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={rows ? `${rows.length} assignments` : undefined}
        action={<Button label="Add assignment" icon="plus" onClick={openCreate} />}
      />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No assignments found" actionLabel="Add assignment" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add assignment">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Subject"
            required
            error={errors.subjectId}
            value={form.subjectId}
            onChange={(v) => setField('subjectId', v)}
            options={subjectOptions}
          />
          <TextField label="Title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} placeholder="Assignment title" />
          <TextField
            label="Description"
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="What students need to submit"
          />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Due date" required error={errors.dueDate} value={form.dueDate} onChange={(v) => setField('dueDate', v)} />
            <TextField
              label="Max marks"
              type="number"
              value={form.maxMarks}
              onChangeText={(v) => setForm((f) => ({ ...f, maxMarks: v }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add assignment" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove assignment"
        message={`Remove "${deleteTarget?.title}"? This cannot be undone.`}
        loading={deleting}
      />

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Assignment details"
        header={
          detailTarget && (
            <div>
              <div className="text-h3 text-ink">{detailTarget.title}</div>
              <div className="text-small text-ink-muted">{subjectLabel(detailTarget)}</div>
            </div>
          )
        }
        fields={
          detailTarget
            ? [
                { label: 'Subject', value: subjectLabel(detailTarget) },
                { label: 'Due Date', value: formatDate(detailTarget.dueDate) },
                { label: 'Max Marks', value: detailTarget.maxMarks },
                { label: 'Status', value: <StatusPill status={statusTone[detailTarget.status]} label={detailTarget.status} /> },
                { label: 'Description', value: detailTarget.description, full: true },
              ]
            : []
        }
        onDelete={() => {
          const a = detailTarget;
          setDetailTarget(null);
          if (a) setDeleteTarget(a);
        }}
      />
    </div>
  );
}
