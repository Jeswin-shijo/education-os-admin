import { useState } from 'react';
import { adminService } from '../../services';
import * as certificateService from '../../services/certificateService';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { Certificate } from '../../data/types';
import { formatDate } from '../../lib';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  SearchableSelect,
  DatePicker,
  Badge,
  Banner,
  Loading,
  EmptyState,
  Pagination,
  DetailModal,
} from '../../components';

const KINDS: Certificate['kind'][] = ['course', 'event', 'achievement'];

// Badge only offers create/update/delete/broadcast/neutral tones — mapped to something
// visually distinct per certificate kind since there's no dedicated tone set for this.
const kindTone: Record<Certificate['kind'], 'create' | 'update' | 'delete' | 'broadcast' | 'neutral'> = {
  course: 'update',
  event: 'broadcast',
  achievement: 'create',
};

const emptyForm = {
  studentId: '',
  title: '',
  issuer: '',
  issuedOn: '',
  kind: 'course' as Certificate['kind'],
  url: '',
};

export function CertificatesPage() {
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList((p) => certificateService.listPage(p), []);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();
  const toast = useToast();

  const [detailTarget, setDetailTarget] = useState<Certificate | null>(null);

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const studentOptions = (students ?? []).map((s) => ({ label: s.name, value: s.id, sub: s.rollNo }));

  function openCreate() {
    setForm(emptyForm);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = 'Student is required';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.issuer.trim()) e.issuer = 'Issuer is required';
    if (!form.issuedOn) e.issuedOn = 'Issued date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    const student = students?.find((s) => s.id === form.studentId);
    if (!student) return;
    setSaving(true);
    setFormError(undefined);
    try {
      await certificateService.issue({
        studentId: student.id,
        studentName: student.name,
        title: form.title,
        issuer: form.issuer,
        issuedOn: form.issuedOn,
        kind: form.kind,
        url: form.url || undefined,
      });
      toast.success('Certificate issued', `${form.title} · ${student.name}`);
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not issue certificate');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Certificate>[] = [
    { key: 'student', header: 'Student', render: (c) => <span className="font-semibold text-ink">{c.studentName || '—'}</span> },
    { key: 'title', header: 'Title', render: (c) => c.title },
    { key: 'issuer', header: 'Issuer', render: (c) => c.issuer },
    { key: 'issuedOn', header: 'Issued on', render: (c) => formatDate(c.issuedOn) },
    { key: 'kind', header: 'Kind', render: (c) => <Badge tone={kindTone[c.kind]} label={c.kind} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle={rows ? `${rows.length} certificates` : undefined}
        action={<Button label="Issue certificate" icon="plus" onClick={openCreate} />}
      />

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No certificates found" actionLabel="Issue certificate" onAction={openCreate} />
      ) : (
        <>
          <Table columns={columns} rows={rows} onRowClick={setDetailTarget} />
          <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Issue certificate" width={520}>
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
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" required error={errors.title} value={form.title} onChangeText={(v) => setField('title', v)} />
            <TextField label="Issuer" required error={errors.issuer} value={form.issuer} onChangeText={(v) => setField('issuer', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Issued date" required error={errors.issuedOn} value={form.issuedOn} onChange={(v) => setField('issuedOn', v)} />
            <Select
              label="Kind"
              value={form.kind}
              onChange={(v) => setForm((f) => ({ ...f, kind: v as Certificate['kind'] }))}
              options={KINDS.map((k) => ({ label: k, value: k }))}
            />
          </div>
          <TextField label="URL (optional)" value={form.url} onChangeText={(v) => setForm((f) => ({ ...f, url: v }))} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Issue certificate" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <DetailModal
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title="Certificate details"
        fields={
          detailTarget
            ? [
                { label: 'Student', value: detailTarget.studentName },
                { label: 'Title', value: detailTarget.title },
                { label: 'Issuer', value: detailTarget.issuer },
                { label: 'Issued on', value: formatDate(detailTarget.issuedOn) },
                { label: 'Kind', value: <Badge tone={kindTone[detailTarget.kind]} label={detailTarget.kind} /> },
                { label: 'URL', value: detailTarget.url, full: true },
              ]
            : []
        }
      />
    </div>
  );
}
