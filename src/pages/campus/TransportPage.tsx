import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import type { BusRoute } from '../../data/types';
import { PageHeader, Button, Table, type Column, Modal, TextField, Banner, Loading, EmptyState } from '../../components';

const emptyForm = {
  name: '',
  number: '',
  driver: '',
  driverPhone: '',
};

export function TransportPage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.transport.list(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BusRoute | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    setModalOpen(true);
  }

  function openEdit(r: BusRoute) {
    setEditing(r);
    setForm({
      name: r.name,
      number: r.number,
      driver: r.driver,
      driverPhone: r.driverPhone,
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.number.trim()) {
      setFormError('Route name and number are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      if (editing) {
        const payload = {
          ...editing,
          name: form.name,
          number: form.number,
          driver: form.driver,
          driverPhone: form.driverPhone,
        };
        await adminService.transport.update(editing.id, payload);
        setSuccessMsg(`Updated route "${payload.name}"`);
      } else {
        const payload = {
          name: form.name,
          number: form.number,
          driver: form.driver,
          driverPhone: form.driverPhone,
          stops: [],
        };
        await adminService.transport.create(payload);
        setSuccessMsg(`Added route "${payload.name}"`);
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save route');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<BusRoute>[] = [
    {
      key: 'name',
      header: 'Route',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.name}</div>
          <div className="text-caption text-ink-soft">{r.number}</div>
        </div>
      ),
    },
    { key: 'driver', header: 'Driver', render: (r) => r.driver },
    { key: 'driverPhone', header: 'Driver phone', render: (r) => r.driverPhone },
    { key: 'stops', header: 'Stops', render: (r) => `${r.stops.length} stops` },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (r) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(r)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transport"
        subtitle={rows ? `${rows.length} routes` : undefined}
        action={<Button label="Add route" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="campus" title="No routes found" actionLabel="Add route" onAction={openCreate} />
      ) : (
        <Table columns={columns} rows={rows} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit route' : 'Add route'}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Route name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <TextField label="Route number" value={form.number} onChangeText={(v) => setForm((f) => ({ ...f, number: v }))} />
            <TextField label="Driver" value={form.driver} onChangeText={(v) => setForm((f) => ({ ...f, driver: v }))} />
            <TextField label="Driver phone" value={form.driverPhone} onChangeText={(v) => setForm((f) => ({ ...f, driverPhone: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add route'} size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
