import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Section, Semester, Student } from '../../data/types';
import { minLen, required, composeValidators } from '../../lib/validation';
import { toLocalISODate } from '../../lib/date';
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
  avatarUrl: '',
};

const validatePassword = composeValidators(required('Password is required'), minLen(8, 'Password must be at least 8 characters'));

export function StudentsPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.students.list(q), [q]);
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
      avatarUrl: s.avatarUrl ?? '',
    });
    setFormError(undefined);
    setPhotoError(undefined);
    setModalOpen(true);
  }

  async function handleDepartmentChange(departmentId: string) {
    const firstProgram = programsForDept(departmentId)[0]?.id ?? '';
    const sems = await loadSemesters(firstProgram);
    const firstSemester = sems[0]?.id ?? '';
    const secs = await loadSections(firstSemester);
    setForm((f) => ({ ...f, departmentId, programId: firstProgram, semesterId: firstSemester, sectionId: secs[0]?.id ?? '' }));
  }

  async function handleProgramChange(programId: string) {
    const sems = await loadSemesters(programId);
    const firstSemester = sems[0]?.id ?? '';
    const secs = await loadSections(firstSemester);
    setForm((f) => ({ ...f, programId, semesterId: firstSemester, sectionId: secs[0]?.id ?? '' }));
  }

  async function handleSemesterChange(semesterId: string) {
    const secs = await loadSections(semesterId);
    setForm((f) => ({ ...f, semesterId, sectionId: secs[0]?.id ?? '' }));
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

  async function handleSave() {
    if (!form.name.trim() || !form.rollNo.trim() || !form.email.trim() || !form.departmentId || !form.programId || !form.semesterId || !form.sectionId) {
      setFormError('Name, roll number, email, department, program, semester, and section are required');
      return;
    }
    if (!editing) {
      const passwordError = validatePassword(form.password);
      if (passwordError) {
        setFormError(passwordError);
        return;
      }
    }
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
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="people" title="No students found" actionLabel="Add student" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
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
            <TextField label="Full name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <TextField label="Roll number" value={form.rollNo} onChangeText={(v) => setForm((f) => ({ ...f, rollNo: v }))} />
            <TextField label="Admission no." value={form.admissionNo} onChangeText={(v) => setForm((f) => ({ ...f, admissionNo: v }))} />
            <TextField label="Email" type="email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
            <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            {!editing && (
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                placeholder="Min. 8 characters"
              />
            )}
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
            <Select
              label="Department"
              value={form.departmentId}
              onChange={handleDepartmentChange}
              options={(departments ?? []).map((d) => ({ label: d.name, value: d.id }))}
            />
            <Select
              label="Program"
              value={form.programId}
              onChange={handleProgramChange}
              options={programsForDept(form.departmentId).map((p) => ({ label: p.name, value: p.id }))}
            />
            <Select
              label="Semester"
              value={form.semesterId}
              onChange={handleSemesterChange}
              options={semesterOptions.map((s) => ({ label: `Semester ${s.number}`, value: s.id }))}
            />
            <Select
              label="Section"
              value={form.sectionId}
              onChange={(v) => setForm((f) => ({ ...f, sectionId: v }))}
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
