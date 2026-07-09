import * as storage from './storage';
import * as seed from '../data/seed';
import type {
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
  Student,
  Subject,
} from '../data/types';

export type Collections = {
  students: Student[];
  faculty: FacultyMember[];
  parents: ParentAccount[];
  platformUsers: PlatformUser[];
  departments: Department[];
  courses: Course[];
  subjects: Subject[];
  sessions: ClassSession[];
  fees: FeeInvoice[];
  books: Book[];
  busRoutes: BusRoute[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
};

const collectionNames = [
  'students',
  'faculty',
  'parents',
  'platformUsers',
  'departments',
  'courses',
  'subjects',
  'sessions',
  'fees',
  'books',
  'busRoutes',
  'notifications',
  'auditLogs',
] as const satisfies readonly (keyof Collections)[];

const SEEDED_FLAG = 'seeded';
const HOSTEL_KEY = 'hostel';

function seedDefault<K extends keyof Collections>(name: K): Collections[K] {
  return (seed as unknown as Collections)[name];
}

export async function seedIfEmpty(): Promise<void> {
  if (storage.getJSON<boolean>(SEEDED_FLAG)) return;
  for (const name of collectionNames) {
    storage.setJSON(name, seedDefault(name));
  }
  storage.setJSON(HOSTEL_KEY, seed.hostel);
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

export async function readHostel(): Promise<HostelInfo> {
  await seedIfEmpty();
  return storage.getJSON<HostelInfo>(HOSTEL_KEY) ?? seed.hostel;
}

export async function writeHostel(info: HostelInfo): Promise<void> {
  storage.setJSON(HOSTEL_KEY, info);
}

export async function resetAll(): Promise<void> {
  for (const name of collectionNames) storage.remove(name);
  storage.remove(HOSTEL_KEY);
  storage.remove(SEEDED_FLAG);
  await seedIfEmpty();
}
