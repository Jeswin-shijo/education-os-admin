import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { cn } from '../lib/cn';

type NavItem = { to: string; label: string; icon: IconName };
type NavGroup = { title?: string; items: NavItem[] };

const groups: NavGroup[] = [
  { items: [{ to: '/', label: 'Dashboard', icon: 'dashboard' }] },
  {
    title: 'People',
    items: [
      { to: '/students', label: 'Students', icon: 'student' },
      { to: '/faculty', label: 'Faculty', icon: 'faculty' },
      { to: '/parents', label: 'Parents', icon: 'people' },
      { to: '/users', label: 'Users & Roles', icon: 'role' },
    ],
  },
  {
    title: 'Academics',
    items: [
      { to: '/departments', label: 'Departments', icon: 'department' },
      { to: '/courses', label: 'Courses', icon: 'course' },
      { to: '/subjects', label: 'Subjects', icon: 'subject' },
      { to: '/timetable', label: 'Timetable', icon: 'timetable' },
      { to: '/attendance', label: 'Attendance', icon: 'attendance' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { to: '/fees', label: 'Fees', icon: 'fees' },
      { to: '/library', label: 'Library', icon: 'library' },
      { to: '/hostel', label: 'Hostel', icon: 'hostel' },
      { to: '/transport', label: 'Transport', icon: 'transport' },
      { to: '/notifications', label: 'Notifications', icon: 'notification' },
    ],
  },
  { items: [{ to: '/audit-logs', label: 'Audit Logs', icon: 'audit' }] },
];

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate?: () => void }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-dark transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo size={36} />
        <div className="leading-tight">
          <div className="text-title text-white">AI Campus OS</div>
          <div className="text-caption text-navy-muted">Admin Console</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((group, i) => (
          <div key={i} className="mb-4">
            {group.title && (
              <div className="px-3 pb-1.5 pt-3 text-caption uppercase tracking-wider text-navy-muted">{group.title}</div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium transition-colors',
                    isActive ? 'bg-accent text-navy-dark font-semibold' : 'text-navy-soft hover:bg-navy',
                  )
                }
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
