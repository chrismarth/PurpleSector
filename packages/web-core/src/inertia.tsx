/**
 * Inertia.js entry point for the PurpleSector React frontend.
 *
 * Django serves Inertia JSON responses; this adapter renders
 * the corresponding React page component.
 *
 * Inertia-compatible components receive data via usePage().props
 * instead of fetch()/useEffect.
 */

import { createInertiaApp, router } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import Layout from "./pages/Layout";
import { loadPlugins } from "./plugins";

// Create a global toast function that will be available to error handlers
let globalToast: ((toast: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void) | null = null;

export function setGlobalToast(toastFn: (toast: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void) {
  globalToast = toastFn;
}

// Eagerly import all page components from src/pages/
// Each file default-exports a React component.
const pages = import.meta.glob("./pages/**/*.tsx", { eager: true }) as Record<
  string,
  { default: React.ComponentType<any> }
>;

function resolvePage(name: string) {
  // Convert "Events/Detail" → "./pages/Events/Detail.tsx"
  const key = `./pages/${name}.tsx`;
  const page = pages[key];
  if (!page) {
    throw new Error(
      `Inertia page component not found: ${name} (looked for ${key})`,
    );
  }
  return page.default;
}

// Load all Django-declared plugins before React boots so every
// registration (nav tabs, panels, etc.) is in place at first render.
loadPlugins().then(() => {
  // Set up Inertia.js v3 enhanced error handling
  
  // Handle HTTP exceptions (4xx, 5xx responses)
  router.on('httpException', (event) => {
    const { response } = event.detail;
    console.error('HTTP Exception:', response.status);
    
    // Handle validation errors (422)
    if (response.status === 422) {
      // Validation errors will be handled by individual forms
      return;
    }
    
    // Handle unauthorized (401)
    if (response.status === 401) {
      globalToast?.({
        title: 'Session Expired',
        description: 'Please log in again',
        variant: 'destructive'
      });
      router.visit('/login');
      return;
    }
    
    // Handle forbidden (403)
    if (response.status === 403) {
      globalToast?.({
        title: 'Access Denied',
        description: 'You do not have permission to access this resource',
        variant: 'destructive'
      });
      return;
    }
    
    // Handle not found (404)
    if (response.status === 404) {
      globalToast?.({
        title: 'Not Found',
        description: 'The requested resource was not found',
        variant: 'destructive'
      });
      return;
    }
    
    // Handle server errors (5xx)
    if (response.status >= 500) {
      globalToast?.({
        title: 'Server Error',
        description: 'Something went wrong. Please try again later.',
        variant: 'destructive'
      });
      return;
    }
  });
  
  // Handle network errors (connection issues)
  router.on('networkError', (event) => {
    console.error('Network Error:', event.detail.error);
    globalToast?.({
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please check your internet connection.',
      variant: 'destructive'
    });
  });

  createInertiaApp({
    title: (title) => (title ? `${title} – Purple Sector` : "Purple Sector"),
    resolve: resolvePage,
    setup({ el, App, props }) {
      createRoot(el).render(
        <Layout>
          <App {...props} />
        </Layout>,
      );
    },
  });
}).catch(err => {
  console.error('Failed to load plugins:', err);
});
