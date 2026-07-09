import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, PlacementApplication, PlacementOpening } from '../data/types';

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// =====================================================================================
// Openings
// =====================================================================================
type OpeningApi = {
  id: string;
  company: string;
  role: string;
  ctc: number;
  location: string;
  eligibility: string;
  last_date: string;
  logo_color: string;
  is_active: boolean;
};

function mapOpening(o: OpeningApi): PlacementOpening {
  return {
    id: o.id,
    company: o.company,
    role: o.role,
    ctc: o.ctc,
    location: o.location,
    eligibility: o.eligibility,
    lastDate: o.last_date,
    logoColor: o.logo_color,
    isActive: o.is_active,
  };
}

export const openings = {
  async list(): Promise<PlacementOpening[]> {
    return fromSource(
      () => db.read('placementOpenings'),
      async () => {
        const rows = await http.get<OpeningApi[]>('/api/v1/placements');
        return rows.map(mapOpening);
      },
    );
  },
  async create(input: Omit<PlacementOpening, 'id'>): Promise<PlacementOpening> {
    return fromSource(
      async () => {
        const row: PlacementOpening = { ...input, id: genId('place') };
        await db.upsert('placementOpenings', row);
        await logAction('create', 'Placement Opening', `Added opening "${row.role}" at ${row.company}`);
        return row;
      },
      async () => {
        const data = await http.post<OpeningApi>('/api/v1/placements-admin/', {
          company: input.company,
          role: input.role,
          ctc: input.ctc,
          location: input.location,
          eligibility: input.eligibility,
          last_date: input.lastDate,
          logo_color: input.logoColor,
          is_active: input.isActive,
        });
        const row = mapOpening(data);
        await logAction('create', 'Placement Opening', `Added opening "${row.role}" at ${row.company}`);
        return row;
      },
    );
  },
};

// =====================================================================================
// Applications
// =====================================================================================
type ApplicationApi = {
  id: string;
  opening?: string;
  company_role?: string;
  student: string;
  student_name: string;
  status: PlacementApplication['status'];
  applied_on: string;
};

function mapApplication(a: ApplicationApi): PlacementApplication {
  return {
    id: a.id,
    openingId: a.opening ?? '',
    companyRole: a.company_role ?? '',
    studentId: a.student ?? '',
    studentName: a.student_name ?? '',
    status: a.status,
    appliedOn: a.applied_on,
  };
}

export const applications = {
  async list(): Promise<PlacementApplication[]> {
    return fromSource(
      () => db.read('placementApplications'),
      async () => {
        const rows = await http.get<ApplicationApi[]>('/api/v1/placement-applications/');
        return rows.map(mapApplication);
      },
    );
  },
  async updateStatus(id: string, status: PlacementApplication['status']): Promise<PlacementApplication> {
    return fromSource(
      async () => {
        const rows = await db.read('placementApplications');
        const existing = rows.find((a) => a.id === id);
        if (!existing) throw new Error('Application not found');
        const updated = { ...existing, status };
        await db.upsert('placementApplications', updated);
        await logAction('update', 'Placement Application', `Set status of ${updated.studentName}'s application to ${status}`);
        return updated;
      },
      async () => {
        await http.patch(`/api/v1/placement-applications/${id}/`, { status });
        const rows = await this.list();
        const updated = rows.find((a) => a.id === id);
        if (!updated) throw new Error('Application not found after update');
        await logAction('update', 'Placement Application', `Set status of ${updated.studentName}'s application to ${status}`);
        return updated;
      },
    );
  },
};

// =====================================================================================
// Stats — no dedicated mock computation; the page derives simple counts from the lists.
// =====================================================================================
export function stats(): Promise<{ eligible?: number; applied?: number; placed?: number }> {
  return fromSource(
    async () => ({}),
    async () => http.get<{ eligible?: number; applied?: number; placed?: number }>('/api/v1/placements/stats').catch(() => ({})),
  );
}
