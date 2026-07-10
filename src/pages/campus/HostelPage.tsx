import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import type { HostelAllocation, HostelBlock, HostelRoom } from '../../data/types';
import { formatINR } from '../../lib';
import {
  PageHeader,
  Button,
  Table,
  type Column,
  Modal,
  TextField,
  Select,
  SearchableSelect,
  Chip,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

type Tab = 'blocks' | 'rooms' | 'allocations';

const emptyBlockForm = { name: '', warden: '', wardenPhone: '' };
const emptyRoomForm = { blockId: '', roomNo: '', capacity: '4' };
const emptyAllocationForm = { studentId: '', roomId: '', bed: '', messPlan: '', fees: '0' };

export function HostelPage() {
  const [tab, setTab] = useState<Tab>('blocks');
  const [successMsg, setSuccessMsg] = useState<string>();

  const { data: blocks, loading: blocksLoading, reload: reloadBlocks } = useAsync(() => adminService.hostel.blocks.list(), []);
  const { data: rooms, loading: roomsLoading, reload: reloadRooms } = useAsync(() => adminService.hostel.rooms.list(), []);
  const {
    data: allocations,
    loading: allocationsLoading,
    reload: reloadAllocations,
  } = useAsync(() => adminService.hostel.allocations.list(), []);
  const { data: students } = useAsync(() => adminService.students.list(), []);

  const blockName = (id: string) => blocks?.find((b) => b.id === id)?.name ?? '—';
  const roomLabel = (id: string) => {
    const room = rooms?.find((r) => r.id === id);
    if (!room) return '—';
    return `${blockName(room.blockId)} — ${room.roomNo}`;
  };

  // Block modal
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState(emptyBlockForm);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockFormError, setBlockFormError] = useState<string>();
  const [blockDeleteTarget, setBlockDeleteTarget] = useState<HostelBlock | null>(null);
  const [blockDeleteError, setBlockDeleteError] = useState<string>();
  const [blockDeleting, setBlockDeleting] = useState(false);
  const blockErrors = useFieldErrors();

  function openCreateBlock() {
    setBlockForm(emptyBlockForm);
    setBlockFormError(undefined);
    blockErrors.resetErrors();
    setBlockModalOpen(true);
  }

  async function handleSaveBlock() {
    const e: Record<string, string> = {};
    if (!blockForm.name.trim()) e.name = 'Block name is required';
    if (!blockForm.warden.trim()) e.warden = 'Warden is required';
    blockErrors.setErrors(e);
    if (Object.keys(e).length) return;
    setBlockSaving(true);
    setBlockFormError(undefined);
    try {
      await adminService.hostel.blocks.create({
        name: blockForm.name,
        warden: blockForm.warden,
        wardenPhone: blockForm.wardenPhone,
      });
      setSuccessMsg(`Added block "${blockForm.name}"`);
      setBlockModalOpen(false);
      reloadBlocks();
    } catch (err) {
      setBlockFormError(err instanceof Error ? err.message : 'Could not save block');
    } finally {
      setBlockSaving(false);
    }
  }

  async function handleDeleteBlock() {
    if (!blockDeleteTarget) return;
    setBlockDeleting(true);
    setBlockDeleteError(undefined);
    try {
      await adminService.hostel.blocks.remove(blockDeleteTarget.id);
      setBlockDeleteTarget(null);
      reloadBlocks();
    } catch (err) {
      setBlockDeleteError(err instanceof Error ? err.message : 'Could not remove block');
    } finally {
      setBlockDeleting(false);
    }
  }

  // Room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomFormError, setRoomFormError] = useState<string>();
  const roomErrors = useFieldErrors();

  function openCreateRoom() {
    setRoomForm({ ...emptyRoomForm, blockId: blocks?.[0]?.id ?? '' });
    setRoomFormError(undefined);
    roomErrors.resetErrors();
    setRoomModalOpen(true);
  }

  async function handleSaveRoom() {
    const e: Record<string, string> = {};
    if (!roomForm.blockId) e.blockId = 'Block is required';
    if (!roomForm.roomNo.trim()) e.roomNo = 'Room number is required';
    roomErrors.setErrors(e);
    if (Object.keys(e).length) return;
    setRoomSaving(true);
    setRoomFormError(undefined);
    try {
      await adminService.hostel.rooms.create({
        blockId: roomForm.blockId,
        roomNo: roomForm.roomNo,
        capacity: Number(roomForm.capacity) || 0,
      });
      setSuccessMsg(`Added room ${roomForm.roomNo}`);
      setRoomModalOpen(false);
      reloadRooms();
    } catch (err) {
      setRoomFormError(err instanceof Error ? err.message : 'Could not save room');
    } finally {
      setRoomSaving(false);
    }
  }

  // Allocation modal
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationForm, setAllocationForm] = useState(emptyAllocationForm);
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [allocationFormError, setAllocationFormError] = useState<string>();
  const [allocationDeleteTarget, setAllocationDeleteTarget] = useState<HostelAllocation | null>(null);
  const [allocationDeleteError, setAllocationDeleteError] = useState<string>();
  const [allocationDeleting, setAllocationDeleting] = useState(false);
  const allocErrors = useFieldErrors();

  function openCreateAllocation() {
    setAllocationForm({ ...emptyAllocationForm, roomId: rooms?.[0]?.id ?? '' });
    setAllocationFormError(undefined);
    allocErrors.resetErrors();
    setAllocationModalOpen(true);
  }

  async function handleSaveAllocation() {
    const e: Record<string, string> = {};
    if (!allocationForm.studentId) e.studentId = 'Student is required';
    if (!allocationForm.roomId) e.roomId = 'Room is required';
    if (!allocationForm.bed.trim()) e.bed = 'Bed is required';
    allocErrors.setErrors(e);
    if (Object.keys(e).length) return;
    const student = students?.find((s) => s.id === allocationForm.studentId);
    if (!student) return;
    setAllocationSaving(true);
    setAllocationFormError(undefined);
    try {
      await adminService.hostel.allocations.create({
        studentId: student.id,
        studentName: student.name,
        roomId: allocationForm.roomId,
        bed: allocationForm.bed,
        messPlan: allocationForm.messPlan,
        fees: Number(allocationForm.fees) || 0,
      });
      setSuccessMsg(`Allocated ${student.name} to a room`);
      setAllocationModalOpen(false);
      reloadAllocations();
    } catch (err) {
      setAllocationFormError(err instanceof Error ? err.message : 'Could not save allocation');
    } finally {
      setAllocationSaving(false);
    }
  }

  async function handleDeleteAllocation() {
    if (!allocationDeleteTarget) return;
    setAllocationDeleting(true);
    setAllocationDeleteError(undefined);
    try {
      await adminService.hostel.allocations.remove(allocationDeleteTarget.id);
      setAllocationDeleteTarget(null);
      reloadAllocations();
    } catch (err) {
      setAllocationDeleteError(err instanceof Error ? err.message : 'Could not remove allocation');
    } finally {
      setAllocationDeleting(false);
    }
  }

  const blockColumns: Column<HostelBlock>[] = [
    { key: 'name', header: 'Block', render: (b) => <span className="font-semibold text-ink">{b.name}</span> },
    { key: 'warden', header: 'Warden', render: (b) => b.warden },
    { key: 'wardenPhone', header: 'Warden phone', render: (b) => b.wardenPhone },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (b) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setBlockDeleteTarget(b)} />
        </div>
      ),
    },
  ];

  const roomColumns: Column<HostelRoom>[] = [
    { key: 'block', header: 'Block', render: (r) => blockName(r.blockId) },
    { key: 'roomNo', header: 'Room no.', render: (r) => <span className="font-semibold text-ink">{r.roomNo}</span> },
    { key: 'capacity', header: 'Capacity', render: (r) => r.capacity },
  ];

  const allocationColumns: Column<HostelAllocation>[] = [
    { key: 'student', header: 'Student', render: (a) => <span className="font-semibold text-ink">{a.studentName}</span> },
    { key: 'room', header: 'Room', render: (a) => roomLabel(a.roomId) },
    { key: 'bed', header: 'Bed', render: (a) => a.bed },
    { key: 'messPlan', header: 'Mess plan', render: (a) => a.messPlan },
    { key: 'fees', header: 'Fees', render: (a) => formatINR(a.fees) },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (a) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" icon="trash" className="text-danger hover:bg-danger-soft" onClick={() => setAllocationDeleteTarget(a)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hostel"
        subtitle="Blocks, rooms, and student allocations"
        action={
          <div className="flex gap-2">
            <Chip label="Blocks" selected={tab === 'blocks'} onClick={() => setTab('blocks')} />
            <Chip label="Rooms" selected={tab === 'rooms'} onClick={() => setTab('rooms')} />
            <Chip label="Allocations" selected={tab === 'allocations'} onClick={() => setTab('allocations')} />
          </div>
        }
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {tab === 'blocks' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-small text-ink-muted">{blocks ? `${blocks.length} blocks` : ''}</span>
            <Button label="Add block" icon="plus" size="sm" onClick={openCreateBlock} />
          </div>
          {blocksLoading ? (
            <Loading />
          ) : !blocks || blocks.length === 0 ? (
            <EmptyState icon="hostel" title="No hostel blocks found" actionLabel="Add block" onAction={openCreateBlock} />
          ) : (
            <Table columns={blockColumns} rows={blocks} />
          )}
        </div>
      )}

      {tab === 'rooms' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-small text-ink-muted">{rooms ? `${rooms.length} rooms` : ''}</span>
            <Button label="Add room" icon="plus" size="sm" onClick={openCreateRoom} disabled={!blocks || blocks.length === 0} />
          </div>
          {roomsLoading ? (
            <Loading />
          ) : !rooms || rooms.length === 0 ? (
            <EmptyState icon="hostel" title="No rooms found" actionLabel="Add room" onAction={openCreateRoom} />
          ) : (
            <Table columns={roomColumns} rows={rooms} />
          )}
        </div>
      )}

      {tab === 'allocations' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-small text-ink-muted">{allocations ? `${allocations.length} allocations` : ''}</span>
            <Button label="Add allocation" icon="plus" size="sm" onClick={openCreateAllocation} disabled={!rooms || rooms.length === 0} />
          </div>
          {allocationsLoading ? (
            <Loading />
          ) : !allocations || allocations.length === 0 ? (
            <EmptyState icon="hostel" title="No allocations found" actionLabel="Add allocation" onAction={openCreateAllocation} />
          ) : (
            <Table columns={allocationColumns} rows={allocations} />
          )}
        </div>
      )}

      <Modal open={blockModalOpen} onClose={() => setBlockModalOpen(false)} title="Add block">
        <div className="flex flex-col gap-4">
          {blockFormError && <Banner tone="danger" title={blockFormError} />}
          <TextField label="Block name" required error={blockErrors.errors.name} value={blockForm.name} onChangeText={(v) => { setBlockForm((f) => ({ ...f, name: v })); blockErrors.clearError('name'); }} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Warden" required error={blockErrors.errors.warden} value={blockForm.warden} onChangeText={(v) => { setBlockForm((f) => ({ ...f, warden: v })); blockErrors.clearError('warden'); }} />
            <TextField label="Warden phone" value={blockForm.wardenPhone} onChangeText={(v) => setBlockForm((f) => ({ ...f, wardenPhone: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setBlockModalOpen(false)} />
            <Button label="Add block" size="sm" loading={blockSaving} onClick={handleSaveBlock} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!blockDeleteTarget}
        onClose={() => {
          setBlockDeleteTarget(null);
          setBlockDeleteError(undefined);
        }}
        onConfirm={handleDeleteBlock}
        title="Remove block"
        message={`Remove ${blockDeleteTarget?.name}? This cannot be undone.`}
        loading={blockDeleting}
        error={blockDeleteError}
      />

      <Modal open={roomModalOpen} onClose={() => setRoomModalOpen(false)} title="Add room">
        <div className="flex flex-col gap-4">
          {roomFormError && <Banner tone="danger" title={roomFormError} />}
          <Select
            label="Block"
            required
            error={roomErrors.errors.blockId}
            value={roomForm.blockId}
            onChange={(v) => { setRoomForm((f) => ({ ...f, blockId: v })); roomErrors.clearError('blockId'); }}
            options={(blocks ?? []).map((b) => ({ label: b.name, value: b.id }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Room no." required error={roomErrors.errors.roomNo} value={roomForm.roomNo} onChangeText={(v) => { setRoomForm((f) => ({ ...f, roomNo: v })); roomErrors.clearError('roomNo'); }} />
            <TextField label="Capacity" type="number" value={roomForm.capacity} onChangeText={(v) => setRoomForm((f) => ({ ...f, capacity: v }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setRoomModalOpen(false)} />
            <Button label="Add room" size="sm" loading={roomSaving} onClick={handleSaveRoom} />
          </div>
        </div>
      </Modal>

      <Modal open={allocationModalOpen} onClose={() => setAllocationModalOpen(false)} title="Add allocation" width={520}>
        <div className="flex flex-col gap-4">
          {allocationFormError && <Banner tone="danger" title={allocationFormError} />}
          <SearchableSelect
            label="Student"
            required
            error={allocErrors.errors.studentId}
            value={allocationForm.studentId}
            onChange={(v) => { setAllocationForm((f) => ({ ...f, studentId: v })); allocErrors.clearError('studentId'); }}
            options={(students ?? []).map((s) => ({ label: s.name, value: s.id, sub: s.rollNo }))}
            placeholder="Search by name or roll no…"
          />
          <Select
            label="Room"
            required
            error={allocErrors.errors.roomId}
            value={allocationForm.roomId}
            onChange={(v) => { setAllocationForm((f) => ({ ...f, roomId: v })); allocErrors.clearError('roomId'); }}
            options={(rooms ?? []).map((r) => ({ label: `${blockName(r.blockId)} — ${r.roomNo}`, value: r.id }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Bed" required error={allocErrors.errors.bed} value={allocationForm.bed} onChangeText={(v) => { setAllocationForm((f) => ({ ...f, bed: v })); allocErrors.clearError('bed'); }} />
            <TextField label="Mess plan" value={allocationForm.messPlan} onChangeText={(v) => setAllocationForm((f) => ({ ...f, messPlan: v }))} />
          </div>
          <TextField label="Fees" type="number" value={allocationForm.fees} onChangeText={(v) => setAllocationForm((f) => ({ ...f, fees: v }))} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setAllocationModalOpen(false)} />
            <Button label="Add allocation" size="sm" loading={allocationSaving} onClick={handleSaveAllocation} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!allocationDeleteTarget}
        onClose={() => {
          setAllocationDeleteTarget(null);
          setAllocationDeleteError(undefined);
        }}
        onConfirm={handleDeleteAllocation}
        title="Remove allocation"
        message={`Remove allocation for ${allocationDeleteTarget?.studentName}? This cannot be undone.`}
        loading={allocationDeleting}
        error={allocationDeleteError}
      />
    </div>
  );
}
