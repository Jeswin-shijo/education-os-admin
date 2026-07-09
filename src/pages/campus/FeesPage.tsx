import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { FeeInvoice } from '../../data/types';
import { formatINR, formatDate } from '../../lib';
import {
  PageHeader,
  Button,
  SearchBar,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  DatePicker,
  StatusPill,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const emptyForm = {
  studentId: '',
  studentName: '',
  title: '',
  term: '',
  amount: '0',
  dueDate: '',
};

const statusTone: Record<FeeInvoice['status'], 'success' | 'info' | 'danger'> = {
  paid: 'success',
  due: 'info',
  overdue: 'danger',
};

export function FeesPage() {
  const [q, setQ] = useState('');
  const { data: rows, loading, reload } = useAsync(() => adminService.fees.list(q), [q]);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();
  const [markingId, setMarkingId] = useState<string | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.studentId || !form.title.trim() || !form.term.trim() || !form.dueDate) {
      setFormError('Student, title, term, and due date are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        studentId: form.studentId,
        studentName: form.studentName,
        title: form.title,
        term: form.term,
        amount: Number(form.amount) || 0,
        dueDate: new Date(form.dueDate).toISOString(),
        status: 'due' as const,
      };
      await adminService.fees.create(payload);
      setSuccessMsg(`Added invoice "${payload.title}"`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save invoice');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id: string) {
    setMarkingId(id);
    try {
      await adminService.fees.markPaid(id);
      reload();
    } finally {
      setMarkingId(null);
    }
  }

  const columns: Column<FeeInvoice>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (f) => <span className="font-semibold text-ink">{f.studentName}</span>,
    },
    {
      key: 'title',
      header: 'Invoice',
      render: (f) => (
        <div>
          <div className="text-ink">{f.title}</div>
          <div className="text-caption text-ink-soft">{f.term}</div>
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', render: (f) => formatINR(f.amount) },
    { key: 'dueDate', header: 'Due date', render: (f) => formatDate(f.dueDate) },
    { key: 'status', header: 'Status', render: (f) => <StatusPill status={statusTone[f.status]} label={f.status} /> },
    {
      key: 'actions',
      header: '',
      width: '130px',
      render: (f) =>
        f.status !== 'paid' ? (
          <div className="flex justify-end">
            <Button
              label="Mark paid"
              variant="outline"
              size="sm"
              loading={markingId === f.id}
              onClick={() => handleMarkPaid(f.id)}
            />
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fees"
        subtitle={rows ? `${rows.length} invoices` : undefined}
        action={<Button label="Add invoice" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <SearchBar value={q} onChangeText={setQ} placeholder="Search by student, title, term…" />
      </div>

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="campus" title="No invoices found" actionLabel="Add invoice" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add invoice">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select
            label="Student"
            value={form.studentId}
            onChange={(v) => {
              const student = students?.find((s) => s.id === v);
              setForm((f) => ({ ...f, studentId: v, studentName: student?.name ?? '' }));
            }}
            options={[
              { label: 'Select a student', value: '' },
              ...(students ?? []).map((s) => ({ label: `${s.name} (${s.rollNo})`, value: s.id })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            <TextField label="Term" value={form.term} onChangeText={(v) => setForm((f) => ({ ...f, term: v }))} />
            <TextField label="Amount" type="number" value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))} />
            <DatePicker label="Due date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add invoice" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
