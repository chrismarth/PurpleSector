import type { PluginModule } from '@purplesector/plugin-api';
import { loadServerPlugins } from '@purplesector/plugin-registry';
import { prisma } from '@purplesector/db-prisma';
// Server entry point — only imports Node.js-safe code
import agentServerPlugin from '@purplesector/plugin-agent/server';

// Import all plugin modules that have server-side registrations.
// Add new plugins here as they are created.
const allPlugins: PluginModule[] = [
  agentServerPlugin,
];

let initialized = false;

/**
 * Initialize server-side plugin registrations.
 * Safe to call multiple times — only runs once.
 */
export function initServerPlugins(): void {
  if (initialized) return;
  initialized = true;
  loadServerPlugins(allPlugins, prisma);
}
