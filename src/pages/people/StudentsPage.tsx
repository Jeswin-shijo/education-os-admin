import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Student } from '../../data/types';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Avatar,
  Modal,
  TextField,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const NAVY = '#13327F';

const emptyForm = {
  name: '',
  rollNo: '',
  admissionNo: '',
  email: '',
  phone: '',
  program: 'B.Tech',
  branch: 'CSE',
  semester: '1',
  section: 'A',
  year: '1',
  cgpa: '0',
  mentorName: '',
  bloodGroup: '',
};

export function StudentsPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.students.list(q), [q]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
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
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.rollNo.trim() || !form.email.trim()) {
      setFormError('Name, roll number, and email are required');
      return;
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
        mentorName: form.mentorName,
        bloodGroup: form.bloodGroup,
      };
      if (editing) {
        await adminService.students.update(editing.id, payload);
        setSuccessMsg(`Updated ${payload.name}`);
      } else {
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
          <Avatar name={s.name} size={32} color={s.avatarColor} />
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit student' : 'Add student'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Full name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <TextField label="Roll number" value={form.rollNo} onChangeText={(v) => setForm((f) => ({ ...f, rollNo: v }))} />
            <TextField label="Admission no." value={form.admissionNo} onChangeText={(v) => setForm((f) => ({ ...f, admissionNo: v }))} />
            <TextField label="Email" type="email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} />
            <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <TextField label="Program" value={form.program} onChangeText={(v) => setForm((f) => ({ ...f, program: v }))} />
            <TextField label="Branch" value={form.branch} onChangeText={(v) => setForm((f) => ({ ...f, branch: v }))} />
            <TextField label="Section" value={form.section} onChangeText={(v) => setForm((f) => ({ ...f, section: v }))} />
            <TextField label="Semester" type="number" value={form.semester} onChangeText={(v) => setForm((f) => ({ ...f, semester: v }))} />
            <TextField label="Year" type="number" value={form.year} onChangeText={(v) => setForm((f) => ({ ...f, year: v }))} />
            <TextField label="CGPA" type="number" value={form.cgpa} onChangeText={(v) => setForm((f) => ({ ...f, cgpa: v }))} />
            <TextField label="Blood group" value={form.bloodGroup} onChangeText={(v) => setForm((f) => ({ ...f, bloodGroup: v }))} />
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
