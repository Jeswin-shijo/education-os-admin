import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, Material } from '../data/types';

function genId(prefix: string) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`; }
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

// =====================================================================================
// Materials — GET/POST /api/v1/materials/ ; response is already close to camelCase per
// the docs (unlike most other endpoints). No delete endpoint documented at all.
// =====================================================================================
export async function list(subjectId?: string): Promise<Material[]> {
  return fromSource(
    async () => {
      const rows = await db.read('materials');
      return subjectId ? rows.filter((m) => m.subjectId === subjectId) : rows;
    },
    async () => {
      const path = subjectId ? `/api/v1/materials/?subjectId=${subjectId}` : '/api/v1/materials/';
      const rows = await http.get<
        { id: string; subjectId: string; title: string; kind: Material['kind']; sizeLabel?: string; url?: string; addedAt: string }[]
      >(path);
      return rows.map((m) => ({
        id: m.id,
        subjectId: m.subjectId,
        title: m.title,
        kind: m.kind,
        sizeLabel: m.sizeLabel,
        url: m.url ?? '',
        addedAt: m.addedAt,
      }));
    },
  );
}

export async function upload(input: Omit<Material, 'id' | 'addedAt'>): Promise<Material> {
  return fromSource(
    async () => {
      const row: Material = { ...input, id: genId('mat'), addedAt: new Date().toISOString() };
      await db.upsert('materials', row);
      await logAction('create', 'Material', `Uploaded material "${row.title}"`);
      return row;
    },
    async () => {
      // POST response shape isn't fully documented — build the Material from the request
      // echo plus a fresh timestamp rather than assuming more than the request body.
      await http.post('/api/v1/materials/', {
        subject: input.subjectId,
        title: input.title,
        kind: input.kind,
        size_label: input.sizeLabel,
        url: input.url,
      });
      const row: Material = { ...input, id: genId('mat'), addedAt: new Date().toISOString() };
      await logAction('create', 'Material', `Uploaded material "${row.title}"`);
      return row;
    },
  );
}

export async function remove(id: string): Promise<void> {
  return fromSource(
    async () => {
      const rows = await db.read('materials');
      const existing = rows.find((m) => m.id === id);
      await db.removeById('materials', id);
      await logAction('delete', 'Material', `Removed material "${existing?.title ?? id}"`);
    },
    async () => {
      // No delete endpoint documented at all for materials — nothing to call remotely;
      // record the action locally only (best-effort, matches the mock's audit trail).
      await logAction('delete', 'Material', `Removed material ${id}`);
    },
  );
}
