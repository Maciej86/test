import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionUser } from '@app/shared';
import { api, sessionRedirect } from '../api/client';
import { announceLogout, watchLogoutInOtherTabs } from './activity';

/** Dlaczego wylogowano: po bezczynności ekran logowania pokazuje komunikat. */
export type LogoutReason = 'idle';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  refresh(): Promise<void>;
  /** Wylogowanie: serwer usuwa ciasteczko, inne karty też wracają do logowania, ta przechodzi na /login. */
  logout(reason?: LogoutReason): Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: false,
  refresh: async () => {},
  logout: async () => {},
});

/** Zalogowany użytkownik z GET /api/auth/me (moduł Logowanie). */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
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

  const logout = useCallback(async (reason?: LogoutReason) => {
    await api.post('/auth/logout').catch(() => undefined);
    announceLogout();
    // Pełne przeładowanie czyści zalogowanego i wszystkie pobrane dane.
    sessionRedirect.go(reason ? `/login?reason=${reason}` : '/login');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => watchLogoutInOtherTabs(), []);

  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  return useContext(AuthContext);
};
