import * as db from './db';
import * as authService from './authService';
import { CORE_SUBJECT_IDS, CORE_USER_IDS, students as seedStudents } from '../data/seed';
import type {
  AdminDashboard,
  AuditLog,
  Book,
  BusRoute,
  ClassSession,
  Course,
  Department,
  FacultyMember,
  FeeInvoice,
  HostelInfo,
  NotificationItem,
  ParentAccount,
  PlatformUser,
  Role,
  Student,
  Subject,
} from '../data/types';

const GUARD_MESSAGE = 'Cannot remove a core record other roles depend on';
const ANCHOR_STUDENT_ID = seedStudents[0].id;

function throwGuard(): never {
  throw new Error(GUARD_MESSAGE);
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function currentActorName(): Promise<string> {
  const session = await authService.getSession();
  return session?.name ?? 'Campus Admin';
}

async function logAction(action: AuditLog['action'], entity: string, detail: string): Promise<void> {
  const entry: AuditLog = {
    id: genId('audit'),
    at: new Date().toISOString(),
    actor: await currentActorName(),
    action,
    entity,
    detail,
  };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

function matches(haystacks: (string | number)[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some((h) => String(h).toLowerCase().includes(needle));
}

export async function getDashboard(): Promise<AdminDashboard> {
  const [studentsList, facultyList, parentsList, departmentsList, coursesList, subjectsList, feesList, notificationsList, audits] =
    await Promise.all([
      db.read('students'),
      db.read('faculty'),
      db.read('parents'),
      db.read('departments'),
      db.read('courses'),
      db.read('subjects'),
      db.read('fees'),
      db.read('notifications'),
      db.read('auditLogs'),
    ]);
  return {
    counts: {
      students: studentsList.length,
      faculty: facultyList.length,
      parents: parentsList.length,
      departments: departmentsList.length,
      courses: coursesList.length,
      subjects: subjectsList.length,
      feeInvoices: feesList.length,
      notifications: notificationsList.length,
    },
    recentAudits: audits.slice(0, 8),
  };
}

// ---------- Students ----------
export const students = {
  async list(q?: string): Promise<Student[]> {
    const rows = await db.read('students');
    return q ? rows.filter((s) => matches([s.name, s.rollNo, s.email, s.branch], q)) : rows;
  },
  async create(input: Omit<Student, 'id'>): Promise<Student> {
    const row: Student = { ...input, id: genId('stu') };
    await db.upsert('students', row);
    await logAction('create', 'Student', `Added student ${row.name} (${row.rollNo})`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<Student, 'id'>>): Promise<Student> {
    const rows = await db.read('students');
    const existing = rows.find((s) => s.id === id);
    if (!existing) throw new Error('Student not found');
    const updated = { ...existing, ...patch };
    await db.upsert('students', updated);
    await logAction('update', 'Student', `Updated student ${updated.name}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    if (id === ANCHOR_STUDENT_ID) throwGuard();
    const rows = await db.read('students');
    const existing = rows.find((s) => s.id === id);
    await db.removeById('students', id);
    await logAction('delete', 'Student', `Removed student ${existing?.name ?? id}`);
  },
};

// ---------- Faculty ----------
export const faculty = {
  async list(q?: string): Promise<FacultyMember[]> {
    const rows = await db.read('faculty');
    return q ? rows.filter((f) => matches([f.name, f.email, f.department], q)) : rows;
  },
  async create(input: Omit<FacultyMember, 'id'>): Promise<FacultyMember> {
    const row: FacultyMember = { ...input, id: genId('fac') };
    await db.upsert('faculty', row);
    await logAction('create', 'Faculty', `Added faculty ${row.name}`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<FacultyMember, 'id'>>): Promise<FacultyMember> {
    const rows = await db.read('faculty');
    const existing = rows.find((f) => f.id === id);
    if (!existing) throw new Error('Faculty not found');
    const updated = { ...existing, ...patch };
    await db.upsert('faculty', updated);
    await logAction('update', 'Faculty', `Updated faculty ${updated.name}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const rows = await db.read('faculty');
    const existing = rows.find((f) => f.id === id);
    await db.removeById('faculty', id);
    await logAction('delete', 'Faculty', `Removed faculty ${existing?.name ?? id}`);
  },
};

// ---------- Parents ----------
export const parents = {
  async list(q?: string): Promise<ParentAccount[]> {
    const rows = await db.read('parents');
    return q ? rows.filter((p) => matches([p.name, p.email, p.relation], q)) : rows;
  },
  async create(input: Omit<ParentAccount, 'id'>): Promise<ParentAccount> {
    const row: ParentAccount = { ...input, id: genId('par') };
    await db.upsert('parents', row);
    await logAction('create', 'Parent', `Added parent ${row.name}`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<ParentAccount, 'id'>>): Promise<ParentAccount> {
    const rows = await db.read('parents');
    const existing = rows.find((p) => p.id === id);
    if (!existing) throw new Error('Parent not found');
    const updated = { ...existing, ...patch };
    await db.upsert('parents', updated);
    await logAction('update', 'Parent', `Updated parent ${updated.name}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const rows = await db.read('parents');
    const existing = rows.find((p) => p.id === id);
    await db.removeById('parents', id);
    await logAction('delete', 'Parent', `Removed parent ${existing?.name ?? id}`);
  },
};

// ---------- Users & Roles ----------
export const users = {
  async list(q?: string, role?: Role): Promise<PlatformUser[]> {
    let rows = await db.read('platformUsers');
    if (role) rows = rows.filter((u) => u.role === role);
    return q ? rows.filter((u) => matches([u.name, u.email], q)) : rows;
  },
  async updateRole(id: string, role: Role): Promise<PlatformUser> {
    const rows = await db.read('platformUsers');
    const existing = rows.find((u) => u.id === id);
    if (!existing) throw new Error('User not found');
    const updated = { ...existing, role };
    await db.upsert('platformUsers', updated);
    await logAction('update', 'User', `Changed role for ${updated.name} to ${role}`);
    return updated;
  },
  async setActive(id: string, active: boolean): Promise<PlatformUser> {
    if (!active) {
      if (CORE_USER_IDS.includes(id)) throwGuard();
      const session = await authService.getSession();
      if (session && id === session.id) throwGuard();
    }
    const rows = await db.read('platformUsers');
    const existing = rows.find((u) => u.id === id);
    if (!existing) throw new Error('User not found');
    const updated = { ...existing, active };
    await db.upsert('platformUsers', updated);
    await logAction('update', 'User', `${active ? 'Activated' : 'Deactivated'} ${updated.name}`);
    return updated;
  },
};

// ---------- Departments ----------
export const departments = {
  list: (): Promise<Department[]> => db.read('departments'),
  async create(input: Omit<Department, 'id'>): Promise<Department> {
    const row: Department = { ...input, id: genId('dept') };
    await db.upsert('departments', row);
    await logAction('create', 'Department', `Added department ${row.name}`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<Department, 'id'>>): Promise<Department> {
    const rows = await db.read('departments');
    const existing = rows.find((d) => d.id === id);
    if (!existing) throw new Error('Department not found');
    const updated = { ...existing, ...patch };
    await db.upsert('departments', updated);
    await logAction('update', 'Department', `Updated department ${updated.name}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const rows = await db.read('departments');
    const existing = rows.find((d) => d.id === id);
    await db.removeById('departments', id);
    await logAction('delete', 'Department', `Removed department ${existing?.name ?? id}`);
  },
};

// ---------- Courses ----------
export const courses = {
  list: (): Promise<Course[]> => db.read('courses'),
  async create(input: Omit<Course, 'id'>): Promise<Course> {
    const row: Course = { ...input, id: genId('course') };
    await db.upsert('courses', row);
    await logAction('create', 'Course', `Added course ${row.name}`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<Course, 'id'>>): Promise<Course> {
    const rows = await db.read('courses');
    const existing = rows.find((c) => c.id === id);
    if (!existing) throw new Error('Course not found');
    const updated = { ...existing, ...patch };
    await db.upsert('courses', updated);
    await logAction('update', 'Course', `Updated course ${updated.name}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const rows = await db.read('courses');
    const existing = rows.find((c) => c.id === id);
    await db.removeById('courses', id);
    await logAction('delete', 'Course', `Removed course ${existing?.name ?? id}`);
  },
};

// ---------- Subjects ----------
export const subjects = {
  async list(q?: string): Promise<Subject[]> {
    const rows = await db.read('subjects');
    return q ? rows.filter((s) => matches([s.name, s.code, s.faculty], q)) : rows;
  },
  async create(input: Omit<Subject, 'id'>): Promise<Subject> {
    const row: Subject = { ...input, id: genId('sub') };
    await db.upsert('subjects', row);
    await logAction('create', 'Subject', `Added subject ${row.name}`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<Subject, 'id'>>): Promise<Subject> {
    const rows = await db.read('subjects');
    const existing = rows.find((s) => s.id === id);
    if (!existing) throw new Error('Subject not found');
    const updated = { ...existing, ...patch };
    await db.upsert('subjects', updated);
    await logAction('update', 'Subject', `Updated subject ${updated.name}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    if (CORE_SUBJECT_IDS.includes(id)) throwGuard();
    const rows = await db.read('subjects');
    const existing = rows.find((s) => s.id === id);
    await db.removeById('subjects', id);
    await logAction('delete', 'Subject', `Removed subject ${existing?.name ?? id}`);
  },
};

// ---------- Timetable ----------
export const timetable = {
  list: (): Promise<ClassSession[]> => db.read('sessions'),
  async create(input: Omit<ClassSession, 'id'>): Promise<ClassSession> {
    const row: ClassSession = { ...input, id: genId('sess') };
    await db.upsert('sessions', row);
    await logAction('create', 'Timetable', `Added session for ${input.subjectId} on ${input.day}`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<ClassSession, 'id'>>): Promise<ClassSession> {
    const rows = await db.read('sessions');
    const existing = rows.find((s) => s.id === id);
    if (!existing) throw new Error('Session not found');
    const updated = { ...existing, ...patch };
    await db.upsert('sessions', updated);
    await logAction('update', 'Timetable', `Updated session ${id}`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    await db.removeById('sessions', id);
    await logAction('delete', 'Timetable', `Removed session ${id}`);
  },
};

// ---------- Attendance (read-only) ----------
export const attendance = {
  async overview() {
    const [sessionRows, subjectRows] = await Promise.all([db.read('sessions'), db.read('subjects')]);
    const bySubject = subjectRows.map((subject) => {
      const count = sessionRows.filter((s) => s.subjectId === subject.id).length;
      // Deterministic pseudo-attendance derived from the subject id so the overview looks real
      // without a live attendance-taking flow in this console.
      const seedNum = subject.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const percent = 72 + (seedNum % 24);
      return { label: `${subject.code} ${subject.name}`, percent, sessions: count };
    });
    const overallPercent = bySubject.length
      ? Math.round(bySubject.reduce((a, b) => a + b.percent, 0) / bySubject.length)
      : 0;
    return {
      overallPercent,
      sessionsRecorded: sessionRows.length,
      byClass: bySubject,
    };
  },
};

// ---------- Fees ----------
export const fees = {
  async list(q?: string): Promise<FeeInvoice[]> {
    const rows = await db.read('fees');
    return q ? rows.filter((f) => matches([f.studentName, f.title, f.term], q)) : rows;
  },
  async create(input: Omit<FeeInvoice, 'id'>): Promise<FeeInvoice> {
    const row: FeeInvoice = { ...input, id: genId('fee') };
    await db.upsert('fees', row);
    await logAction('create', 'Fee Invoice', `Added invoice "${row.title}" for ${row.studentName}`);
    return row;
  },
  async markPaid(id: string): Promise<FeeInvoice> {
    const rows = await db.read('fees');
    const existing = rows.find((f) => f.id === id);
    if (!existing) throw new Error('Invoice not found');
    const updated: FeeInvoice = { ...existing, status: 'paid', paidOn: new Date().toISOString() };
    await db.upsert('fees', updated);
    await logAction('update', 'Fee Invoice', `Marked "${updated.title}" as paid for ${updated.studentName}`);
    return updated;
  },
};

// ---------- Library ----------
export const library = {
  async list(q?: string): Promise<Book[]> {
    const rows = await db.read('books');
    return q ? rows.filter((b) => matches([b.title, b.author, b.category], q)) : rows;
  },
  async create(input: Omit<Book, 'id'>): Promise<Book> {
    const row: Book = { ...input, id: genId('book') };
    await db.upsert('books', row);
    await logAction('create', 'Library Book', `Added book "${row.title}"`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<Book, 'id'>>): Promise<Book> {
    const rows = await db.read('books');
    const existing = rows.find((b) => b.id === id);
    if (!existing) throw new Error('Book not found');
    const updated = { ...existing, ...patch };
    await db.upsert('books', updated);
    await logAction('update', 'Library Book', `Updated "${updated.title}"`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    const rows = await db.read('books');
    const existing = rows.find((b) => b.id === id);
    await db.removeById('books', id);
    await logAction('delete', 'Library Book', `Removed "${existing?.title ?? id}"`);
  },
};

// ---------- Transport ----------
export const transport = {
  list: (): Promise<BusRoute[]> => db.read('busRoutes'),
  async create(input: Omit<BusRoute, 'id'>): Promise<BusRoute> {
    const row: BusRoute = { ...input, id: genId('bus') };
    await db.upsert('busRoutes', row);
    await logAction('create', 'Bus Route', `Added route "${row.name}"`);
    return row;
  },
  async update(id: string, patch: Partial<Omit<BusRoute, 'id'>>): Promise<BusRoute> {
    const rows = await db.read('busRoutes');
    const existing = rows.find((b) => b.id === id);
    if (!existing) throw new Error('Route not found');
    const updated = { ...existing, ...patch };
    await db.upsert('busRoutes', updated);
    await logAction('update', 'Bus Route', `Updated route "${updated.name}"`);
    return updated;
  },
};

// ---------- Hostel ----------
export const hostel = {
  get: (): Promise<HostelInfo> => db.readHostel(),
  async update(patch: Partial<HostelInfo>): Promise<HostelInfo> {
    const existing = await db.readHostel();
    const updated = { ...existing, ...patch };
    await db.writeHostel(updated);
    await logAction('update', 'Hostel', `Updated hostel info (${updated.block})`);
    return updated;
  },
};

// ---------- Notifications ----------
export const notifications = {
  list: (): Promise<NotificationItem[]> => db.read('notifications'),
  async broadcast(input: Omit<NotificationItem, 'id' | 'sentAt'>): Promise<NotificationItem> {
    const row: NotificationItem = { ...input, id: genId('notif'), sentAt: new Date().toISOString() };
    const rows = await db.read('notifications');
    await db.write('notifications', [row, ...rows]);
    await logAction('broadcast', 'Notification', `Broadcast "${row.title}" to ${row.audience}`);
    return row;
  },
};

// ---------- Audit ----------
export const audit = {
  list: (): Promise<AuditLog[]> => db.read('auditLogs'),
  async log(entry: { action: AuditLog['action']; entity: string; detail: string }): Promise<void> {
    await logAction(entry.action, entry.entity, entry.detail);
  },
};

export async function resetDemoData(): Promise<void> {
  await db.resetAll();
}
