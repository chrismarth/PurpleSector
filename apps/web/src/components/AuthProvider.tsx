'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

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
  const queryClient = useQueryClient();

  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    const data = await fetchJson<{ user: AuthUser | null }>('/api/auth/me', {
      unauthorized: { kind: 'return_fallback' },
      fallback: { user: null },
    });
    return data.user ?? null;
  }, []);

  const meQuery = useQuery({
    queryKey: queryKeys.authMe,
    queryFn: fetchMe,
    staleTime: 30_000,
  });

  const user = meQuery.data ?? null;
  const loading = meQuery.isLoading;

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.authMe });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await mutationJson('/api/auth/logout', {
        method: 'POST',
        unauthorized: { kind: 'return_fallback' },
        fallback: undefined,
      });
    } finally {
      queryClient.setQueryData(queryKeys.authMe, null);
      queryClient.removeQueries({ queryKey: queryKeys.navEvents });
      router.replace('/login');
      router.refresh();
    }
  }, [queryClient, router]);

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
