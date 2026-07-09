import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { CORE_SUBJECT_IDS } from '../../data/seed';
import type { Subject } from '../../data/types';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  Badge,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const NAVY = '#13327F';

const emptyForm = {
  code: '',
  name: '',
  credits: '3',
  faculty: '',
  departmentCode: '',
};

export function SubjectsPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.subjects.list(q), [q]);
  const { data: departments } = useAsync(() => adminService.departments.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const departmentOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.code }));

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, departmentCode: departments?.[0]?.code ?? '' });
    setFormError(undefined);
    setModalOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setForm({
      code: s.code,
      name: s.name,
      credits: String(s.credits),
      faculty: s.faculty,
      departmentCode: s.departmentCode,
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim() || !form.faculty.trim() || !form.departmentCode.trim()) {
      setFormError('Code, name, faculty, and department are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        credits: Number(form.credits) || 1,
        faculty: form.faculty,
        departmentCode: form.departmentCode,
        color: editing?.color ?? NAVY,
      };
      if (editing) {
        await adminService.subjects.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.subjects.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save subject');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.subjects.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove subject');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Subject>[] = [
    {
      key: 'name',
      header: 'Subject',
      render: (s) => (
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-ink">{s.code}</div>
            <div className="text-caption text-ink-soft">{s.name}</div>
          </div>
          {CORE_SUBJECT_IDS.includes(s.id) && <Badge label="Core" tone="neutral" />}
        </div>
      ),
    },
    { key: 'credits', header: 'Credits', render: (s) => s.credits },
    { key: 'faculty', header: 'Faculty', render: (s) => s.faculty },
    { key: 'departmentCode', header: 'Department', render: (s) => s.departmentCode },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (s) => {
        const isCore = CORE_SUBJECT_IDS.includes(s.id);
        return (
          <div className="flex justify-end gap-1.5">
            <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(s)} />
            {!isCore && (
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                className="text-danger hover:bg-danger-soft"
                onClick={() => setDeleteTarget(s)}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle={rows ? `${rows.length} subjects` : undefined}
        action={<Button label="Add subject" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, code, faculty…" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No subjects found" actionLabel="Add subject" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit subject' : 'Add subject'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))} />
            <TextField label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <TextField label="Credits" type="number" value={form.credits} onChangeText={(v) => setForm((f) => ({ ...f, credits: v }))} />
            <Select
              label="Department"
              value={form.departmentCode}
              onChange={(v) => setForm((f) => ({ ...f, departmentCode: v }))}
              options={departmentOptions}
            />
          </div>
          <TextField label="Faculty" value={form.faculty} onChangeText={(v) => setForm((f) => ({ ...f, faculty: v }))} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add subject'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove subject"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
