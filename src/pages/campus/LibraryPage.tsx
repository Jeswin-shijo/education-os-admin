import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { Book } from '../../data/types';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Modal,
  TextField,
  ConfirmDialog,
  StatusPill,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const emptyForm = {
  title: '',
  author: '',
  category: '',
  copies: '1',
  available: '1',
};

export function LibraryPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.library.list(q), [q]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  function openEdit(b: Book) {
    setEditing(b);
    setForm({
      title: b.title,
      author: b.author,
      category: b.category,
      copies: String(b.copies),
      available: String(b.available),
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.author.trim()) {
      setFormError('Title and author are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        title: form.title,
        author: form.author,
        category: form.category,
        copies: Number(form.copies) || 0,
        available: Number(form.available) || 0,
      };
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
        b.available > 0 ? (
          <StatusPill status="success" label={`${b.available}/${b.copies} available`} />
        ) : (
          <StatusPill status="danger" label="Out of stock" />
        ),
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
      <PageHeader
        title="Library"
        subtitle={rows ? `${rows.length} books` : undefined}
        action={<Button label="Add book" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by title, author, category…" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No books found" actionLabel="Add book" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit book' : 'Add book'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            <TextField label="Author" value={form.author} onChangeText={(v) => setForm((f) => ({ ...f, author: v }))} />
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
