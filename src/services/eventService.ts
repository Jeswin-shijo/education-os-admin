import * as db from './db';
import { http } from './http';
import { fromSource } from './source';
import * as authService from './authService';
import type { AuditLog, EventItem } from '../data/types';

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
async function logAction(action: AuditLog['action'], entity: string, detail: string) {
  const entry: AuditLog = { id: genId('audit'), at: new Date().toISOString(), actor: (await authService.getSession())?.name ?? 'Campus Admin', action, entity, detail };
  const rows = await db.read('auditLogs');
  await db.write('auditLogs', [entry, ...rows]);
}

export async function list(): Promise<EventItem[]> {
  return fromSource(
    () => db.read('events'),
    async () => {
      const rows = await http.get<EventItem[]>('/api/v1/events');
      return rows.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        venue: e.venue,
        category: e.category,
        description: e.description,
      }));
    },
  );
}

export async function create(input: Omit<EventItem, 'id'>): Promise<EventItem> {
  return fromSource(
    async () => {
      const row: EventItem = { ...input, id: genId('event') };
      await db.upsert('events', row);
      await logAction('create', 'Event', `Added event "${row.title}"`);
      return row;
    },
    async () => {
      const data = await http.post<EventItem>('/api/v1/events-admin/', {
        title: input.title,
        date: input.date,
        time: input.time,
        venue: input.venue,
        category: input.category,
        description: input.description,
      });
      const row: EventItem = {
        id: data.id,
        title: data.title,
        date: data.date,
        time: data.time,
        venue: data.venue,
        category: data.category,
        description: data.description,
      };
      await logAction('create', 'Event', `Added event "${row.title}"`);
      return row;
    },
  );
}

export async function remove(id: string): Promise<void> {
  return fromSource(
    async () => {
      const rows = await db.read('events');
      const existing = rows.find((e) => e.id === id);
      await db.removeById('events', id);
      await logAction('delete', 'Event', `Removed event "${existing?.title ?? id}"`);
    },
    async () => {
      const rows = await db.read('events');
      const existing = rows.find((e) => e.id === id);
      await db.removeById('events', id);
      // No delete endpoint documented for events — best-effort remote call, swallow errors.
      await http.delete(`/api/v1/events-admin/${id}/`).catch(() => {});
      await logAction('delete', 'Event', `Removed event "${existing?.title ?? id}"`);
    },
  );
}
