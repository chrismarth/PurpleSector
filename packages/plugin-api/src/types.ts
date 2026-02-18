export type PluginCapability =
  | 'lapAnalysisView'
  | 'analysisPanels'
  | 'agentTools'
  | 'apiRoutes'
  | 'settingsTabs'
  | 'globalUI';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  capabilities: PluginCapability[];
  entry: string;
  tier?: 'free' | 'premium';
  prismaModels?: string;
  dependencies?: string[];
}
