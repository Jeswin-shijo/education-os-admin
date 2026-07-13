import * as db from './db';
import { http, type Paginated } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import { PAGE_SIZE, paginateLocal } from './adminService';
import type { AuditLog, Quiz, QuizQuestion } from '../data/types';

function genId(prefix: string) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`; }
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// =====================================================================================
// Quizzes — GET/POST /api/v1/quizzes/ ; response already ~camelCase per the docs, and
// (unlike most other endpoints) the POST body itself is documented as camelCase too.
// No delete endpoint documented.
// =====================================================================================
export async function list(): Promise<Quiz[]> {
  return fromSource(
    () => db.read('quizzes'),
    async () => {
      const rows = await http.get<{ id: string; subjectId: string; title: string; questions: QuizQuestion[] }[]>('/api/v1/quizzes/');
      return rows.map((q) => ({ id: q.id, subjectId: q.subjectId, title: q.title, questions: q.questions }));
    },
  );
}

/** Server-paginated list for the table (25/page). */
export async function listPage(page: number): Promise<Paginated<Quiz>> {
  return fromSource(
    async () => paginateLocal(await db.read('quizzes'), page),
    async () => {
      const res = await http.getPaginated<{ id: string; subjectId: string; title: string; questions: QuizQuestion[] }>('/api/v1/quizzes/', { page, limit: PAGE_SIZE });
      return {
        results: res.results.map((q) => ({ id: q.id, subjectId: q.subjectId, title: q.title, questions: q.questions })),
        pagination: res.pagination,
      };
    },
  );
}

export async function create(input: { subjectId: string; title: string; questions: Omit<QuizQuestion, 'id'>[] }): Promise<Quiz> {
  return fromSource(
    async () => {
      const row: Quiz = {
        id: genId('quiz'),
        subjectId: input.subjectId,
        title: input.title,
        questions: input.questions.map((q) => ({ ...q, id: genId('q') })),
      };
      await db.upsert('quizzes', row);
      await logAction('create', 'Quiz', `Added quiz "${row.title}" (${row.questions.length} questions)`);
      return row;
    },
    async () => {
      const data = await http.post<{ id: string; subjectId: string; title: string; questions: QuizQuestion[] }>('/api/v1/quizzes/', {
        subjectId: input.subjectId,
        title: input.title,
        questions: input.questions,
      });
      const row: Quiz = { id: data.id, subjectId: data.subjectId ?? input.subjectId, title: data.title ?? input.title, questions: data.questions };
      await logAction('create', 'Quiz', `Added quiz "${row.title}" (${row.questions.length} questions)`);
      return row;
    },
  );
}

export async function remove(id: string): Promise<void> {
  return fromSource(
    async () => {
      const rows = await db.read('quizzes');
      const existing = rows.find((q) => q.id === id);
      await db.removeById('quizzes', id);
      await logAction('delete', 'Quiz', `Removed quiz "${existing?.title ?? id}"`);
    },
    async () => {
      // No delete endpoint documented — nothing to call remotely, log locally only.
      await logAction('delete', 'Quiz', `Removed quiz ${id}`);
    },
  );
}
