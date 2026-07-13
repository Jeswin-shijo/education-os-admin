import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { isEmail } from '../../lib/validation';
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
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB — uploaded to object storage, not localStorage

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
  qualifications: '',
  experience: '',
  photoUrl: '',
};

export function FacultyPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.faculty.list(q), [q]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FacultyMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function handlePhotoChange(file: File | undefined) {
    setPhotoError(undefined);
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo is too large — please choose one under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, photoUrl: String(reader.result ?? '') }));
    reader.readAsDataURL(file);
  }

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<FacultyMember | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setPhotoError(undefined);
    resetErrors();
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
      qualifications: f.qualifications ?? '',
      experience: f.experience ?? '',
      photoUrl: f.photoUrl ?? '',
    });
    setFormError(undefined);
    setPhotoError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email';
    if (!form.department.trim()) e.department = 'Department is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        designation: form.designation,
        qualifications: form.qualifications,
        experience: form.experience,
        photoUrl: form.photoUrl,
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
          <Avatar name={f.name} size={32} color={f.avatarColor} uri={f.photoUrl} />
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
            <TextField label="Full name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} />
            <TextField label="Email" type="email" autoComplete="off" required error={errors.email} value={form.email} onChangeText={(v) => setField('email', v)} />
            <TextField label="Phone" autoComplete="off" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <TextField label="Designation" value={form.designation} onChangeText={(v) => setForm((f) => ({ ...f, designation: v }))} />
          </div>
          <TextField label="Department" required error={errors.department} value={form.department} onChangeText={(v) => setField('department', v)} />
          <div className="flex items-center gap-3">
            <Avatar name={form.name || 'Faculty'} size={44} color={editing?.avatarColor ?? PURPLE} uri={form.photoUrl || undefined} />
            <div className="flex-1">
              <label className="text-label uppercase tracking-wide text-ink-muted">Profile picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                className="mt-1 block w-full text-small text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-navy-soft file:px-3 file:py-1.5 file:text-small file:font-semibold file:text-navy hover:file:bg-navy-soft/70"
              />
              {photoError && <div className="mt-1 text-caption text-danger">{photoError}</div>}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-label uppercase tracking-wide text-ink-muted">Educational qualifications</span>
            <textarea
              rows={3}
              value={form.qualifications}
              onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
              className="resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-body text-ink outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-label uppercase tracking-wide text-ink-muted">Previous work experience</span>
            <textarea
              rows={3}
              value={form.experience}
              onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
              className="resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-body text-ink outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy-soft"
            />
          </label>
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
