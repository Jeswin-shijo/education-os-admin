import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useFieldErrors } from '../../hooks/useFieldErrors';
import { groupBy, keyBy } from '../../lib';
import type { ClassSession, Weekday, Shift, SessionStatus } from '../../data/types';
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
  Pagination,
} from '../../components';

const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSION_TYPES: ClassSession['type'][] = ['Lecture', 'Lab', 'Tutorial'];
const SHIFTS: Shift[] = ['Morning', 'Afternoon', 'Evening'];
const STATUSES: SessionStatus[] = ['active', 'inactive'];

const typeTone: Record<ClassSession['type'], 'info' | 'warning' | 'neutral'> = {
  Lecture: 'info',
  Lab: 'warning',
  Tutorial: 'neutral',
};

/** Minutes between two "HH:MM" times; undefined if unparseable or non-positive. */
function computeDurationMins(start: string, end: string): number | undefined {
  const re = /^(\d{1,2}):(\d{2})$/;
  const a = start.trim().match(re);
  const b = end.trim().match(re);
  if (!a || !b) return undefined;
  const startMin = Number(a[1]) * 60 + Number(a[2]);
  const endMin = Number(b[1]) * 60 + Number(b[2]);
  const diff = endMin - startMin;
  return diff > 0 ? diff : undefined;
}

/** Human duration: 110 -> "1h 50m", 50 -> "50m", 120 -> "2h". */
function formatDuration(mins?: number): string {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m || !h) parts.push(`${m}m`);
  return parts.join(' ');
}

// UI-only fields (department/program/semester) scope the cascade down to a Section +
// Subject; they aren't sent to the backend — the session infers them from those two.
const emptyForm = {
  academicSession: '',
  departmentId: '',
  programId: '',
  semesterId: '',
  sectionId: '',
  shift: '' as Shift | '',
  subjectId: '',
  facultyId: '',
  type: 'Lecture' as ClassSession['type'],
  day: 'Mon' as Weekday,
  start: '',
  end: '',
  room: '',
  status: 'active' as SessionStatus,
};

