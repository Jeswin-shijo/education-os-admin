import * as storage from './storage';
import * as seed from '../data/seed';
import type {
  Assignment,
  AuditLog,
  Book,
  BookLoan,
  BusRoute,
  BusStop,
  BusLiveStatus,
  Certificate,
  ClassSession,
  Complaint,
  Department,
  Exam,
  ExamResult,
  FacultyMember,
  FeeInvoice,
  HostelAllocation,
  HostelBlock,
  HostelRoom,
  LeaveRequest,
  Material,
  NotificationItem,
  ParentAccount,
  PlacementApplication,
  PlacementOpening,
  PlatformUser,
  Program,
  Quiz,
  Section,
  Semester,
  Student,
  Subject,
  EventItem,
} from '../data/types';

export type Collections = {
  students: Student[];
  faculty: FacultyMember[];
  parents: ParentAccount[];
  platformUsers: PlatformUser[];
  departments: Department[];
  programs: Program[];
  semesters: Semester[];
  sections: Section[];
  subjects: Subject[];
  sessions: ClassSession[];
  fees: FeeInvoice[];
  books: Book[];
  bookLoans: BookLoan[];
  hostelBlocks: HostelBlock[];
  hostelRooms: HostelRoom[];
  hostelAllocations: HostelAllocation[];
  busRoutes: BusRoute[];
  busStops: BusStop[];
  busLiveStatuses: BusLiveStatus[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  exams: Exam[];
  examResults: ExamResult[];
  assignments: Assignment[];
  materials: Material[];
  quizzes: Quiz[];
  placementOpenings: PlacementOpening[];
  placementApplications: PlacementApplication[];
  events: EventItem[];
  complaints: Complaint[];
  leaveRequests: LeaveRequest[];
  certificates: Certificate[];
};

const collectionNames = [
  'students',
  'faculty',
  'parents',
  'platformUsers',
  'departments',
  'programs',
  'semesters',
  'sections',
  'subjects',
  'sessions',
  'fees',
  'books',
  'bookLoans',
  'hostelBlocks',
  'hostelRooms',
  'hostelAllocations',
  'busRoutes',
  'busStops',
  'busLiveStatuses',
  'notifications',
  'auditLogs',
  'exams',
  'examResults',
  'assignments',
  'materials',
  'quizzes',
  'placementOpenings',
  'placementApplications',
  'events',
  'complaints',
  'leaveRequests',
  'certificates',
] as const satisfies readonly (keyof Collections)[];

const SEEDED_FLAG = 'seeded-v2';

function seedDefault<K extends keyof Collections>(name: K): Collections[K] {
  return (seed as unknown as Collections)[name] ?? [];
}

export async function seedIfEmpty(): Promise<void> {
  if (storage.getJSON<boolean>(SEEDED_FLAG)) return;
  for (const name of collectionNames) {
    storage.setJSON(name, seedDefault(name));
  }
  storage.setJSON(SEEDED_FLAG, true);
}

export async function read<K extends keyof Collections>(name: K): Promise<Collections[K]> {
  await seedIfEmpty();
  return storage.getJSON<Collections[K]>(name) ?? seedDefault(name);
}

export async function write<K extends keyof Collections>(name: K, rows: Collections[K]): Promise<void> {
  storage.setJSON(name, rows);
}

export async function upsert<K extends keyof Collections>(
  name: K,
  row: Collections[K][number],
): Promise<void> {
  const rows = await read(name);
  const idx = (rows as { id: string }[]).findIndex((r) => r.id === (row as { id: string }).id);
  if (idx >= 0) {
    (rows as unknown[])[idx] = row;
  } else {
    (rows as unknown[]).push(row);
  }
  await write(name, rows);
}

export async function removeById<K extends keyof Collections>(name: K, id: string): Promise<void> {
  const rows = await read(name);
  const filtered = (rows as { id: string }[]).filter((r) => r.id !== id) as Collections[K];
  await write(name, filtered);
}

export async function resetAll(): Promise<void> {
  for (const name of collectionNames) storage.remove(name);
  storage.remove(SEEDED_FLAG);
  await seedIfEmpty();
}
