import { useState } from 'react';
import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { formatPercent } from '../../lib';
import { toLocalISODate } from '../../lib/date';
import type { AttendanceStatus, Student } from '../../data/types';
import { PageHeader, Card, StatCard, Loading, EmptyState, Chip, Button, Banner, Avatar } from '../../components';

const barToneClasses: Record<'good' | 'warn' | 'bad', string> = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-danger',
};

function toneFor(percent: number): 'good' | 'warn' | 'bad' {
  if (percent >= 75) return 'good';
  if (percent >= 60) return 'warn';
  return 'bad';
}

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'late'];
const statusButtonClasses: Record<AttendanceStatus, string> = {
  present: 'bg-success text-white border-success',
  absent: 'bg-danger text-white border-danger',
  late: 'bg-warning text-white border-warning',
};

function OverviewTab() {
  const { data, loading } = useAsync(() => adminService.attendance.overview(), []);

  if (loading) return <Loading />;
  if (!data || data.byClass.length === 0) {
    return <EmptyState icon="academics" title="No attendance data yet" message="Attendance will appear here once class sessions are recorded." />;
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <StatCard label="Overall attendance" value={formatPercent(data.overallPercent)} icon="check" tone="success" />
        <StatCard label="Sessions recorded" value={data.sessionsRecorded} icon="audit" tone="navy" />
      </div>
      <Card>
        <div className="flex flex-col divide-y divide-line-soft">
          {data.byClass.map((entry) => (
            <div key={entry.label} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="w-56 shrink-0 truncate text-body font-semibold text-ink">{entry.label}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                <div className={`h-full rounded-full ${barToneClasses[toneFor(entry.percent)]}`} style={{ width: `${entry.percent}%` }} />
              </div>
              <div className="w-32 shrink-0 text-right text-small text-ink-muted">
                {formatPercent(entry.percent)} · {entry.sessions} sessions
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function MarkAttendanceTab() {
  const { data: periods, loading: periodsLoading } = useAsync(() => adminService.attendance.todaySessions(), []);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [entries, setEntries] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [successMsg, setSuccessMsg] = useState<string>();

  const selected = selectedIdx != null && periods ? periods[selectedIdx] : null;
  const periodNumber = selectedIdx != null ? selectedIdx + 1 : 1;

  async function selectPeriod(idx: number) {
    const p = periods?.[idx];
    if (!p) return;
    setSelectedIdx(idx);
    setSuccessMsg(undefined);
    setError(undefined);
    setRosterLoading(true);
    try {
      const students = await adminService.attendance.roster(p.classId);
      setRoster(students);
      setEntries(Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the roster');
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }

  function markAllPresent() {
    setEntries((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, 'present' as AttendanceStatus])));
  }

  const counts = { present: 0, absent: 0, late: 0 };
  Object.values(entries).forEach((s) => counts[s]++);

  async function handleSubmit() {
    if (!selected) return;
    setSaving(true);
    setError(undefined);
    try {
      await adminService.attendance.saveRecord({
        classId: selected.classId,
        date: toLocalISODate(new Date()),
        period: periodNumber,
        entries: roster.map((s) => ({ studentId: s.id, status: entries[s.id] ?? 'present' })),
      });
      setSuccessMsg(`Attendance saved for ${roster.length} students`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  }

  if (periodsLoading) return <Loading />;
  if (!periods || periods.length === 0) {
    return <EmptyState icon="attendance" title="No classes to mark" message="No classes are available to record attendance against." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-2 text-title text-ink">1. Select today's period</div>
        <div className="flex flex-wrap gap-2">
          {periods.map((p, i) => (
            <Chip
              key={`${p.classId}-${p.start}-${i}`}
              label={`${i + 1}. ${p.subjectLabel.split(' · ')[0]}${p.start ? ` · ${p.start}` : ''}`}
              selected={i === selectedIdx}
              onClick={() => selectPeriod(i)}
            />
          ))}
        </div>
      </Card>

      {selected && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-title text-ink">
                {selected.subjectLabel} — {selected.sectionLabel}
              </div>
              <div className="text-caption text-ink-soft">
                {toLocalISODate(new Date())} · Period {periodNumber}
                {selected.start ? ` · ${selected.start}–${selected.end}` : ''}
                {selected.room ? ` · Room ${selected.room}` : ''}
              </div>
            </div>
            <Button label="Mark all present" variant="outline" size="sm" onClick={markAllPresent} />
          </div>

          {successMsg && (
            <div className="mb-3">
              <Banner tone="success" title={successMsg} />
            </div>
          )}
          {error && (
            <div className="mb-3">
              <Banner tone="danger" title={error} />
            </div>
          )}

          {rosterLoading ? (
            <Loading />
          ) : roster.length === 0 ? (
            <EmptyState icon="people" title="No students in this section" />
          ) : (
            <>
              <div className="mb-3 flex gap-4 text-small text-ink-muted">
                <span>
                  <span className="font-semibold text-success">{counts.present}</span> present
                </span>
                <span>
                  <span className="font-semibold text-danger">{counts.absent}</span> absent
                </span>
                <span>
                  <span className="font-semibold text-warning">{counts.late}</span> late
                </span>
              </div>
              <div className="flex flex-col divide-y divide-line-soft">
                {roster.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} size={32} color={s.avatarColor ?? '#13327F'} />
                      <div>
                        <div className="font-semibold text-ink">{s.name}</div>
                        <div className="text-caption text-ink-soft">{s.rollNo}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setEntries((prev) => ({ ...prev, [s.id]: status }))}
                          className={`rounded-md border px-2.5 py-1.5 text-caption font-semibold uppercase transition-colors ${
                            entries[s.id] === status ? statusButtonClasses[status] : 'border-line bg-surface text-ink-muted hover:border-navy-muted'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button label="Save attendance" loading={saving} onClick={handleSubmit} />
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

export function AttendancePage() {
  const [tab, setTab] = useState<'overview' | 'mark'>('overview');

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={tab === 'overview' ? 'Computed from recorded class sessions' : "Mark today's attendance period by period"}
        action={
          <div className="flex gap-2">
            <Chip label="Overview" selected={tab === 'overview'} onClick={() => setTab('overview')} />
            <Chip label="Mark Attendance" selected={tab === 'mark'} onClick={() => setTab('mark')} />
          </div>
        }
      />
      {tab === 'overview' ? <OverviewTab /> : <MarkAttendanceTab />}
    </div>
  );
}
