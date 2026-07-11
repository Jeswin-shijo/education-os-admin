// Single source of truth for admin navigation. Consumed by the Sidebar (accordion
// groups), the tabbed hub pages (Academic Structure / Teaching & Content), and the
// ⌘K command palette. Add a page in exactly one place and all three stay in sync.
import type { IconName } from '../components/Icon';

export type NavLeaf = { to: string; label: string; icon: IconName };
export type NavItem = NavLeaf & { children?: NavLeaf[] };
export type NavGroup = { title?: string; items: NavItem[] };

// Structural config pages an admin sets up once — grouped under one hub with tabs.
export const ACADEMIC_TABS: NavLeaf[] = [
  { to: '/academics/departments', label: 'Departments', icon: 'department' },
  { to: '/academics/programs', label: 'Programs', icon: 'course' },
  { to: '/academics/semesters', label: 'Semesters', icon: 'timetable' },
  { to: '/academics/sections', label: 'Sections', icon: 'subject' },
  { to: '/academics/subjects', label: 'Subjects', icon: 'subject' },
];

// Teaching artefacts that move together through a term — one hub, tabbed.
export const CONTENT_TABS: NavLeaf[] = [
  { to: '/content/exams', label: 'Exams', icon: 'exam' },
  { to: '/content/results', label: 'Results', icon: 'results' },
  { to: '/content/assignments', label: 'Assignments', icon: 'assignment' },
  { to: '/content/materials', label: 'Materials', icon: 'material' },
  { to: '/content/quizzes', label: 'Quizzes', icon: 'quiz' },
];

// Day-to-day campus operations & facilities — one hub, tabbed.
export const CAMPUS_TABS: NavLeaf[] = [
  { to: '/campus/fees', label: 'Fees', icon: 'fees' },
  { to: '/campus/library', label: 'Library', icon: 'library' },
  { to: '/campus/hostel', label: 'Hostel', icon: 'hostel' },
  { to: '/campus/transport', label: 'Transport', icon: 'transport' },
  { to: '/campus/notifications', label: 'Notifications', icon: 'notification' },
];

// Student-facing services & requests — one hub, tabbed.
export const STUDENT_LIFE_TABS: NavLeaf[] = [
  { to: '/student-life/placements', label: 'Placements', icon: 'placement' },
  { to: '/student-life/events', label: 'Events', icon: 'event' },
  { to: '/student-life/complaints', label: 'Complaints', icon: 'complaint' },
  { to: '/student-life/leave', label: 'Leave', icon: 'leave' },
  { to: '/student-life/certificates', label: 'Certificates', icon: 'certificate' },
];

export const navGroups: NavGroup[] = [
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
      { to: '/academics', label: 'Academic Structure', icon: 'academics', children: ACADEMIC_TABS },
      { to: '/timetable', label: 'Timetable', icon: 'timetable' },
      { to: '/attendance', label: 'Attendance', icon: 'attendance' },
      { to: '/content', label: 'Teaching & Content', icon: 'material', children: CONTENT_TABS },
    ],
  },
  {
    title: 'Campus',
    items: [
      { to: '/campus', label: 'Campus Services', icon: 'campus', children: CAMPUS_TABS },
      { to: '/student-life', label: 'Student Life', icon: 'event', children: STUDENT_LIFE_TABS },
    ],
  },
  { items: [{ to: '/audit-logs', label: 'Audit Logs', icon: 'audit' }] },
];

// Flattened, leaf-only list for the command palette — hubs expand to their tabs so
// every real page is reachable, tagged with the section it lives under.
export type CommandItem = NavLeaf & { section?: string };
export const commandItems: CommandItem[] = navGroups.flatMap((g) =>
  g.items.flatMap((item) =>
    item.children
      ? item.children.map((c) => ({ ...c, section: item.label }))
      : [{ to: item.to, label: item.label, icon: item.icon, section: g.title }],
  ),
);
