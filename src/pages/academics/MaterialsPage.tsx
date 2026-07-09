import { useState } from 'react';
import { adminService } from '../../services';
import * as materialService from '../../services/materialService';
import { useAsync } from '../../hooks/useAsync';
import type { Material, MaterialKind } from '../../data/types';
import { formatRelative } from '../../lib';
import {
  PageHeader,
  Button,
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

const ALL_SUBJECTS = '__all__';
const MATERIAL_KINDS: MaterialKind[] = ['note', 'pdf', 'link', 'video'];

const kindTone: Record<MaterialKind, 'create' | 'update' | 'delete' | 'broadcast' | 'neutral'> = {
  note: 'update',
  pdf: 'delete',
  link: 'broadcast',
  video: 'create',
};

const emptyForm = {
  subjectId: '',
  title: '',
  kind: 'note' as MaterialKind,
  sizeLabel: '',
  url: '',
};

export function MaterialsPage() {
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);
  const [filterSubjectId, setFilterSubjectId] = useState(ALL_SUBJECTS);
  const { data: rows, loading, reload } = useAsync(
    () => materialService.list(filterSubjectId === ALL_SUBJECTS ? undefined : filterSubjectId),
    [filterSubjectId],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const subjectOptions = (subjects ?? []).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));
  const filterOptions = [{ label: 'All subjects', value: ALL_SUBJECTS }, ...subjectOptions];

  function subjectName(subjectId: string): string {
    const subject = subjects?.find((s) => s.id === subjectId);
    return subject ? `${subject.code} — ${subject.name}` : subjectId;
  }

  function openCreate() {
    setForm({ ...emptyForm, subjectId: subjects?.[0]?.id ?? '' });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.subjectId || !form.title.trim() || !form.url.trim()) {
      setFormError('Subject, title, and URL are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        subjectId: form.subjectId,
        title: form.title,
        kind: form.kind,
        sizeLabel: form.sizeLabel || undefined,
        url: form.url,
      };
      await materialService.upload(payload);
      setSuccessMsg(`Uploaded "${payload.title}"`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not upload material');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await materialService.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove material');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Material>[] = [
    { key: 'title', header: 'Title', render: (m) => <span className="font-semibold text-ink">{m.title}</span> },
    { key: 'subject', header: 'Subject', render: (m) => subjectName(m.subjectId) },
    { key: 'kind', header: 'Kind', render: (m) => <Badge label={m.kind} tone={kindTone[m.kind]} /> },
    { key: 'sizeLabel', header: 'Size', render: (m) => m.sizeLabel ?? <span className="text-ink-soft">—</span> },
    { key: 'addedAt', header: 'Added', render: (m) => formatRelative(m.addedAt) },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (m) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(m)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Materials"
        subtitle={rows ? `${rows.length} materials` : undefined}
        action={<Button label="Upload material" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 max-w-xs">
        <Select label="Filter by subject" value={filterSubjectId} onChange={setFilterSubjectId} options={filterOptions} />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="subject" title="No materials found" actionLabel="Upload material" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload material">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Subject"
            value={form.subjectId}
            onChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}
            options={subjectOptions}
          />
          <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Material title" />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Kind"
              value={form.kind}
              onChange={(v) => setForm((f) => ({ ...f, kind: v as MaterialKind }))}
              options={MATERIAL_KINDS.map((k) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: k }))}
            />
            <TextField
              label="Size label (optional)"
              value={form.sizeLabel}
              onChangeText={(v) => setForm((f) => ({ ...f, sizeLabel: v }))}
              placeholder="2.4 MB"
            />
          </div>
          <TextField label="URL" value={form.url} onChangeText={(v) => setForm((f) => ({ ...f, url: v }))} placeholder="https://…" />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Upload material" size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove material"
        message={`Remove "${deleteTarget?.title}"? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
