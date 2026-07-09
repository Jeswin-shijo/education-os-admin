import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { Assignment, AuditLog } from '../data/types';

function genId(prefix: string) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`; }
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// =====================================================================================
// Assignments — GET/POST /api/v1/assignments/ ; no documented update or delete endpoint.
// =====================================================================================
export async function list(): Promise<Assignment[]> {
  return fromSource(
    () => db.read('assignments'),
    async () => {
      const rows = await http.get<
        { id: string; subject: string; subject_code?: string; subject_name?: string; title: string; description: string; due_date: string; max_marks: number; status: Assignment['status'] }[]
      >('/api/v1/assignments/');
      return rows.map((a) => ({
        id: a.id,
        subjectId: a.subject,
        subjectCode: a.subject_code,
        subjectName: a.subject_name,
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        maxMarks: a.max_marks,
        status: a.status,
      }));
    },
  );
}

export async function create(input: Omit<Assignment, 'id' | 'status'>): Promise<Assignment> {
  return fromSource(
    async () => {
      const row: Assignment = { ...input, id: genId('asg'), status: 'pending' };
      await db.upsert('assignments', row);
      await logAction('create', 'Assignment', `Added assignment "${row.title}"`);
      return row;
    },
    async () => {
      const data = await http.post<
        { id: string; subject: string; subject_code?: string; subject_name?: string; title: string; description: string; due_date: string; max_marks: number; status: Assignment['status'] }
      >('/api/v1/assignments/', {
        subject: input.subjectId,
        title: input.title,
        description: input.description,
        due_date: input.dueDate,
        max_marks: input.maxMarks,
      });
      const row: Assignment = {
        id: data.id,
        subjectId: data.subject ?? input.subjectId,
        subjectCode: data.subject_code ?? input.subjectCode,
        subjectName: data.subject_name ?? input.subjectName,
        title: data.title ?? input.title,
        description: data.description ?? input.description,
        dueDate: data.due_date ?? input.dueDate,
        maxMarks: data.max_marks ?? input.maxMarks,
        status: data.status ?? 'pending',
      };
      await logAction('create', 'Assignment', `Added assignment "${row.title}"`);
      return row;
    },
  );
}

export async function remove(id: string): Promise<void> {
  return fromSource(
    async () => {
      const rows = await db.read('assignments');
      const existing = rows.find((a) => a.id === id);
      await db.removeById('assignments', id);
      await logAction('delete', 'Assignment', `Removed assignment "${existing?.title ?? id}"`);
    },
    async () => {
      // No delete endpoint is documented for assignments — best-effort remote call that
      // silently swallows failure so the UI experience isn't broken either way.
      await http.delete(`/api/v1/assignments/${id}/`).catch(() => {});
      await db.removeById('assignments', id);
      await logAction('delete', 'Assignment', `Removed assignment ${id}`);
    },
  );
}
