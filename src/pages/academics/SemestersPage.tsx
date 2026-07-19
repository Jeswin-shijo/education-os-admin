import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { Semester } from '../../data/types';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  Select,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

const NUMBER_OPTIONS = Array.from({ length: 8 }, (_, i) => String(i + 1));

export function SemestersPage() {
  const { data: programs } = useAsync(() => adminService.programs.list(), []);
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.semesters.listPage(undefined, p), []);

  const programName = (id: string) => programs?.find((p) => p.id === id)?.name ?? '—';

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ programId: '', number: '1' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  function openCreate() {
    setForm({ programId: programs?.[0]?.id ?? '', number: '1' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.programId) {
      setErrors({ programId: 'Program is required' });
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      await adminService.semesters.create({ programId: form.programId, number: Number(form.number) });
      toast.success('Semester added', `Semester ${form.number}`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save semester');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const removed = deleteTarget.number;
    setDeleting(true);
    try {
      await adminService.semesters.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast.success('Semester removed', `Semester ${removed}`);
    } catch (err) {
      setDeleteTarget(null);
      toast.error('Could not remove semester', err instanceof Error ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Semester>[] = [
    { key: 'program', header: 'Program', render: (s) => programName(s.programId) },
    { key: 'number', header: 'Semester', render: (s) => `Semester ${s.number}` },
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
        title="Semesters"
        subtitle={rows ? `${rows.length} semesters` : undefined}
        action={<Button label="Add semester" icon="plus" onClick={openCreate} />}
      />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No semesters found" actionLabel="Add semester" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add semester">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Program"
            required
            error={errors.programId}
            value={form.programId}
            onChange={(v) => { setForm((f) => ({ ...f, programId: v })); clearError('programId'); }}
            options={(programs ?? []).map((p) => ({ label: p.name, value: p.id }))}
          />
          <Select
            label="Number"
            value={form.number}
            onChange={(v) => setForm((f) => ({ ...f, number: v }))}
            options={NUMBER_OPTIONS.map((n) => ({ label: `Semester ${n}`, value: n }))}
          />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add semester" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove semester"
        message={`Remove Semester ${deleteTarget?.number}? This cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
