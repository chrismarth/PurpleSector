import type { PluginContext, PluginModule, LapAnalysisView } from '@purplesector/plugin-api';
import coreLapViewsPlugin from '@purplesector/plugin-core-lap-telemetry';

const lapAnalysisViews: LapAnalysisView[] = [];

const pluginContext: PluginContext = {
  registerLapAnalysisView(view: LapAnalysisView) {
    lapAnalysisViews.push(view);
  },
};

function loadPlugin(module: PluginModule) {
  module.register(pluginContext);
}

// Register built-in plugins here
[coreLapViewsPlugin].forEach(loadPlugin);

export function getLapAnalysisViews(): LapAnalysisView[] {
  return lapAnalysisViews.slice();
}
