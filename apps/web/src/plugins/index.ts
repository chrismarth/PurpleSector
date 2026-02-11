import type {
  PluginContext,
  PluginModule,
  PluginManifest,
  LapAnalysisView,
  AnalysisPanelType,
  AnalysisPanelProvider,
} from '@purplesector/plugin-api';
import coreLapViewsPlugin from '@purplesector/plugin-core-lap-telemetry';

const loadedManifests: PluginManifest[] = [];
const lapAnalysisViews: LapAnalysisView[] = [];
const analysisPanelTypes: AnalysisPanelType[] = [];
const analysisPanelProviders: AnalysisPanelProvider[] = [];

const pluginContext: PluginContext = {
  registerLapAnalysisView(view: LapAnalysisView) {
    lapAnalysisViews.push(view);
  },

  registerAnalysisPanelType(type: AnalysisPanelType) {
    // Avoid duplicate ids if multiple plugins try to register the same type
    if (!analysisPanelTypes.find((t) => t.id === type.id)) {
      analysisPanelTypes.push(type);
    }
  },

  registerAnalysisPanelProvider(provider: AnalysisPanelProvider) {
    analysisPanelProviders.push(provider);
  },
};

function loadPlugin(module: PluginModule) {
  loadedManifests.push(module.manifest);
  module.register(pluginContext);
}

// Register built-in plugins here
[coreLapViewsPlugin].forEach(loadPlugin);

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

export function getLoadedPlugins(): PluginManifest[] {
  return loadedManifests.slice();
}
