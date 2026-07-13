import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { Program } from '../../data/types';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const NAVY = '#13327F';

const emptyForm = {
  code: '',
  name: '',
  departmentId: '',
  durationYears: '4',
  intake: '60',
};

export function ProgramsPage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.programs.list(), []);
  const { data: departments } = useAsync(() => adminService.departments.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const departmentOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.id }));
  const departmentName = (id: string) => departments?.find((d) => d.id === id)?.name ?? '—';

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, departmentId: departments?.[0]?.id ?? '' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(p: Program) {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      departmentId: p.departmentId,
      durationYears: String(p.durationYears),
      intake: String(p.intake),
    });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Code is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.departmentId) e.departmentId = 'Department is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        departmentId: form.departmentId,
        durationYears: Number(form.durationYears) || 1,
        intake: Number(form.intake) || 0,
        color: editing?.color ?? NAVY,
      };
      if (editing) {
        await adminService.programs.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.programs.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save program');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.programs.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove program');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Program>[] = [
    { key: 'code', header: 'Code', render: (p) => <span className="font-semibold text-ink">{p.code}</span> },
    { key: 'name', header: 'Name', render: (p) => p.name },
    { key: 'department', header: 'Department', render: (p) => departmentName(p.departmentId) },
    { key: 'durationYears', header: 'Duration', render: (p) => `${p.durationYears} yrs` },
    { key: 'intake', header: 'Intake', render: (p) => p.intake },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (p) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(p)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(p)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Programs"
        subtitle={rows ? `${rows.length} programs` : undefined}
        action={<Button label="Add program" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No programs found" actionLabel="Add program" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit program' : 'Add program'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" required error={errors.code} value={form.code} onChangeText={(v) => setField('code', v)} />
            <TextField label="Name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} />
            <Select
              label="Department"
              required
              error={errors.departmentId}
              value={form.departmentId}
              onChange={(v) => setField('departmentId', v)}
              options={departmentOptions}
            />
            <TextField
              label="Duration (years)"
              type="number"
              value={form.durationYears}
              onChangeText={(v) => setForm((f) => ({ ...f, durationYears: v }))}
            />
            <TextField label="Intake" type="number" value={form.intake} onChangeText={(v) => setForm((f) => ({ ...f, intake: v }))} />
          </div>
          {!editing && (
            <p className="text-caption text-ink-soft">
              Semesters 1–{(Number(form.durationYears) || 0) * 2} are generated automatically when the program is created.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add program'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove program"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
