import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { toLocalISODate } from '../../lib/date';
import type { Book, BookLoan } from '../../data/types';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Modal,
  TextField,
  SearchableSelect,
  DatePicker,
  ConfirmDialog,
  StatusPill,
  Chip,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

const emptyForm = {
  title: '',
  author: '',
  category: '',
  copies: '1',
  available: '1',
};

function BooksTab() {
  const [q, setQ] = useState('');
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.library.listPage(q, p), [q]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(b: Book) {
    setEditing(b);
    setForm({ title: b.title, author: b.author, category: b.category, copies: String(b.copies), available: String(b.available) });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.author.trim()) e.author = 'Author is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = { title: form.title, author: form.author, category: form.category, copies: Number(form.copies) || 0, available: Number(form.available) || 0 };
      if (editing) {
        await adminService.library.update(editing.id, payload);
        setSuccessMsg(`Updated "${payload.title}"`);
      } else {
        await adminService.library.create(payload);
        setSuccessMsg(`Added "${payload.title}"`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save book');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.library.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove book');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Book>[] = [
    {
      key: 'title',
      header: 'Book',
      render: (b) => (
        <div>
          <div className="font-semibold text-ink">{b.title}</div>
          <div className="text-caption text-ink-soft">{b.author}</div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (b) => b.category },
    {
      key: 'available',
      header: 'Availability',
      render: (b) =>
        b.available > 0 ? <StatusPill status="success" label={`${b.available}/${b.copies} available`} /> : <StatusPill status="danger" label="Out of stock" />,
    },
    {
      key: 'actions',
      header: '',
      width: '110px',
      render: (b) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(b)} />
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(b)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by title, author, category…" />
        <Button label="Add book" icon="plus" onClick={openCreate} />
      </div>

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No books found" actionLabel="Add book" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit book' : 'Add book'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} />
            <TextField label="Author" required error={errors.author} value={form.author} onChangeText={(v) => setField('author', v)} />
            <TextField label="Category" value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} />
            <TextField label="Copies" type="number" value={form.copies} onChangeText={(v) => setForm((f) => ({ ...f, copies: v }))} />
            <TextField label="Available" type="number" value={form.available} onChangeText={(v) => setForm((f) => ({ ...f, available: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add book'} size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove book"
        message={`Remove "${deleteTarget?.title}"? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}

function loanStatusPill(loan: BookLoan) {
  if (loan.status === 'returned') return <StatusPill status="success" label="Returned" />;
  const overdue = !loan.returnedOn && loan.dueOn && loan.dueOn < toLocalISODate(new Date());
  return overdue ? <StatusPill status="danger" label="Overdue" /> : <StatusPill status="info" label="Active" />;
}

function LoansTab() {
  const { rows: loans, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.library.loans.listPage(p), []);
  const { data: books } = useAsync(() => adminService.library.list(), []);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [bookId, setBookId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [issuedOn, setIssuedOn] = useState(toLocalISODate(new Date()));
  const [dueOn, setDueOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();
  const [returningId, setReturningId] = useState<string | null>(null);
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  const bookOptions = (books ?? []).map((b) => ({ label: b.title, value: b.id, sub: b.author }));
  const studentOptions = (students ?? []).map((s) => ({ label: s.name, value: s.id, sub: s.rollNo }));
  // The loans endpoint returns only book/student uuids — resolve names from the lists.
  const bookById = new Map((books ?? []).map((b) => [b.id, b.title]));
  const studentById = new Map((students ?? []).map((s) => [s.id, s.name]));

  function openIssue() {
    setBookId('');
    setStudentId('');
    setIssuedOn(toLocalISODate(new Date()));
    // Default due date: two weeks out.
    const due = new Date();
    due.setDate(due.getDate() + 14);
    setDueOn(toLocalISODate(due));
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!bookId) e.bookId = 'Book is required';
    if (!studentId) e.studentId = 'Student is required';
    if (!issuedOn) e.issuedOn = 'Issue date is required';
    if (!dueOn) e.dueOn = 'Due date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleIssue() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const book = books?.find((b) => b.id === bookId);
      const student = students?.find((s) => s.id === studentId);
      await adminService.library.loans.issue({
        bookId,
        bookTitle: book?.title ?? '',
        studentId,
        studentName: student?.name ?? '',
        issuedOn,
        dueOn,
      });
      setSuccessMsg(`Issued "${book?.title ?? 'book'}" to ${student?.name ?? 'student'}`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not issue book');
    } finally {
      setSaving(false);
    }
  }

  async function handleReturn(loan: BookLoan) {
    setReturningId(loan.id);
    try {
      await adminService.library.loans.returnBook(loan.id, toLocalISODate(new Date()));
      setSuccessMsg(`Marked "${loan.bookTitle}" as returned`);
      reload();
    } catch {
      setSuccessMsg(undefined);
    } finally {
      setReturningId(null);
    }
  }

  const columns: Column<BookLoan>[] = [
    {
      key: 'book',
      header: 'Book',
      render: (l) => (
        <div>
          <div className="font-semibold text-ink">{l.bookTitle || bookById.get(l.bookId) || l.bookId}</div>
          <div className="text-caption text-ink-soft">{l.studentName || studentById.get(l.studentId) || l.studentId}</div>
        </div>
      ),
    },
    { key: 'issuedOn', header: 'Issued', render: (l) => l.issuedOn },
    { key: 'dueOn', header: 'Due', render: (l) => l.dueOn },
    { key: 'status', header: 'Status', render: (l) => loanStatusPill(l) },
    {
      key: 'actions',
      header: '',
      width: '120px',
      render: (l) =>
        l.status === 'returned' ? (
          <span className="text-caption text-ink-soft">Returned {l.returnedOn}</span>
        ) : (
          <div className="flex justify-end">
            <Button label="Return" variant="outline" size="sm" loading={returningId === l.id} onClick={() => handleReturn(l)} />
          </div>
        ),
    },
  ];

  return (
    <div>
      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-body text-ink-muted">{loans ? `${loans.length} loans` : ''}</div>
        <Button label="Issue book" icon="plus" onClick={openIssue} />
      </div>

      {loading ? (
        <Loading />
      ) : loans.length === 0 ? (
        <EmptyState icon="academics" title="No loans yet" actionLabel="Issue book" onAction={openIssue} />
      ) : (
        <>
          <Table columns={columns} rows={loans} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Issue book">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <SearchableSelect label="Book" required error={errors.bookId} value={bookId} onChange={(v) => { setBookId(v); clearError('bookId'); }} options={bookOptions} placeholder="Search by title or author…" />
          <SearchableSelect label="Student" required error={errors.studentId} value={studentId} onChange={(v) => { setStudentId(v); clearError('studentId'); }} options={studentOptions} placeholder="Search by name or roll no…" />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Issued on" required error={errors.issuedOn} value={issuedOn} onChange={(v) => { setIssuedOn(v); clearError('issuedOn'); }} />
            <DatePicker label="Due on" required error={errors.dueOn} value={dueOn} onChange={(v) => { setDueOn(v); clearError('dueOn'); }} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Issue book" size="sm" loading={saving} onClick={handleIssue} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function LibraryPage() {
  const [tab, setTab] = useState<'books' | 'loans'>('books');
  return (
    <div>
      <PageHeader
        title="Library"
        subtitle="Catalogue and circulation"
        action={
          <div className="flex gap-2">
            <Chip label="Books" selected={tab === 'books'} onClick={() => setTab('books')} />
            <Chip label="Loans" selected={tab === 'loans'} onClick={() => setTab('loans')} />
          </div>
        }
      />
      {tab === 'books' ? <BooksTab /> : <LoansTab />}
    </div>
  );
}
