import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
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
} from '../../components';

const NUMBER_OPTIONS = Array.from({ length: 8 }, (_, i) => String(i + 1));

export function SemestersPage() {
  const { data: programs } = useAsync(() => adminService.programs.list(), []);
  const { data: rows, loading, reload } = useAsync(() => adminService.semesters.list(), []);

  const programName = (id: string) => programs?.find((p) => p.id === id)?.name ?? '—';

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ programId: '', number: '1' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  const [deleteTarget, setDeleteTarget] = useState<Semester | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

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
      setSuccessMsg(`Added semester ${form.number}`);
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
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.semesters.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove semester');
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

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No semesters found" actionLabel="Add semester" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
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
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(undefined);
        }}
        onConfirm={handleDelete}
        title="Remove semester"
        message={`Remove Semester ${deleteTarget?.number}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
