import { useState } from 'react';
import * as eventService from '../../services/eventService';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
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
  TimePicker,
  StatusPill,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
  DetailModal,
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
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();
  const toast = useToast();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<EventItem | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.date) e.date = 'Date is required';
    if (!form.time.trim()) e.time = 'Time is required';
    if (!form.venue.trim()) e.venue = 'Venue is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
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
      toast.success('Event created', form.title);
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
    const removed = deleteTarget.title;
    setDeleting(true);
    try {
      await eventService.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast.success('Event removed', removed);
    } catch (err) {
      setDeleteTarget(null);
      toast.error('Could not remove event', err instanceof Error ? err.message : undefined);
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

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="campus" title="No events found" actionLabel="Add event" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add event">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <TextField label="Title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Date" required error={errors.date} value={form.date} onChange={(v) => setField('date', v)} />
            <TimePicker label="Time" required error={errors.time} value={form.time} onChange={(v) => setField('time', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Venue" required error={errors.venue} value={form.venue} onChangeText={(v) => setField('venue', v)} />
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
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove event"
        message={`Remove ${deleteTarget?.title}? This cannot be undone.`}
        loading={deleting}
      />

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Event details"
        fields={
          detailTarget
            ? [
                { label: 'Title', value: detailTarget.title },
                { label: 'Date', value: formatDate(detailTarget.date) },
                { label: 'Time', value: detailTarget.time },
                { label: 'Venue', value: detailTarget.venue },
                { label: 'Category', value: <StatusPill status={categoryTone[detailTarget.category]} label={detailTarget.category} /> },
                { label: 'Description', value: detailTarget.description, full: true },
              ]
            : []
        }
        onDelete={() => {
          const e = detailTarget;
          setDetailTarget(null);
          if (e) setDeleteTarget(e);
        }}
      />
    </div>
  );
}
