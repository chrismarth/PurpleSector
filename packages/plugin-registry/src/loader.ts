import type {
  PluginModule,
  PluginManifest,
  PluginClientContext,
  PluginServerContext,
  PluginApiRoute,
  AgentToolDefinition,
  AgentToolHandler,
  GlobalPanelRegistration,
  SettingsTabRegistration,
  LapAnalysisView,
  AnalysisPanelType,
  AnalysisPanelProvider,
} from '@purplesector/plugin-api';
import { enabledPlugins } from './plugins.config';

// ── Client-side registrations ──

const loadedManifests: PluginManifest[] = [];
const lapAnalysisViews: LapAnalysisView[] = [];
const analysisPanelTypes: AnalysisPanelType[] = [];
const analysisPanelProviders: AnalysisPanelProvider[] = [];
const globalPanels: GlobalPanelRegistration[] = [];
const settingsTabs: SettingsTabRegistration[] = [];
const agentToolDefinitions: AgentToolDefinition[] = [];

// ── Server-side registrations ──

interface RegisteredRoute {
  pluginId: string;
  route: PluginApiRoute;
}

const registeredRoutes: RegisteredRoute[] = [];
const agentToolHandlers = new Map<string, AgentToolHandler>();

let prismaInstance: unknown = null;

// ── Client context factory ──

function createClientContext(): PluginClientContext {
  return {
    registerLapAnalysisView(view: LapAnalysisView) {
      lapAnalysisViews.push(view);
    },
    registerAnalysisPanelType(type: AnalysisPanelType) {
      if (!analysisPanelTypes.find((t) => t.id === type.id)) {
        analysisPanelTypes.push(type);
      }
    },
    registerAnalysisPanelProvider(provider: AnalysisPanelProvider) {
      analysisPanelProviders.push(provider);
    },
    registerGlobalPanel(panel: GlobalPanelRegistration) {
      if (!globalPanels.find((p) => p.id === panel.id)) {
        globalPanels.push(panel);
      }
    },
    registerSettingsTab(tab: SettingsTabRegistration) {
      if (!settingsTabs.find((t) => t.id === tab.id)) {
        settingsTabs.push(tab);
      }
    },
    registerAgentTool(tool: AgentToolDefinition) {
      if (!agentToolDefinitions.find((t) => t.name === tool.name)) {
        agentToolDefinitions.push(tool);
      }
    },
  };
}

// ── Server context factory ──

function createServerContext(pluginId: string): PluginServerContext {
  return {
    registerApiRoute(route: PluginApiRoute) {
      registeredRoutes.push({ pluginId, route });
    },
    getPrisma() {
      return prismaInstance;
    },
    registerAgentToolHandler(name: string, handler: AgentToolHandler) {
      agentToolHandlers.set(name, handler);
    },
  };
}

// ── Loading ──

let clientLoaded = false;
let serverLoaded = false;

export function loadClientPlugins(plugins: PluginModule[]): void {
  if (clientLoaded) return;
  clientLoaded = true;

  const clientCtx = createClientContext();
  for (const plugin of plugins) {
    if (!enabledPlugins.includes(plugin.manifest.id)) continue;
    loadedManifests.push(plugin.manifest);
    plugin.register?.(clientCtx);
  }
}

export function loadServerPlugins(plugins: PluginModule[], prisma: unknown): void {
  if (serverLoaded) return;
  serverLoaded = true;

  prismaInstance = prisma;
  for (const plugin of plugins) {
    if (!enabledPlugins.includes(plugin.manifest.id)) continue;
    const serverCtx = createServerContext(plugin.manifest.id);
    plugin.registerServer?.(serverCtx);
  }
}

// ── Accessors ──

export function getLoadedPlugins(): PluginManifest[] {
  return loadedManifests.slice();
}

export function getLapAnalysisViews(): LapAnalysisView[] {
  return lapAnalysisViews.slice();
}

export function getAnalysisPanelTypes(): AnalysisPanelType[] {
  return analysisPanelTypes.slice();
}

export function getAnalysisPanelProviders(): AnalysisPanelProvider[] {
  return analysisPanelProviders.slice();
}

export function getProvidersForType(typeId: string): AnalysisPanelProvider[] {
  return analysisPanelProviders.filter((p) => p.typeId === typeId);
}

export function getDefaultProviderForType(typeId: string): AnalysisPanelProvider | undefined {
  const providers = getProvidersForType(typeId);
  return providers.find((p) => p.isDefault) ?? providers[0];
}

export function getGlobalPanels(): GlobalPanelRegistration[] {
  return globalPanels.slice();
}

export function getSettingsTabs(): SettingsTabRegistration[] {
  return settingsTabs.slice().sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
}

export function getAgentToolDefinitions(): AgentToolDefinition[] {
  return agentToolDefinitions.slice();
}

export function getAgentToolHandler(name: string): AgentToolHandler | undefined {
  return agentToolHandlers.get(name);
}

export function getAgentToolHandlers(): Map<string, AgentToolHandler> {
  return new Map(agentToolHandlers);
}

export function getRegisteredRoutes(): RegisteredRoute[] {
  return registeredRoutes.slice();
}

export function getEnabledPlugins(): string[] {
  return enabledPlugins.slice();
}
