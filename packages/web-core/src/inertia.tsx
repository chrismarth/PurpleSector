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
    console.error('Page not found:', name, 'available keys:', Object.keys(pages));
    throw new Error(
      `Inertia page component not found: ${name} (looked for ${key})`,
    );
  }
  
  if (!page.default) {
    console.error('Page found but default export is null:', name);
    throw new Error(
      `Inertia page component has no default export: ${name}`,
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
        description: 'Something went wrong on the server. Please try again later.',
        variant: 'destructive'
      });
      return;
    }
  });

  // Handle network errors
  router.on('networkError', (event) => {
    console.error('Network Error:', event.detail);
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
      if (!App) {
        console.error('Inertia App component is null');
        return;
      }
      createRoot(el).render(
        <Layout>
          <App {...props} />
        </Layout>,
      );
    },
  });
}).catch(err => {
  console.error('Failed to initialize application:', err);
  // Fallback: render a simple error message
  const rootEl = document.getElementById('app');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui;">
        <h1>Application Error</h1>
        <p>Failed to load the Purple Sector application.</p>
        <p>Please refresh the page or contact support if the issue persists.</p>
        <details style="margin-top: 20px; text-align: left;">
          <summary>Error Details</summary>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
${err.stack || err.message || err}
          </pre>
        </details>
      </div>
    `;
  }
});
