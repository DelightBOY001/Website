'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SessionUser } from '@/types';

interface AuthCtx {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
  isOrganizer: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const json = await res.json();
      setUser(json.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      refresh,
      logout,
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
      isStaff: ['moderator', 'admin', 'super_admin'].includes(user?.role ?? ''),
      isOrganizer: ['organizer', 'moderator', 'admin', 'super_admin'].includes(user?.role ?? ''),
    }),
    [user, loading, refresh, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
