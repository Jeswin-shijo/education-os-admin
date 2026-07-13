import { useState } from 'react';
import { adminService } from '../../services';
import * as quizService from '../../services/quizService';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { Quiz, QuizQuestion } from '../../data/types';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  Card,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

type DraftQuestion = Omit<QuizQuestion, 'id'>;

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function blankQuestion(): DraftQuestion {
  return { q: '', options: ['', '', '', ''], answerIndex: 0 };
}

const emptyForm = {
  subjectId: '',
  title: '',
};

function isFullyEmpty(row: DraftQuestion): boolean {
  return !row.q.trim() && row.options.every((o) => !o.trim());
}

function isComplete(row: DraftQuestion): boolean {
  return !!row.q.trim() && row.options.every((o) => !!o.trim());
}

export function QuizzesPage() {
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => quizService.listPage(p), []);
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  const subjectOptions = (subjects ?? []).map((s) => ({ label: `${s.code} — ${s.name}`, value: s.id }));

  function subjectName(subjectId: string): string {
    const subject = subjects?.find((s) => s.id === subjectId);
    return subject ? `${subject.code} — ${subject.name}` : subjectId;
  }

  function openCreate() {
    setForm({ ...emptyForm, subjectId: subjects?.[0]?.id ?? '' });
    setQuestions([blankQuestion()]);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, blankQuestion()]);
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function updateQuestionText(idx: number, value: string) {
    setQuestions((qs) => qs.map((row, i) => (i === idx ? { ...row, q: value } : row)));
  }

  function updateOption(idx: number, optIdx: number, value: string) {
    setQuestions((qs) =>
      qs.map((row, i) => (i === idx ? { ...row, options: row.options.map((o, oi) => (oi === optIdx ? value : o)) } : row)),
    );
  }

  function setAnswerIndex(idx: number, answerIndex: number) {
    setQuestions((qs) => qs.map((row, i) => (i === idx ? { ...row, answerIndex } : row)));
  }

  async function handleSave() {
    const fieldErr: Record<string, string> = {};
    if (!form.subjectId) fieldErr.subjectId = 'Subject is required';
    if (!form.title.trim()) fieldErr.title = 'Quiz title is required';
    setErrors(fieldErr);
    if (Object.keys(fieldErr).length) return;
    // Drop fully-empty trailing rows, but keep anything partially filled so the user
    // can see (and fix) what's incomplete.
    const cleaned = questions.filter((row) => !isFullyEmpty(row));
    if (cleaned.length === 0) {
      setFormError('Add at least one question');
      return;
    }
    if (!cleaned.every(isComplete)) {
      setFormError('Every question needs question text and all 4 options filled in');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const quiz = await quizService.create({ subjectId: form.subjectId, title: form.title, questions: cleaned });
      setSuccessMsg(`Created quiz "${quiz.title}" with ${quiz.questions.length} questions`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create quiz');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await quizService.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove quiz');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Quiz>[] = [
    { key: 'title', header: 'Title', render: (q) => <span className="font-semibold text-ink">{q.title}</span> },
    { key: 'subject', header: 'Subject', render: (q) => subjectName(q.subjectId) },
    { key: 'questions', header: 'Questions', render: (q) => q.questions.length },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (q) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(q)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Quizzes"
        subtitle={rows ? `${rows.length} quizzes` : undefined}
        action={<Button label="Create quiz" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="subject" title="No quizzes found" actionLabel="Create quiz" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create quiz" width={640}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Subject"
              required
              error={errors.subjectId}
              value={form.subjectId}
              onChange={(v) => setField('subjectId', v)}
              options={subjectOptions}
            />
            <TextField label="Quiz title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} placeholder="Unit 1 quiz" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-label uppercase tracking-wide text-ink-muted">Questions</span>
              <Button label="Add question" icon="plus" variant="outline" size="sm" onClick={addQuestion} />
            </div>

            {questions.map((row, idx) => (
              <Card key={idx} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-small font-semibold text-ink-muted">Question {idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => removeQuestion(idx)}
                    disabled={questions.length === 1}
                  />
                </div>
                <TextField
                  label="Question text"
                  value={row.q}
                  onChangeText={(v) => updateQuestionText(idx, v)}
                  placeholder="What is…?"
                />
                <div className="flex flex-col gap-2">
                  {row.options.map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAnswerIndex(idx, optIdx)}
                        title="Mark as correct answer"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-caption font-semibold uppercase transition-colors ${
                          row.answerIndex === optIdx
                            ? 'border-success bg-success text-white'
                            : 'border-line bg-surface text-ink-muted hover:border-navy-muted'
                        }`}
                      >
                        {OPTION_LABELS[optIdx]}
                      </button>
                      <TextField
                        value={option}
                        onChangeText={(v) => updateOption(idx, optIdx, v)}
                        placeholder={`Option ${OPTION_LABELS[optIdx]}`}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Create quiz" size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove quiz"
        message={`Remove "${deleteTarget?.title}"? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
