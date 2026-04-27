/**
 * Inertia compatibility layer for Next.js hooks.
 *
 * During migration, components still import from next/navigation.
 * This module provides drop-in replacements that work with Inertia's
 * usePage().props for route params and router.visit() for navigation.
 *
 * Usage:  Import-swap "next/navigation" → "@/lib/inertia-compat"
 *   or — set up path aliases so existing imports resolve here.
 *
 * For now, pages in src/pages/ use this explicitly.
 */

import { usePage, Link, router } from "@inertiajs/react";

/**
 * Drop-in for next/link <Link href="...">
 * @inertiajs/react Link accepts href + children — same API as next/link.
 */
export { Link };

/**
 * Drop-in for next/navigation useParams().
 * Inertia passes route params as page props from the Django view.
 */
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const { props } = usePage<T & Record<string, unknown>>();
  return props as unknown as T;
}

/**
 * Drop-in for next/navigation useRouter().
 * Safe to call from components inside the Inertia App.
 */
export function useRouter() {
  return {
    push(url: string) {
      router.visit(url);
    },
    replace(url: string) {
      router.visit(url, { replace: true });
    },
    back() {
      window.history.back();
    },
    refresh() {
      router.reload();
    },
  };
}

/**
 * Drop-in for next/navigation useSearchParams().
 */
export function useSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return params;
}
