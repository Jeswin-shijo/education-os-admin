import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authService from '../services/authService';
import type { AdminAccount } from '../data/types';

type Status = 'loading' | 'authed' | 'guest';

type AuthContextValue = {
  admin: AdminAccount | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    authService.getSession().then((session) => {
      setAdmin(session);
      setStatus(session ? 'authed' : 'guest');
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const account = await authService.login(email, password);
    setAdmin(account);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setAdmin(null);
    setStatus('guest');
  }, []);

  return <AuthContext.Provider value={{ admin, status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
