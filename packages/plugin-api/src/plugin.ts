import type { LapAnalysisView } from './lapAnalysis';
import type { PluginManifest } from './types';
import type {
  AnalysisPanelType,
  AnalysisPanelProvider,
} from './analysisPanels';

export interface PluginContext {
  registerLapAnalysisView(view: LapAnalysisView): void;

  // Generic analysis panel system
  registerAnalysisPanelType(type: AnalysisPanelType): void;
  registerAnalysisPanelProvider(provider: AnalysisPanelProvider): void;
}

export interface PluginModule {
  manifest: PluginManifest;
  register: (ctx: PluginContext) => void;
}
