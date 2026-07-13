import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { FeeInvoice, PaymentMethod } from '../../data/types';
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
  SearchableSelect,
  DatePicker,
  StatusPill,
  Banner,
  Loading,
  EmptyState,
  Icon,
  Pagination,
} from '../../components';

type LineItem = { key: number; title: string; term: string; amount: string; dueDate: string };

let lineKeySeq = 0;
function newLine(): LineItem {
  lineKeySeq += 1;
  return { key: lineKeySeq, title: '', term: '', amount: '0', dueDate: '' };
}

const PAYMENT_METHODS: PaymentMethod[] = ['upi', 'card', 'netbanking', 'cash', 'cheque', 'other'];

const statusTone: Record<FeeInvoice['status'], 'success' | 'info' | 'danger'> = {
  paid: 'success',
  due: 'info',
  overdue: 'danger',
  pending: 'info',
};

export function FeesPage() {
  const [q, setQ] = useState('');
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => adminService.fees.listPage(q, p), [q]);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  const [paymentTarget, setPaymentTarget] = useState<FeeInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string>();

  const studentOptions = (students ?? []).map((s) => ({ label: s.name, value: s.id, sub: s.rollNo }));

  function openCreate() {
    setStudentId('');
    setLines([newLine()]);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function updateLine(key: number, patch: Partial<LineItem>) {
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    Object.keys(patch).forEach((field) => clearError(`${key}:${field}`));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!studentId) e.studentId = 'Student is required';
    lines.forEach((l) => {
      if (!l.title.trim()) e[`${l.key}:title`] = 'Title is required';
      if (!l.term.trim()) e[`${l.key}:term`] = 'Term is required';
      if (!l.dueDate) e[`${l.key}:dueDate`] = 'Due date is required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const student = students?.find((s) => s.id === studentId);
    if (!student) return;
    setSaving(true);
    setFormError(undefined);
    try {
      await adminService.fees.createBatch(
        lines.map((l) => ({
          studentId: student.id,
          studentName: student.name,
          title: l.title,
          term: l.term,
          amount: Number(l.amount) || 0,
          dueDate: new Date(l.dueDate).toISOString(),
        })),
      );
      setSuccessMsg(`Added ${lines.length} invoice${lines.length > 1 ? 's' : ''} for ${student.name}`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save invoices');
    } finally {
      setSaving(false);
    }
  }

  function openPayment(invoice: FeeInvoice) {
    setPaymentTarget(invoice);
    setPaymentMethod('cash');
    setPaymentReference('');
    setPaymentError(undefined);
  }

  async function handleRecordPayment() {
    if (!paymentTarget) return;
    setPaying(true);
    setPaymentError(undefined);
    try {
      await adminService.fees.recordPayment(paymentTarget.id, paymentTarget.amount, paymentMethod, paymentReference);
      setPaymentTarget(null);
      reload();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not record payment');
    } finally {
      setPaying(false);
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
            <Button label="Record payment" variant="outline" size="sm" onClick={() => openPayment(f)} />
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
      ) : rows.length === 0 ? (
        <EmptyState icon="campus" title="No invoices found" actionLabel="Add invoice" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add invoice(s)" width={560}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <SearchableSelect
            label="Student"
            required
            error={errors.studentId}
            value={studentId}
            onChange={(v) => { setStudentId(v); clearError('studentId'); }}
            options={studentOptions}
            placeholder="Search by name or roll no…"
          />

          <div className="flex flex-col gap-3">
            {lines.map((line, i) => (
              <div key={line.key} className="rounded-lg border border-line-soft p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-label uppercase tracking-wide text-ink-muted">Invoice {i + 1}</span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((rows) => rows.filter((r) => r.key !== line.key))}
                      className="text-ink-soft hover:text-danger"
                      aria-label="Remove invoice line"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Title" required error={errors[`${line.key}:title`]} value={line.title} onChangeText={(v) => updateLine(line.key, { title: v })} />
                  <TextField label="Term" required error={errors[`${line.key}:term`]} value={line.term} onChangeText={(v) => updateLine(line.key, { term: v })} />
                  <TextField label="Amount" type="number" value={line.amount} onChangeText={(v) => updateLine(line.key, { amount: v })} />
                  <DatePicker label="Due date" required error={errors[`${line.key}:dueDate`]} value={line.dueDate} onChange={(v) => updateLine(line.key, { dueDate: v })} />
                </div>
              </div>
            ))}
            <Button label="Add another invoice" icon="plus" variant="outline" size="sm" onClick={() => setLines((rows) => [...rows, newLine()])} />
          </div>

          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={lines.length > 1 ? `Add ${lines.length} invoices` : 'Add invoice'} size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Record payment">
        <div className="flex flex-col gap-4">
          {paymentError && <Banner tone="danger" title={paymentError} />}
          <div className="text-body text-ink-muted">
            {paymentTarget?.title} — {paymentTarget && formatINR(paymentTarget.amount)} for {paymentTarget?.studentName}
          </div>
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(v) => setPaymentMethod(v as PaymentMethod)}
            options={PAYMENT_METHODS.map((m) => ({ label: m.toUpperCase(), value: m }))}
          />
          <TextField label="Reference (optional)" value={paymentReference} onChangeText={setPaymentReference} placeholder="Transaction / cheque no." />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setPaymentTarget(null)} />
            <Button label="Record payment" size="sm" loading={paying} onClick={handleRecordPayment} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
