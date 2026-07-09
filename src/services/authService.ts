import * as storage from './storage';
import * as tokenStore from './tokenStore';
import { http, ApiError } from './http';
import { fromSource } from './source';
import { adminAccounts } from '../data/seed';
import type { AdminAccount } from '../data/types';

const SESSION_KEY = 'session-admin';
// Matches the seeded demo password in the Django backend (core/management/commands/seed_demo.py)
// so this mock login stays truthful once wired to the real API.
const DEMO_PASSWORD = 'campus123';

const AVATAR_PALETTE = ['#13327F', '#7C3AED', '#0D9488', '#EA8A00', '#DB2777', '#0EA5E9'];

function colorFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockLogin(email: string, password: string): Promise<AdminAccount> {
  await delay(400);
  const account = adminAccounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || password !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password');
  }
  storage.setJSON(SESSION_KEY, account);
  return account;
}

async function realLogin(email: string, password: string): Promise<AdminAccount> {
  const data = await http.post<{
    user: { id: string; name: string; role: string };
    access_token: string;
    refresh_token: string;
    active_role: string;
  }>('/api/v1/auth/login', { email, password }, { auth: false });

  if (!['admin', 'super_admin', 'superadmin'].includes(data.user.role)) {
    throw new ApiError('This account does not have admin access.');
  }

  tokenStore.setTokens(data.access_token, data.refresh_token);
  const account: AdminAccount = {
    id: data.user.id,
    name: data.user.name,
    email,
    role: data.user.role,
    avatarColor: colorFor(data.user.id),
  };
  storage.setJSON(SESSION_KEY, account);
  return account;
}

export async function login(email: string, password: string): Promise<AdminAccount> {
  return fromSource(() => mockLogin(email, password), () => realLogin(email, password));
}

export async function logout(): Promise<void> {
  return fromSource(
    async () => {
      storage.remove(SESSION_KEY);
    },
    async () => {
      const refresh = tokenStore.getRefreshToken();
      storage.remove(SESSION_KEY);
      tokenStore.clearTokens();
      if (refresh) {
        await http.post('/api/v1/auth/logout', { refresh }, { auth: false }).catch(() => {
          // best-effort — token is already cleared locally either way
        });
      }
    },
  );
}

export async function getSession(): Promise<AdminAccount | null> {
  return fromSource(
    async () => storage.getJSON<AdminAccount>(SESSION_KEY),
    async () => {
      const account = storage.getJSON<AdminAccount>(SESSION_KEY);
      const hasToken = !!tokenStore.getAccessToken();
      return account && hasToken ? account : null;
    },
  );
}
