import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Department } from '../../data/types';
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

// Standard department code/name presets — keeps entries consistent instead of free text.
const DEPARTMENT_PRESETS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'CHEM', name: 'Chemical Engineering' },
  { code: 'BIOTECH', name: 'Biotechnology' },
  { code: 'MBA', name: 'Business Administration' },
  { code: 'MCA', name: 'Computer Applications' },
];

const NO_HOD = '__none__';

const emptyForm = {
  code: DEPARTMENT_PRESETS[0].code,
  name: DEPARTMENT_PRESETS[0].name,
  hod: NO_HOD,
};

export function DepartmentsPage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.departments.list(), []);
  const { data: hodCandidates } = useAsync(() => adminService.departments.hodCandidates(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function hodName(id?: string): string | undefined {
    return hodCandidates?.find((c) => c.id === id)?.fullName;
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  function openEdit(d: Department) {
    setEditing(d);
    setForm({
      code: d.code,
      name: d.name,
      hod: d.hod ?? NO_HOD,
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  function handleCodeChange(code: string) {
    const preset = DEPARTMENT_PRESETS.find((p) => p.code === code);
    setForm((f) => ({ ...f, code, name: preset?.name ?? f.name }));
  }

  function handleNameChange(name: string) {
    const preset = DEPARTMENT_PRESETS.find((p) => p.name === name);
    setForm((f) => ({ ...f, name, code: preset?.code ?? f.code }));
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      setFormError('Code and name are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        hod: form.hod === NO_HOD ? undefined : form.hod,
      };
      if (editing) {
        await adminService.departments.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.departments.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save department');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.departments.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove department');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Department>[] = [
    { key: 'code', header: 'Code', render: (d) => <span className="font-semibold text-ink">{d.code}</span> },
    { key: 'name', header: 'Name', render: (d) => d.name },
    { key: 'hod', header: 'HOD', render: (d) => hodName(d.hod) ?? <span className="text-ink-soft">—</span> },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (d) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(d)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(d)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle={rows ? `${rows.length} departments` : undefined}
        action={<Button label="Add department" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="campus" title="No departments found" actionLabel="Add department" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit department' : 'Add department'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Code"
              value={form.code}
              onChange={handleCodeChange}
              options={DEPARTMENT_PRESETS.map((p) => ({ label: p.code, value: p.code }))}
            />
            <Select
              label="Name"
              value={form.name}
              onChange={handleNameChange}
              options={DEPARTMENT_PRESETS.map((p) => ({ label: p.name, value: p.name }))}
            />
          </div>
          <Select
            label="HOD (optional)"
            value={form.hod}
            onChange={(v) => setForm((f) => ({ ...f, hod: v }))}
            options={[
              { label: '— None —', value: NO_HOD },
              ...(hodCandidates ?? []).map((c) => ({ label: `${c.fullName} (${c.role})`, value: c.id })),
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add department'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove department"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
