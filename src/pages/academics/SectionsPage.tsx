import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { Section, Shift } from '../../data/types';

const SHIFT_OPTIONS: { label: string; value: Shift }[] = [
  { label: 'Morning', value: 'Morning' },
  { label: 'Afternoon', value: 'Afternoon' },
  { label: 'Evening', value: 'Evening' },
];
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  ConfirmDialog,
  DetailModal,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

export function SectionsPage() {
  const { data: programs } = useAsync(() => adminService.programs.list(), []);
  const { data: semesters } = useAsync(() => adminService.semesters.list(), []);
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.sections.listPage(undefined, p), []);

  const semesterLabel = (id: string) => {
    const sem = semesters?.find((s) => s.id === id);
    if (!sem) return '—';
    const program = programs?.find((p) => p.id === sem.programId);
    return `${program?.name ?? sem.programId} — Semester ${sem.number}`;
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<{ semesterId: string; name: string; shift: Shift }>({ semesterId: '', name: 'A', shift: 'Morning' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Section | null>(null);
  const toast = useToast();

  function openCreate() {
    setForm({ semesterId: semesters?.[0]?.id ?? '', name: 'A', shift: 'Morning' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.semesterId) e.semesterId = 'Semester is required';
    if (!form.name.trim()) e.name = 'Section name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      await adminService.sections.create({ semesterId: form.semesterId, name: form.name.trim().toUpperCase(), shift: form.shift });
      toast.success('Section added', `Section ${form.name}`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save section');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const removed = deleteTarget.name;
    setDeleting(true);
    try {
      await adminService.sections.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast.success('Section removed', `Section ${removed}`);
    } catch (err) {
      setDeleteTarget(null);
      toast.error('Could not remove section', err instanceof Error ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Section>[] = [
    { key: 'semester', header: 'Semester', render: (s) => semesterLabel(s.semesterId) },
    { key: 'name', header: 'Section', render: (s) => s.name },
    { key: 'shift', header: 'Shift', render: (s) => s.shift ?? '—' },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (s) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(s)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sections"
        subtitle={rows ? `${rows.length} sections` : undefined}
        action={<Button label="Add section" icon="plus" onClick={openCreate} />}
      />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No sections found" actionLabel="Add section" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add section">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Semester"
            required
            error={errors.semesterId}
            value={form.semesterId}
            onChange={(v) => { setForm((f) => ({ ...f, semesterId: v })); clearError('semesterId'); }}
            options={(semesters ?? []).map((s) => ({ label: semesterLabel(s.id), value: s.id }))}
          />
          <TextField label="Section name" required error={errors.name} value={form.name} onChangeText={(v) => { setForm((f) => ({ ...f, name: v })); clearError('name'); }} placeholder="A" />
          <Select
            label="Shift"
            value={form.shift}
            onChange={(v) => setForm((f) => ({ ...f, shift: v as Shift }))}
            options={SHIFT_OPTIONS}
          />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add section" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove section"
        message={`Remove Section ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
      />

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Section details"
        fields={
          detailTarget
            ? [
                { label: 'Semester', value: semesterLabel(detailTarget.semesterId) },
                { label: 'Section', value: detailTarget.name },
                { label: 'Shift', value: detailTarget.shift },
              ]
            : []
        }
        onDelete={() => {
          const s = detailTarget;
          setDetailTarget(null);
          if (s) setDeleteTarget(s);
        }}
      />
    </div>
  );
}
