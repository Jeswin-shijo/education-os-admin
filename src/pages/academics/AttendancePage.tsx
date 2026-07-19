import { useState } from 'react';
import { adminService } from '../../services';
import * as attendanceService from '../../services/attendanceService';
import type { AttendanceBreakdownRow } from '../../services/attendanceService';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../state/ToastContext';
import { formatPercent } from '../../lib';
import { toLocalISODate } from '../../lib/date';
import type { AttendanceStatus, Student } from '../../data/types';
import { PageHeader, Card, Loading, EmptyState, Chip, Button, Banner, Avatar, Icon, type IconName } from '../../components';

type Tone = 'good' | 'warn' | 'bad';

const barToneClasses: Record<Tone, string> = {
  good: 'bg-success',
  warn: 'bg-warning',
  bad: 'bg-danger',
};

const ringToneText: Record<Tone, string> = {
  good: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
};

function toneFor(percent: number): Tone {
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

// Headline ring for the overall college figure. The track and the progress arc each
// carry their own text-colour token and paint via currentColor, so the arc colours by
// value (green / amber / red) using the shared design-system tokens.
function AttendanceRing({ percent }: { percent: number }) {
  const size = 128;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle className="text-line-soft" cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} />
        <circle
          className={ringToneText[toneFor(percent)]}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-display leading-none text-ink">{Math.round(percent)}%</span>
        <span className="text-caption uppercase tracking-wide text-ink-soft">overall</span>
      </div>
    </div>
  );
}

// Colour key so the value-based colouring is never conveyed by colour alone.
function ThresholdLegend() {
  const items: { tone: Tone; label: string }[] = [
    { tone: 'good', label: 'Good · 75%+' },
    { tone: 'warn', label: 'At risk · 60–74%' },
    { tone: 'bad', label: 'Low · below 60%' },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <span key={i.tone} className="flex items-center gap-1.5 text-caption text-ink-muted">
          <span className={`h-2.5 w-2.5 rounded-full ${barToneClasses[i.tone]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// A single breakdown (Department / Program / Faculty) as a card of horizontal % bars.
function BreakdownCard({ title, icon, rows, emptyMessage }: { title: string; icon: IconName; rows: AttendanceBreakdownRow[]; emptyMessage: string }) {
  const sorted = [...rows].sort((a, b) => b.percent - a.percent);
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy-soft text-navy">
          <Icon name={icon} size={16} />
        </div>
        <div className="text-title text-ink">{title}</div>
        {rows.length > 0 && <div className="ml-auto text-caption text-ink-soft">{rows.length}</div>}
      </div>
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-small text-ink-soft">{emptyMessage}</div>
      ) : (
        <div className="flex flex-col divide-y divide-line-soft">
          {sorted.map((row) => (
            <div key={row.key} className="py-2.5 first:pt-0 last:pb-0">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="truncate text-body font-semibold text-ink">{row.label}</span>
                <span className="shrink-0 text-small font-semibold text-ink-muted">{formatPercent(row.percent)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line-soft">
                <div className={`h-full rounded-full ${barToneClasses[toneFor(row.percent)]}`} style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function OverviewTab() {
  const { data, loading, error } = useAsync(() => attendanceService.analytics(), []);

  if (loading) return <Loading />;
  if (error) return <Banner tone="danger" title="Could not load attendance analytics" message={error.message} />;

  const isEmpty = !data || (data.overallPercent === 0 && data.byDepartment.length === 0 && data.byProgram.length === 0 && data.byFaculty.length === 0);
  if (isEmpty) {
    return <EmptyState icon="academics" title="No attendance data yet" message="Attendance analytics will appear here once class sessions are recorded." />;
  }

  const overallCaption: Record<Tone, string> = {
    good: 'Healthy — most students are attending regularly.',
    warn: 'At risk — attendance is dipping in some areas.',
    bad: 'Critical — attendance needs attention.',
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Overall college attendance — headline */}
      <Card>
        <div className="flex flex-wrap items-center gap-6">
          <AttendanceRing percent={data.overallPercent} />
          <div className="min-w-0 flex-1">
            <div className="text-label uppercase tracking-wide text-ink-soft">Overall College Attendance</div>
            <div className="mt-1 text-h2 text-ink">{overallCaption[toneFor(data.overallPercent)]}</div>
            <p className="mt-1 mb-3 text-small text-ink-muted">Aggregated across every department, program and faculty member.</p>
            <ThresholdLegend />
          </div>
        </div>
      </Card>

      {/* 2–4. Department-, program- and faculty-wise breakdowns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Department-wise" icon="department" rows={data.byDepartment} emptyMessage="No department data yet." />
        <BreakdownCard title="Program-wise" icon="course" rows={data.byProgram} emptyMessage="No program data yet." />
        <BreakdownCard title="Faculty-wise" icon="faculty" rows={data.byFaculty} emptyMessage="No faculty data yet." />
      </div>
    </div>
  );
}

function MarkAttendanceTab() {
  const { data: periods, loading: periodsLoading } = useAsync(() => adminService.attendance.todaySessions(), []);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [roster, setRoster] = useState<Student[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [entries, setEntries] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const selected = selectedIdx != null && periods ? periods[selectedIdx] : null;
  const periodNumber = selectedIdx != null ? selectedIdx + 1 : 1;

  async function selectPeriod(idx: number) {
    const p = periods?.[idx];
    if (!p) return;
    setSelectedIdx(idx);
    setRosterLoading(true);
    try {
      const students = await adminService.attendance.roster(p.classId);
      setRoster(students);
      setEntries(Object.fromEntries(students.map((s) => [s.id, 'present' as AttendanceStatus])));
    } catch (err) {
      toast.error('Could not load the roster', err instanceof Error ? err.message : undefined);
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
    try {
      await adminService.attendance.saveRecord({
        classId: selected.classId,
        date: toLocalISODate(new Date()),
        period: periodNumber,
        entries: roster.map((s) => ({ studentId: s.id, status: entries[s.id] ?? 'present' })),
      });
      toast.success('Attendance saved', `${roster.length} students`);
    } catch (err) {
      toast.error('Could not save attendance', err instanceof Error ? err.message : undefined);
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
        subtitle={tab === 'overview' ? 'College-wide attendance across departments, programs and faculty' : "Mark today's attendance period by period"}
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
