'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { AppShell } from './AppShell';

/** Routes that bypass the auth gate and render children directly. */
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

/**
 * Root client boundary for the AppShell.
 * Gates on authentication — redirects to /login if not signed in.
 * Public routes (login, register, etc.) render children directly.
 */
export function AppShellRoot({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!isPublicRoute && !loading && !user) {
      const next = encodeURIComponent(pathname + window.location.search);
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, router, pathname, isPublicRoute]);

  // Public routes render children directly (no AppShell wrapper)
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect is pending in the useEffect above — show spinner instead of blank.
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
