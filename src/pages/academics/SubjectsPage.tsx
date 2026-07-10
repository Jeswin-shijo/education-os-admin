import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
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
  departmentId: '',
  programId: '', // transient — only used to filter the Semester dropdown, not stored on Subject
  semesterId: '',
  facultyId: '',
};

export function SubjectsPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.subjects.list(q), [q]);
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
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const departmentOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.id }));
  const departmentName = (id: string) => departments?.find((d) => d.id === id)?.name ?? '—';
  const facultyName = (id?: string) => facultyCandidates?.find((f) => f.id === id)?.fullName ?? '—';
  const programsForDept = (departmentId: string) => (allPrograms ?? []).filter((p) => p.departmentId === departmentId);

  async function loadSemesters(programId: string) {
    if (!programId) {
      setSemesterOptions([]);
      return;
    }
    const rows = await adminService.semesters.list(programId);
    setSemesterOptions(rows.map((s) => ({ id: s.id, number: s.number })));
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
    // Best-effort: find which program this subject's semester belongs to, for the cascade.
    const owningProgramId = (allPrograms ?? []).find((p) => p.departmentId === s.departmentId)?.id ?? '';
    setForm({
      code: s.code,
      name: s.name,
      credits: String(s.credits),
      departmentId: s.departmentId,
      programId: owningProgramId,
      semesterId: s.semesterId,
      facultyId: s.facultyId ?? '',
    });
    await loadSemesters(owningProgramId);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  async function handleDepartmentChange(departmentId: string) {
    const firstProgram = programsForDept(departmentId)[0]?.id ?? '';
    setForm((f) => ({ ...f, departmentId, programId: firstProgram, semesterId: '' }));
    setErrors((e) => ({ ...e, departmentId: undefined, semesterId: undefined }));
    await loadSemesters(firstProgram);
  }

  async function handleProgramChange(programId: string) {
    setForm((f) => ({ ...f, programId, semesterId: '' }));
    setErrors((e) => ({ ...e, semesterId: undefined }));
    await loadSemesters(programId);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = 'Code is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.semesterId) e.semesterId = 'Semester is required';
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
        semesterId: form.semesterId,
        facultyId: form.facultyId || undefined,
        facultyName: form.facultyId ? facultyName(form.facultyId) : undefined,
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
    { key: 'faculty', header: 'Faculty', render: (s) => s.facultyName ?? facultyName(s.facultyId) },
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit subject' : 'Add subject'} width={560}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" required error={errors.code} value={form.code} onChangeText={(v) => setField('code', v)} />
            <TextField label="Name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} />
            <TextField label="Credits" type="number" value={form.credits} onChangeText={(v) => setForm((f) => ({ ...f, credits: v }))} />
            <Select
              label="Faculty"
              value={form.facultyId}
              onChange={(v) => setForm((f) => ({ ...f, facultyId: v }))}
              options={[{ label: 'Unassigned', value: '' }, ...(facultyCandidates ?? []).map((c) => ({ label: c.fullName, value: c.id }))]}
            />
            <Select label="Department" required error={errors.departmentId} value={form.departmentId} onChange={handleDepartmentChange} options={departmentOptions} />
            <Select
              label="Program"
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
          </div>
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
