import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AppShell } from './AppShell';

/** Routes that bypass the auth gate and render children directly. */
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password'];

/**
 * Root client boundary for the AppShell.
 * Gates on authentication — redirects to /login if not signed in.
 * Public routes (login, register, etc.) render children directly.
 *
 * Note: Client-side auth redirects are intentionally NOT implemented here.
 * Django's LoginRequiredMiddleware handles redirects server-side, which is
 * more reliable than trying to use Inertia router before it's initialized.
 */
export function AppShellRoot({ children }: { children?: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = window.location.pathname;

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

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
    // Unauthenticated on protected route — server should redirect to login.
    // Show spinner while server-side redirect is in progress.
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
