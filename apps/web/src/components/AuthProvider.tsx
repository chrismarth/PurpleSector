'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AuthUserRole = 'ORG_ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  username: string;
  role: AuthUserRole;
  fullName: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Internal fetch that throws on failure so the retry loop can catch.
  const fetchMe = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch('/api/auth/me', { cache: 'no-store', signal });
    if (!res.ok) {
      setUser(null);
      return;
    }
    const data = (await res.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  // Safe wrapper for external callers (login page, user menu, etc.)
  const refresh = useCallback(async () => {
    try {
      await fetchMe();
    } catch {
      setUser(null);
    }
  }, [fetchMe]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let activeController: AbortController | null = null;

    const AUTH_TIMEOUT_MS = 5000;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000;

    (async () => {
      setLoading(true);
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (cancelled) return;
        const controller = new AbortController();
        activeController = controller;
        const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
        try {
          await fetchMe(controller.signal);
          clearTimeout(timer);
          break; // success
        } catch {
          clearTimeout(timer);
          if (cancelled) return;
          // On final attempt, ensure user is null so the app redirects to login
          if (attempt === MAX_RETRIES) {
            setUser(null);
          } else {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          }
        }
      }
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      activeController?.abort();
    };
  }, [fetchMe]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
