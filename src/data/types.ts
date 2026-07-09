export type Role = 'student' | 'parent' | 'faculty' | 'hod' | 'principal' | 'admin';
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin';
  avatarColor: string;
};

export type Student = {
  id: string;
  name: string;
  rollNo: string;
  admissionNo: string;
  email: string;
  phone: string;
  program: string;
  branch: string;
  semester: number;
  section: string;
  year: number;
  cgpa: number;
  avatarColor: string;
  mentorName: string;
  bloodGroup: string;
};

export type FacultyMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  avatarColor: string;
};

export type ParentAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  relation: string;
  childId: string;
  avatarColor: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  avatarColor: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  hod?: string;
};

export type Course = {
  id: string;
  code: string;
  name: string;
  departmentCode: string;
  durationYears: number;
  intake: number;
  color: string;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  credits: number;
  faculty: string;
  departmentCode: string;
  color: string;
};

export type ClassSession = {
  id: string;
  subjectId: string;
  day: Weekday;
  start: string;
  end: string;
  room: string;
  section: string;
  semester: number;
  type: 'Lecture' | 'Lab' | 'Tutorial';
};

export type AttendanceOverview = {
  overallPercent: number;
  sessionsRecorded: number;
  byClass: { label: string; percent: number; sessions: number }[];
};

export type FeeInvoice = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  term: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'due' | 'overdue';
  paidOn?: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  copies: number;
  available: number;
};

export type HostelInfo = {
  block: string;
  totalRooms: number;
  occupied: number;
  warden: string;
  wardenPhone: string;
  messPlan: string;
  fees: number;
};

export type BusRoute = {
  id: string;
  name: string;
  number: string;
  driver: string;
  driverPhone: string;
  stops: { name: string; time: string }[];
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  category: 'academic' | 'fee' | 'event' | 'general' | 'alert';
  audience: Role | 'all';
  sentAt: string;
};

export type AuditLog = {
  id: string;
  at: string;
  actor: string;
  action: 'create' | 'update' | 'delete' | 'broadcast';
  entity: string;
  detail: string;
};

export type AdminDashboard = {
  counts: {
    students: number;
    faculty: number;
    parents: number;
    departments: number;
    courses: number;
    subjects: number;
    feeInvoices: number;
    notifications: number;
  };
  recentAudits: AuditLog[];
};
