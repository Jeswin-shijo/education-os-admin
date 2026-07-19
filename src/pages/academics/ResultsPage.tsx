import { useState } from 'react';
import { adminService } from '../../services';
import * as examService from '../../services/examService';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { ExamResult } from '../../data/types';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  SearchableSelect,
  StatusPill,
  DetailModal,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

type GradeStatus = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function gradeStatus(grade: string): GradeStatus {
  const g = grade.trim().toUpperCase();
  if (g.startsWith('A')) return 'success';
  if (g.startsWith('B')) return 'info';
  if (g.startsWith('C')) return 'warning';
  if (g.startsWith('D') || g.startsWith('F')) return 'danger';
  return 'neutral';
}

const emptyForm = {
  studentId: '',
  subjectId: '',
  exam: '',
  marks: '0',
  maxMarks: '100',
  grade: '',
  gradePoint: '0',
  credits: '4',
};

export function ResultsPage() {
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => examService.results.listPage(p), []);
  const { data: students } = useAsync(() => adminService.students.list(), []);
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExamResult | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();
  const [detailTarget, setDetailTarget] = useState<ExamResult | null>(null);
  const toast = useToast();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const studentOptions = (students ?? []).map((s) => ({ label: s.name, value: s.id, sub: s.rollNo }));
  const subjectOptions = (subjects ?? []).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));

  function studentLabel(studentId: string, name?: string): string {
    if (name) return name;
    return students?.find((s) => s.id === studentId)?.name ?? studentId;
  }

  function subjectLabel(subjectId: string, name?: string): string {
    if (name) return name;
    const subject = subjects?.find((s) => s.id === subjectId);
    return subject ? `${subject.code} ${subject.name}` : subjectId;
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, studentId: students?.[0]?.id ?? '', subjectId: subjects?.[0]?.id ?? '' });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(result: ExamResult) {
    setEditing(result);
    setForm({
      studentId: result.studentId,
      subjectId: result.subjectId,
      exam: result.exam,
      marks: String(result.marks),
      maxMarks: String(result.maxMarks),
      grade: result.grade,
      gradePoint: String(result.gradePoint),
      credits: String(result.credits),
    });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = 'Student is required';
    if (!form.subjectId) e.subjectId = 'Subject is required';
    if (!form.exam.trim()) e.exam = 'Exam is required';
    if (!form.grade.trim()) e.grade = 'Grade is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const student = students?.find((s) => s.id === form.studentId);
      const subject = subjects?.find((s) => s.id === form.subjectId);
      const payload = {
        studentId: form.studentId,
        studentName: student?.name,
        subjectId: form.subjectId,
        subjectName: subject?.name,
        exam: form.exam,
        marks: Number(form.marks) || 0,
        maxMarks: Number(form.maxMarks) || 0,
        grade: form.grade,
        gradePoint: Number(form.gradePoint) || 0,
        credits: Number(form.credits) || 0,
      };
      if (editing) {
        await examService.results.update(editing.id, payload);
        toast.success('Result updated', payload.studentName ?? payload.studentId);
      } else {
        await examService.results.create(payload);
        toast.success('Result added', payload.studentName ?? payload.studentId);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save result');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ExamResult>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (r) => <span className="font-semibold text-ink">{studentLabel(r.studentId, r.studentName)}</span>,
    },
    { key: 'subject', header: 'Subject', render: (r) => subjectLabel(r.subjectId, r.subjectName) },
    { key: 'exam', header: 'Exam', render: (r) => r.exam },
    { key: 'marks', header: 'Marks', render: (r) => `${r.marks} / ${r.maxMarks}` },
    { key: 'grade', header: 'Grade', render: (r) => <StatusPill status={gradeStatus(r.grade)} label={r.grade} /> },
    { key: 'gradePoint', header: 'Grade point', render: (r) => r.gradePoint },
    { key: 'credits', header: 'Credits', render: (r) => r.credits },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (r) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(r)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Results"
        subtitle={rows ? `${rows.length} results` : undefined}
        action={<Button label="Add result" icon="plus" onClick={openCreate} />}
      />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="audit" title="No results found" actionLabel="Add result" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit result' : 'Add result'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <SearchableSelect
            label="Student"
            required
            error={errors.studentId}
            value={form.studentId}
            onChange={(v) => setField('studentId', v)}
            options={studentOptions}
            placeholder="Search by name or roll no…"
          />
          <Select
            label="Subject"
            required
            error={errors.subjectId}
            value={form.subjectId}
            onChange={(v) => setField('subjectId', v)}
            options={subjectOptions}
          />
          <TextField label="Exam" required error={errors.exam} value={form.exam} onChangeText={(v) => setField('exam', v)} placeholder="Mid Semester" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Marks" type="number" value={form.marks} onChangeText={(v) => setForm((f) => ({ ...f, marks: v }))} />
            <TextField label="Max marks" type="number" value={form.maxMarks} onChangeText={(v) => setForm((f) => ({ ...f, maxMarks: v }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Grade" required error={errors.grade} value={form.grade} onChangeText={(v) => setField('grade', v)} placeholder="A" />
            <TextField
              label="Grade point"
              type="number"
              value={form.gradePoint}
              onChangeText={(v) => setForm((f) => ({ ...f, gradePoint: v }))}
            />
            <TextField label="Credits" type="number" value={form.credits} onChangeText={(v) => setForm((f) => ({ ...f, credits: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add result'} size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Result details"
        header={
          detailTarget && (
            <div>
              <div className="text-h3 text-ink">{studentLabel(detailTarget.studentId, detailTarget.studentName)}</div>
              <div className="text-small text-ink-muted">{subjectLabel(detailTarget.subjectId, detailTarget.subjectName)}</div>
            </div>
          )
        }
        fields={
          detailTarget
            ? [
                { label: 'Student', value: studentLabel(detailTarget.studentId, detailTarget.studentName) },
                { label: 'Subject', value: subjectLabel(detailTarget.subjectId, detailTarget.subjectName) },
                { label: 'Exam', value: detailTarget.exam },
                { label: 'Marks', value: `${detailTarget.marks} / ${detailTarget.maxMarks}` },
                { label: 'Grade', value: <StatusPill status={gradeStatus(detailTarget.grade)} label={detailTarget.grade} /> },
                { label: 'Grade Point', value: detailTarget.gradePoint },
                { label: 'Credits', value: detailTarget.credits },
              ]
            : []
        }
        onEdit={() => {
          const r = detailTarget;
          setDetailTarget(null);
          if (r) openEdit(r);
        }}
      />
    </div>
  );
}
