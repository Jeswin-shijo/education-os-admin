import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { NotificationItem } from '../../data/types';
import { formatRelative } from '../../lib';
import { PageHeader, Button, Card, Table, type Column, TextField, Select, Badge, Banner, Loading, EmptyState } from '../../components';

const categoryOptions = [
  { label: 'Academic', value: 'academic' },
  { label: 'Fee', value: 'fee' },
  { label: 'Event', value: 'event' },
  { label: 'General', value: 'general' },
  { label: 'Alert', value: 'alert' },
];

const audienceOptions = [
  { label: 'All', value: 'all' },
  { label: 'Student', value: 'student' },
  { label: 'Parent', value: 'parent' },
  { label: 'Faculty', value: 'faculty' },
  { label: 'HOD', value: 'hod' },
  { label: 'Principal', value: 'principal' },
  { label: 'Admin', value: 'admin' },
];

const emptyForm = {
  title: '',
  body: '',
  category: 'general' as NotificationItem['category'],
  audience: 'all' as NotificationItem['audience'],
};

export function NotificationsPage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.notifications.list(), []);

  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();

  async function handleBroadcast() {
    if (!form.title.trim() || !form.body.trim()) {
      setFormError('Title and body are required');
      return;
    }
    setSending(true);
    setFormError(undefined);
    try {
      await adminService.notifications.broadcast(form);
      setSuccessMsg(`Broadcast "${form.title}" sent`);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not send broadcast');
    } finally {
      setSending(false);
    }
  }

  const columns: Column<NotificationItem>[] = [
    { key: 'title', header: 'Title', render: (n) => <span className="font-semibold text-ink">{n.title}</span> },
    { key: 'category', header: 'Category', render: (n) => <Badge tone="neutral" label={n.category} /> },
    { key: 'audience', header: 'Audience', render: (n) => n.audience },
    { key: 'sentAt', header: 'Sent', render: (n) => formatRelative(n.sentAt) },
  ];

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Broadcast announcements to the campus" />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            <TextField label="Body" value={form.body} onChangeText={(v) => setForm((f) => ({ ...f, body: v }))} />
            <Select
              label="Category"
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v as NotificationItem['category'] }))}
              options={categoryOptions}
            />
            <Select
              label="Audience"
              value={form.audience}
              onChange={(v) => setForm((f) => ({ ...f, audience: v as NotificationItem['audience'] }))}
              options={audienceOptions}
            />
          </div>
          <div className="flex justify-end">
            <Button label="Broadcast" icon="check" size="sm" loading={sending} onClick={handleBroadcast} />
          </div>
        </div>
      </Card>

      <PageHeader title="Sent notifications" subtitle={rows ? `${rows.length} notifications` : undefined} />

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="alert" title="No notifications sent yet" />
      ) : (
        <Table columns={columns} rows={rows} />
      )}
    </div>
  );
}
