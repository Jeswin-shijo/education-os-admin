import { useState } from 'react';
import * as eventService from '../../services/eventService';
import { useAsync } from '../../hooks/useAsync';
import type { EventItem } from '../../data/types';
import { formatDate } from '../../lib';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  DatePicker,
  StatusPill,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const CATEGORIES: EventItem['category'][] = ['tech', 'cultural', 'sports', 'workshop'];

// StatusPill only supports success/warning/danger/info/neutral — 'cultural' has no dedicated
// purple tone on that component, so it falls back to neutral (closest available tone).
const categoryTone: Record<EventItem['category'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  tech: 'info',
  cultural: 'neutral',
  sports: 'success',
  workshop: 'warning',
};

const emptyForm = {
  title: '',
  date: '',
  time: '',
  venue: '',
  category: 'tech' as EventItem['category'],
  description: '',
};

export function EventsPage() {
  const { data: rows, loading, reload } = useAsync(() => eventService.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.date || !form.time.trim() || !form.venue.trim()) {
      setFormError('Title, date, time, and venue are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      await eventService.create({
        title: form.title,
        date: form.date,
        time: form.time,
        venue: form.venue,
        category: form.category,
        description: form.description || undefined,
      });
      setSuccessMsg(`Added event "${form.title}"`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save event');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await eventService.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove event');
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<EventItem>[] = [
    { key: 'title', header: 'Title', render: (e) => <span className="font-semibold text-ink">{e.title}</span> },
    {
      key: 'when',
      header: 'Date & time',
      render: (e) => (
        <div>
          <div className="text-ink">{formatDate(e.date)}</div>
          <div className="text-caption text-ink-soft">{e.time}</div>
        </div>
      ),
    },
    { key: 'venue', header: 'Venue', render: (e) => e.venue },
    { key: 'category', header: 'Category', render: (e) => <StatusPill status={categoryTone[e.category]} label={e.category} /> },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (e) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setDeleteTarget(e)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle={rows ? `${rows.length} events` : undefined}
        action={<Button label="Add event" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="campus" title="No events found" actionLabel="Add event" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add event">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            <TextField label="Time" value={form.time} onChangeText={(v) => setForm((f) => ({ ...f, time: v }))} placeholder="e.g. 10:00 AM" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Venue" value={form.venue} onChangeText={(v) => setForm((f) => ({ ...f, venue: v }))} />
            <Select
              label="Category"
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v as EventItem['category'] }))}
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
            />
          </div>
          <TextField label="Description (optional)" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add event" size="sm" loading={saving} onClick={handleSave} />
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
        title="Remove event"
        message={`Remove ${deleteTarget?.title}? This cannot be undone.`}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
