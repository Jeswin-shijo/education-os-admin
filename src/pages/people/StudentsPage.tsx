import { useEffect, useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { Section, Semester, Student } from '../../data/types';
import { isEmail } from '../../lib/validation';
import { toLocalISODate } from '../../lib/date';
import { cn } from '../../lib/cn';
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
  DatePicker,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
  Icon,
  Pagination,
} from '../../components';

const NAVY = '#13327F';
const MAX_PHOTO_BYTES = 800 * 1024; // keep localStorage-friendly

const GENDER_OPTIONS: Student['gender'][] = ['Male', 'Female', 'Other'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm = {
  name: '',
  rollNo: '',
  admissionNo: '',
  email: '',
  phone: '',
  departmentId: '',
  programId: '',
  semesterId: '',
  sectionId: '',
  year: '1',
  cgpa: '0',
  mentorName: '',
  bloodGroup: BLOOD_GROUP_OPTIONS[6], // O+
  gender: GENDER_OPTIONS[0],
  dob: '',
  password: '',
  address: '',
  avatarUrl: '',
};

/** Auto-generate a password as `Name@BirthYear` (e.g. Ashika@2000) from the
 *  student's first name and DOB. Empty until both are known. */
function generatePassword(name: string, dob: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const year = dob ? dob.slice(0, 4) : '';
  if (!first || !year) return '';
  return `${first.charAt(0).toUpperCase()}${first.slice(1)}@${year}`;
}

export function StudentsPage() {
  const [q, setQ] = useState('');
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.students.listPage(q, p), [q]);
  const { data: departments } = useAsync(() => adminService.departments.list(), []);
  const { data: allPrograms } = useAsync(() => adminService.programs.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [semesterOptions, setSemesterOptions] = useState<Semester[]>([]);
  const [sectionOptions, setSectionOptions] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  // Once the admin types their own password, stop auto-filling it from name/DOB.
  const [passwordManual, setPasswordManual] = useState(false);
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  // Keep the password in sync with name/DOB (as `Name@BirthYear`) while creating,
  // until the admin edits it by hand.
  useEffect(() => {
    if (editing || passwordManual) return;
    const gen = generatePassword(form.name, form.dob);
    if (!gen) return;
    setForm((f) => (f.password === gen ? f : { ...f, password: gen }));
  }, [form.name, form.dob, editing, passwordManual]);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const departmentName = (id: string) => departments?.find((d) => d.id === id)?.code ?? '—';
  const programsForDept = (departmentId: string) => (allPrograms ?? []).filter((p) => p.departmentId === departmentId);

  async function loadSemesters(programId: string) {
    const rows = programId ? await adminService.semesters.list(programId) : [];
    setSemesterOptions(rows);
    return rows;
  }

  async function loadSections(semesterId: string) {
    const rows = semesterId ? await adminService.sections.list(semesterId) : [];
    setSectionOptions(rows);
    return rows;
  }

  async function openCreate() {
    setEditing(null);
    const firstDept = departments?.[0]?.id ?? '';
    const firstProgram = programsForDept(firstDept)[0]?.id ?? '';
    const sems = await loadSemesters(firstProgram);
    const firstSemester = sems[0]?.id ?? '';
    const secs = await loadSections(firstSemester);
    setForm({ ...emptyForm, departmentId: firstDept, programId: firstProgram, semesterId: firstSemester, sectionId: secs[0]?.id ?? '' });
    setFormError(undefined);
    setPhotoError(undefined);
    setShowPassword(false);
    setPasswordManual(false);
    resetErrors();
    setModalOpen(true);
  }

  async function openEdit(s: Student) {
    setEditing(s);
    await loadSemesters(s.programId);
    await loadSections(s.semesterId);
    setForm({
      name: s.name,
      rollNo: s.rollNo,
      admissionNo: s.admissionNo,
      email: s.email,
      phone: s.phone,
      departmentId: s.departmentId,
      programId: s.programId,
      semesterId: s.semesterId,
      sectionId: s.sectionId,
      year: String(s.year),
      cgpa: String(s.cgpa),
      mentorName: s.mentorName,
      bloodGroup: s.bloodGroup,
      gender: s.gender,
      dob: s.dob,
      password: '',
      address: s.address ?? '',
      avatarUrl: s.avatarUrl ?? '',
    });
    setFormError(undefined);
    setPhotoError(undefined);
    setShowPassword(false);
    setPasswordManual(false);
    resetErrors();
    setModalOpen(true);
  }

  async function handleDepartmentChange(departmentId: string) {
    const firstProgram = programsForDept(departmentId)[0]?.id ?? '';
    const sems = await loadSemesters(firstProgram);
    const firstSemester = sems[0]?.id ?? '';
    const secs = await loadSections(firstSemester);
    setForm((f) => ({ ...f, departmentId, programId: firstProgram, semesterId: firstSemester, sectionId: secs[0]?.id ?? '' }));
    setErrors((e) => ({ ...e, departmentId: undefined, programId: undefined, semesterId: undefined, sectionId: undefined }));
  }

  async function handleProgramChange(programId: string) {
    const sems = await loadSemesters(programId);
    const firstSemester = sems[0]?.id ?? '';
    const secs = await loadSections(firstSemester);
    setForm((f) => ({ ...f, programId, semesterId: firstSemester, sectionId: secs[0]?.id ?? '' }));
    setErrors((e) => ({ ...e, programId: undefined, semesterId: undefined, sectionId: undefined }));
  }

  async function handleSemesterChange(semesterId: string) {
    const secs = await loadSections(semesterId);
    setForm((f) => ({ ...f, semesterId, sectionId: secs[0]?.id ?? '' }));
    setErrors((e) => ({ ...e, semesterId: undefined, sectionId: undefined }));
  }

  function handlePhotoChange(file: File | undefined) {
    setPhotoError(undefined);
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Photo is too large — please choose one under 800KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, avatarUrl: String(reader.result ?? '') }));
    reader.readAsDataURL(file);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.rollNo.trim()) e.rollNo = 'Roll number is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!isEmail(form.email)) e.email = 'Enter a valid email';
    if (!editing) {
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    }
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.programId) e.programId = 'Program is required';
    if (!form.semesterId) e.semesterId = 'Semester is required';
    if (!form.sectionId) e.sectionId = 'Section is required';
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
        rollNo: form.rollNo,
        admissionNo: form.admissionNo,
        email: form.email,
        phone: form.phone,
        departmentId: form.departmentId,
        programId: form.programId,
        semesterId: form.semesterId,
        sectionId: form.sectionId,
        year: Number(form.year) || 1,
        cgpa: Number(form.cgpa) || 0,
        avatarColor: editing?.avatarColor ?? NAVY,
        avatarUrl: form.avatarUrl || undefined,
        mentorName: form.mentorName,
        bloodGroup: form.bloodGroup,
        gender: form.gender,
        dob: form.dob,
        address: form.address,
      };
      if (editing) {
        await adminService.students.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
        await adminService.students.create({ ...payload, password: form.password });
        setSuccessMsg(`Added ${payload.name}`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save student');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.students.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove student');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Student>[] = [
    {
      key: 'name',
      header: 'Student',
      render: (s) => (
        <div className="flex items-center gap-3">
          <Avatar name={s.name} size={32} color={s.avatarColor} uri={s.avatarUrl} />
          <div>
            <div className="font-semibold text-ink">{s.name}</div>
            <div className="text-caption text-ink-soft">{s.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'rollNo', header: 'Roll No.', render: (s) => s.rollNo },
    { key: 'branch', header: 'Branch', render: (s) => departmentName(s.departmentId) },
    { key: 'cgpa', header: 'CGPA', render: (s) => s.cgpa.toFixed(1) },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (s) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(s)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(s)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={rows ? `${rows.length} students` : undefined}
        action={<Button label="Add student" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, roll no, email…" />
      </div>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="people" title="No students found" actionLabel="Add student" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit student' : 'Add student'} width={560}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}

          <div className="flex items-center gap-4">
            <Avatar name={form.name || 'New Student'} size={56} color={NAVY} uri={form.avatarUrl || undefined} />
            <div className="flex-1">
              <label className="text-label uppercase tracking-wide text-ink-muted">Profile photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                className="mt-1.5 block w-full text-small text-ink-muted file:mr-3 file:rounded-md file:border-0 file:bg-navy-soft file:px-3 file:py-1.5 file:text-small file:font-semibold file:text-navy hover:file:bg-navy-soft/80"
              />
              {photoError && <div className="mt-1 text-caption text-danger">{photoError}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Full name" required error={errors.name} value={form.name} onChangeText={(v) => setField('name', v)} />
            <TextField label="Roll number" required error={errors.rollNo} value={form.rollNo} onChangeText={(v) => setField('rollNo', v)} />
            <TextField label="Admission no." value={form.admissionNo} onChangeText={(v) => setForm((f) => ({ ...f, admissionNo: v }))} />
            <TextField label="Email" type="email" autoComplete="off" required error={errors.email} value={form.email} onChangeText={(v) => setField('email', v)} />
            <TextField label="Phone" autoComplete="off" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <Select
              label="Gender"
              value={form.gender}
              onChange={(v) => setForm((f) => ({ ...f, gender: v as Student['gender'] }))}
              options={GENDER_OPTIONS.map((g) => ({ label: g, value: g }))}
            />
            <DatePicker
              label="Date of birth"
              value={form.dob}
              onChange={(v) => setForm((f) => ({ ...f, dob: v }))}
              maxDate={toLocalISODate(new Date())}
            />
            {!editing && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-label uppercase tracking-wide text-ink-muted">
                    Password<span className="text-danger"> *</span>
                  </span>
                  <button
                    type="button"
                    disabled={!generatePassword(form.name, form.dob)}
                    onClick={() => {
                      setForm((f) => ({ ...f, password: generatePassword(f.name, f.dob) }));
                      setPasswordManual(false);
                      clearError('password');
                    }}
                    title="Generate as Name@BirthYear"
                    className="text-caption font-semibold text-navy hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    Auto-generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => {
                      setField('password', e.target.value);
                      setPasswordManual(true);
                    }}
                    placeholder="Name@BirthYear"
                    className={cn(
                      'w-full rounded-md border bg-surface px-3 py-2.5 pr-10 text-body text-ink outline-none transition-colors',
                      'focus:border-navy focus:ring-2 focus:ring-navy-soft',
                      errors.password ? 'border-danger' : 'border-line',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-ink"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
                  </button>
                </div>
                {errors.password && <span className="text-caption text-danger">{errors.password}</span>}
              </div>
            )}
            <Select
              label="Department"
              required
              error={errors.departmentId}
              value={form.departmentId}
              onChange={handleDepartmentChange}
              options={(departments ?? []).map((d) => ({ label: d.name, value: d.id }))}
            />
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
              onChange={handleSemesterChange}
              options={semesterOptions.map((s) => ({ label: `Semester ${s.number}`, value: s.id }))}
            />
            <Select
              label="Section"
              required
              error={errors.sectionId}
              value={form.sectionId}
              onChange={(v) => setField('sectionId', v)}
              options={sectionOptions.map((s) => ({ label: `Section ${s.name}`, value: s.id }))}
            />
            <TextField label="Year" type="number" value={form.year} onChangeText={(v) => setForm((f) => ({ ...f, year: v }))} />
            <TextField label="CGPA" type="number" value={form.cgpa} onChangeText={(v) => setForm((f) => ({ ...f, cgpa: v }))} />
            <Select
              label="Blood group"
              value={form.bloodGroup}
              onChange={(v) => setForm((f) => ({ ...f, bloodGroup: v }))}
              options={BLOOD_GROUP_OPTIONS.map((b) => ({ label: b, value: b }))}
            />
          </div>
          <TextField label="Mentor" value={form.mentorName} onChangeText={(v) => setForm((f) => ({ ...f, mentorName: v }))} />
          <label className="flex flex-col gap-1.5">
            <span className="text-label uppercase tracking-wide text-ink-muted">Address</span>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="House / street, city, state, PIN"
              className="resize-y rounded-md border border-line bg-surface px-3 py-2.5 text-body text-ink outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-navy-soft"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add student'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove student"
        message={`Remove ${deleteTarget?.name}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
