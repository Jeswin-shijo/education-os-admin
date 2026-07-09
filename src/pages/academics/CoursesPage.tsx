import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Course } from '../../data/types';
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
  departmentCode: '',
  durationYears: '4',
  intake: '60',
};

export function CoursesPage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.courses.list(), []);
  const { data: departments } = useAsync(() => adminService.departments.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
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

  function openEdit(c: Course) {
    setEditing(c);
    setForm({
      code: c.code,
      name: c.name,
      departmentCode: c.departmentCode,
      durationYears: String(c.durationYears),
      intake: String(c.intake),
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim() || !form.departmentCode.trim()) {
      setFormError('Code, name, and department are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        departmentCode: form.departmentCode,
        durationYears: Number(form.durationYears) || 1,
        intake: Number(form.intake) || 0,
        color: editing?.color ?? NAVY,
      };
      if (editing) {
        await adminService.courses.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.courses.create(payload);
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save course');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.courses.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove course');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Course>[] = [
    { key: 'code', header: 'Code', render: (c) => <span className="font-semibold text-ink">{c.code}</span> },
    { key: 'name', header: 'Name', render: (c) => c.name },
    { key: 'departmentCode', header: 'Department', render: (c) => c.departmentCode },
    { key: 'durationYears', header: 'Duration', render: (c) => `${c.durationYears} yrs` },
    { key: 'intake', header: 'Intake', render: (c) => c.intake },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (c) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(c)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(c)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle={rows ? `${rows.length} courses` : undefined}
        action={<Button label="Add course" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No courses found" actionLabel="Add course" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit course' : 'Add course'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" value={form.code} onChangeText={(v) => setForm((f) => ({ ...f, code: v }))} />
            <TextField label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Select
              label="Department"
              value={form.departmentCode}
              onChange={(v) => setForm((f) => ({ ...f, departmentCode: v }))}
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
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add course'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove course"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
