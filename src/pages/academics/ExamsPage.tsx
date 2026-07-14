import { useState } from 'react';
import { adminService } from '../../services';
import * as examService from '../../services/examService';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { Exam, ExamType } from '../../data/types';
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
  TimePicker,
  StatusPill,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

const EXAM_TYPES: ExamType[] = ['Internal', 'Semester', 'Quiz'];

const typeStatus: Record<ExamType, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  Internal: 'warning',
  Semester: 'danger',
  Quiz: 'neutral',
};

const emptyForm = {
  subjectId: '',
  name: '',
  date: '',
  time: '',
  room: '',
  durationMins: '60',
  type: 'Internal' as ExamType,
};

export function ExamsPage() {
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => examService.exams.listPage(p), []);
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const subjectOptions = (subjects ?? []).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));

  function subjectLabel(subjectId: string, code?: string, name?: string): string {
    if (code || name) return `${code ?? ''} ${name ?? ''}`.trim();
    const subject = subjects?.find((s) => s.id === subjectId);
    return subject ? `${subject.code} ${subject.name}` : subjectId;
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, subjectId: subjects?.[0]?.id ?? '' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(exam: Exam) {
    setEditing(exam);
    setForm({
      subjectId: exam.subjectId,
      name: exam.name,
      date: exam.date,
      time: exam.time,
      room: exam.room,
      durationMins: String(exam.durationMins),
      type: exam.type,
    });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.subjectId) e.subjectId = 'Subject is required';
    if (!form.name.trim()) e.name = 'Exam name is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.time.trim()) e.time = 'Time is required';
    if (!form.room.trim()) e.room = 'Room is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        subjectId: form.subjectId,
        name: form.name,
        date: form.date,
        time: form.time,
        room: form.room,
        durationMins: Number(form.durationMins) || 0,
        type: form.type,
      };
      if (editing) {
        await examService.exams.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await examService.exams.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save exam');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await examService.exams.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove exam');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Exam>[] = [
    {
      key: 'subject',
      header: 'Subject',
      render: (e) => <span className="font-semibold text-ink">{subjectLabel(e.subjectId, e.subjectCode, e.subjectName)}</span>,
    },
    { key: 'name', header: 'Exam', render: (e) => e.name },
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    { key: 'time', header: 'Time', render: (e) => e.time },
    { key: 'room', header: 'Room', render: (e) => e.room },
    { key: 'type', header: 'Type', render: (e) => <StatusPill status={typeStatus[e.type]} label={e.type} /> },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (e) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(e)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(e)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Exams"
        subtitle={rows ? `${rows.length} exams` : undefined}
        action={<Button label="Add exam" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="timetable" title="No exams found" actionLabel="Add exam" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit exam' : 'Add exam'}>
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
          <TextField label="Exam name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} placeholder="Mid Semester Exam" />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Date" required error={errors.date} value={form.date} onChange={(v) => setField('date', v)} />
            <TimePicker label="Time" required error={errors.time} value={form.time} onChange={(v) => setField('time', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Room" required error={errors.room} value={form.room} onChangeText={(v) => setField('room', v)} placeholder="Hall-A" />
            <TextField
              label="Duration (mins)"
              type="number"
              value={form.durationMins}
              onChangeText={(v) => setForm((f) => ({ ...f, durationMins: v }))}
            />
          </div>
          <Select
            label="Type"
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v as ExamType }))}
            options={EXAM_TYPES.map((t) => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))}
          />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add exam'} size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(undefined);
        }}
        onConfirm={handleDelete}
        title="Remove exam"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
