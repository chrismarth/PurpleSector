/**
 * Inertia page layout — equivalent to Next.js app/layout.tsx.
 *
 * Wraps all Inertia pages with the same providers and shell
 * that the Next.js layout provides.
 */

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShellRoot } from "@/components/app-shell/AppShellRoot";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
    },
  },
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShellRoot>{children}</AppShellRoot>
      </AuthProvider>
    </QueryClientProvider>
  );
}
