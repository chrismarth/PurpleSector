export type PluginCapability =
  | 'analysisPanelType'
  | 'analysisPanelProvider'
  | 'globalPanel'
  | 'settingsTab'
  | 'navTab'
  | 'contentTab'
  | 'toolbarItem';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  capabilities: PluginCapability[];
  entry: string;
  tier?: 'free' | 'premium';
  dependencies?: string[];
}
