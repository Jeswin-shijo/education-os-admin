import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, LeaveRequest } from '../data/types';

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// Leave requests originate from students — read + approve/reject only, no create.
type LeaveApi = {
  id: string;
  student?: string;
  student_id?: string;
  student_name?: string;
  studentName?: string;
  type: LeaveRequest['type'];
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveRequest['status'];
  applied_on: string;
};

function mapLeave(l: LeaveApi): LeaveRequest {
  return {
    id: l.id,
    studentId: l.student ?? l.student_id ?? '',
    studentName: l.studentName ?? l.student_name,
    type: l.type,
    fromDate: l.from_date,
    toDate: l.to_date,
    reason: l.reason,
    status: l.status,
    appliedOn: l.applied_on,
  };
}

export async function list(): Promise<LeaveRequest[]> {
  return fromSource(
    () => db.read('leaveRequests'),
    async () => {
      const rows = await http.get<LeaveApi[]>('/api/v1/leaves');
      return rows.map(mapLeave);
    },
  );
}

export async function updateStatus(id: string, status: 'approved' | 'rejected'): Promise<LeaveRequest> {
  return fromSource(
    async () => {
      const rows = await db.read('leaveRequests');
      const existing = rows.find((l) => l.id === id);
      if (!existing) throw new Error('Leave request not found');
      const updated = { ...existing, status };
      await db.upsert('leaveRequests', updated);
      await logAction('update', 'Leave Request', `${status === 'approved' ? 'Approved' : 'Rejected'} leave for ${updated.studentName ?? updated.studentId}`);
      return updated;
    },
    async () => {
      // Note: real backend uses PUT here, not PATCH, per the documented endpoint.
      await http.put(`/api/v1/leaves/${id}`, { status });
      const rows = await list();
      const updated = rows.find((l) => l.id === id);
      if (!updated) throw new Error('Leave request not found after update');
      await logAction('update', 'Leave Request', `${status === 'approved' ? 'Approved' : 'Rejected'} leave for ${updated.studentName ?? updated.studentId}`);
      return updated;
    },
  );
}
