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
  TextField,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const emptyForm = {
  code: '',
  name: '',
  hod: '',
};

export function DepartmentsPage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.departments.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

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
      hod: d.hod ?? '',
    });
    setFormError(undefined);
    setModalOpen(true);
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
        hod: form.hod.trim() || undefined,
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
    { key: 'hod', header: 'HOD', render: (d) => d.hod || <span className="text-ink-soft">—</span> },
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
            <TextField label="Code" value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))} />
            <TextField label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
          </div>
          <TextField label="HOD (optional)" value={form.hod} onChangeText={(v) => setForm((f) => ({ ...f, hod: v }))} />
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
