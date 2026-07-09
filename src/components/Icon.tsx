type IconName =
  | 'search'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'x'
  | 'chevron-down'
  | 'chevron-right'
  | 'logout'
  | 'check'
  | 'alert'
  | 'menu'
  | 'dashboard'
  | 'people'
  | 'academics'
  | 'campus'
  | 'audit'
  | 'refresh'
  | 'department'
  | 'course'
  | 'subject'
  | 'timetable'
  | 'attendance'
  | 'fees'
  | 'library'
  | 'hostel'
  | 'transport'
  | 'notification'
  | 'student'
  | 'faculty'
  | 'role';

const paths: Record<IconName, string> = {
  search: 'M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z',
  x: 'M18 6L6 18M6 6l12 12',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  menu: 'M3 12h18M3 6h18M3 18h18',
  dashboard: 'M3 3h8v8H3zM13 3h8v5h-8zM13 12h8v9h-8zM3 15h8v6H3z',
  people: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  academics: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5',
  campus: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1M9 21v-4h6v4',
  audit: 'M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  // Academics group — each visually distinct from the others and from the generic 'academics' cap
  department: 'M12 3L3 8h18L12 3zM5 10v9M19 10v9M9 19v-6h6v6M3 19h18',
  course: 'M4 19V5a2 2 0 012-2h11a1 1 0 011 1v14.5M4 19a2 2 0 002 2h12M4 19a2 2 0 012-2h12',
  subject: 'M12 6.5C10.5 5 8 4 4 4v14c4 0 6.5 1 8 2.5M12 6.5C13.5 5 16 4 20 4v14c-4 0-6.5 1-8 2.5M12 6.5v12',
  timetable: 'M7 2v3M17 2v3M3 9h18M4 5h16a1 1 0 011 1v13a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01',
  attendance: 'M9 4H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-2M8.5 4a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0115.5 4v0a1.5 1.5 0 01-1.5 1.5h-4A1.5 1.5 0 018.5 4v0zM8 13l2.5 2.5L16 10',
  // Campus group
  fees: 'M3 7a2 2 0 012-2h12a2 2 0 012 2v1H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2h-3a1.5 1.5 0 000 3h3',
  library: 'M4 5h16v3H4zM4 11h16v3H4zM4 17h10v3H4z',
  hostel: 'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z',
  transport: 'M4 16V7a2 2 0 012-2h12a2 2 0 012 2v9M4 16a1 1 0 001 1h1a1 1 0 001-1M4 16h16M18 16a1 1 0 001 1h1a1 1 0 001-1M7 19h.01M17 19h.01',
  notification: 'M18 8a6 6 0 00-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14 18 8zM13.73 18a2 2 0 01-3.46 0',
  // People group — Parents keeps the two-person 'people' glyph (family); these three are distinct
  student: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5M22 10v6',
  faculty: 'M4 4h16v14a2 2 0 01-2 2H6a2 2 0 01-2-2zM12 11a3 3 0 100-6 3 3 0 000 6zM8 21v-2a4 4 0 018 0v2',
  role: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6zM9.5 12l2 2 3.5-3.5',
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export type { IconName };
