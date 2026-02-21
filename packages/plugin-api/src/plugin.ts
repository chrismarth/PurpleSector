import type { LapAnalysisView } from './lapAnalysis';
import type { PluginManifest } from './types';
import type {
  AnalysisPanelType,
  AnalysisPanelProvider,
} from './analysisPanels';
import type {
  GlobalPanelRegistration,
  SettingsTabRegistration,
  NavTabRegistration,
  ContentTabRegistration,
  ToolbarItemRegistration,
} from './globalUI';
import type { AgentToolDefinition } from './agentTools';
import type { PluginServerContext } from './serverPlugin';

export interface PluginClientContext {
  registerLapAnalysisView(view: LapAnalysisView): void;

  // Generic analysis panel system
  registerAnalysisPanelType(type: AnalysisPanelType): void;
  registerAnalysisPanelProvider(provider: AnalysisPanelProvider): void;

  // Global UI slots
  registerGlobalPanel(panel: GlobalPanelRegistration): void;

  // Settings tabs
  registerSettingsTab(tab: SettingsTabRegistration): void;

  // Agent tool definitions (client-side metadata only)
  registerAgentTool(tool: AgentToolDefinition): void;

  // App Shell: Navigation pane tabs
  registerNavTab(tab: NavTabRegistration): void;

  // App Shell: Content pane tab types
  registerContentTab(tab: ContentTabRegistration): void;

  // App Shell: Toolbar items
  registerToolbarItem(item: ToolbarItemRegistration): void;
}

/**
 * @deprecated Use PluginClientContext instead. Kept for backward compatibility.
 */
export type PluginContext = PluginClientContext;

export interface PluginModule {
  manifest: PluginManifest;
  register?: (ctx: PluginClientContext) => void;
  registerServer?: (ctx: PluginServerContext) => void;
}
