import { Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { adminService } from '../services';
import { useAsync } from '../hooks/useAsync';
import { Card, StatCard, Loading, Badge, PageHeader } from '../components';
import { formatRelative } from '../lib/date';

const quickLinks = [
  { to: '/students', label: 'People', desc: 'Students, faculty, parents, roles', icon: '👥' },
  { to: '/academics', label: 'Academics', desc: 'Departments, courses, subjects, timetable', icon: '🎓' },
  { to: '/campus', label: 'Campus', desc: 'Fees, library, hostel, transport, notices', icon: '🏫' },
  { to: '/audit-logs', label: 'Audit Logs', desc: 'Every change made in this console', icon: '🧾' },
];

const badgeTone: Record<string, 'create' | 'update' | 'delete' | 'broadcast'> = {
  create: 'create',
  update: 'update',
  delete: 'delete',
  broadcast: 'broadcast',
};

export function DashboardPage() {
  const { admin } = useAuth();
  const { data, loading } = useAsync(() => adminService.getDashboard(), []);

  return (
    <div>
      <PageHeader title={`Welcome back, ${admin?.name?.split(' ')[0] ?? 'Admin'} 👋`} subtitle="Here's what's happening across AI Campus OS today." />

      {loading || !data ? (
        <Loading label="Loading dashboard…" />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-3">
            <StatCard label="Students" value={data.counts.students} icon="people" tone="navy" />
            <StatCard label="Faculty" value={data.counts.faculty} icon="people" tone="purple" />
            <StatCard label="Parents" value={data.counts.parents} icon="people" tone="teal" />
            <StatCard label="Departments" value={data.counts.departments} icon="academics" tone="warning" />
            <StatCard label="Courses" value={data.counts.courses} icon="academics" tone="info" />
            <StatCard label="Subjects" value={data.counts.subjects} icon="academics" tone="pink" />
            <StatCard label="Fee invoices" value={data.counts.feeInvoices} icon="campus" tone="success" />
            <StatCard label="Notifications" value={data.counts.notifications} icon="campus" tone="danger" />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <div className="mb-2 text-2xl">{link.icon}</div>
                  <div className="text-title text-ink">{link.label}</div>
                  <div className="mt-1 text-small text-ink-muted">{link.desc}</div>
                </Card>
              </Link>
            ))}
          </div>

          <Card padded={false}>
            <div className="border-b border-line px-5 py-4">
              <div className="text-title text-ink">Recent activity</div>
            </div>
            <div className="divide-y divide-line-soft">
              {data.recentAudits.length === 0 && <div className="px-5 py-6 text-small text-ink-muted">No activity yet.</div>}
              {data.recentAudits.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <Badge label={log.action} tone={badgeTone[log.action]} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-small text-ink">{log.detail}</div>
                    <div className="text-caption text-ink-soft">
                      {log.entity} · {log.actor}
                    </div>
                  </div>
                  <div className="shrink-0 text-caption text-ink-soft">{formatRelative(log.at)}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
