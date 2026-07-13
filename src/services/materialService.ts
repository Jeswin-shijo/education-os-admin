import * as db from './db';
import { http, type Paginated } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import { PAGE_SIZE, paginateLocal, dataUrlToBlob } from './adminService';
import type { AuditLog, Material } from '../data/types';

type MaterialApi = { id: string; subjectId: string; title: string; kind: Material['kind']; sizeLabel?: string; url?: string; addedAt: string };

function mapMaterial(m: MaterialApi): Material {
  return {
    id: m.id,
    subjectId: m.subjectId,
    title: m.title,
    kind: m.kind,
    sizeLabel: m.sizeLabel,
    url: m.url ?? '',
    addedAt: m.addedAt,
  };
}

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

/** Server-paginated list (optionally scoped by subject) for the table (25/page). */
export async function listPage(subjectId: string | undefined, page: number): Promise<Paginated<Material>> {
  return fromSource(
    async () => {
      const rows = await db.read('materials');
      const filtered = subjectId ? rows.filter((m) => m.subjectId === subjectId) : rows;
      return paginateLocal(filtered, page);
    },
    async () => {
      const res = await http.getPaginated<MaterialApi>('/api/v1/materials/', { subjectId, page, limit: PAGE_SIZE });
      return { results: res.results.map(mapMaterial), pagination: res.pagination };
    },
  );
}

export async function upload(input: Omit<Material, 'id' | 'addedAt'> & { fileName?: string }): Promise<Material> {
  // `fileName` is upload-only metadata (the picked file's original name) — keep it out of
  // the stored Material row.
  const { fileName, ...material } = input;
  return fromSource(
    async () => {
      const row: Material = { ...material, id: genId('mat'), addedAt: new Date().toISOString() };
      await db.upsert('materials', row);
      await logAction('create', 'Material', `Uploaded material "${row.title}"`);
      return row;
    },
    async () => {
      // POST response shape isn't fully documented — build the Material from the request
      // echo plus a fresh timestamp rather than assuming more than the request body.
      // A picked file arrives as a data URL → send it as multipart `file` (the field the
      // backend MaterialSerializer expects); a plain URL (legacy/link) goes as JSON `url`.
      // Preserve the original filename (with extension) so downloads keep their type.
      const isUpload = typeof material.url === 'string' && material.url.startsWith('data:');
      if (isUpload) {
        const form = new FormData();
        form.append('subject', material.subjectId);
        form.append('title', material.title);
        form.append('kind', material.kind);
        if (material.sizeLabel) form.append('size_label', material.sizeLabel);
        form.append('file', await dataUrlToBlob(material.url), fileName || material.title || 'material');
        await http.postForm('/api/v1/materials/', form);
      } else {
        await http.post('/api/v1/materials/', {
          subject: material.subjectId,
          title: material.title,
          kind: material.kind,
          size_label: material.sizeLabel,
          url: material.url,
        });
      }
      const row: Material = { ...material, id: genId('mat'), addedAt: new Date().toISOString() };
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
