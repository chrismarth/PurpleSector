/**
 * Agent Plugin — Client Entry Point
 *
 * This file is imported by the client-side plugin loader. It must NOT import
 * any server-only modules (LangGraph, Prisma, etc.) to avoid webpack errors
 * when bundling for the browser. Server-side registration lives in
 * plugin.server.ts which is imported only by the server-side loader.
 */

import * as React from 'react';
import type {
  PluginModule,
  PluginClientContext,
  PluginManifest,
} from '@purplesector/plugin-api';
import { allToolDefinitions } from './shared/tool-definitions';
import { AgentPanel } from './client/AgentPanel';
import { AgentSettingsTab } from './client/AgentSettingsTab';

function BotIcon({ className }: { className?: string }) {
  return React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
  },
    React.createElement('path', { d: 'M12 8V4H8' }),
    React.createElement('rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' }),
    React.createElement('path', { d: 'm2 14 2-2-2-2' }),
    React.createElement('path', { d: 'm22 14-2-2 2-2' }),
    React.createElement('path', { d: 'M15 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z' }),
    React.createElement('path', { d: 'M9 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z' }),
  );
}

export const manifest: PluginManifest = {
  id: 'purple-sector.agent',
  name: 'AI Agent',
  version: '0.1.0',
  description: 'Embedded AI agent that can manipulate any aspect of the application',
  capabilities: ['agentTools', 'apiRoutes', 'settingsTabs', 'globalUI'],
  entry: './src/plugin',
  tier: 'premium',
  prismaModels: './prisma/plugin.prisma',
};

const plugin: PluginModule = {
  manifest,

  register(ctx: PluginClientContext) {
    // Register agent tool definitions (metadata only, for UI display)
    for (const def of allToolDefinitions) {
      ctx.registerAgentTool(def);
    }

    // Global sidebar panel
    ctx.registerGlobalPanel({
      id: 'agent-panel',
      position: 'sidebar-right',
      icon: BotIcon,
      label: 'AI Agent',
      render: () => React.createElement(AgentPanel),
    });

    // Settings tab
    ctx.registerSettingsTab({
      id: 'agent-settings',
      label: 'AI Agent',
      icon: BotIcon,
      order: 25,
      render: () => React.createElement(AgentSettingsTab),
    });
  },

  // registerServer is NOT defined here — see plugin.server.ts
};

export default plugin;
