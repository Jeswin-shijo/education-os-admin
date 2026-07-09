import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, Exam, ExamResult } from '../data/types';

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function logAction(action: AuditLog['action'], entity: string, detail: string): Promise<void> {
  const entry: AuditLog = {
    id: genId('audit'),
    at: new Date().toISOString(),
    actor: (await authService.getSession())?.name ?? 'Campus Admin',
    action,
    entity,
    detail,
  };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// =====================================================================================
// Exams
// =====================================================================================
type ExamApi = {
  id: string;
  subject: string;
  subject_code?: string;
  subject_name?: string;
  name: string;
  date: string;
  time: string;
  room: string;
  duration_mins: number;
  type: Exam['type'];
};

function mapExam(e: ExamApi): Exam {
  return {
    id: e.id,
    subjectId: e.subject,
    subjectCode: e.subject_code,
    subjectName: e.subject_name,
    name: e.name,
    date: e.date,
    time: e.time,
    room: e.room,
    durationMins: e.duration_mins,
    type: e.type,
  };
}

export const exams = {
  async list(): Promise<Exam[]> {
    return fromSource(
      () => db.read('exams'),
      async () => {
        const rows = await http.get<ExamApi[]>('/api/v1/exams/');
        return rows.map(mapExam);
      },
    );
  },
  async upcoming(): Promise<Exam[]> {
    return fromSource(
      async () => {
        const rows = await db.read('exams');
        const today = new Date().toISOString().slice(0, 10);
        return rows.filter((e) => e.date >= today);
      },
      async () => {
        const rows = await http.get<ExamApi[]>('/api/v1/exams/upcoming/');
        return rows.map(mapExam);
      },
    );
  },
  async create(input: Omit<Exam, 'id'>): Promise<Exam> {
    return fromSource(
      async () => {
        const row: Exam = { ...input, id: genId('exam') };
        await db.upsert('exams', row);
        await logAction('create', 'Exam', `Added exam "${row.name}"`);
        return row;
      },
      async () => {
        const data = await http.post<ExamApi>('/api/v1/exams/', {
          subject: input.subjectId,
          name: input.name,
          date: input.date,
          time: input.time,
          room: input.room,
          duration_mins: input.durationMins,
          type: input.type,
        });
        const row = mapExam(data);
        await logAction('create', 'Exam', `Added exam "${row.name}"`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<Exam, 'id'>>): Promise<Exam> {
    return fromSource(
      async () => {
        const rows = await db.read('exams');
        const existing = rows.find((e) => e.id === id);
        if (!existing) throw new Error('Exam not found');
        const updated = { ...existing, ...patch };
        await db.upsert('exams', updated);
        await logAction('update', 'Exam', `Updated exam "${updated.name}"`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/exams/${id}/`, {
          ...(patch.subjectId && { subject: patch.subjectId }),
          ...(patch.name && { name: patch.name }),
          ...(patch.date && { date: patch.date }),
          ...(patch.time && { time: patch.time }),
          ...(patch.room && { room: patch.room }),
          ...(patch.durationMins !== undefined && { duration_mins: patch.durationMins }),
          ...(patch.type && { type: patch.type }),
        });
        const rows = await this.list();
        const updated = rows.find((e) => e.id === id);
        if (!updated) throw new Error('Exam not found after update');
        await logAction('update', 'Exam', `Updated exam "${updated.name}"`);
        return updated;
      },
    );
  },
  async remove(id: string): Promise<void> {
    return fromSource(
      async () => {
        const rows = await db.read('exams');
        const existing = rows.find((e) => e.id === id);
        await db.removeById('exams', id);
        await logAction('delete', 'Exam', `Removed exam "${existing?.name ?? id}"`);
      },
      async () => {
        await http.delete(`/api/v1/exams/${id}/`);
        await logAction('delete', 'Exam', `Removed exam ${id}`);
      },
    );
  },
};

// =====================================================================================
// Results
// =====================================================================================
type ExamResultApi = {
  id: string;
  student: string;
  student_name?: string;
  subject: string;
  subject_name?: string;
  exam_ref?: string;
  exam: string;
  marks: number;
  max_marks: number;
  grade: string;
  grade_point: number;
  credits: number;
};

function mapResult(r: ExamResultApi): ExamResult {
  return {
    id: r.id,
    studentId: r.student,
    studentName: r.student_name,
    subjectId: r.subject,
    subjectName: r.subject_name,
    examRef: r.exam_ref,
    exam: r.exam,
    marks: r.marks,
    maxMarks: r.max_marks,
    grade: r.grade,
    gradePoint: r.grade_point,
    credits: r.credits,
  };
}

export const results = {
  async list(): Promise<ExamResult[]> {
    return fromSource(
      () => db.read('examResults'),
      async () => {
        const rows = await http.get<ExamResultApi[]>('/api/v1/results/');
        return rows.map(mapResult);
      },
    );
  },
  async create(input: Omit<ExamResult, 'id'>): Promise<ExamResult> {
    return fromSource(
      async () => {
        const row: ExamResult = { ...input, id: genId('result') };
        await db.upsert('examResults', row);
        await logAction('create', 'Exam Result', `Added result for ${row.studentName ?? row.studentId} in ${row.subjectName ?? row.subjectId}`);
        return row;
      },
      async () => {
        const data = await http.post<ExamResultApi>('/api/v1/results/', {
          student: input.studentId,
          subject: input.subjectId,
          exam_ref: input.examRef,
          exam: input.exam,
          marks: input.marks,
          max_marks: input.maxMarks,
          grade: input.grade,
          grade_point: input.gradePoint,
          credits: input.credits,
        });
        const row = mapResult(data);
        await logAction('create', 'Exam Result', `Added result for ${row.studentName ?? row.studentId} in ${row.subjectName ?? row.subjectId}`);
        return row;
      },
    );
  },
  async update(id: string, patch: Partial<Omit<ExamResult, 'id'>>): Promise<ExamResult> {
    return fromSource(
      async () => {
        const rows = await db.read('examResults');
        const existing = rows.find((r) => r.id === id);
        if (!existing) throw new Error('Result not found');
        const updated = { ...existing, ...patch };
        await db.upsert('examResults', updated);
        await logAction('update', 'Exam Result', `Updated result for ${updated.studentName ?? updated.studentId}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/results/${id}/`, {
          ...(patch.studentId && { student: patch.studentId }),
          ...(patch.subjectId && { subject: patch.subjectId }),
          ...(patch.examRef && { exam_ref: patch.examRef }),
          ...(patch.exam && { exam: patch.exam }),
          ...(patch.marks !== undefined && { marks: patch.marks }),
          ...(patch.maxMarks !== undefined && { max_marks: patch.maxMarks }),
          ...(patch.grade && { grade: patch.grade }),
          ...(patch.gradePoint !== undefined && { grade_point: patch.gradePoint }),
          ...(patch.credits !== undefined && { credits: patch.credits }),
        });
        const rows = await this.list();
        const updated = rows.find((r) => r.id === id);
        if (!updated) throw new Error('Result not found after update');
        await logAction('update', 'Exam Result', `Updated result for ${updated.studentName ?? updated.studentId}`);
        return updated;
      },
    );
  },
};
