import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { formatINR } from '../../lib';
import { PageHeader, Button, Card, Modal, TextField, Banner, Loading } from '../../components';

const emptyForm = {
  block: '',
  totalRooms: '0',
  occupied: '0',
  warden: '',
  wardenPhone: '',
  messPlan: '',
  fees: '0',
};

export function HostelPage() {
  const { data: hostel, loading, reload } = useAsync(() => adminService.hostel.get(), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();

  function openEdit() {
    if (!hostel) return;
    setForm({
      block: hostel.block,
      totalRooms: String(hostel.totalRooms),
      occupied: String(hostel.occupied),
      warden: hostel.warden,
      wardenPhone: hostel.wardenPhone,
      messPlan: hostel.messPlan,
      fees: String(hostel.fees),
    });
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.block.trim() || !form.warden.trim()) {
      setFormError('Block and warden are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        block: form.block,
        totalRooms: Number(form.totalRooms) || 0,
        occupied: Number(form.occupied) || 0,
        warden: form.warden,
        wardenPhone: form.wardenPhone,
        messPlan: form.messPlan,
        fees: Number(form.fees) || 0,
      };
      await adminService.hostel.update(payload);
      setModalOpen(false);
      reload();
      setSuccessMsg('Hostel details updated');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save hostel details');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Hostel" action={<Button label="Edit" icon="edit" onClick={openEdit} disabled={!hostel} />} />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading || !hostel ? (
        <Loading />
      ) : (
        <Card>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Block</div>
              <div className="mt-1 text-title text-ink">{hostel.block}</div>
            </div>
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Occupancy</div>
              <div className="mt-1 text-title text-ink">{`${hostel.occupied}/${hostel.totalRooms} occupied`}</div>
            </div>
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Total rooms</div>
              <div className="mt-1 text-title text-ink">{hostel.totalRooms}</div>
            </div>
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Warden</div>
              <div className="mt-1 text-title text-ink">{hostel.warden}</div>
            </div>
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Warden phone</div>
              <div className="mt-1 text-title text-ink">{hostel.wardenPhone}</div>
            </div>
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Mess plan</div>
              <div className="mt-1 text-title text-ink">{hostel.messPlan}</div>
            </div>
            <div>
              <div className="text-label uppercase tracking-wide text-ink-muted">Fees</div>
              <div className="mt-1 text-title text-ink">{formatINR(hostel.fees)}</div>
            </div>
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit hostel details">
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Block" value={form.block} onChangeText={(v) => setForm((f) => ({ ...f, block: v }))} />
            <TextField label="Total rooms" type="number" value={form.totalRooms} onChangeText={(v) => setForm((f) => ({ ...f, totalRooms: v }))} />
            <TextField label="Occupied" type="number" value={form.occupied} onChangeText={(v) => setForm((f) => ({ ...f, occupied: v }))} />
            <TextField label="Fees" type="number" value={form.fees} onChangeText={(v) => setForm((f) => ({ ...f, fees: v }))} />
            <TextField label="Warden" value={form.warden} onChangeText={(v) => setForm((f) => ({ ...f, warden: v }))} />
            <TextField label="Warden phone" value={form.wardenPhone} onChangeText={(v) => setForm((f) => ({ ...f, wardenPhone: v }))} />
          </div>
          <TextField label="Mess plan" value={form.messPlan} onChangeText={(v) => setForm((f) => ({ ...f, messPlan: v }))} />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label="Save changes" size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
