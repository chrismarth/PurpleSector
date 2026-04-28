/**
 * Plugin loader — Django-driven dynamic plugin loading.
 *
 * Reads the plugin manifest list that Django injected into the Inertia
 * shared props (window.__inertia_page.props.plugins), then for each
 * enabled plugin dynamically imports its JS entry chunk and calls
 * register(ctx).
 *
 * This runs once, before createInertiaApp, so all plugins are registered
 * synchronously by the time React renders the first component.
 *
 * In development Vite serves modules directly; in production Django serves
 * the hashed chunks from dist/.  Either way the browser resolves the same
 * logical path declared in the plugin's `entry` field.
 */

import type { PluginModule } from '@purplesector/plugin-api';
import { ctx, loadedManifests } from './registry';

interface ServerPluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  capabilities: string[];
  entry: string;         // e.g. "plugins/agent/index.js"
  tier: string;
  dependencies: string[];
  enabled: boolean;
}

/**
 * Pre-built map of plugin entry names → Vite-generated chunk URLs.
 *
 * import.meta.glob with { eager: false } tells Vite to emit these as
 * separate async chunks at build time, giving us stable URLs we can
 * use for the dynamic import() call in loadPlugins().
 *
 * The keys must match the `entry` field values declared in each
 * plugin's Django manifest (without the leading "plugins/" prefix that
 * Vite strips from the logical name).
 */
const PLUGIN_CHUNK_MAP: Record<string, () => Promise<unknown>> = import.meta.glob(
  '../../../*/src/index.ts',
  { eager: false },
);

/**
 * Resolve a dynamic import factory for a plugin entry path.
 *
 * In dev mode Vite resolves the module from its own dev server.
 * In production we use the pre-built chunk map that Vite statically
 * analysed at build time — this gives us the hashed output URL.
 *
 * Entry format from Django: "plugins/agent/index.js"
 * Glob key format:          "../../../plugin-agent/src/index.ts"
 */
function resolvePluginImport(entry: string): (() => Promise<unknown>) | null {
  // Map "plugins/agent/index.js" → "plugin-agent"
  const match = entry.match(/^plugins\/([^/]+)\/index/);
  if (!match) {
    console.warn(`[PluginLoader] Invalid entry format: ${entry}`);
    return null;
  }
  const slug = match[1]; // e.g. "agent", "vehicles", "core-lap-telemetry"
  const key = `../../../plugin-${slug}/src/index.ts`;
  return PLUGIN_CHUNK_MAP[key] ?? null;
}

/**
 * Read the plugin manifest list that Django injected via Inertia shared props.
 * Inertia v3 stores the initial page data in a <script data-page="app" type="application/json">
 * tag rendered by Django's Inertia template.
 * Falls back to an empty list so the app still boots if props are missing.
 */
function getServerManifests(): ServerPluginManifest[] {
  try {
    // Inertia v3 format: <script data-page="app" type="application/json">
    const scriptEl = document.querySelector('script[data-page="app"][type="application/json"]');
    const raw = scriptEl?.textContent;
    if (!raw) return [];
    const page = JSON.parse(raw);
    return (page?.props?.plugins as ServerPluginManifest[]) ?? [];
  } catch {
    return [];
  }
}

let _loaded = false;

/**
 * Load all plugins declared in the Django manifest.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function loadPlugins(): Promise<void> {
  if (_loaded) return;
  _loaded = true;

  const manifests = getServerManifests();

  if (manifests.length === 0) {
    console.warn('[PluginLoader] No plugins in Inertia shared props — check Django InertiaShareMiddleware.');
    return;
  }

  const results = await Promise.allSettled(
    manifests.map(async (serverManifest) => {
      const importer = resolvePluginImport(serverManifest.entry);

      if (!importer) {
        console.warn(`[PluginLoader] No chunk registered for entry "${serverManifest.entry}" — skipping plugin "${serverManifest.id}".`);
        return;
      }

      try {
        const mod = await importer() as { default?: PluginModule } & Partial<PluginModule>;
        const plugin: PluginModule | undefined = mod.default ?? (mod as any);

        if (!plugin?.manifest) {
          console.warn(`[PluginLoader] Plugin "${serverManifest.id}" has no manifest export — skipping.`);
          return;
        }

        loadedManifests.push(plugin.manifest);
        plugin.register?.(ctx);
        console.debug(`[PluginLoader] Loaded plugin: ${plugin.manifest.id}`);
      } catch (err) {
        console.error(`[PluginLoader] Failed to load plugin "${serverManifest.id}":`, err);
      }
    }),
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[PluginLoader] ${failed.length} plugin(s) failed to load.`);
  }
}
