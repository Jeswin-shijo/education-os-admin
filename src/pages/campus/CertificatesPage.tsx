import { useState } from 'react';
import { adminService } from '../../services';
import * as certificateService from '../../services/certificateService';
import { useAsync } from '../../hooks/useAsync';
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
  const { data: rows, loading, reload } = useAsync(() => certificateService.list(), []);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();

  const studentOptions = (students ?? []).map((s) => ({ label: s.name, value: s.id, sub: s.rollNo }));

  function openCreate() {
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    const student = students?.find((s) => s.id === form.studentId);
    if (!student || !form.title.trim() || !form.issuer.trim() || !form.issuedOn) {
      setFormError('Student, title, issuer, and issued date are required');
      return;
    }
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
      setSuccessMsg(`Issued "${form.title}" to ${student.name}`);
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

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No certificates found" actionLabel="Issue certificate" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Issue certificate" width={520}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <SearchableSelect
            label="Student"
            value={form.studentId}
            onChange={(v) => setForm((f) => ({ ...f, studentId: v }))}
            options={studentOptions}
            placeholder="Search by name or roll no…"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
            <TextField label="Issuer" value={form.issuer} onChangeText={(v) => setForm((f) => ({ ...f, issuer: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Issued date" value={form.issuedOn} onChange={(v) => setForm((f) => ({ ...f, issuedOn: v }))} />
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
    </div>
  );
}
