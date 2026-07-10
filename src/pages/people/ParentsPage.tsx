import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { isEmail } from '../../lib/validation';
import type { ParentAccount } from '../../data/types';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Avatar,
  Modal,
  TextField,
  Select,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const TEAL = '#0D9488';

export function ParentsPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.parents.list(q), [q]);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const emptyForm = {
    name: '',
    email: '',
    phone: '',
    relation: '',
    childId: '',
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ParentAccount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<ParentAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, childId: students?.[0]?.id ?? '' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(p: ParentAccount) {
    setEditing(p);
    setForm({
      name: p.name,
      email: p.email,
      phone: p.phone,
      relation: p.relation,
      childId: p.childId,
    });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email';
    if (!form.childId) e.childId = 'Child is required';
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
        relation: form.relation,
        childId: form.childId,
        avatarColor: editing?.avatarColor ?? TEAL,
      };
      if (editing) {
        await adminService.parents.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.parents.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save parent');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.parents.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove parent');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<ParentAccount>[] = [
    {
      key: 'name',
      header: 'Parent',
      render: (p) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.name} size={32} color={p.avatarColor} />
          <div>
            <div className="font-semibold text-ink">{p.name}</div>
            <div className="text-caption text-ink-soft">{p.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'relation', header: 'Relation', render: (p) => p.relation },
    { key: 'phone', header: 'Phone', render: (p) => p.phone },
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

  const studentOptions = (students ?? []).map((s) => ({ label: `${s.name} (${s.rollNo})`, value: s.id }));

  return (
    <div>
      <PageHeader
        title="Parents"
        subtitle={rows ? `${rows.length} parents` : undefined}
        action={<Button label="Add parent" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, email, relation…" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="people" title="No parents found" actionLabel="Add parent" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit parent' : 'Add parent'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Full name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} />
            <TextField label="Email" type="email" autoComplete="off" required error={errors.email} value={form.email} onChangeText={(v) => setField('email', v)} />
            <TextField label="Phone" autoComplete="off" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <TextField label="Relation" value={form.relation} onChangeText={(v) => setForm((f) => ({ ...f, relation: v }))} />
          </div>
          <Select
            label="Child"
            required
            error={errors.childId}
            value={form.childId}
            onChange={(v) => setField('childId', v)}
            options={studentOptions}
          />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add parent'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove parent"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
