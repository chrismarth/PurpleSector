import type { LapAnalysisView } from './lapAnalysis';
import type { PluginManifest } from './types';
import type { AnalysisPanelType, AnalysisPanelProvider } from './analysisPanels';
import type { GlobalPanelRegistration, SettingsTabRegistration, NavTabRegistration, ContentTabRegistration, ToolbarItemRegistration } from './globalUI';
import type { AgentToolDefinition } from './agentTools';
import type { PluginServerContext } from './serverPlugin';
export interface PluginClientContext {
    registerLapAnalysisView(view: LapAnalysisView): void;
    registerAnalysisPanelType(type: AnalysisPanelType): void;
    registerAnalysisPanelProvider(provider: AnalysisPanelProvider): void;
    registerGlobalPanel(panel: GlobalPanelRegistration): void;
    registerSettingsTab(tab: SettingsTabRegistration): void;
    registerAgentTool(tool: AgentToolDefinition): void;
    registerNavTab(tab: NavTabRegistration): void;
    registerContentTab(tab: ContentTabRegistration): void;
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
//# sourceMappingURL=plugin.d.ts.map