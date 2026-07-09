import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { FacultyMember } from '../../data/types';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Avatar,
  Modal,
  TextField,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const PURPLE = '#7C3AED';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
};

export function FacultyPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.faculty.list(q), [q]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FacultyMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<FacultyMember | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  function openEdit(f: FacultyMember) {
    setEditing(f);
    setForm({
      name: f.name,
      email: f.email,
      phone: f.phone,
      department: f.department,
      designation: f.designation,
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.department.trim()) {
      setFormError('Name, email, and department are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        designation: form.designation,
        avatarColor: editing?.avatarColor ?? PURPLE,
      };
      if (editing) {
        await adminService.faculty.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.faculty.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save faculty member');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.faculty.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove faculty member');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<FacultyMember>[] = [
    {
      key: 'name',
      header: 'Faculty',
      render: (f) => (
        <div className="flex items-center gap-3">
          <Avatar name={f.name} size={32} color={f.avatarColor} />
          <div>
            <div className="font-semibold text-ink">{f.name}</div>
            <div className="text-caption text-ink-soft">{f.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'department', header: 'Department', render: (f) => f.department },
    { key: 'designation', header: 'Designation', render: (f) => f.designation },
    { key: 'phone', header: 'Phone', render: (f) => f.phone },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (f) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(f)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(f)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Faculty"
        subtitle={rows ? `${rows.length} faculty members` : undefined}
        action={<Button label="Add faculty" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, email, department…" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="people" title="No faculty found" actionLabel="Add faculty" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit faculty' : 'Add faculty'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Full name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <TextField label="Email" type="email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
            <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <TextField label="Designation" value={form.designation} onChangeText={(v) => setForm((f) => ({ ...f, designation: v }))} />
          </div>
          <TextField label="Department" value={form.department} onChangeText={(v) => setForm((f) => ({ ...f, department: v }))} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add faculty'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove faculty"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
