export type PluginCapability = 'lapAnalysisView';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  capabilities: PluginCapability[];
  entry: string;
}
