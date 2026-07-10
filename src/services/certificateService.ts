import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, Certificate } from '../data/types';

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

type CertificateApi = {
  id: string;
  student?: string;
  student_name?: string;
  title: string;
  issuer: string;
  issued_on: string;
  kind: Certificate['kind'];
  url?: string;
};

function mapCertificate(c: CertificateApi): Certificate {
  return {
    id: c.id,
    studentId: c.student ?? '',
    studentName: c.student_name,
    title: c.title,
    issuer: c.issuer,
    issuedOn: c.issued_on,
    kind: c.kind,
    url: c.url,
  };
}

export async function list(): Promise<Certificate[]> {
  return fromSource(
    () => db.read('certificates'),
    async () => {
      // `/certificates` is the student's own list (404 for admin). Admins list via the
      // admin CRUD resource.
      const rows = await http.get<CertificateApi[]>('/api/v1/certificates-admin');
      return rows.map(mapCertificate);
    },
  );
}

export async function issue(input: Omit<Certificate, 'id'>): Promise<Certificate> {
  return fromSource(
    async () => {
      const row: Certificate = { ...input, id: genId('cert') };
      await db.upsert('certificates', row);
      await logAction('create', 'Certificate', `Issued "${row.title}" to ${row.studentName ?? row.studentId}`);
      return row;
    },
    async () => {
      const data = await http.post<CertificateApi>('/api/v1/certificates-admin/', {
        student: input.studentId,
        title: input.title,
        issuer: input.issuer,
        issued_on: input.issuedOn,
        kind: input.kind,
        url: input.url,
      });
      const row = mapCertificate(data);
      await logAction('create', 'Certificate', `Issued "${row.title}" to ${row.studentName ?? input.studentName ?? row.studentId}`);
      return row;
    },
  );
}
