import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionUser } from '@app/shared';
import { api } from '../api/client';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthState>({ user: null, loading: false, refresh: async () => {} });

/** Zalogowany użytkownik z GET /api/auth/me (adres powstaje w module Logowanie; do tego czasu nikt nie jest zalogowany). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get<{ user: SessionUser }>('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ user, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
