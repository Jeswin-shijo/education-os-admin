import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Section } from '../../data/types';
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

export function SectionsPage() {
  const { data: programs } = useAsync(() => adminService.programs.list(), []);
  const { data: semesters } = useAsync(() => adminService.semesters.list(), []);
  const { data: rows, loading, reload } = useAsync(() => adminService.sections.list(), []);

  const semesterLabel = (id: string) => {
    const sem = semesters?.find((s) => s.id === id);
    if (!sem) return '—';
    const program = programs?.find((p) => p.id === sem.programId);
    return `${program?.name ?? sem.programId} — Semester ${sem.number}`;
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ semesterId: '', name: 'A' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setForm({ semesterId: semesters?.[0]?.id ?? '', name: 'A' });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.semesterId || !form.name.trim()) {
      setFormError('Semester and name are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      await adminService.sections.create({ semesterId: form.semesterId, name: form.name.trim().toUpperCase() });
      setSuccessMsg(`Added section ${form.name}`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save section');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.sections.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove section');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Section>[] = [
    { key: 'semester', header: 'Semester', render: (s) => semesterLabel(s.semesterId) },
    { key: 'name', header: 'Section', render: (s) => s.name },
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
        title="Sections"
        subtitle={rows ? `${rows.length} sections` : undefined}
        action={<Button label="Add section" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No sections found" actionLabel="Add section" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add section">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Semester"
            value={form.semesterId}
            onChange={(v) => setForm((f) => ({ ...f, semesterId: v }))}
            options={(semesters ?? []).map((s) => ({ label: semesterLabel(s.id), value: s.id }))}
          />
          <TextField label="Section name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="A" />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add section" size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove section"
        message={`Remove Section ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
