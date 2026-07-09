import { adminService } from '../../services';
import { useAsync } from '../../hooks/useAsync';
import { formatPercent } from '../../lib';
import { PageHeader, Card, StatCard, Loading, EmptyState } from '../../components';

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

export function AttendancePage() {
  const { data, loading } = useAsync(() => adminService.attendance.overview(), []);

  return (
    <div>
      <PageHeader title="Attendance Overview" subtitle="Read-only — computed from recorded class sessions" />

      {loading ? (
        <Loading />
      ) : !data || data.byClass.length === 0 ? (
        <EmptyState icon="academics" title="No attendance data yet" message="Attendance will appear here once class sessions are recorded." />
      ) : (
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
                    <div
                      className={`h-full rounded-full ${barToneClasses[toneFor(entry.percent)]}`}
                      style={{ width: `${entry.percent}%` }}
                    />
                  </div>
                  <div className="w-32 shrink-0 text-right text-small text-ink-muted">
                    {formatPercent(entry.percent)} · {entry.sessions} sessions
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
