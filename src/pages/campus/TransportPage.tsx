import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { useToast } from '../../state/ToastContext';
import type { BusLiveStatus, BusRoute, BusStop } from '../../data/types';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  TimePicker,
  Select,
  Chip,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

type Tab = 'routes' | 'stops' | 'liveStatus';

const emptyRouteForm = { name: '', number: '', driver: '', driverPhone: '' };
const emptyStopForm = { routeId: '', name: '', time: '', order: '1' };
const emptyLiveStatusForm = { routeId: '', currentStop: '', nextStop: '', etaMins: '5', occupancy: '0' };

export function TransportPage() {
  const [tab, setTab] = useState<Tab>('routes');
  const toast = useToast();

  const { data: routes, loading: routesLoading, reload: reloadRoutes } = useAsync(() => adminService.transport.routes.list(), []);
  const { data: stops, loading: stopsLoading, reload: reloadStops } = useAsync(() => adminService.transport.stops.list(), []);
  const {
    data: liveStatuses,
    loading: liveStatusLoading,
    reload: reloadLiveStatus,
  } = useAsync(() => adminService.transport.liveStatus.list(), []);

  const routeName = (id: string) => routes?.find((r) => r.id === id)?.name ?? '—';

  // Route modal
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [routeSaving, setRouteSaving] = useState(false);
  const [routeFormError, setRouteFormError] = useState<string>();
  const routeErrors = useFieldErrors();

  function openCreateRoute() {
    setEditingRoute(null);
    setRouteForm(emptyRouteForm);
    setRouteFormError(undefined);
    routeErrors.resetErrors();
    setRouteModalOpen(true);
  }

  function openEditRoute(r: BusRoute) {
    setEditingRoute(r);
    setRouteForm({ name: r.name, number: r.number, driver: r.driver, driverPhone: r.driverPhone });
    setRouteFormError(undefined);
    routeErrors.resetErrors();
    setRouteModalOpen(true);
  }

  async function handleSaveRoute() {
    const e: Record<string, string> = {};
    if (!routeForm.name.trim()) e.name = 'Route name is required';
    if (!routeForm.number.trim()) e.number = 'Route number is required';
    routeErrors.setErrors(e);
    if (Object.keys(e).length) return;
    setRouteSaving(true);
    setRouteFormError(undefined);
    try {
      if (editingRoute) {
        await adminService.transport.routes.update(editingRoute.id, {
          name: routeForm.name,
          number: routeForm.number,
          driver: routeForm.driver,
          driverPhone: routeForm.driverPhone,
        });
        toast.success('Route updated', routeForm.name);
      } else {
        await adminService.transport.routes.create({
          name: routeForm.name,
          number: routeForm.number,
          driver: routeForm.driver,
          driverPhone: routeForm.driverPhone,
        });
        toast.success('Route added', routeForm.name);
      }
      setRouteModalOpen(false);
      reloadRoutes();
    } catch (err) {
      setRouteFormError(err instanceof Error ? err.message : 'Could not save route');
    } finally {
      setRouteSaving(false);
    }
  }

  // Stop modal
  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [stopForm, setStopForm] = useState(emptyStopForm);
  const [stopSaving, setStopSaving] = useState(false);
  const [stopFormError, setStopFormError] = useState<string>();
  const stopErrors = useFieldErrors();

  function openCreateStop() {
    setStopForm({ ...emptyStopForm, routeId: routes?.[0]?.id ?? '' });
    setStopFormError(undefined);
    stopErrors.resetErrors();
    setStopModalOpen(true);
  }

  async function handleSaveStop() {
    const e: Record<string, string> = {};
    if (!stopForm.routeId) e.routeId = 'Route is required';
    if (!stopForm.name.trim()) e.name = 'Stop name is required';
    stopErrors.setErrors(e);
    if (Object.keys(e).length) return;
    setStopSaving(true);
    setStopFormError(undefined);
    try {
      await adminService.transport.stops.create({
        routeId: stopForm.routeId,
        name: stopForm.name,
        time: stopForm.time,
        order: Number(stopForm.order) || 0,
      });
      toast.success('Stop added', stopForm.name);
      setStopModalOpen(false);
      reloadStops();
    } catch (err) {
      setStopFormError(err instanceof Error ? err.message : 'Could not save stop');
    } finally {
      setStopSaving(false);
    }
  }

  // Live status modal
  const [liveStatusModalOpen, setLiveStatusModalOpen] = useState(false);
  const [liveStatusForm, setLiveStatusForm] = useState(emptyLiveStatusForm);
  const [liveStatusSaving, setLiveStatusSaving] = useState(false);
  const [liveStatusFormError, setLiveStatusFormError] = useState<string>();
  const liveErrors = useFieldErrors();

  function openUpdateLiveStatus(existing?: BusLiveStatus) {
    if (existing) {
      setLiveStatusForm({
        routeId: existing.routeId,
        currentStop: existing.currentStop,
        nextStop: existing.nextStop,
        etaMins: String(existing.etaMins),
        occupancy: String(existing.occupancy),
      });
    } else {
      setLiveStatusForm({ ...emptyLiveStatusForm, routeId: routes?.[0]?.id ?? '' });
    }
    setLiveStatusFormError(undefined);
    liveErrors.resetErrors();
    setLiveStatusModalOpen(true);
  }

  async function handleSaveLiveStatus() {
    const e: Record<string, string> = {};
    if (!liveStatusForm.routeId) e.routeId = 'Route is required';
    if (!liveStatusForm.currentStop.trim()) e.currentStop = 'Current stop is required';
    if (!liveStatusForm.nextStop.trim()) e.nextStop = 'Next stop is required';
    liveErrors.setErrors(e);
    if (Object.keys(e).length) return;
    setLiveStatusSaving(true);
    setLiveStatusFormError(undefined);
    try {
      await adminService.transport.liveStatus.update({
        routeId: liveStatusForm.routeId,
        currentStop: liveStatusForm.currentStop,
        nextStop: liveStatusForm.nextStop,
        etaMins: Number(liveStatusForm.etaMins) || 0,
        occupancy: Number(liveStatusForm.occupancy) || 0,
      });
      toast.success('Live status updated', routeName(liveStatusForm.routeId));
      setLiveStatusModalOpen(false);
      reloadLiveStatus();
    } catch (err) {
      setLiveStatusFormError(err instanceof Error ? err.message : 'Could not update live status');
    } finally {
      setLiveStatusSaving(false);
    }
  }

  const routeColumns: Column<BusRoute>[] = [
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
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (r) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openEditRoute(r)} />
        </div>
      ),
    },
  ];

  const sortedStops = [...(stops ?? [])].sort((a, b) => {
    const rn = routeName(a.routeId).localeCompare(routeName(b.routeId));
    return rn !== 0 ? rn : a.order - b.order;
  });

  const stopColumns: Column<BusStop>[] = [
    { key: 'route', header: 'Route', render: (s) => routeName(s.routeId) },
    { key: 'name', header: 'Stop', render: (s) => <span className="font-semibold text-ink">{s.name}</span> },
    { key: 'time', header: 'Time', render: (s) => s.time },
    { key: 'order', header: 'Order', render: (s) => s.order },
  ];

  const liveStatusColumns: Column<BusLiveStatus>[] = [
    { key: 'route', header: 'Route', render: (s) => <span className="font-semibold text-ink">{routeName(s.routeId)}</span> },
    { key: 'currentStop', header: 'Current stop', render: (s) => s.currentStop },
    { key: 'nextStop', header: 'Next stop', render: (s) => s.nextStop },
    { key: 'etaMins', header: 'ETA', render: (s) => `${s.etaMins} min` },
    { key: 'occupancy', header: 'Occupancy', render: (s) => `${s.occupancy}%` },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (s) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="edit" onClick={() => openUpdateLiveStatus(s)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transport"
        subtitle="Bus routes, stops, and live status"
        action={
          <div className="flex gap-2">
            <Chip label="Routes" selected={tab === 'routes'} onClick={() => setTab('routes')} />
            <Chip label="Stops" selected={tab === 'stops'} onClick={() => setTab('stops')} />
            <Chip label="Live Status" selected={tab === 'liveStatus'} onClick={() => setTab('liveStatus')} />
          </div>
        }
      />

      {tab === 'routes' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-small text-ink-muted">{routes ? `${routes.length} routes` : ''}</span>
            <Button label="Add route" icon="plus" size="sm" onClick={openCreateRoute} />
          </div>
          {routesLoading ? (
            <Loading />
          ) : !routes || routes.length === 0 ? (
            <EmptyState icon="transport" title="No routes found" actionLabel="Add route" onAction={openCreateRoute} />
          ) : (
            <Table columns={routeColumns} rows={routes} />
          )}
        </div>
      )}

      {tab === 'stops' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-small text-ink-muted">{stops ? `${stops.length} stops` : ''}</span>
            <Button label="Add stop" icon="plus" size="sm" onClick={openCreateStop} disabled={!routes || routes.length === 0} />
          </div>
          {stopsLoading ? (
            <Loading />
          ) : sortedStops.length === 0 ? (
            <EmptyState icon="transport" title="No stops found" actionLabel="Add stop" onAction={openCreateStop} />
          ) : (
            <Table columns={stopColumns} rows={sortedStops} />
          )}
        </div>
      )}

      {tab === 'liveStatus' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-small text-ink-muted">{liveStatuses ? `${liveStatuses.length} routes reporting` : ''}</span>
            <Button
              label="Update status"
              icon="plus"
              size="sm"
              onClick={() => openUpdateLiveStatus()}
              disabled={!routes || routes.length === 0}
            />
          </div>
          {liveStatusLoading ? (
            <Loading />
          ) : !liveStatuses || liveStatuses.length === 0 ? (
            <EmptyState icon="transport" title="No live status reported yet" actionLabel="Update status" onAction={() => openUpdateLiveStatus()} />
          ) : (
            <Table columns={liveStatusColumns} rows={liveStatuses} />
          )}
        </div>
      )}

      <Modal open={routeModalOpen} onClose={() => setRouteModalOpen(false)} title={editingRoute ? 'Edit route' : 'Add route'}>
        <div className="flex flex-col gap-4">
          {routeFormError && <Banner tone="danger" title={routeFormError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Route name" required error={routeErrors.errors.name} value={routeForm.name} onChangeText={(v) => { setRouteForm((f) => ({ ...f, name: v })); routeErrors.clearError('name'); }} />
            <TextField label="Route number" required error={routeErrors.errors.number} value={routeForm.number} onChangeText={(v) => { setRouteForm((f) => ({ ...f, number: v })); routeErrors.clearError('number'); }} />
            <TextField label="Driver" value={routeForm.driver} onChangeText={(v) => setRouteForm((f) => ({ ...f, driver: v }))} />
            <TextField label="Driver phone" value={routeForm.driverPhone} onChangeText={(v) => setRouteForm((f) => ({ ...f, driverPhone: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setRouteModalOpen(false)} />
            <Button label={editingRoute ? 'Save changes' : 'Add route'} size="sm" loading={routeSaving} onClick={handleSaveRoute} />
          </div>
        </div>
      </Modal>

      <Modal open={stopModalOpen} onClose={() => setStopModalOpen(false)} title="Add stop">
        <div className="flex flex-col gap-4">
          {stopFormError && <Banner tone="danger" title={stopFormError} />}
          <Select
            label="Route"
            required
            error={stopErrors.errors.routeId}
            value={stopForm.routeId}
            onChange={(v) => { setStopForm((f) => ({ ...f, routeId: v })); stopErrors.clearError('routeId'); }}
            options={(routes ?? []).map((r) => ({ label: r.name, value: r.id }))}
          />
          <TextField label="Stop name" required error={stopErrors.errors.name} value={stopForm.name} onChangeText={(v) => { setStopForm((f) => ({ ...f, name: v })); stopErrors.clearError('name'); }} />
          <div className="grid grid-cols-2 gap-3">
            <TimePicker label="Time" value={stopForm.time} onChange={(v) => setStopForm((f) => ({ ...f, time: v }))} />
            <TextField label="Order" type="number" value={stopForm.order} onChangeText={(v) => setStopForm((f) => ({ ...f, order: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setStopModalOpen(false)} />
            <Button label="Add stop" size="sm" loading={stopSaving} onClick={handleSaveStop} />
          </div>
        </div>
      </Modal>

      <Modal open={liveStatusModalOpen} onClose={() => setLiveStatusModalOpen(false)} title="Update live status">
        <div className="flex flex-col gap-4">
          {liveStatusFormError && <Banner tone="danger" title={liveStatusFormError} />}
          <Select
            label="Route"
            required
            error={liveErrors.errors.routeId}
            value={liveStatusForm.routeId}
            onChange={(v) => { setLiveStatusForm((f) => ({ ...f, routeId: v })); liveErrors.clearError('routeId'); }}
            options={(routes ?? []).map((r) => ({ label: r.name, value: r.id }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Current stop" required error={liveErrors.errors.currentStop} value={liveStatusForm.currentStop} onChangeText={(v) => { setLiveStatusForm((f) => ({ ...f, currentStop: v })); liveErrors.clearError('currentStop'); }} />
            <TextField label="Next stop" required error={liveErrors.errors.nextStop} value={liveStatusForm.nextStop} onChangeText={(v) => { setLiveStatusForm((f) => ({ ...f, nextStop: v })); liveErrors.clearError('nextStop'); }} />
            <TextField
              label="ETA (mins)"
              type="number"
              value={liveStatusForm.etaMins}
              onChangeText={(v) => setLiveStatusForm((f) => ({ ...f, etaMins: v }))}
            />
            <TextField
              label="Occupancy (%)"
              type="number"
              value={liveStatusForm.occupancy}
              onChangeText={(v) => setLiveStatusForm((f) => ({ ...f, occupancy: v }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setLiveStatusModalOpen(false)} />
            <Button label="Update status" size="sm" loading={liveStatusSaving} onClick={handleSaveLiveStatus} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
