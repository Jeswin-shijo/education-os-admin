import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { NotificationItem, Role } from '../../data/types';
import { formatRelative } from '../../lib';
import {
  PageHeader,
  Button,
  Card,
  Table,
  type Column,
  TextField,
  Select,
  SearchableSelect,
  Chip,
  Badge,
  Banner,
  Loading,
  EmptyState,
  Pagination,
} from '../../components';

type Mode = 'direct' | 'broadcast';

const categoryOptions: { label: string; value: NotificationItem['category'] }[] = [
  { label: 'Academic', value: 'academic' },
  { label: 'Fee', value: 'fee' },
  { label: 'Event', value: 'event' },
  { label: 'General', value: 'general' },
  { label: 'Alert', value: 'alert' },
  { label: 'Attendance', value: 'attendance' },
];

const categoryTone: Record<NotificationItem['category'], 'create' | 'update' | 'delete' | 'broadcast' | 'neutral'> = {
  academic: 'update',
  fee: 'broadcast',
  event: 'create',
  general: 'neutral',
  alert: 'delete',
  attendance: 'update',
};

const roleOptions: { label: string; value: Role | '' }[] = [
  { label: 'All roles', value: '' },
  { label: 'Student', value: 'student' },
  { label: 'Faculty', value: 'faculty' },
  { label: 'HOD', value: 'hod' },
  { label: 'Admin', value: 'admin' },
];

const emptyForm = {
  recipientId: '',
  role: '' as Role | '',
  title: '',
  body: '',
  category: 'general' as NotificationItem['category'],
};

export function NotificationsPage() {
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.notifications.listPage(p), []);
  const { data: recipients } = useAsync(() => adminService.notifications.recipientCandidates(), []);

  const [mode, setMode] = useState<Mode>('direct');
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();
  const toast = useToast();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const recipientOptions = (recipients ?? []).map((r) => ({ label: `${r.name} (${r.role})`, value: r.id }));

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(undefined);
    resetErrors();
  }

  async function handleSend() {
    const e: Record<string, string> = {};
    if (mode === 'direct' && !form.recipientId) e.recipientId = 'Recipient is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.body.trim()) e.body = 'Body is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSending(true);
    setFormError(undefined);
    try {
      if (mode === 'direct') {
        const recipient = recipients?.find((r) => r.id === form.recipientId);
        await adminService.notifications.send({
          recipientId: form.recipientId,
          recipientName: recipient?.name ?? '',
          title: form.title,
          body: form.body,
          category: form.category,
        });
        toast.success('Notification sent', `"${form.title}" to ${recipient?.name ?? 'recipient'}`);
      } else {
        await adminService.notifications.broadcast({
          title: form.title,
          body: form.body,
          category: form.category,
          role: form.role || undefined,
        });
        toast.success('Broadcast sent', `"${form.title}" to ${form.role || 'everyone'}`);
      }
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send notification');
    } finally {
      setSending(false);
    }
  }

  const columns: Column<NotificationItem>[] = [
    { key: 'title', header: 'Title', render: (n) => <span className="font-semibold text-ink">{n.title}</span> },
    { key: 'category', header: 'Category', render: (n) => <Badge tone={categoryTone[n.category]} label={n.category} /> },
    {
      key: 'target',
      header: 'Recipient',
      render: (n) => (n.recipientName ? n.recipientName : `Broadcast: ${n.broadcastRole || 'everyone'}`),
    },
    { key: 'sentAt', header: 'Sent', render: (n) => formatRelative(n.sentAt) },
  ];

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Send direct messages or broadcast announcements" />

      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Chip label="Direct to user" selected={mode === 'direct'} onClick={() => switchMode('direct')} />
            <Chip label="Broadcast by role" selected={mode === 'broadcast'} onClick={() => switchMode('broadcast')} />
          </div>

          {formError && <Banner tone="danger" title={formError} />}

          {mode === 'direct' ? (
            <SearchableSelect
              label="Recipient"
              required
              error={errors.recipientId}
              value={form.recipientId}
              onChange={(v) => setField('recipientId', v)}
              options={recipientOptions}
              placeholder="Search by name…"
            />
          ) : (
            <Select
              label="Broadcast to role"
              value={form.role}
              onChange={(v) => setForm((f) => ({ ...f, role: v as Role | '' }))}
              options={roleOptions}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} />
            <Select
              label="Category"
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v as NotificationItem['category'] }))}
              options={categoryOptions}
            />
          </div>
          <TextField label="Body" required error={errors.body} value={form.body} onChangeText={(v) => setField('body', v)} />

          <div className="flex justify-end">
            <Button
              label={mode === 'direct' ? 'Send' : 'Broadcast'}
              icon="check"
              size="sm"
              loading={sending}
              onClick={handleSend}
            />
          </div>
        </div>
      </Card>

      <PageHeader title="Sent notifications" subtitle={rows ? `${rows.length} notifications` : undefined} />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="notification" title="No notifications sent yet" />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
