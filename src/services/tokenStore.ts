import * as storage from './storage';

export function getAccessToken(): string | null {
  return storage.getJSON<string>('access_token');
}

export function getRefreshToken(): string | null {
  return storage.getJSON<string>('refresh_token');
}

export function setTokens(access: string, refresh: string): void {
  storage.setJSON('access_token', access);
  storage.setJSON('refresh_token', refresh);
}

export function clearTokens(): void {
  storage.remove('access_token');
  storage.remove('refresh_token');
}
