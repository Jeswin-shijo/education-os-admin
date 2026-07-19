import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
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
  SearchableSelect,
  Badge,
  ConfirmDialog,
  DetailModal,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

const NAVY = '#13327F';

const emptyForm = {
  code: '',
  name: '',
  credits: '3',
  departmentId: '',
  programId: '',
  semesterId: '',
  academicSession: '',
  facultyIds: [] as string[],
};

export function SubjectsPage() {
  const [q, setQ] = useState('');
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.subjects.listPage(q, p), [q]);
  const { data: departments } = useAsync(() => adminService.departments.list(), []);
  const { data: allPrograms } = useAsync(() => adminService.programs.list(), []);
  const { data: facultyCandidates } = useAsync(() => adminService.subjects.facultyCandidates(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [semesterOptions, setSemesterOptions] = useState<{ id: string; number: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Subject | null>(null);
  const toast = useToast();

  const departmentOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.id }));
  const departmentName = (id: string) => departments?.find((d) => d.id === id)?.name ?? '—';
  const facultyName = (id?: string) => facultyCandidates?.find((f) => f.id === id)?.fullName ?? '—';
  const facultyDisplay = (s: Subject) => {
    if (s.facultyNames && s.facultyNames.length) return s.facultyNames.join(', ');
    if (s.facultyIds && s.facultyIds.length) return s.facultyIds.map((id) => facultyName(id)).join(', ');
    return s.facultyName ?? facultyName(s.facultyId);
  };
  const programsForDept = (departmentId: string) => (allPrograms ?? []).filter((p) => p.departmentId === departmentId);

  async function loadSemesters(programId: string, preferredId?: string) {
    if (!programId) {
      setSemesterOptions([]);
      setForm((f) => ({ ...f, semesterId: '' }));
      return;
    }
    const rows = await adminService.semesters.list(programId);
    const opts = rows.map((s) => ({ id: s.id, number: s.number }));
    setSemesterOptions(opts);
    // Sync state to the option the native <select> actually displays (the first one),
    // unless a valid existing value is preferred (edit flow).
    const nextId = preferredId && opts.some((o) => o.id === preferredId) ? preferredId : (opts[0]?.id ?? '');
    setForm((f) => ({ ...f, semesterId: nextId }));
  }

  async function openCreate() {
    setEditing(null);
    const firstDept = departments?.[0]?.id ?? '';
    const firstProgram = programsForDept(firstDept)[0]?.id ?? '';
    setForm({ ...emptyForm, departmentId: firstDept, programId: firstProgram });
    await loadSemesters(firstProgram);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  async function openEdit(s: Subject) {
    setEditing(s);
    // Prefer the subject's own program; fall back to the first program in its department for the cascade.
    const owningProgramId = s.programId ?? (allPrograms ?? []).find((p) => p.departmentId === s.departmentId)?.id ?? '';
    setForm({
      code: s.code,
      name: s.name,
      credits: String(s.credits),
      departmentId: s.departmentId,
      programId: owningProgramId,
      semesterId: s.semesterId,
      academicSession: s.academicSession ?? '',
      facultyIds: s.facultyIds ?? (s.facultyId ? [s.facultyId] : []),
    });
    await loadSemesters(owningProgramId, s.semesterId);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function addFaculty(id: string) {
    if (!id) return;
    setForm((f) => (f.facultyIds.includes(id) ? f : { ...f, facultyIds: [...f.facultyIds, id] }));
    clearError('faculty');
  }

  function removeFaculty(id: string) {
    setForm((f) => ({ ...f, facultyIds: f.facultyIds.filter((x) => x !== id) }));
  }

  async function handleDepartmentChange(departmentId: string) {
    const firstProgram = programsForDept(departmentId)[0]?.id ?? '';
    setForm((f) => ({ ...f, departmentId, programId: firstProgram, semesterId: '' }));
    setErrors((e) => ({ ...e, departmentId: undefined, programId: undefined, semesterId: undefined }));
    await loadSemesters(firstProgram);
  }

  async function handleProgramChange(programId: string) {
    setForm((f) => ({ ...f, programId, semesterId: '' }));
    setErrors((e) => ({ ...e, programId: undefined, semesterId: undefined }));
    await loadSemesters(programId);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Code is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.programId) e.programId = 'Program is required';
    if (!form.semesterId) e.semesterId = 'Semester is required';
    if (!form.credits.trim() || Number(form.credits) <= 0) e.credits = 'Credits are required';
    if (!form.academicSession.trim()) e.academicSession = 'Academic session is required';
    if (form.facultyIds.length === 0) e.faculty = 'At least one faculty is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        credits: Number(form.credits) || 1,
        departmentId: form.departmentId,
        programId: form.programId,
        semesterId: form.semesterId,
        academicSession: form.academicSession.trim(),
        facultyIds: form.facultyIds,
        facultyNames: form.facultyIds.map((id) => facultyName(id)),
        color: editing?.color ?? NAVY,
      };
      if (editing) {
        await adminService.subjects.update(editing.id, payload);
        toast.success('Subject updated', payload.name);
      } else {
        await adminService.subjects.create(payload);
        toast.success('Subject added', payload.name);
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
    const removed = deleteTarget.name;
    setDeleting(true);
    try {
      await adminService.subjects.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast.success('Subject removed', removed);
    } catch (err) {
      setDeleteTarget(null);
      toast.error('Could not remove subject', err instanceof Error ? err.message : undefined);
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
    { key: 'session', header: 'Session', render: (s) => s.academicSession ?? '—' },
    { key: 'faculty', header: 'Faculty', render: (s) => facultyDisplay(s) },
    { key: 'department', header: 'Department', render: (s) => departmentName(s.departmentId) },
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

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, code, faculty…" />
      </div>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No subjects found" actionLabel="Add subject" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit subject' : 'Add subject'} width={560}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" required error={errors.code} value={form.code} onChangeText={(v) => setField('code', v)} />
            <TextField label="Name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} />
            <TextField label="Credits" required type="number" error={errors.credits} value={form.credits} onChangeText={(v) => setField('credits', v)} />
            <TextField
              label="Academic Session"
              required
              error={errors.academicSession}
              value={form.academicSession}
              onChangeText={(v) => setField('academicSession', v)}
              placeholder="2026-2027"
            />
            <Select label="Department" required error={errors.departmentId} value={form.departmentId} onChange={handleDepartmentChange} options={departmentOptions} />
            <Select
              label="Program"
              required
              error={errors.programId}
              value={form.programId}
              onChange={handleProgramChange}
              options={programsForDept(form.departmentId).map((p) => ({ label: p.name, value: p.id }))}
            />
            <Select
              label="Semester"
              required
              error={errors.semesterId}
              value={form.semesterId}
              onChange={(v) => setField('semesterId', v)}
              options={semesterOptions.map((s) => ({ label: `Semester ${s.number}`, value: s.id }))}
            />
            <div className="col-span-2 flex flex-col gap-1.5">
              <span className="text-label uppercase tracking-wide text-ink-muted">
                Faculty<span className="text-danger"> *</span>
              </span>
              <SearchableSelect
                value=""
                placeholder="Add faculty…"
                error={errors.faculty}
                onChange={addFaculty}
                options={(facultyCandidates ?? [])
                  .filter((c) => !form.facultyIds.includes(c.id))
                  .map((c) => ({ label: c.fullName, value: c.id, sub: c.email }))}
              />
              {form.facultyIds.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {form.facultyIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-navy-soft px-2.5 py-1 text-caption text-navy">
                      {facultyName(id)}
                      <button
                        type="button"
                        aria-label={`Remove ${facultyName(id)}`}
                        onClick={() => removeFaculty(id)}
                        className="leading-none text-ink-soft hover:text-danger"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add subject'} size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove subject"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
      />

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Subject details"
        header={
          detailTarget && (
            <div className="flex items-center gap-2">
              <div>
                <div className="text-h3 text-ink">{detailTarget.name}</div>
                <div className="text-small text-ink-muted">{detailTarget.code}</div>
              </div>
              {CORE_SUBJECT_IDS.includes(detailTarget.id) && <Badge label="Core" tone="neutral" />}
            </div>
          )
        }
        fields={
          detailTarget
            ? [
                { label: 'Code', value: detailTarget.code },
                { label: 'Credits', value: detailTarget.credits },
                { label: 'Academic Session', value: detailTarget.academicSession },
                { label: 'Department', value: departmentName(detailTarget.departmentId) },
                { label: 'Faculty', value: facultyDisplay(detailTarget), full: true },
              ]
            : []
        }
        onEdit={() => {
          const s = detailTarget;
          setDetailTarget(null);
          if (s) openEdit(s);
        }}
        onDelete={
          detailTarget && !CORE_SUBJECT_IDS.includes(detailTarget.id)
            ? () => {
                const s = detailTarget;
                setDetailTarget(null);
                if (s) setDeleteTarget(s);
              }
            : undefined
        }
      />
    </div>
  );
}
