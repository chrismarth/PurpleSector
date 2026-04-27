/**
 * Inertia.js entry point for the PurpleSector React frontend.
 *
 * Django serves Inertia JSON responses; this adapter renders
 * the corresponding React page component.
 *
 * Inertia-compatible components receive data via usePage().props
 * instead of fetch()/useEffect.
 */

import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import Layout from "./pages/Layout";
import { loadPlugins } from "./plugins";

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
