import type { LapAnalysisView } from './lapAnalysis';
import type { PluginManifest } from './types';

export interface PluginContext {
  registerLapAnalysisView(view: LapAnalysisView): void;
}

export interface PluginModule {
  manifest: PluginManifest;
  register: (ctx: PluginContext) => void;
}
