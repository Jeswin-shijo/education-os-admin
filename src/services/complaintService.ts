import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, Complaint } from '../data/types';

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// Complaints originate from students — this service is read + status-update only, no create.
type ComplaintApi = {
  id: string;
  student?: string;
  student_id?: string;
  student_name?: string;
  studentName?: string;
  user_name?: string;
  userName?: string;
  category: string;
  subject: string;
  description: string;
  status: Complaint['status'];
  created_on?: string;
  createdOn?: string;
};
// `/complaints/monitor` returns { total, byStatus, complaints: [...] } (camelCase rows).
type MonitorResponse = { complaints?: ComplaintApi[] } | ComplaintApi[];

function mapComplaint(c: ComplaintApi): Complaint {
  return {
    id: c.id,
    studentId: c.student ?? c.student_id,
    studentName: c.studentName ?? c.student_name ?? c.userName ?? c.user_name,
    category: c.category,
    subject: c.subject,
    description: c.description,
    status: c.status,
    createdOn: c.createdOn ?? c.created_on ?? '',
  };
}

export async function list(): Promise<Complaint[]> {
  return fromSource(
    () => db.read('complaints'),
    async () => {
      const res = await http.get<MonitorResponse>('/api/v1/complaints/monitor');
      const rows = Array.isArray(res) ? res : res.complaints ?? [];
      return rows.map(mapComplaint);
    },
  );
}

export async function updateStatus(id: string, status: Complaint['status']): Promise<Complaint> {
  return fromSource(
    async () => {
      const rows = await db.read('complaints');
      const existing = rows.find((c) => c.id === id);
      if (!existing) throw new Error('Complaint not found');
      const updated = { ...existing, status };
      await db.upsert('complaints', updated);
      await logAction('update', 'Complaint', `Set status of "${updated.subject}" to ${status}`);
      return updated;
    },
    async () => {
      await http.patch(`/api/v1/complaints/${id}/`, { status });
      const rows = await list();
      const updated = rows.find((c) => c.id === id);
      if (!updated) throw new Error('Complaint not found after update');
      await logAction('update', 'Complaint', `Set status of "${updated.subject}" to ${status}`);
      return updated;
    },
  );
}
