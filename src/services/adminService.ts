import * as db from './db';
import * as authService from './authService';
import { http } from './http';
import { fromSource } from './source';
import { CORE_SUBJECT_IDS, CORE_USER_IDS, hodCandidates as seedHodCandidates, students as seedStudents } from '../data/seed';
import type {
  AdminDashboard,
  AttendanceOverview,
  AttendanceEntry,
  AttendanceRecord,
  AuditLog,
  Book,
  BookLoan,
  BusLiveStatus,
  BusRoute,
  BusStop,
  ClassSession,
  Department,
  FacultyCandidate,
  FacultyMember,
  FeeInvoice,
  Gender,
  HodCandidate,
  HostelAllocation,
  HostelBlock,
  HostelRoom,
  NotificationItem,
  ParentAccount,
  PaymentMethod,
  PlatformUser,
  Program,
  Role,
  Section,
  Semester,
  Shift,
  Student,
  Subject,
  Weekday,
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

// Audit trail is a LOCAL-only convenience for this console — the documented backend has no
// generic audit-log endpoint, so this always writes locally regardless of USE_MOCK_DATA.
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

function matches(haystacks: (string | number | undefined)[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some((h) => h !== undefined && String(h).toLowerCase().includes(needle));
}

export async function getDashboard(): Promise<AdminDashboard> {
  return fromSource(
    async () => {
      const [studentsList, facultyList, parentsList, departmentsList, programsList, subjectsList, feesList, notificationsList, audits] =
        await Promise.all([
          db.read('students'),
          db.read('faculty'),
          db.read('parents'),
          db.read('departments'),
          db.read('programs'),
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
          courses: programsList.length,
          subjects: subjectsList.length,
          feeInvoices: feesList.length,
          notifications: notificationsList.length,
        },
        recentAudits: audits.slice(0, 8),
      };
    },
    async () => {
      const [studentsList, departmentsList, programsList, subjectsList, feesList, notificationsList] = await Promise.all([
        http.get<unknown[]>('/api/v1/students/').catch(() => []),
        http.get<unknown[]>('/api/v1/departments/').catch(() => []),
        http.get<unknown[]>('/api/v1/programs/').catch(() => []),
        http.get<unknown[]>('/api/v1/subjects/').catch(() => []),
        http.get<unknown[]>('/api/v1/fees/').catch(() => []),
        http.get<unknown[]>('/api/v1/notifications/').catch(() => []),
      ]);
      const audits = await db.read('auditLogs'); // no real audit-log endpoint documented
      return {
        counts: {
          students: studentsList.length,
          faculty: 0,
          parents: 0,
          departments: departmentsList.length,
          courses: programsList.length,
          subjects: subjectsList.length,
          feeInvoices: feesList.length,
          notifications: notificationsList.length,
        },
        recentAudits: audits.slice(0, 8),
      };
    },
  );
}

// =====================================================================================
// Students — POST /api/v1/auth/register (role:'student'), multipart when a photo is set
// =====================================================================================
const GENDER_API: Record<string, string> = { Male: 'male', Female: 'female', Other: 'other' };
const GENDER_FROM_API: Record<string, Gender> = { male: 'Male', female: 'Female', other: 'Other' };
const STU_PALETTE = ['#13327F', '#7C3AED', '#0D9488', '#EA8A00', '#DB2777', '#0EA5E9'];
function colorForSeed(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return STU_PALETTE[hash % STU_PALETTE.length];
}

// The `/students` list returns Django-shaped rows (snake_case, cgpa as a decimal
// *string*, semester_number instead of a year). Map them onto the console's Student.
type StudentApi = {
  id: string;
  full_name?: string;
  roll_no?: string;
  admission_no?: string;
  email?: string;
  phone?: string;
  department?: string;
  program?: string;
  semester?: string;
  section?: string;
  semester_number?: number;
  cgpa?: string | number;
  gender?: string;
  dob?: string | null;
  blood_group?: string;
  mentor_name?: string;
  avatar_color?: string;
  profile_pic?: string | null;
};
function mapStudentFromApi(s: StudentApi): Student {
  const semNum = Number(s.semester_number ?? 0);
  return {
    id: s.id,
    name: s.full_name ?? '',
    rollNo: s.roll_no ?? '',
    admissionNo: s.admission_no ?? '',
    email: s.email ?? '',
    phone: s.phone ?? '',
    departmentId: s.department ?? '',
    programId: s.program ?? '',
    semesterId: s.semester ?? '',
    sectionId: s.section ?? '',
    year: semNum ? Math.ceil(semNum / 2) : 0,
    cgpa: Number(s.cgpa ?? 0) || 0,
    avatarColor: s.avatar_color ?? colorForSeed(s.id),
    avatarUrl: s.profile_pic ?? undefined,
    mentorName: s.mentor_name ?? '',
    bloodGroup: s.blood_group ?? '',
    gender: GENDER_FROM_API[(s.gender ?? '').toLowerCase()] ?? 'Male',
    dob: s.dob ?? '',
  };
}

function studentToApiFields(input: Omit<Student, 'id'>): Record<string, string> {
  return {
    email: input.email,
    full_name: input.name,
    role: 'student',
    phone: input.phone,
    roll_no: input.rollNo,
    admission_no: input.admissionNo,
    department: input.departmentId,
    program: input.programId,
    semester: input.semesterId,
    section: input.sectionId,
    gender: GENDER_API[input.gender] ?? input.gender.toLowerCase(),
    dob: input.dob,
    blood_group: input.bloodGroup,
    mentor_name: input.mentorName,
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export const students = {
  async list(q?: string): Promise<Student[]> {
    return fromSource(
      async () => {
        const rows = await db.read('students');
        return q ? rows.filter((s) => matches([s.name, s.rollNo, s.email], q)) : rows;
      },
      async () => {
        const rows = await http.get<StudentApi[]>('/api/v1/students/');
        const mapped = rows.map(mapStudentFromApi);
        return q ? mapped.filter((s) => matches([s.name, s.rollNo, s.email], q)) : mapped;
      },
    );
  },
  async create(input: Omit<Student, 'id'> & { password?: string }): Promise<Student> {
    return fromSource(
      async () => {
        const row: Student = { ...input, id: genId('stu') };
        await db.upsert('students', row);
        await logAction('create', 'Student', `Added student ${row.name} (${row.rollNo})`);
        return row;
      },
      async () => {
        const fields = studentToApiFields(input);
        let data: { id: string; name: string; email: string; phone: string; roll_no: string };
        if (input.avatarUrl) {
          const form = new FormData();
          Object.entries({ ...fields, password: input.password ?? '' }).forEach(([k, v]) => form.append(k, v));
          form.append('profile_pic', await dataUrlToBlob(input.avatarUrl), 'photo.jpg');
          data = await http.postForm('/api/v1/auth/register', form);
        } else {
          data = await http.post('/api/v1/auth/register', { ...fields, password: input.password });
        }
        const row: Student = { ...input, id: data.id, name: data.name, email: data.email, phone: data.phone, rollNo: data.roll_no };
        await logAction('create', 'Student', `Added student ${row.name} (${row.rollNo})`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<Student, 'id'>>): Promise<Student> {
    return fromSource(
      async () => {
        const rows = await db.read('students');
        const existing = rows.find((s) => s.id === id);
        if (!existing) throw new Error('Student not found');
        const updated = { ...existing, ...patch };
        await db.upsert('students', updated);
        await logAction('update', 'Student', `Updated student ${updated.name}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/students/${id}/`, patch);
        const rows = await http.get<Student[]>('/api/v1/students/');
        const updated = rows.find((s) => s.id === id);
        if (!updated) throw new Error('Student not found after update');
        await logAction('update', 'Student', `Updated student ${updated.name}`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        if (id === ANCHOR_STUDENT_ID) throwGuard();
        const rows = await db.read('students');
        const existing = rows.find((s) => s.id === id);
        await db.removeById('students', id);
        await logAction('delete', 'Student', `Removed student ${existing?.name ?? id}`);
      },
      async () => {
        await http.delete(`/api/v1/students/${id}/`);
        await logAction('delete', 'Student', `Removed student ${id}`);
      },
    );
  },
};

// =====================================================================================
// Faculty — real reads/writes go through the dedicated FacultyProfile CRUD endpoint
// (`/api/v1/faculty`). Its rows carry the faculty user's name/email/phone plus the
// profile's department/designation and the personal-info fields the console surfaces
// (qualifications, experience, photo_url). Create POSTs to the same endpoint, which
// provisions the underlying faculty *user account* AND its profile in one call — the
// `department` ref accepts an id/code/name, so the console's department string resolves
// server-side; all profile fields persist at create time.
// =====================================================================================
type FacultyApi = {
  id: string;
  user_name?: string;
  user_email?: string;
  phone?: string;
  department?: string; // department FK id
  department_name?: string; // human-readable
  designation?: string;
  qualifications?: string;
  experience?: string;
  photo_url?: string;
};
function mapFacultyFromApi(f: FacultyApi): FacultyMember {
  return {
    id: f.id,
    name: f.user_name ?? '',
    email: f.user_email ?? '',
    phone: f.phone ?? '',
    department: f.department_name ?? '',
    designation: f.designation ?? '',
    qualifications: f.qualifications ?? '',
    experience: f.experience ?? '',
    photoUrl: f.photo_url || undefined,
    avatarColor: '#7C3AED',
  };
}

export const faculty = {
  async list(q?: string): Promise<FacultyMember[]> {
    return fromSource(
      async () => {
        const rows = await db.read('faculty');
        return q ? rows.filter((f) => matches([f.name, f.email, f.department], q)) : rows;
      },
      async () => {
        const rows = await http.get<FacultyApi[]>('/api/v1/faculty');
        const mapped = rows.map(mapFacultyFromApi);
        return q ? mapped.filter((f) => matches([f.name, f.email, f.department], q)) : mapped;
      },
    );
  },
  async create(input: Omit<FacultyMember, 'id'> & { password?: string }): Promise<FacultyMember> {
    return fromSource(
      async () => {
        const row: FacultyMember = { ...input, id: genId('fac') };
        await db.upsert('faculty', row);
        await logAction('create', 'Faculty', `Added faculty ${row.name}`);
        return row;
      },
      async () => {
        // One call creates the faculty User + FacultyProfile. `department` accepts an
        // id/code/name; profile fields persist server-side. A picked photo arrives as a
        // data URL → upload it as multipart `profile_pic` (stored on the user's image
        // field → object storage); otherwise send plain JSON. Response mirrors a list
        // row → map it straight back.
        const fields: Record<string, string> = {
          full_name: input.name,
          email: input.email,
          phone: input.phone,
          department: input.department,
          designation: input.designation,
          qualifications: input.qualifications ?? '',
          experience: input.experience ?? '',
          ...(input.password ? { password: input.password } : {}),
        };
        const isUpload = typeof input.photoUrl === 'string' && input.photoUrl.startsWith('data:');
        let data: FacultyApi;
        if (isUpload) {
          const form = new FormData();
          Object.entries(fields).forEach(([k, v]) => form.append(k, v ?? ''));
          form.append('profile_pic', await dataUrlToBlob(input.photoUrl as string), 'faculty.jpg');
          data = await http.postForm<FacultyApi>('/api/v1/faculty', form);
        } else {
          data = await http.post<FacultyApi>('/api/v1/faculty', fields);
        }
        const row = mapFacultyFromApi(data);
        await logAction('create', 'Faculty', `Added faculty ${row.name}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<FacultyMember, 'id'>>): Promise<FacultyMember> {
    return fromSource(
      async () => {
        const rows = await db.read('faculty');
        const existing = rows.find((f) => f.id === id);
        if (!existing) throw new Error('Faculty not found');
        const updated = { ...existing, ...patch };
        await db.upsert('faculty', updated);
        await logAction('update', 'Faculty', `Updated faculty ${updated.name}`);
        return updated;
      },
      async () => {
        // PATCH the FacultyProfile (id from list() is the profile id). Only the
        // profile-owned fields are writable here — name/email live on the user and
        // are read-only on this endpoint. phone is synced back to the user server-side.
        // A newly-picked photo arrives as a data URL → PATCH it as multipart
        // `profile_pic`; an unchanged photo (already an http URL) is left untouched.
        const fields: Record<string, string> = {};
        if (patch.phone !== undefined) fields.phone = patch.phone;
        if (patch.designation !== undefined) fields.designation = patch.designation;
        if (patch.qualifications !== undefined) fields.qualifications = patch.qualifications ?? '';
        if (patch.experience !== undefined) fields.experience = patch.experience ?? '';
        const isUpload = typeof patch.photoUrl === 'string' && patch.photoUrl.startsWith('data:');
        if (isUpload) {
          const form = new FormData();
          Object.entries(fields).forEach(([k, v]) => form.append(k, v ?? ''));
          form.append('profile_pic', await dataUrlToBlob(patch.photoUrl as string), 'faculty.jpg');
          await http.patchForm(`/api/v1/faculty/${id}`, form);
        } else {
          await http.patch(`/api/v1/faculty/${id}`, fields);
        }
        const rows = await this.list();
        const updated = rows.find((f) => f.id === id);
        if (!updated) throw new Error('Faculty not found after update');
        await logAction('update', 'Faculty', `Updated faculty ${updated.name}`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        const rows = await db.read('faculty');
        const existing = rows.find((f) => f.id === id);
        await db.removeById('faculty', id);
        await logAction('delete', 'Faculty', `Removed faculty ${existing?.name ?? id}`);
      },
      async () => {
        await http.delete(`/api/v1/faculty/${id}`);
        await logAction('delete', 'Faculty', `Removed faculty ${id}`);
      },
    );
  },
};

// =====================================================================================
// Parents — create via /auth/register (role:'parent'); list via /admin/users filtered.
// =====================================================================================
export const parents = {
  async list(q?: string): Promise<ParentAccount[]> {
    return fromSource(
      async () => {
        const rows = await db.read('parents');
        return q ? rows.filter((p) => matches([p.name, p.email, p.relation], q)) : rows;
      },
      async () => {
        const rows = await http.get<{ id: string; name: string; email: string; role: string }[]>('/api/v1/admin/users');
        const parentRows: ParentAccount[] = rows
          .filter((u) => u.role === 'parent')
          .map((u) => ({ id: u.id, name: u.name, email: u.email, phone: '', relation: '', childId: '', avatarColor: '#0D9488' }));
        return q ? parentRows.filter((p) => matches([p.name, p.email, p.relation], q)) : parentRows;
      },
    );
  },
  async create(input: Omit<ParentAccount, 'id'> & { password?: string }): Promise<ParentAccount> {
    return fromSource(
      async () => {
        const row: ParentAccount = { ...input, id: genId('par') };
        await db.upsert('parents', row);
        await logAction('create', 'Parent', `Added parent ${row.name}`);
        return row;
      },
      async () => {
        const data = await http.post<{ id: string; name: string; email: string; phone: string }>('/api/v1/auth/register', {
          email: input.email,
          full_name: input.name,
          role: 'parent',
          password: input.password,
          phone: input.phone,
        });
        const row: ParentAccount = { ...input, id: data.id, name: data.name, email: data.email, phone: data.phone };
        await logAction('create', 'Parent', `Added parent ${row.name}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<ParentAccount, 'id'>>): Promise<ParentAccount> {
    return fromSource(
      async () => {
        const rows = await db.read('parents');
        const existing = rows.find((p) => p.id === id);
        if (!existing) throw new Error('Parent not found');
        const updated = { ...existing, ...patch };
        await db.upsert('parents', updated);
        await logAction('update', 'Parent', `Updated parent ${updated.name}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/admin/users/${id}/`, patch);
        const rows = await this.list();
        const updated = rows.find((p) => p.id === id);
        if (!updated) throw new Error('Parent not found after update');
        await logAction('update', 'Parent', `Updated parent ${updated.name}`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        const rows = await db.read('parents');
        const existing = rows.find((p) => p.id === id);
        await db.removeById('parents', id);
        await logAction('delete', 'Parent', `Removed parent ${existing?.name ?? id}`);
      },
      async () => {
        await http.delete(`/api/v1/admin/users/${id}/`);
        await logAction('delete', 'Parent', `Removed parent ${id}`);
      },
    );
  },
};

// =====================================================================================
// Users & Roles
// =====================================================================================
export const users = {
  async list(q?: string, role?: Role): Promise<PlatformUser[]> {
    return fromSource(
      async () => {
        let rows = await db.read('platformUsers');
        if (role) rows = rows.filter((u) => u.role === role);
        return q ? rows.filter((u) => matches([u.name, u.email], q)) : rows;
      },
      async () => {
        const raw = await http.get<{ id: string; name: string; email: string; role: string; is_active?: boolean }[]>('/api/v1/admin/users');
        let rows: PlatformUser[] = raw.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as Role,
          active: u.is_active ?? true,
          avatarColor: '#13327F',
        }));
        if (role) rows = rows.filter((u) => u.role === role);
        return q ? rows.filter((u) => matches([u.name, u.email], q)) : rows;
      },
    );
  },
  async updateRole(id: string, role: Role): Promise<PlatformUser> {
    return fromSource(
      async () => {
        const rows = await db.read('platformUsers');
        const existing = rows.find((u) => u.id === id);
        if (!existing) throw new Error('User not found');
        const updated = { ...existing, role };
        await db.upsert('platformUsers', updated);
        await logAction('update', 'User', `Changed role for ${updated.name} to ${role}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/admin/users/${id}/`, { role });
        const rows = await this.list();
        const updated = rows.find((u) => u.id === id);
        if (!updated) throw new Error('User not found after update');
        await logAction('update', 'User', `Changed role for ${updated.name} to ${role}`);
        return updated;
      },
    );
  },
  async setActive(id: string, active: boolean): Promise<PlatformUser> {
    if (!active) {
      if (CORE_USER_IDS.includes(id)) throwGuard();
      const session = await authService.getSession();
      if (session && id === session.id) throwGuard();
    }
    return fromSource(
      async () => {
        const rows = await db.read('platformUsers');
        const existing = rows.find((u) => u.id === id);
        if (!existing) throw new Error('User not found');
        const updated = { ...existing, active };
        await db.upsert('platformUsers', updated);
        await logAction('update', 'User', `${active ? 'Activated' : 'Deactivated'} ${updated.name}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/admin/users/${id}/`, { is_active: active });
        const rows = await this.list();
        const updated = rows.find((u) => u.id === id);
        if (!updated) throw new Error('User not found after update');
        await logAction('update', 'User', `${active ? 'Activated' : 'Deactivated'} ${updated.name}`);
        return updated;
      },
    );
  },
};

// =====================================================================================
// Departments
// =====================================================================================
export const departments = {
  async list(): Promise<Department[]> {
    return fromSource(
      () => db.read('departments'),
      async () => {
        const rows = await http.get<{ id: string; code: string; name: string; hod?: string }[]>('/api/v1/departments/');
        return rows.map((d) => ({ id: d.id, code: d.code, name: d.name, hod: d.hod }));
      },
    );
  },
  hodCandidates(): Promise<HodCandidate[]> {
    return fromSource(
      () => Promise.resolve(seedHodCandidates),
      async () => {
        const rows = await http.get<{ id: string; full_name: string; email: string; role: string }[]>('/api/v1/departments/hod-candidates');
        return rows.map((r) => ({ id: r.id, fullName: r.full_name, email: r.email, role: (r.role as 'faculty' | 'hod') ?? 'faculty' }));
      },
    );
  },
  async create(input: Omit<Department, 'id'>): Promise<Department> {
    return fromSource(
      async () => {
        const row: Department = { ...input, id: genId('dept') };
        await db.upsert('departments', row);
        await logAction('create', 'Department', `Added department ${row.name}`);
        return row;
      },
      async () => {
        const data = await http.post<{ id: string; code: string; name: string; hod?: string }>('/api/v1/departments/', input);
        const row: Department = { id: data.id, code: data.code, name: data.name, hod: data.hod };
        await logAction('create', 'Department', `Added department ${row.name}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<Department, 'id'>>): Promise<Department> {
    return fromSource(
      async () => {
        const rows = await db.read('departments');
        const existing = rows.find((d) => d.id === id);
        if (!existing) throw new Error('Department not found');
        const updated = { ...existing, ...patch };
        await db.upsert('departments', updated);
        await logAction('update', 'Department', `Updated department ${updated.name}`);
        return updated;
      },
      async () => {
        const data = await http.patch<{ id: string; code: string; name: string; hod?: string }>(`/api/v1/departments/${id}/`, patch);
        const row: Department = { id: data.id, code: data.code, name: data.name, hod: data.hod };
        await logAction('update', 'Department', `Updated department ${row.name}`);
        return row;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        const rows = await db.read('departments');
        const existing = rows.find((d) => d.id === id);
        await db.removeById('departments', id);
        await logAction('delete', 'Department', `Removed department ${existing?.name ?? id}`);
      },
      async () => {
        await http.delete(`/api/v1/departments/${id}/`);
        await logAction('delete', 'Department', `Removed department ${id}`);
      },
    );
  },
};

// =====================================================================================
// Programs (was "Course" — renamed to match the real /api/v1/programs/ resource)
// =====================================================================================
export const programs = {
  async list(): Promise<Program[]> {
    return fromSource(
      () => db.read('programs'),
      async () => {
        const rows = await http.get<{ id: string; code: string; name: string; department: string; duration_years: number; intake: number }[]>(
          '/api/v1/programs/',
        );
        return rows.map((p) => ({ id: p.id, code: p.code, name: p.name, departmentId: p.department, durationYears: p.duration_years, intake: p.intake, color: '#13327F' }));
      },
    );
  },
  async create(input: Omit<Program, 'id'>): Promise<Program> {
    return fromSource(
      async () => {
        const row: Program = { ...input, id: genId('prog') };
        await db.upsert('programs', row);
        await logAction('create', 'Program', `Added program ${row.name}`);
        return row;
      },
      async () => {
        // Post ONLY the program — the backend auto-generates its semesters
        // (durationYears * 2), so we never send a semester count/list here.
        const data = await http.post<{ id: string; code: string; name: string; department: string; duration_years: number; intake: number }>(
          '/api/v1/programs/',
          { code: input.code, name: input.name, department: input.departmentId, duration_years: input.durationYears, intake: input.intake },
        );
        const row: Program = { id: data.id, code: data.code, name: data.name, departmentId: data.department, durationYears: data.duration_years, intake: data.intake, color: input.color };
        await logAction('create', 'Program', `Added program ${row.name}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<Program, 'id'>>): Promise<Program> {
    return fromSource(
      async () => {
        const rows = await db.read('programs');
        const existing = rows.find((c) => c.id === id);
        if (!existing) throw new Error('Program not found');
        const updated = { ...existing, ...patch };
        await db.upsert('programs', updated);
        await logAction('update', 'Program', `Updated program ${updated.name}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/programs/${id}/`, {
          ...(patch.code && { code: patch.code }),
          ...(patch.name && { name: patch.name }),
          ...(patch.departmentId && { department: patch.departmentId }),
          ...(patch.durationYears && { duration_years: patch.durationYears }),
          ...(patch.intake && { intake: patch.intake }),
        });
        const rows = await this.list();
        const updated = rows.find((p) => p.id === id);
        if (!updated) throw new Error('Program not found after update');
        await logAction('update', 'Program', `Updated program ${updated.name}`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        const rows = await db.read('programs');
        const existing = rows.find((c) => c.id === id);
        await db.removeById('programs', id);
        await logAction('delete', 'Program', `Removed program ${existing?.name ?? id}`);
      },
      async () => {
        await http.delete(`/api/v1/programs/${id}/`);
        await logAction('delete', 'Program', `Removed program ${id}`);
      },
    );
  },
};

// =====================================================================================
// Semesters
// =====================================================================================
export const semesters = {
  async list(programId?: string): Promise<Semester[]> {
    return fromSource(
      async () => {
        const rows = await db.read('semesters');
        return programId ? rows.filter((s) => s.programId === programId) : rows;
      },
      async () => {
        const path = programId ? `/api/v1/semesters/?program=${programId}` : '/api/v1/semesters/';
        const rows = await http.get<{ id: string; program: string; number: number }[]>(path);
        return rows.map((s) => ({ id: s.id, programId: s.program, number: s.number }));
      },
    );
  },
  async create(input: Omit<Semester, 'id'>): Promise<Semester> {
    return fromSource(
      async () => {
        const row: Semester = { ...input, id: genId('sem') };
        await db.upsert('semesters', row);
        await logAction('create', 'Semester', `Added semester ${row.number}`);
        return row;
      },
      async () => {
        const data = await http.post<{ id: string; program: string; number: number }>('/api/v1/semesters/', {
          program: input.programId,
          number: input.number,
        });
        const row: Semester = { id: data.id, programId: data.program, number: data.number };
        await logAction('create', 'Semester', `Added semester ${row.number}`);
        return row;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        await db.removeById('semesters', id);
        await logAction('delete', 'Semester', `Removed semester ${id}`);
      },
      async () => {
        await http.delete(`/api/v1/semesters/${id}/`);
        await logAction('delete', 'Semester', `Removed semester ${id}`);
      },
    );
  },
};

// =====================================================================================
// Sections
// =====================================================================================
export const sections = {
  async list(semesterIdFilter?: string): Promise<Section[]> {
    return fromSource(
      async () => {
        const rows = await db.read('sections');
        return semesterIdFilter ? rows.filter((s) => s.semesterId === semesterIdFilter) : rows;
      },
      async () => {
        const path = semesterIdFilter ? `/api/v1/sections/?semester=${semesterIdFilter}` : '/api/v1/sections/';
        const rows = await http.get<{ id: string; semester: string; name: string; shift?: Shift }[]>(path);
        return rows.map((s) => ({ id: s.id, semesterId: s.semester, name: s.name, shift: s.shift }));
      },
    );
  },
  async create(input: Omit<Section, 'id'>): Promise<Section> {
    return fromSource(
      async () => {
        const row: Section = { ...input, id: genId('sec') };
        await db.upsert('sections', row);
        await logAction('create', 'Section', `Added section ${row.name}`);
        return row;
      },
      async () => {
        const data = await http.post<{ id: string; semester: string; name: string; shift?: Shift }>('/api/v1/sections/', {
          semester: input.semesterId,
          name: input.name,
          ...(input.shift && { shift: input.shift }),
        });
        const row: Section = { id: data.id, semesterId: data.semester, name: data.name, shift: data.shift ?? input.shift };
        await logAction('create', 'Section', `Added section ${row.name}`);
        return row;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        await db.removeById('sections', id);
        await logAction('delete', 'Section', `Removed section ${id}`);
      },
      async () => {
        await http.delete(`/api/v1/sections/${id}/`);
        await logAction('delete', 'Section', `Removed section ${id}`);
      },
    );
  },
};

// =====================================================================================
// Subjects
// =====================================================================================
type RawSubject = {
  id: string;
  code: string;
  name: string;
  credits: number;
  department: string;
  program?: string;
  semester: string;
  academic_session?: string;
  faculty?: string; // legacy single
  faculty_name?: string; // legacy single
  faculties?: string[];
  faculty_names?: string[];
  color?: string;
};

function mapSubject(s: RawSubject): Subject {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    credits: s.credits,
    departmentId: s.department,
    programId: s.program,
    semesterId: s.semester,
    academicSession: s.academic_session,
    facultyIds: s.faculties,
    facultyNames: s.faculty_names,
    facultyId: s.faculty,
    facultyName: s.faculty_name,
    color: s.color ?? '#13327F',
  };
}

export const subjects = {
  async list(q?: string): Promise<Subject[]> {
    return fromSource(
      async () => {
        const rows = await db.read('subjects');
        return q ? rows.filter((s) => matches([s.name, s.code, s.facultyName], q)) : rows;
      },
      async () => {
        const rows = await http.get<RawSubject[]>('/api/v1/subjects/');
        const mapped = rows.map(mapSubject);
        return q ? mapped.filter((s) => matches([s.name, s.code, s.facultyName, ...(s.facultyNames ?? [])], q)) : mapped;
      },
    );
  },
  facultyCandidates(): Promise<FacultyCandidate[]> {
    return fromSource(
      async () => {
        const rows = await db.read('faculty');
        return rows.map((f) => ({ id: f.id, fullName: f.name, email: f.email }));
      },
      async () => {
        const rows = await http.get<{ id: string; full_name: string; email: string }[]>('/api/v1/subjects/faculty-candidates');
        return rows.map((r) => ({ id: r.id, fullName: r.full_name, email: r.email }));
      },
    );
  },
  async create(input: Omit<Subject, 'id'>): Promise<Subject> {
    return fromSource(
      async () => {
        const row: Subject = { ...input, id: genId('sub') };
        await db.upsert('subjects', row);
        await logAction('create', 'Subject', `Added subject ${row.name}`);
        return row;
      },
      async () => {
        const data = await http.post<RawSubject>('/api/v1/subjects/', {
          code: input.code,
          name: input.name,
          credits: input.credits,
          department: input.departmentId,
          semester: input.semesterId,
          ...(input.programId && { program: input.programId }),
          ...(input.academicSession && { academic_session: input.academicSession }),
          ...(input.facultyIds && { faculties: input.facultyIds }),
          color: input.color,
        });
        const row: Subject = { ...mapSubject(data), color: data.color ?? input.color };
        await logAction('create', 'Subject', `Added subject ${row.name}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<Subject, 'id'>>): Promise<Subject> {
    return fromSource(
      async () => {
        const rows = await db.read('subjects');
        const existing = rows.find((s) => s.id === id);
        if (!existing) throw new Error('Subject not found');
        const updated = { ...existing, ...patch };
        await db.upsert('subjects', updated);
        await logAction('update', 'Subject', `Updated subject ${updated.name}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/subjects/${id}/`, {
          ...(patch.code && { code: patch.code }),
          ...(patch.name && { name: patch.name }),
          ...(patch.credits !== undefined && { credits: patch.credits }),
          ...(patch.departmentId && { department: patch.departmentId }),
          ...(patch.programId && { program: patch.programId }),
          ...(patch.semesterId && { semester: patch.semesterId }),
          ...(patch.academicSession && { academic_session: patch.academicSession }),
          ...(patch.facultyIds && { faculties: patch.facultyIds }),
          ...(patch.color && { color: patch.color }),
        });
        const rows = await this.list();
        const updated = rows.find((s) => s.id === id);
        if (!updated) throw new Error('Subject not found after update');
        await logAction('update', 'Subject', `Updated subject ${updated.name}`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        if (CORE_SUBJECT_IDS.includes(id)) throwGuard();
        const rows = await db.read('subjects');
        const existing = rows.find((s) => s.id === id);
        await db.removeById('subjects', id);
        await logAction('delete', 'Subject', `Removed subject ${existing?.name ?? id}`);
      },
      async () => {
        await http.delete(`/api/v1/subjects/${id}/`);
        await logAction('delete', 'Subject', `Removed subject ${id}`);
      },
    );
  },
};

// =====================================================================================
// Timetable
// =====================================================================================
// Maps a raw backend session (snake_case) → ClassSession. Backend now also carries
// academic_session / shift / status / duration_mins, so map them everywhere.
function mapClassSession(s: Record<string, unknown>): ClassSession {
  return {
    id: s.id as string,
    subjectId: s.subject as string,
    sectionId: s.section as string,
    facultyId: s.faculty as string | undefined,
    facultyName: s.faculty_name as string | undefined,
    academicSession: s.academic_session as string | undefined,
    shift: s.shift as ClassSession['shift'],
    status: s.status as ClassSession['status'],
    day: s.day as Weekday,
    start: s.start as string,
    end: s.end as string,
    durationMins: s.duration_mins as number | undefined,
    room: s.room as string,
    type: s.type as ClassSession['type'],
  };
}

export const timetable = {
  // `facultyId` filters the week by faculty via the backend `?faculty=<id>` param.
  async list(facultyId?: string): Promise<ClassSession[]> {
    return fromSource(
      async () => {
        const rows = await db.read('sessions');
        return facultyId ? rows.filter((s) => s.facultyId === facultyId) : rows;
      },
      async () => {
        const path = facultyId ? `/api/v1/timetable/week?faculty=${encodeURIComponent(facultyId)}` : '/api/v1/timetable/week';
        const week = await http.get<unknown>(path);
        const rows: unknown[] = Array.isArray(week) ? week : Object.values(week as Record<string, unknown[]>).flat();
        return (rows as Record<string, unknown>[]).map(mapClassSession);
      },
    );
  },
  // Today's periods, used by the Attendance "select period" flow.
  async today(): Promise<ClassSession[]> {
    return fromSource(
      async () => {
        const rows = await db.read('sessions');
        const todayIdx = new Date().getDay(); // 0=Sun
        const map: Weekday[] = ['Sun' as Weekday, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const todayName = map[todayIdx];
        return rows.filter((s) => s.day === todayName);
      },
      async () => {
        const rows = await http.get<Record<string, unknown>[]>('/api/v1/timetable/today');
        return rows.map(mapClassSession);
      },
    );
  },
  async create(input: Omit<ClassSession, 'id'>): Promise<ClassSession> {
    return fromSource(
      async () => {
        const row: ClassSession = { ...input, id: genId('sess') };
        await db.upsert('sessions', row);
        await logAction('create', 'Timetable', `Added session for ${input.subjectId} on ${input.day}`);
        return row;
      },
      async () => {
        const data = await http.post<Record<string, unknown>>('/api/v1/timetable/', {
          subject: input.subjectId,
          section: input.sectionId,
          faculty: input.facultyId,
          day: input.day,
          start: input.start,
          end: input.end,
          room: input.room,
          type: input.type,
          academic_session: input.academicSession,
          shift: input.shift,
          status: input.status,
          duration_mins: input.durationMins,
        });
        const row = mapClassSession(data);
        await logAction('create', 'Timetable', `Added session for ${row.subjectId} on ${row.day}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<ClassSession, 'id'>>): Promise<ClassSession> {
    return fromSource(
      async () => {
        const rows = await db.read('sessions');
        const existing = rows.find((s) => s.id === id);
        if (!existing) throw new Error('Session not found');
        const updated = { ...existing, ...patch };
        await db.upsert('sessions', updated);
        await logAction('update', 'Timetable', `Updated session ${id}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/timetable/${id}/`, {
          ...(patch.subjectId && { subject: patch.subjectId }),
          ...(patch.sectionId && { section: patch.sectionId }),
          ...(patch.facultyId && { faculty: patch.facultyId }),
          ...(patch.day && { day: patch.day }),
          ...(patch.start && { start: patch.start }),
          ...(patch.end && { end: patch.end }),
          ...(patch.room && { room: patch.room }),
          ...(patch.type && { type: patch.type }),
          ...(patch.academicSession !== undefined && { academic_session: patch.academicSession }),
          ...(patch.shift !== undefined && { shift: patch.shift }),
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.durationMins !== undefined && { duration_mins: patch.durationMins }),
        });
        const rows = await this.list();
        const updated = rows.find((s) => s.id === id);
        if (!updated) throw new Error('Session not found after update');
        await logAction('update', 'Timetable', `Updated session ${id}`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        await db.removeById('sessions', id);
        await logAction('delete', 'Timetable', `Removed session ${id}`);
      },
      async () => {
        await http.delete(`/api/v1/timetable/${id}/`);
        await logAction('delete', 'Timetable', `Removed session ${id}`);
      },
    );
  },
};

// =====================================================================================
// Attendance — read-only overview (existing) + mark-attendance flow (new, item 4)
// =====================================================================================

/** A markable period for today: a class + one of its scheduled slots. */
export type MarkSession = {
  classId: string;
  subjectLabel: string;
  sectionLabel: string;
  start: string;
  end: string;
  room: string;
};

export const attendance = {
  async overview(): Promise<AttendanceOverview> {
    return fromSource(
      async () => {
        const [sessionRows, subjectRows] = await Promise.all([db.read('sessions'), db.read('subjects')]);
        const bySubject = subjectRows.map((subject) => {
          const count = sessionRows.filter((s) => s.subjectId === subject.id).length;
          const seedNum = subject.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const percent = 72 + (seedNum % 24);
          return { label: `${subject.code} ${subject.name}`, percent, sessions: count };
        });
        const overallPercent = bySubject.length ? Math.round(bySubject.reduce((a, b) => a + b.percent, 0) / bySubject.length) : 0;
        return { overallPercent, sessionsRecorded: sessionRows.length, byClass: bySubject };
      },
      async () => {
        // `/attendance/summary` & `/overall` are student-self-scoped (404 for an admin
        // with no student profile). Build the admin overview by aggregating the raw
        // records from the admin management list instead.
        const records = await http
          .get<{ subject_code?: string; subject_name?: string; status?: string; date?: string }[]>('/api/v1/attendance/manage')
          .catch(() => [] as { subject_code?: string; subject_name?: string; status?: string; date?: string }[]);
        const groups = new Map<string, { label: string; attended: number; total: number; dates: Set<string> }>();
        for (const r of records) {
          const key = r.subject_code ?? r.subject_name ?? 'Unknown';
          const label = [r.subject_code, r.subject_name].filter(Boolean).join(' ') || 'Unknown';
          const g = groups.get(key) ?? { label, attended: 0, total: 0, dates: new Set<string>() };
          g.total += 1;
          if (r.status === 'present' || r.status === 'late') g.attended += 1;
          if (r.date) g.dates.add(r.date);
          groups.set(key, g);
        }
        const all = [...groups.values()];
        const totAttended = all.reduce((a, g) => a + g.attended, 0);
        const totAll = all.reduce((a, g) => a + g.total, 0);
        return {
          overallPercent: totAll ? Math.round((totAttended / totAll) * 100) : 0,
          sessionsRecorded: records.length,
          byClass: all.map((g) => ({ label: g.label, percent: g.total ? Math.round((g.attended / g.total) * 100) : 0, sessions: g.dates.size })),
        };
      },
    );
  },
  // Markable periods for today. Real mode reads faculty classes (the unit attendance
  // is recorded against) and flattens their slots to today's weekday; if nothing is
  // scheduled today, it falls back to one row per class so the tool is always usable.
  // Mock mode derives the same shape from the timetable sessions. `classId` is the id
  // roster()/saveRecord() must be called with (a FacultyClass id in real mode).
  async todaySessions(): Promise<MarkSession[]> {
    const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
    return fromSource(
      async () => {
        const [sessionRows, subjectRows, sectionRows] = await Promise.all([db.read('sessions'), db.read('subjects'), db.read('sections')]);
        const subjectLabel = (id: string) => {
          const s = subjectRows.find((x) => x.id === id);
          return s ? `${s.code} · ${s.name}` : id;
        };
        const sectionLabel = (id: string) => {
          const s = sectionRows.find((x) => x.id === id);
          return s ? `Section ${s.name}` : id;
        };
        let todays = sessionRows.filter((s) => s.day === today);
        if (todays.length === 0) todays = sessionRows;
        return todays
          .map((s) => ({ classId: s.id, subjectLabel: subjectLabel(s.subjectId), sectionLabel: sectionLabel(s.sectionId), start: s.start, end: s.end, room: s.room }))
          .sort((a, b) => a.start.localeCompare(b.start));
      },
      async () => {
        const classes = await http.get<
          { id: string; subjectCode: string; subjectName: string; section: string; slots?: { day: string; start: string; end: string; room: string }[] }[]
        >('/api/v1/faculty/classes');
        const todays: MarkSession[] = [];
        for (const c of classes) {
          const label = `${c.subjectCode} · ${c.subjectName}`;
          const section = `Section ${c.section}`;
          for (const slot of c.slots ?? []) {
            if (slot.day === today) todays.push({ classId: c.id, subjectLabel: label, sectionLabel: section, start: slot.start, end: slot.end, room: slot.room });
          }
        }
        if (todays.length === 0) {
          // Nothing scheduled today — offer every class (using its first slot's time if any).
          for (const c of classes) {
            const slot = c.slots?.[0];
            todays.push({ classId: c.id, subjectLabel: `${c.subjectCode} · ${c.subjectName}`, sectionLabel: `Section ${c.section}`, start: slot?.start ?? '', end: slot?.end ?? '', room: slot?.room ?? '' });
          }
        }
        return todays.sort((a, b) => a.start.localeCompare(b.start));
      },
    );
  },
  // Roster for a class session — students in that session's section.
  async roster(classId: string): Promise<Student[]> {
    return fromSource(
      async () => {
        const [sessionRows, studentRows] = await Promise.all([db.read('sessions'), db.read('students')]);
        const session = sessionRows.find((s) => s.id === classId);
        if (!session) return [];
        return studentRows.filter((s) => s.sectionId === session.sectionId);
      },
      async () => {
        // classId is a FacultyClass id (see todaySessions). The roster endpoint is
        // readable by admins for any class; it returns {id,name,rollNo,avatarColor}.
        const rows = await http.get<Record<string, unknown>[]>(`/api/v1/faculty/classes/${classId}/roster`);
        return rows.map(
          (r) =>
            ({
              id: r.id as string,
              name: (r.name as string) ?? (r.full_name as string),
              rollNo: (r.rollNo as string) ?? (r.roll_no as string) ?? '',
              avatarColor: (r.avatarColor as string) ?? (r.avatar_color as string) ?? undefined,
            }) as Student,
        );
      },
    );
  },
  async saveRecord(input: { classId: string; date: string; period: number; entries: AttendanceEntry[] }): Promise<AttendanceRecord> {
    return fromSource(
      async () => {
        const row: AttendanceRecord = { ...input, id: genId('att') };
        const rows = await db.read('sessions'); // no dedicated attendanceRecords collection needed for mock display
        void rows;
        await logAction('create', 'Attendance', `Marked attendance for class ${input.classId} on ${input.date} (${input.entries.length} students)`);
        return row;
      },
      async () => {
        const data = await http.post<{ id: string; classId: string; date: string; entries: AttendanceEntry[] }>('/api/v1/attendance', {
          classId: input.classId,
          date: input.date,
          period: input.period,
          entries: input.entries,
        });
        await logAction('create', 'Attendance', `Marked attendance for class ${input.classId} on ${input.date} (${input.entries.length} students)`);
        return { id: data.id, classId: data.classId, date: data.date, period: input.period, entries: data.entries };
      },
    );
  },
};

// =====================================================================================
// Fees
// =====================================================================================
export const fees = {
  async list(q?: string): Promise<FeeInvoice[]> {
    return fromSource(
      async () => {
        const rows = await db.read('fees');
        return q ? rows.filter((f) => matches([f.studentName, f.title, f.term], q)) : rows;
      },
      async () => {
        const rows = await http.get<Record<string, unknown>[]>('/api/v1/fees/');
        const mapped: FeeInvoice[] = rows.map((f) => ({
          id: f.id as string,
          studentId: f.student as string,
          studentName: (f.student_name as string) ?? '',
          title: f.title as string,
          term: f.term as string,
          amount: f.amount as number,
          dueDate: (f.dueDate as string) ?? (f.due_date as string),
          status: f.status as FeeInvoice['status'],
          paidOn: f.paidOn as string | undefined,
        }));
        return q ? mapped.filter((f) => matches([f.studentName, f.title, f.term], q)) : mapped;
      },
    );
  },
  async create(input: Omit<FeeInvoice, 'id' | 'status'>): Promise<FeeInvoice> {
    return fromSource(
      async () => {
        const row: FeeInvoice = { ...input, id: genId('fee'), status: 'due' };
        await db.upsert('fees', row);
        await logAction('create', 'Fee Invoice', `Added invoice "${row.title}" for ${row.studentName}`);
        return row;
      },
      async () => {
        const data = await http.post<Record<string, unknown>>('/api/v1/fees/', {
          student: input.studentId,
          title: input.title,
          term: input.term,
          amount: input.amount,
          // Backend write field is camelCase `dueDate`; `due_date` is silently
          // ignored (persists null). Verified live against the API.
          dueDate: input.dueDate,
        });
        const row: FeeInvoice = {
          id: data.id as string,
          studentId: input.studentId,
          studentName: input.studentName,
          title: data.title as string,
          term: data.term as string,
          amount: data.amount as number,
          dueDate: (data.dueDate as string) ?? input.dueDate,
          status: (data.status as FeeInvoice['status']) ?? 'pending',
        };
        await logAction('create', 'Fee Invoice', `Added invoice "${row.title}" for ${row.studentName}`);
        return row;
      },
    );
  },
  // Item 5: create several invoice line-items for one student in a single submission.
  async createBatch(items: Omit<FeeInvoice, 'id' | 'status'>[]): Promise<FeeInvoice[]> {
    const created: FeeInvoice[] = [];
    for (const item of items) {
      created.push(await this.create(item));
    }
    return created;
  },
  async recordPayment(feeId: string, amount: number, method: PaymentMethod, reference: string): Promise<{ paymentId: string; receiptNo: string }> {
    return fromSource(
      async () => {
        const rows = await db.read('fees');
        const existing = rows.find((f) => f.id === feeId);
        if (!existing) throw new Error('Invoice not found');
        const updated: FeeInvoice = { ...existing, status: 'paid', paidOn: new Date().toISOString() };
        await db.upsert('fees', updated);
        await logAction('update', 'Fee Invoice', `Recorded ${method} payment for "${updated.title}" (${updated.studentName})`);
        return { paymentId: genId('pay'), receiptNo: `RCP-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}` };
      },
      async () => {
        const data = await http.post<{ payment_id: string; receipt_no: string }>('/api/v1/fees/payment', {
          fee_id: feeId,
          amount,
          method,
          reference,
        });
        await logAction('update', 'Fee Invoice', `Recorded ${method} payment for invoice ${feeId}`);
        return { paymentId: data.payment_id, receiptNo: data.receipt_no };
      },
    );
  },
  // Back-compat alias used by earlier UI — marks as paid with a default cash payment.
  markPaid(id: string): Promise<FeeInvoice> {
    return fromSource(
      async () => {
        const rows = await db.read('fees');
        const existing = rows.find((f) => f.id === id);
        if (!existing) throw new Error('Invoice not found');
        const updated: FeeInvoice = { ...existing, status: 'paid', paidOn: new Date().toISOString() };
        await db.upsert('fees', updated);
        await logAction('update', 'Fee Invoice', `Marked "${updated.title}" as paid for ${updated.studentName}`);
        return updated;
      },
      async () => {
        await this.recordPayment(id, 0, 'cash', '');
        const rows = await this.list();
        const updated = rows.find((f) => f.id === id);
        if (!updated) throw new Error('Invoice not found after payment');
        return updated;
      },
    );
  },
  totalDue(): Promise<number> {
    return fromSource(
      async () => {
        const rows = await db.read('fees');
        return rows.filter((f) => f.status !== 'paid').reduce((sum, f) => sum + f.amount, 0);
      },
      async () => {
        const data = await http.get<{ total_due: number }>('/api/v1/fees/total-due').catch(() => ({ total_due: 0 }));
        return data.total_due ?? 0;
      },
    );
  },
};

// =====================================================================================
// Library
// =====================================================================================
export const library = {
  async list(q?: string): Promise<Book[]> {
    return fromSource(
      async () => {
        const rows = await db.read('books');
        return q ? rows.filter((b) => matches([b.title, b.author, b.category], q)) : rows;
      },
      async () => {
        const rows = await http.get<Record<string, unknown>[]>('/api/v1/library/books-admin/');
        const mapped: Book[] = rows.map((b) => ({
          id: b.id as string,
          title: b.title as string,
          author: b.author as string,
          category: b.category as string,
          isbn: b.isbn as string | undefined,
          copies: b.copies_total as number,
          available: b.copies_available as number,
        }));
        return q ? mapped.filter((b) => matches([b.title, b.author, b.category], q)) : mapped;
      },
    );
  },
  async create(input: Omit<Book, 'id'>): Promise<Book> {
    return fromSource(
      async () => {
        const row: Book = { ...input, id: genId('book') };
        await db.upsert('books', row);
        await logAction('create', 'Library Book', `Added book "${row.title}"`);
        return row;
      },
      async () => {
        const data = await http.post<Record<string, unknown>>('/api/v1/library/books-admin/', {
          title: input.title,
          author: input.author,
          category: input.category,
          isbn: input.isbn,
          copies_total: input.copies,
          copies_available: input.available,
        });
        const row: Book = { id: data.id as string, title: data.title as string, author: data.author as string, category: data.category as string, isbn: data.isbn as string | undefined, copies: data.copies_total as number, available: data.copies_available as number };
        await logAction('create', 'Library Book', `Added book "${row.title}"`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<Book, 'id'>>): Promise<Book> {
    return fromSource(
      async () => {
        const rows = await db.read('books');
        const existing = rows.find((b) => b.id === id);
        if (!existing) throw new Error('Book not found');
        const updated = { ...existing, ...patch };
        await db.upsert('books', updated);
        await logAction('update', 'Library Book', `Updated "${updated.title}"`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/library/books-admin/${id}/`, {
          ...(patch.title && { title: patch.title }),
          ...(patch.author && { author: patch.author }),
          ...(patch.category && { category: patch.category }),
          ...(patch.copies !== undefined && { copies_total: patch.copies }),
          ...(patch.available !== undefined && { copies_available: patch.available }),
        });
        const rows = await this.list();
        const updated = rows.find((b) => b.id === id);
        if (!updated) throw new Error('Book not found after update');
        await logAction('update', 'Library Book', `Updated "${updated.title}"`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        const rows = await db.read('books');
        const existing = rows.find((b) => b.id === id);
        await db.removeById('books', id);
        await logAction('delete', 'Library Book', `Removed "${existing?.title ?? id}"`);
      },
      async () => {
        await http.delete(`/api/v1/library/books-admin/${id}/`);
        await logAction('delete', 'Library Book', `Removed book ${id}`);
      },
    );
  },
  loans: {
    async list(): Promise<BookLoan[]> {
      return fromSource(
        () => db.read('bookLoans'),
        async () => {
          const rows = await http.get<Record<string, unknown>[]>('/api/v1/library/loans-admin/');
          return rows.map((l) => ({
            id: l.id as string,
            bookId: l.book as string,
            bookTitle: (l.book_title as string) ?? '',
            studentId: l.student as string,
            studentName: (l.student_name as string) ?? '',
            issuedOn: l.issued_on as string,
            dueOn: l.due_on as string,
            returnedOn: (l.returned_on as string | null) ?? undefined,
            // Backend uses 'borrowed'; the console's vocabulary is 'active'.
            status: (l.status === 'borrowed' ? 'active' : l.status) as BookLoan['status'],
          }));
        },
      );
    },
    async issue(input: { bookId: string; bookTitle: string; studentId: string; studentName: string; issuedOn: string; dueOn: string }): Promise<BookLoan> {
      return fromSource(
        async () => {
          const row: BookLoan = { ...input, id: genId('loan'), status: 'active' };
          await db.upsert('bookLoans', row);
          await logAction('create', 'Library Loan', `Issued "${input.bookTitle}" to ${input.studentName}`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/library/loans-admin/', {
            book: input.bookId,
            student: input.studentId,
            issued_on: input.issuedOn,
            due_on: input.dueOn,
            status: 'borrowed', // backend's STATUS_CHOICES value (app shows it as 'active')
          });
          const row: BookLoan = { id: data.id as string, bookId: input.bookId, bookTitle: input.bookTitle, studentId: input.studentId, studentName: input.studentName, issuedOn: input.issuedOn, dueOn: input.dueOn, status: 'active' };
          await logAction('create', 'Library Loan', `Issued "${input.bookTitle}" to ${input.studentName}`);
          return row;
        },
      );
    },
    async returnBook(id: string, returnedOn: string): Promise<BookLoan> {
      return fromSource(
        async () => {
          const rows = await db.read('bookLoans');
          const existing = rows.find((l) => l.id === id);
          if (!existing) throw new Error('Loan not found');
          const updated: BookLoan = { ...existing, returnedOn, status: 'returned' };
          await db.upsert('bookLoans', updated);
          await logAction('update', 'Library Loan', `Marked "${updated.bookTitle}" as returned`);
          return updated;
        },
        async () => {
          await http.patch(`/api/v1/library/loans-admin/${id}/`, { returned_on: returnedOn, status: 'returned' });
          const rows = await this.list();
          const updated = rows.find((l) => l.id === id);
          if (!updated) throw new Error('Loan not found after update');
          await logAction('update', 'Library Loan', `Marked "${updated.bookTitle}" as returned`);
          return updated;
        },
      );
    },
  },
};

// =====================================================================================
// Transport — split into Routes / Stops / Live status
// =====================================================================================
export const transport = {
  routes: {
    async list(): Promise<BusRoute[]> {
      return fromSource(
        () => db.read('busRoutes'),
        async () => {
          const rows = await http.get<Record<string, unknown>[]>('/api/v1/transport/routes/');
          return rows.map((r) => ({ id: r.id as string, name: r.name as string, number: r.number as string, driver: r.driver as string, driverPhone: r.driver_phone as string }));
        },
      );
    },
    async create(input: Omit<BusRoute, 'id'>): Promise<BusRoute> {
      return fromSource(
        async () => {
          const row: BusRoute = { ...input, id: genId('bus') };
          await db.upsert('busRoutes', row);
          await logAction('create', 'Bus Route', `Added route "${row.name}"`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/transport/routes/', { name: input.name, number: input.number, driver: input.driver, driver_phone: input.driverPhone });
          const row: BusRoute = { id: data.id as string, name: data.name as string, number: data.number as string, driver: data.driver as string, driverPhone: data.driver_phone as string };
          await logAction('create', 'Bus Route', `Added route "${row.name}"`);
          return row;
        },
      );
    },
    async update(id: string, patch: Partial<Omit<BusRoute, 'id'>>): Promise<BusRoute> {
      return fromSource(
        async () => {
          const rows = await db.read('busRoutes');
          const existing = rows.find((b) => b.id === id);
          if (!existing) throw new Error('Route not found');
          const updated = { ...existing, ...patch };
          await db.upsert('busRoutes', updated);
          await logAction('update', 'Bus Route', `Updated route "${updated.name}"`);
          return updated;
        },
        async () => {
          await http.patch(`/api/v1/transport/routes/${id}/`, {
            ...(patch.name && { name: patch.name }),
            ...(patch.number && { number: patch.number }),
            ...(patch.driver && { driver: patch.driver }),
            ...(patch.driverPhone && { driver_phone: patch.driverPhone }),
          });
          const rows = await this.list();
          const updated = rows.find((b) => b.id === id);
          if (!updated) throw new Error('Route not found after update');
          await logAction('update', 'Bus Route', `Updated route "${updated.name}"`);
          return updated;
        },
      );
    },
  },
  stops: {
    async list(routeId?: string): Promise<BusStop[]> {
      return fromSource(
        async () => {
          const rows = await db.read('busStops');
          return routeId ? rows.filter((s) => s.routeId === routeId) : rows;
        },
        async () => {
          const rows = await http.get<Record<string, unknown>[]>('/api/v1/transport/stops/');
          const mapped = rows.map((s) => ({ id: s.id as string, routeId: s.route as string, name: s.name as string, time: s.time as string, order: s.order as number }));
          return routeId ? mapped.filter((s) => s.routeId === routeId) : mapped;
        },
      );
    },
    async create(input: Omit<BusStop, 'id'>): Promise<BusStop> {
      return fromSource(
        async () => {
          const row: BusStop = { ...input, id: genId('stop') };
          await db.upsert('busStops', row);
          await logAction('create', 'Bus Stop', `Added stop "${row.name}"`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/transport/stops/', { route: input.routeId, name: input.name, time: input.time, order: input.order });
          const row: BusStop = { id: data.id as string, routeId: data.route as string, name: data.name as string, time: data.time as string, order: data.order as number };
          await logAction('create', 'Bus Stop', `Added stop "${row.name}"`);
          return row;
        },
      );
    },
  },
  liveStatus: {
    async list(): Promise<BusLiveStatus[]> {
      return fromSource(
        () => db.read('busLiveStatuses'),
        async () => {
          const rows = await http.get<Record<string, unknown>[]>('/api/v1/transport/live-status/');
          return rows.map((s) => ({ id: s.id as string, routeId: s.route as string, currentStop: s.current_stop as string, nextStop: s.next_stop as string, etaMins: s.eta_mins as number, occupancy: s.occupancy as number }));
        },
      );
    },
    async update(input: { routeId: string; currentStop: string; nextStop: string; etaMins: number; occupancy: number }): Promise<BusLiveStatus> {
      return fromSource(
        async () => {
          const rows = await db.read('busLiveStatuses');
          const existing = rows.find((s) => s.routeId === input.routeId);
          const row: BusLiveStatus = { id: existing?.id ?? genId('live'), routeId: input.routeId, currentStop: input.currentStop, nextStop: input.nextStop, etaMins: input.etaMins, occupancy: input.occupancy };
          await db.upsert('busLiveStatuses', row);
          await logAction('update', 'Bus Live Status', `Updated live status for route ${input.routeId}`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/transport/live-status/', {
            route: input.routeId,
            current_stop: input.currentStop,
            next_stop: input.nextStop,
            eta_mins: input.etaMins,
            occupancy: input.occupancy,
          });
          const row: BusLiveStatus = { id: data.id as string, routeId: data.route as string, currentStop: data.current_stop as string, nextStop: data.next_stop as string, etaMins: data.eta_mins as number, occupancy: data.occupancy as number };
          await logAction('update', 'Bus Live Status', `Updated live status for route ${input.routeId}`);
          return row;
        },
      );
    },
  },
};

// =====================================================================================
// Hostel — split into Blocks / Rooms / Allocations
// =====================================================================================
export const hostel = {
  blocks: {
    async list(): Promise<HostelBlock[]> {
      return fromSource(
        () => db.read('hostelBlocks'),
        async () => {
          const rows = await http.get<Record<string, unknown>[]>('/api/v1/hostel-blocks/');
          return rows.map((b) => ({ id: b.id as string, name: b.name as string, warden: b.warden as string, wardenPhone: b.warden_phone as string }));
        },
      );
    },
    async create(input: Omit<HostelBlock, 'id'>): Promise<HostelBlock> {
      return fromSource(
        async () => {
          const row: HostelBlock = { ...input, id: genId('block') };
          await db.upsert('hostelBlocks', row);
          await logAction('create', 'Hostel Block', `Added block "${row.name}"`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/hostel-blocks/', { name: input.name, warden: input.warden, warden_phone: input.wardenPhone });
          const row: HostelBlock = { id: data.id as string, name: data.name as string, warden: data.warden as string, wardenPhone: data.warden_phone as string };
          await logAction('create', 'Hostel Block', `Added block "${row.name}"`);
          return row;
        },
      );
    },
    async remove(id: string): Promise<void> {
      return fromSource(
        async () => {
          const rows = await db.read('hostelBlocks');
          const existing = rows.find((b) => b.id === id);
          await db.removeById('hostelBlocks', id);
          await logAction('delete', 'Hostel Block', `Removed block "${existing?.name ?? id}"`);
        },
        async () => {
          await http.delete(`/api/v1/hostel-blocks/${id}/`);
          await logAction('delete', 'Hostel Block', `Removed block ${id}`);
        },
      );
    },
  },
  rooms: {
    async list(blockId?: string): Promise<HostelRoom[]> {
      return fromSource(
        async () => {
          const rows = await db.read('hostelRooms');
          return blockId ? rows.filter((r) => r.blockId === blockId) : rows;
        },
        async () => {
          const path = blockId ? `/api/v1/hostel-rooms/?block=${blockId}` : '/api/v1/hostel-rooms/';
          const rows = await http.get<Record<string, unknown>[]>(path);
          return rows.map((r) => ({ id: r.id as string, blockId: r.block as string, roomNo: r.room_no as string, capacity: r.capacity as number }));
        },
      );
    },
    async create(input: Omit<HostelRoom, 'id'>): Promise<HostelRoom> {
      return fromSource(
        async () => {
          const row: HostelRoom = { ...input, id: genId('room') };
          await db.upsert('hostelRooms', row);
          await logAction('create', 'Hostel Room', `Added room ${row.roomNo}`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/hostel-rooms/', { block: input.blockId, room_no: input.roomNo, capacity: input.capacity });
          const row: HostelRoom = { id: data.id as string, blockId: data.block as string, roomNo: data.room_no as string, capacity: data.capacity as number };
          await logAction('create', 'Hostel Room', `Added room ${row.roomNo}`);
          return row;
        },
      );
    },
  },
  allocations: {
    async list(): Promise<HostelAllocation[]> {
      return fromSource(
        () => db.read('hostelAllocations'),
        async () => {
          const rows = await http.get<Record<string, unknown>[]>('/api/v1/hostel/');
          return rows.map((a) => ({ id: a.id as string, studentId: a.student as string, studentName: (a.student_name as string) ?? '', roomId: a.room as string, bed: a.bed as string, messPlan: a.mess_plan as string, fees: a.fees as number }));
        },
      );
    },
    async create(input: Omit<HostelAllocation, 'id'>): Promise<HostelAllocation> {
      return fromSource(
        async () => {
          const row: HostelAllocation = { ...input, id: genId('alloc') };
          await db.upsert('hostelAllocations', row);
          await logAction('create', 'Hostel Allocation', `Allocated ${input.studentName} to a room`);
          return row;
        },
        async () => {
          const data = await http.post<Record<string, unknown>>('/api/v1/hostel/', { student: input.studentId, room: input.roomId, bed: input.bed, mess_plan: input.messPlan, fees: input.fees });
          const row: HostelAllocation = { id: data.id as string, studentId: input.studentId, studentName: input.studentName, roomId: data.room as string, bed: data.bed as string, messPlan: data.mess_plan as string, fees: data.fees as number };
          await logAction('create', 'Hostel Allocation', `Allocated ${input.studentName} to a room`);
          return row;
        },
      );
    },
    async remove(id: string): Promise<void> {
      return fromSource(
        async () => {
          const rows = await db.read('hostelAllocations');
          const existing = rows.find((a) => a.id === id);
          await db.removeById('hostelAllocations', id);
          await logAction('delete', 'Hostel Allocation', `Removed allocation for ${existing?.studentName ?? id}`);
        },
        async () => {
          await http.delete(`/api/v1/hostel/${id}/`);
          await logAction('delete', 'Hostel Allocation', `Removed allocation ${id}`);
        },
      );
    },
  },
};

// =====================================================================================
// Notifications — direct-to-user send + role broadcast
// =====================================================================================
export const notifications = {
  async list(): Promise<NotificationItem[]> {
    return fromSource(
      () => db.read('notifications'),
      async () => {
        const rows = await http.get<Record<string, unknown>[]>('/api/v1/notifications/');
        return rows.map((n) => ({
          id: n.id as string,
          recipientId: n.recipient as string | undefined,
          broadcastRole: (n.broadcast_role as string) as NotificationItem['broadcastRole'],
          title: n.title as string,
          body: n.body as string,
          category: n.category as NotificationItem['category'],
          read: (n.read as boolean) ?? (n.is_read as boolean) ?? false,
          sentAt: n.created_at as string,
        }));
      },
    );
  },
  recipientCandidates(): Promise<{ id: string; name: string; email: string; role: string }[]> {
    return fromSource(
      async () => {
        const rows = await db.read('platformUsers');
        return rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
      },
      () => http.get('/api/v1/admin/users'),
    );
  },
  async send(input: { recipientId: string; recipientName: string; title: string; body: string; category: NotificationItem['category'] }): Promise<NotificationItem> {
    return fromSource(
      async () => {
        const row: NotificationItem = { id: genId('notif'), recipientId: input.recipientId, recipientName: input.recipientName, title: input.title, body: input.body, category: input.category, read: false, sentAt: new Date().toISOString() };
        const rows = await db.read('notifications');
        await db.write('notifications', [row, ...rows]);
        await logAction('create', 'Notification', `Sent "${input.title}" to ${input.recipientName}`);
        return row;
      },
      async () => {
        const data = await http.post<Record<string, unknown>>('/api/v1/notifications/', { recipient: input.recipientId, title: input.title, body: input.body, category: input.category });
        const row: NotificationItem = { id: data.id as string, recipientId: input.recipientId, recipientName: input.recipientName, title: data.title as string, body: data.body as string, category: data.category as NotificationItem['category'], read: false, sentAt: data.created_at as string };
        await logAction('create', 'Notification', `Sent "${input.title}" to ${input.recipientName}`);
        return row;
      },
    );
  },
  async broadcast(input: { title: string; body: string; category: NotificationItem['category']; role?: Role }): Promise<NotificationItem> {
    return fromSource(
      async () => {
        const row: NotificationItem = { id: genId('notif'), broadcastRole: input.role ?? '', title: input.title, body: input.body, category: input.category, read: false, sentAt: new Date().toISOString() };
        const rows = await db.read('notifications');
        await db.write('notifications', [row, ...rows]);
        await logAction('broadcast', 'Notification', `Broadcast "${input.title}" to ${input.role ?? 'everyone'}`);
        return row;
      },
      async () => {
        await http.post('/api/v1/notifications/broadcast', { title: input.title, body: input.body, category: input.category, role: input.role ?? '' });
        await logAction('broadcast', 'Notification', `Broadcast "${input.title}" to ${input.role ?? 'everyone'}`);
        return { id: genId('notif'), broadcastRole: input.role ?? '', title: input.title, body: input.body, category: input.category, read: false, sentAt: new Date().toISOString() };
      },
    );
  },
};

// =====================================================================================
// Audit — local-only convenience (no equivalent real backend endpoint is documented)
// =====================================================================================
export const audit = {
  list: (): Promise<AuditLog[]> => db.read('auditLogs'),
  async log(entry: { action: AuditLog['action']; entity: string; detail: string }): Promise<void> {
    await logAction(entry.action, entry.entity, entry.detail);
  },
};

export async function resetDemoData(): Promise<void> {
  await db.resetAll();
}
