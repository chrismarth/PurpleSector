import type { PluginModule } from '@purplesector/plugin-api';
import {
  loadClientPlugins,
  getLoadedPlugins as _getLoadedPlugins,
  getLapAnalysisViews as _getLapAnalysisViews,
  getAnalysisPanelTypes as _getAnalysisPanelTypes,
  getAnalysisPanelProviders as _getAnalysisPanelProviders,
  getProvidersForType as _getProvidersForType,
  getDefaultProviderForType as _getDefaultProviderForType,
  getGlobalPanels as _getGlobalPanels,
  getSettingsTabs as _getSettingsTabs,
  getAgentToolDefinitions as _getAgentToolDefinitions,
  getNavTabs as _getNavTabs,
  getContentTabs as _getContentTabs,
  getContentTabByType as _getContentTabByType,
  getToolbarItems as _getToolbarItems,
} from '@purplesector/plugin-registry';
import coreLapViewsPlugin from '@purplesector/plugin-core-lap-telemetry';
import agentPlugin from '@purplesector/plugin-agent';
import vehiclesPlugin from '@purplesector/plugin-vehicles';

// All available plugin modules — add new plugins here
const allPlugins: PluginModule[] = [
  coreLapViewsPlugin,
  agentPlugin,
  vehiclesPlugin,
];

// Load client-side registrations for enabled plugins
loadClientPlugins(allPlugins);

// Re-export accessors (delegates to the registry)
export const getLoadedPlugins = _getLoadedPlugins;
export const getLapAnalysisViews = _getLapAnalysisViews;
export const getAnalysisPanelTypes = _getAnalysisPanelTypes;
export const getAnalysisPanelProviders = _getAnalysisPanelProviders;
export const getProvidersForType = _getProvidersForType;
export const getDefaultProviderForType = _getDefaultProviderForType;
export const getGlobalPanels = _getGlobalPanels;
export const getSettingsTabs = _getSettingsTabs;
export const getAgentToolDefinitions = _getAgentToolDefinitions;
export const getNavTabs = _getNavTabs;
export const getContentTabs = _getContentTabs;
export const getContentTabByType = _getContentTabByType;
export const getToolbarItems = _getToolbarItems;
