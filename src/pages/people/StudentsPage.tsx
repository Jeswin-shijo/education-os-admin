import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Student } from '../../data/types';
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

const PROGRAM_OPTIONS = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'BSc', 'MSc', 'MBA', 'PhD'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];
const GENDER_OPTIONS: Student['gender'][] = ['Male', 'Female', 'Other'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyForm = {
  name: '',
  rollNo: '',
  admissionNo: '',
  email: '',
  phone: '',
  program: PROGRAM_OPTIONS[0],
  branch: '',
  semester: '1',
  section: SECTION_OPTIONS[0],
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

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [photoError, setPhotoError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const branchOptions = departments && departments.length > 0 ? departments.map((d) => d.code) : ['CSE'];

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, branch: branchOptions[0] });
    setFormError(undefined);
    setPhotoError(undefined);
    setModalOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      name: s.name,
      rollNo: s.rollNo,
      admissionNo: s.admissionNo,
      email: s.email,
      phone: s.phone,
      program: s.program,
      branch: s.branch,
      semester: String(s.semester),
      section: s.section,
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
    if (!form.name.trim() || !form.rollNo.trim() || !form.email.trim()) {
      setFormError('Name, roll number, and email are required');
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
        program: form.program,
        branch: form.branch,
        semester: Number(form.semester) || 1,
        section: form.section,
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
        // `form.password` would be sent to the account-registration endpoint once this
        // console is wired to the real backend (POST /api/v1/auth/register); the mock
        // service has no login system to create it against yet.
        await adminService.students.create(payload);
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
    { key: 'branch', header: 'Branch', render: (s) => `${s.branch} · Sem ${s.semester}${s.section}` },
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
              label="Program"
              value={form.program}
              onChange={(v) => setForm((f) => ({ ...f, program: v }))}
              options={PROGRAM_OPTIONS.map((p) => ({ label: p, value: p }))}
            />
            <Select
              label="Branch"
              value={form.branch}
              onChange={(v) => setForm((f) => ({ ...f, branch: v }))}
              options={branchOptions.map((code) => ({ label: code, value: code }))}
            />
            <Select
              label="Section"
              value={form.section}
              onChange={(v) => setForm((f) => ({ ...f, section: v }))}
              options={SECTION_OPTIONS.map((s) => ({ label: s, value: s }))}
            />
            <TextField label="Semester" type="number" value={form.semester} onChangeText={(v) => setForm((f) => ({ ...f, semester: v }))} />
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
