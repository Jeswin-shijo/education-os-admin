import * as storage from './storage';
import { adminAccounts } from '../data/seed';
import type { AdminAccount } from '../data/types';

const SESSION_KEY = 'session-admin-id';
// Matches the seeded demo password in the Django backend (core/management/commands/seed_demo.py)
// so this mock login stays truthful once wired to the real API.
const DEMO_PASSWORD = 'campus123';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function login(email: string, password: string): Promise<AdminAccount> {
  await delay(400);
  const account = adminAccounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (!account || password !== DEMO_PASSWORD) {
    throw new Error('Invalid email or password');
  }
  storage.setJSON(SESSION_KEY, account.id);
  return account;
}

export async function logout(): Promise<void> {
  storage.remove(SESSION_KEY);
}

export async function getSession(): Promise<AdminAccount | null> {
  const id = storage.getJSON<string>(SESSION_KEY);
  if (!id) return null;
  return adminAccounts.find((a) => a.id === id) ?? null;
}
