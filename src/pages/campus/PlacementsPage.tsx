import { useState } from 'react';
import * as placementService from '../../services/placementService';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { PlacementApplication, PlacementOpening } from '../../data/types';
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
  StatCard,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const APPLICATION_STATUSES: PlacementApplication['status'][] = ['applied', 'shortlisted', 'selected', 'rejected'];

const applicationStatusTone: Record<PlacementApplication['status'], 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  applied: 'info',
  shortlisted: 'warning',
  selected: 'success',
  rejected: 'danger',
};

const emptyOpeningForm = {
  company: '',
  role: '',
  ctc: '0',
  location: '',
  eligibility: '',
  lastDate: '',
  active: 'yes',
};

export function PlacementsPage() {
  const { data: openings, loading: openingsLoading, reload: reloadOpenings } = useAsync(() => placementService.openings.list(), []);
  const { data: applications, loading: applicationsLoading, reload: reloadApplications } = useAsync(
    () => placementService.applications.list(),
    [],
  );
  const { data: statsData } = useAsync(() => placementService.stats(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyOpeningForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();
  const toast = useToast();

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  const hasStats = statsData && (statsData.eligible !== undefined || statsData.applied !== undefined || statsData.placed !== undefined);

  function openCreate() {
    setForm(emptyOpeningForm);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.company.trim()) e.company = 'Company is required';
    if (!form.role.trim()) e.role = 'Role is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.lastDate) e.lastDate = 'Last date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      await placementService.openings.create({
        company: form.company,
        role: form.role,
        ctc: Number(form.ctc) || 0,
        location: form.location,
        eligibility: form.eligibility,
        lastDate: form.lastDate,
        logoColor: '#13327F',
        isActive: form.active === 'yes',
      });
      toast.success('Opening added', `${form.role} at ${form.company}`);
      setModalOpen(false);
      reloadOpenings();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save opening');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(app: PlacementApplication, status: PlacementApplication['status']) {
    await placementService.applications.updateStatus(app.id, status);
    reloadApplications();
  }

  const openingColumns: Column<PlacementOpening>[] = [
    { key: 'company', header: 'Company', render: (o) => <span className="font-semibold text-ink">{o.company}</span> },
    { key: 'role', header: 'Role', render: (o) => o.role },
    { key: 'ctc', header: 'CTC', render: (o) => `${o.ctc}L` },
    { key: 'location', header: 'Location', render: (o) => o.location },
    { key: 'lastDate', header: 'Last date', render: (o) => formatDate(o.lastDate) },
    {
      key: 'active',
      header: 'Status',
      render: (o) => <StatusPill status={o.isActive ? 'success' : 'neutral'} label={o.isActive ? 'Active' : 'Closed'} />,
    },
  ];

  const applicationColumns: Column<PlacementApplication>[] = [
    { key: 'student', header: 'Student', render: (a) => <span className="font-semibold text-ink">{a.studentName || '—'}</span> },
    { key: 'companyRole', header: 'Company / Role', render: (a) => a.companyRole || '—' },
    { key: 'status', header: 'Status', render: (a) => <StatusPill status={applicationStatusTone[a.status]} label={a.status} /> },
    { key: 'appliedOn', header: 'Applied on', render: (a) => formatDate(a.appliedOn) },
    {
      key: 'actions',
      header: 'Update status',
      width: '170px',
      render: (a) => (
        <Select
          value={a.status}
          onChange={(v) => handleStatusChange(a, v as PlacementApplication['status'])}
          options={APPLICATION_STATUSES.map((s) => ({ label: s, value: s }))}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Placements" subtitle="Company openings and student applications" action={<Button label="Add opening" icon="plus" onClick={openCreate} />} />

      <div className="mb-6 flex flex-wrap gap-3">
        {hasStats ? (
          <>
            {statsData?.eligible !== undefined && <StatCard label="Eligible" value={statsData.eligible} icon="people" tone="navy" />}
            {statsData?.applied !== undefined && <StatCard label="Applied" value={statsData.applied} icon="student" tone="info" />}
            {statsData?.placed !== undefined && <StatCard label="Placed" value={statsData.placed} icon="check" tone="success" />}
          </>
        ) : (
          <>
            <StatCard label="Openings" value={openings?.length ?? 0} icon="course" tone="navy" />
            <StatCard label="Applications" value={applications?.length ?? 0} icon="student" tone="info" />
          </>
        )}
      </div>

      <h2 className="mb-3 text-h3 text-ink">Openings</h2>
      {openingsLoading ? (
        <Loading />
      ) : !openings || openings.length === 0 ? (
        <EmptyState icon="course" title="No openings found" actionLabel="Add opening" onAction={openCreate} />
      ) : (
        <Table columns={openingColumns} rows={openings} />
      )}

      <h2 className="mb-3 mt-8 text-h3 text-ink">Applications</h2>
      {applicationsLoading ? (
        <Loading />
      ) : !applications || applications.length === 0 ? (
        <EmptyState icon="student" title="No applications found" />
      ) : (
        <Table columns={applicationColumns} rows={applications} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add opening" width={560}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Company" required error={errors.company} value={form.company} onChangeText={(v) => setField('company', v)} />
            <TextField label="Role" required error={errors.role} value={form.role} onChangeText={(v) => setField('role', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Location" required error={errors.location} value={form.location} onChangeText={(v) => setField('location', v)} />
            <TextField label="CTC (Lakhs)" type="number" value={form.ctc} onChangeText={(v) => setForm((f) => ({ ...f, ctc: v }))} />
          </div>
          <TextField label="Eligibility" value={form.eligibility} onChangeText={(v) => setForm((f) => ({ ...f, eligibility: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <DatePicker label="Last date" required error={errors.lastDate} value={form.lastDate} onChange={(v) => setField('lastDate', v)} />
            <Select
              label="Active"
              value={form.active}
              onChange={(v) => setForm((f) => ({ ...f, active: v }))}
              options={[
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Add opening" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