export function TimetablePage() {
  const [facultyFilter, setFacultyFilter] = useState('');
  const { rows, pagination, page, setPage, loading, reload } = usePaginatedList(
    (p) => adminService.timetable.listPage(facultyFilter || undefined, p),
    [facultyFilter],
  );
  const { data: subjects } = useAsync(() => adminService.subjects.list(), []);
  const { data: facultyCandidates } = useAsync(() => adminService.subjects.facultyCandidates(), []);
  const { data: departments } = useAsync(() => adminService.departments.list(), []);
  const { data: programs } = useAsync(() => adminService.programs.list(), []);
  const { data: allSemesters } = useAsync(() => adminService.semesters.list(), []);
  const { data: allSections } = useAsync(() => adminService.sections.list(), []);

  const subjectById = keyBy(subjects ?? [], (s) => s.id);
  const sectionById = keyBy(allSections ?? [], (s) => s.id);
  const facultyName = (id?: string) => facultyCandidates?.find((f) => f.id === id)?.fullName ?? '—';
  const sectionLabel = (id: string) => (sectionById[id] ? `Section ${sectionById[id].name}` : id);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const { errors, setErrors, clearError, resetErrors } = useFieldErrors();

  const [deleteTarget, setDeleteTarget] = useState<ClassSession | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string>();

  // Option lists, derived from the current cascade selections.
  const facultyOptions = (facultyCandidates ?? []).map((c) => ({ label: c.fullName, value: c.id }));
  const departmentOptions = (departments ?? []).map((d) => ({ label: d.name, value: d.id }));
  const programOptions = (programs ?? [])
    .filter((p) => p.departmentId === form.departmentId)
    .map((p) => ({ label: `${p.code} · ${p.name}`, value: p.id }));
  const semesterOptions = (allSemesters ?? [])
    .filter((s) => s.programId === form.programId)
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((s) => ({ label: `Semester ${s.number}`, value: s.id }));
  const sectionOptions = (allSections ?? [])
    .filter((s) => s.semesterId === form.semesterId)
    .map((s) => ({ label: `Section ${s.name}`, value: s.id }));
  const subjectOptions = (subjects ?? [])
    .filter((s) => s.semesterId === form.semesterId)
    .map((s) => ({ label: `${s.code} · ${s.name}`, value: s.id }));

  // Duration is AUTO — always derived from start/end, never entered by hand.
  const durationMins = computeDurationMins(form.start, form.end);

  function setField<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    clearError(key as string);
  }

  // Cascade resets: picking an upstream field clears everything downstream of it.
  function setDepartment(departmentId: string) {
    setForm((f) => ({ ...f, departmentId, programId: '', semesterId: '', sectionId: '', subjectId: '' }));
    clearError('departmentId');
  }
  function setProgram(programId: string) {
    setForm((f) => ({ ...f, programId, semesterId: '', sectionId: '', subjectId: '' }));
    clearError('programId');
  }
  function setSemester(semesterId: string) {
    setForm((f) => ({ ...f, semesterId, sectionId: '', subjectId: '' }));
    clearError('semesterId');
  }
  function setSection(sectionId: string) {
    // A section can carry its own shift — adopt it as the default when picked.
    const section = (allSections ?? []).find((s) => s.id === sectionId);
    setForm((f) => ({ ...f, sectionId, shift: section?.shift ?? f.shift }));
    clearError('sectionId');
  }
  function setSubject(subjectId: string) {
    const subject = (subjects ?? []).find((s) => s.id === subjectId);
    setForm((f) => ({ ...f, subjectId, facultyId: subject?.facultyId ?? f.facultyId }));
    clearError('subjectId');
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function openEdit(s: ClassSession) {
    setEditing(s);
    // Rebuild the department → program → semester scaffold from the session's section.
    const section = (allSections ?? []).find((x) => x.id === s.sectionId);
    const semester = (allSemesters ?? []).find((x) => x.id === section?.semesterId);
    const program = (programs ?? []).find((x) => x.id === semester?.programId);
    setForm({
      academicSession: s.academicSession ?? '',
      departmentId: program?.departmentId ?? '',
      programId: program?.id ?? '',
      semesterId: semester?.id ?? section?.semesterId ?? '',
      sectionId: s.sectionId,
      shift: s.shift ?? section?.shift ?? '',
      subjectId: s.subjectId,
      facultyId: s.facultyId ?? '',
      type: s.type,
      day: s.day,
      start: s.start,
      end: s.end,
      room: s.room,
      status: s.status ?? 'active',
    });
    setFormError(undefined);
    resetErrors();
    setModalOpen(true);
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.departmentId) e.departmentId = 'Department is required';
    if (!form.programId) e.programId = 'Program is required';
    if (!form.semesterId) e.semesterId = 'Semester is required';
    if (!form.sectionId) e.sectionId = 'Section is required';
    if (!form.subjectId) e.subjectId = 'Subject is required';
    if (!form.start.trim()) e.start = 'Start time is required';
    if (!form.end.trim()) e.end = 'End time is required';
    if (!form.room.trim()) e.room = 'Room is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setFormError(undefined);
    try {
      const payload = {
        subjectId: form.subjectId,
        sectionId: form.sectionId,
        facultyId: form.facultyId || undefined,
        facultyName: form.facultyId ? facultyName(form.facultyId) : undefined,
        academicSession: form.academicSession.trim() || undefined,
        shift: form.shift || undefined,
        status: form.status,
        day: form.day,
        start: form.start,
        end: form.end,
        durationMins,
        room: form.room,
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

      <div className="mb-4 w-full max-w-xs">
        <Select
          label="Filter by faculty"
          value={facultyFilter}
          onChange={setFacultyFilter}
          options={[{ label: 'All faculty', value: '' }, ...facultyOptions]}
        />
      </div>

      {successMsg && (
        <div className="mb-4">
          <Banner tone="success" title={successMsg} />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="academics" title="No sessions found" actionLabel="Add session" onAction={openCreate} />
      ) : (
        <>
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
                          {s.start}–{s.end} · {formatDuration(s.durationMins ?? computeDurationMins(s.start, s.end))} · Room {s.room} ·{' '}
                          {sectionLabel(s.sectionId)}
                          {s.shift ? ` · ${s.shift}` : ''}
                          {s.facultyName ? ` · ${s.facultyName}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.status === 'inactive' && <StatusPill label="Inactive" status="neutral" />}
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
        <Pagination page={page} totalPages={pagination.totalPages} count={pagination.count} limit={pagination.limit} onPageChange={setPage} />
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit session' : 'Add session'} width={560}>
        <div className="flex flex-col gap-4">
          {formError && <Banner tone="danger" title={formError} />}

          <TextField
            label="Academic Session"
            placeholder="2026-2027"
            value={form.academicSession}
            onChangeText={(v) => setField('academicSession', v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Department"
              required
              error={errors.departmentId}
              value={form.departmentId}
              onChange={setDepartment}
              options={[{ label: 'Select department', value: '' }, ...departmentOptions]}
            />
            <Select
              label="Program"
              required
              error={errors.programId}
              value={form.programId}
              onChange={setProgram}
              options={[{ label: 'Select program', value: '' }, ...programOptions]}
            />
            <Select
              label="Semester"
              required
              error={errors.semesterId}
              value={form.semesterId}
              onChange={setSemester}
              options={[{ label: 'Select semester', value: '' }, ...semesterOptions]}
            />
            <Select
              label="Section"
              required
              error={errors.sectionId}
              value={form.sectionId}
              onChange={setSection}
              options={[{ label: 'Select section', value: '' }, ...sectionOptions]}
            />
          </div>

          <Select
            label="Subject"
            required
            error={errors.subjectId}
            value={form.subjectId}
            onChange={setSubject}
            options={[{ label: 'Select subject', value: '' }, ...subjectOptions]}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Shift"
              value={form.shift}
              onChange={(v) => setField('shift', v as Shift | '')}
              options={[{ label: 'Unassigned', value: '' }, ...SHIFTS.map((s) => ({ label: s, value: s }))]}
            />
            <Select
              label="Faculty"
              value={form.facultyId}
              onChange={(v) => setField('facultyId', v)}
              options={[{ label: 'Unassigned', value: '' }, ...facultyOptions]}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(v) => setField('type', v as ClassSession['type'])}
              options={SESSION_TYPES.map((t) => ({ label: t, value: t }))}
            />
            <Select
              label="Day"
              value={form.day}
              onChange={(v) => setField('day', v as Weekday)}
              options={WEEKDAYS.map((d) => ({ label: d, value: d }))}
            />
            <TextField label="Start" required error={errors.start} placeholder="09:00" value={form.start} onChangeText={(v) => setField('start', v)} />
            <TextField label="End" required error={errors.end} placeholder="10:00" value={form.end} onChangeText={(v) => setField('end', v)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Duration (auto)"
              value={formatDuration(durationMins)}
              onChangeText={() => {}}
              readOnly
              tabIndex={-1}
              className="cursor-default bg-line-soft text-ink-muted"
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setField('status', v as SessionStatus)}
              options={STATUSES.map((s) => ({ label: s === 'active' ? 'Active' : 'Inactive', value: s }))}
            />
            <TextField label="Room" required error={errors.room} value={form.room} onChangeText={(v) => setField('room', v)} />
          </div>

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
