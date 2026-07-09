import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { groupBy, keyBy } from '../../lib';
import type { ClassSession, Section, Weekday } from '../../data/types';
import {
  PageHeader,
  Button,
  Card,
  Modal,
  TextField,
  Select,
  StatusPill,
  ConfirmDialog,
  Banner,
  Loading,
  EmptyState,
} from '../../components';

const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSION_TYPES: ClassSession['type'][] = ['Lecture', 'Lab', 'Tutorial'];

const typeTone: Record<ClassSession['type'], 'info' | 'warning' | 'neutral'> = {
  Lecture: 'info',
  Lab: 'warning',
  Tutorial: 'neutral',
};

function emptyFormFor(defaultSubjectId: string) {
  return {
    subjectId: defaultSubjectId,
    day: 'Mon' as Weekday,
    start: '',
    end: '',
    room: '',
    sectionId: '',
    facultyId: '',
    type: 'Lecture' as ClassSession['type'],
  };
}

export function TimetablePage() {
  const { data: rows, loading, reload } = useAsync(() => adminService.timetable.list(), []);
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);
  const { data: facultyCandidates } = useAsync(() => adminService.subjects.facultyCandidates(), []);
  const { data: allSections } = useAsync(() => adminService.sections.list(), []);

  const subjectById = keyBy(subjects ?? [], (s) => s.id);
  const sectionById = keyBy(allSections ?? [], (s) => s.id);
  const subjectOptions = (subjects ?? []).map((s) => ({ label: `${s.code} · ${s.name}`, value: s.id }));
  const facultyName = (id?: string) => facultyCandidates?.find((f) => f.id === id)?.fullName ?? '—';
  const sectionLabel = (id: string) => (sectionById[id] ? `Section ${sectionById[id].name}` : id);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [form, setForm] = useState(emptyFormFor(''));
  const [sectionOptions, setSectionOptions] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();

  const [deleteTarget, setDeleteTarget] = useState<ClassSession | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  // Section options are scoped to whichever subject is picked — its semester carries the
  // scope, so there's no separate "Semester" field on this form (matches item 2's feedback).
  async function loadSectionsForSubject(subjectId: string) {
    const subject = (subjects ?? []).find((s) => s.id === subjectId);
    if (!subject) {
      setSectionOptions([]);
      return;
    }
    const rows = await adminService.sections.list(subject.semesterId);
    setSectionOptions(rows);
  }

  async function handleSubjectChange(subjectId: string) {
    const subject = (subjects ?? []).find((s) => s.id === subjectId);
    setForm((f) => ({ ...f, subjectId, sectionId: '', facultyId: subject?.facultyId ?? f.facultyId }));
    await loadSectionsForSubject(subjectId);
  }

  async function openCreate() {
    setEditing(null);
    const firstSubjectId = subjects?.[0]?.id ?? '';
    setForm({ ...emptyFormFor(firstSubjectId), facultyId: subjects?.[0]?.facultyId ?? '' });
    await loadSectionsForSubject(firstSubjectId);
    setFormError(undefined);
    setModalOpen(true);
  }

  async function openEdit(s: ClassSession) {
    setEditing(s);
    setForm({
      subjectId: s.subjectId,
      day: s.day,
      start: s.start,
      end: s.end,
      room: s.room,
      sectionId: s.sectionId,
      facultyId: s.facultyId ?? '',
      type: s.type,
    });
    await loadSectionsForSubject(s.subjectId);
    setFormError(undefined);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.subjectId || !form.start.trim() || !form.end.trim() || !form.room.trim() || !form.sectionId) {
      setFormError('Subject, start/end time, room, and section are required');
      return;
    }
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        subjectId: form.subjectId,
        day: form.day,
        start: form.start,
        end: form.end,
        room: form.room,
        sectionId: form.sectionId,
        facultyId: form.facultyId || undefined,
        facultyName: form.facultyId ? facultyName(form.facultyId) : undefined,
        type: form.type,
      };
      if (editing) {
        await adminService.timetable.update(editing.id, payload);
        setSuccessMsg('Updated session');
      } else {
        await adminService.timetable.create(payload);
        setSuccessMsg('Added session');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save session');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await adminService.timetable.remove(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not remove session');
    } finally {
      setDeleting(false);
    }
  }

  const grouped = groupBy(rows ?? [], (s) => s.day);

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle={rows ? `${rows.length} sessions` : undefined}
        action={<Button label="Add session" icon="plus" onClick={openCreate} />}
      />

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : !rows || rows.length === 0 ? (
        <EmptyState icon="academics" title="No sessions found" actionLabel="Add session" onAction={openCreate} />
      ) : (
        <div className="flex flex-col gap-4">
          {WEEKDAYS.filter((day) => grouped[day]?.length).map((day) => (
            <Card key={day}>
              <div className="mb-3 text-title text-ink">{day}</div>
              <div className="flex flex-col divide-y divide-line-soft">
                {grouped[day].map((s) => {
                  const subject = subjectById[s.subjectId];
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="font-semibold text-ink">
                          {subject ? `${subject.code} · ${subject.name}` : s.subjectId}
                        </div>
                        <div className="text-caption text-ink-soft">
                          {s.start}–{s.end} · Room {s.room} · {sectionLabel(s.sectionId)}
                          {s.facultyName ? ` · ${s.facultyName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill label={s.type} status={typeTone[s.type]} />
                        <Button variant="ghost" size="sm" icon="edit" onClick={() => openEdit(s)} />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="trash"
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setDeleteTarget(s)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit session' : 'Add session'} width={520}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}
          <Select label="Subject" value={form.subjectId} onChange={handleSubjectChange} options={subjectOptions} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Day"
              value={form.day}
              onChange={(v) => setForm((f) => ({ ...f, day: v as Weekday }))}
              options={WEEKDAYS.map((d) => ({ label: d, value: d }))}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v as ClassSession['type'] }))}
              options={SESSION_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <TextField label="Start" placeholder="09:00" value={form.start} onChangeText={(v) => setForm((f) => ({ ...f, start: v }))} />
            <TextField label="End" placeholder="10:00" value={form.end} onChangeText={(v) => setForm((f) => ({ ...f, end: v }))} />
            <TextField label="Room" value={form.room} onChangeText={(v) => setForm((f) => ({ ...f, room: v }))} />
            <Select
              label="Section"
              value={form.sectionId}
              onChange={(v) => setForm((f) => ({ ...f, sectionId: v }))}
              options={sectionOptions.map((s) => ({ label: `Section ${s.name}`, value: s.id }))}
            />
          </div>
          <Select
            label="Faculty"
            value={form.facultyId}
            onChange={(v) => setForm((f) => ({ ...f, facultyId: v }))}
            options={[{ label: 'Unassigned', value: '' }, ...(facultyCandidates ?? []).map((c) => ({ label: c.fullName, value: c.id }))]}
          />
          <div className="flex justify-end gap-2">
            <Button label="Cancel" variant="outline" size="sm" onClick={() => setModalOpen(false)} />
            <Button label={editing ? 'Save changes' : 'Add session'} size="sm" loading={saving} onClick={handleSave} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(undefined);
        }}
        onConfirm={handleDelete}
        title="Remove session"
        message="Remove this session from the timetable? This cannot be undone."
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
