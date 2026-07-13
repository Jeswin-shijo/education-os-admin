import { useState } from 'react';
import { adminService } from '../../services';
import * as materialService from '../../services/materialService';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
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
  Pagination,
} from '../../components';

const ALL_SUBJECTS = '__all__';
// Kinds offered when uploading a file. `link` is excluded (a link needs a URL, which this
// modal no longer collects). These are backend-valid Material kinds — note that the backend
// has no `pdf`; PDFs and slide decks are represented as `slide`.
const UPLOADABLE_KINDS: MaterialKind[] = ['note', 'slide', 'video'];
// Mock mode persists the file as a data URL in localStorage (~5MB origin quota, and base64
// inflates it ~33%), so keep uploads small — in line with the profile-photo pickers.
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB

const kindTone: Record<MaterialKind, 'create' | 'update' | 'delete' | 'broadcast' | 'neutral'> = {
  note: 'update',
  pdf: 'delete',
  slide: 'neutral',
  link: 'broadcast',
  video: 'create',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// The backend has no `pdf` kind — PDFs and slide decks map to `slide`.
function inferKind(file: File): MaterialKind {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'slide';
  if (file.type.startsWith('video/')) return 'video';
  return 'note';
}

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
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList(
    (p) => materialService.listPage(filterSubjectId === ALL_SUBJECTS ? undefined : filterSubjectId, p),
    [filterSubjectId],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fileName, setFileName] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  function handleFileChange(file: File | undefined) {
    clearError('file');
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileName(undefined);
      setForm((f) => ({ ...f, url: '' }));
      setErrors((e) => ({ ...e, file: `File is too large — please choose one under ${formatBytes(MAX_FILE_BYTES)}` }));
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    // Read the file into a data URL (same approach as the profile-photo pickers) and
    // auto-fill size + kind from the file; both stay editable in the fields below.
    reader.onload = () =>
      setForm((f) => ({
        ...f,
        url: String(reader.result ?? ''),
        // Recompute size + kind from the file on every pick (so re-picking a different
        // file updates them); both remain editable in the fields below.
        sizeLabel: formatBytes(file.size),
        kind: inferKind(file),
      }));
    reader.readAsDataURL(file);
  }

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
    setFileName(undefined);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.subjectId) e.subjectId = 'Subject is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.url) e.file = 'File is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        subjectId: form.subjectId,
        title: form.title,
        kind: form.kind,
        sizeLabel: form.sizeLabel || undefined,
        url: form.url,
        fileName,
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
      ) : rows.length === 0 ? (
        <EmptyState icon="subject" title="No materials found" actionLabel="Upload material" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload material">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Subject"
            required
            error={errors.subjectId}
            value={form.subjectId}
            onChange={(v) => setField('subjectId', v)}
            options={subjectOptions}
          />
          <TextField label="Title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} placeholder="Material title" />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Kind"
              value={form.kind}
              onChange={(v) => setForm((f) => ({ ...f, kind: v as MaterialKind }))}
              options={UPLOADABLE_KINDS.map((k) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: k }))}
            />
            <TextField
              label="Size label (optional)"
              value={form.sizeLabel}
              onChangeText={(v) => setForm((f) => ({ ...f, sizeLabel: v }))}
              placeholder="2.4 MB"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-label uppercase tracking-wide text-ink-muted">
              File<span className="text-danger"> *</span>
            </span>
            <input
              type="file"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="block w-full text-small text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-navy-soft file:px-3 file:py-1.5 file:text-small file:font-semibold file:text-navy hover:file:bg-navy-soft/70"
            />
            {fileName && !errors.file && (
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-navy-soft px-2.5 py-1 text-caption text-navy">
                {fileName}
              </span>
            )}
            {errors.file && <span className="text-caption text-danger">{errors.file}</span>}
          </div>
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
