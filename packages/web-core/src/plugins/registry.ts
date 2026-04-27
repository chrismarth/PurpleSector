/**
 * Plugin registration store.
 *
 * Holds all in-memory registrations collected when plugin modules call
 * register(ctx).  Consumers read from the typed accessor functions below;
 * they never touch the raw arrays directly.
 */

import type {
  PluginManifest,
  PluginClientContext,
  AnalysisPanelType,
  AnalysisPanelProvider,
  GlobalPanelRegistration,
  SettingsTabRegistration,
  NavTabRegistration,
  ToolbarItemRegistration,
} from '@purplesector/plugin-api';

// ── Registration stores ──────────────────────────────────────────────────────

export const loadedManifests: PluginManifest[] = [];
export const analysisPanelTypes: AnalysisPanelType[] = [];
export const analysisPanelProviders: AnalysisPanelProvider[] = [];
export const globalPanels: GlobalPanelRegistration[] = [];
export const settingsTabs: SettingsTabRegistration[] = [];
export const navTabs: NavTabRegistration[] = [];
export const toolbarItems: ToolbarItemRegistration[] = [];

// ── PluginClientContext ──────────────────────────────────────────────────────

export const ctx: PluginClientContext = {
  registerAnalysisPanelType(type) {
    if (!analysisPanelTypes.find((t) => t.id === type.id)) analysisPanelTypes.push(type);
  },
  registerAnalysisPanelProvider(provider) {
    analysisPanelProviders.push(provider);
  },
  registerGlobalPanel(panel) {
    if (!globalPanels.find((p) => p.id === panel.id)) globalPanels.push(panel);
  },
  registerSettingsTab(tab) {
    if (!settingsTabs.find((t) => t.id === tab.id)) settingsTabs.push(tab);
  },
  registerAgentTool() { /* metadata only */ },
  registerNavTab(tab) {
    if (!navTabs.find((t) => t.id === tab.id)) navTabs.push(tab);
  },
  registerContentTab() { /* routing handled by AppShellContext */ },
  registerToolbarItem(item) {
    if (!toolbarItems.find((t) => t.id === item.id)) toolbarItems.push(item);
  },
};

// ── Accessors ────────────────────────────────────────────────────────────────

export function getLoadedPlugins(): PluginManifest[] {
  return loadedManifests;
}

export function getAnalysisPanelTypes(): AnalysisPanelType[] {
  return analysisPanelTypes;
}

export function getDefaultProviderForType(typeId: string): AnalysisPanelProvider | undefined {
  const providers = analysisPanelProviders.filter((p) => p.typeId === typeId);
  return providers.find((p) => p.isDefault) ?? providers[0];
}

export function getGlobalPanels(): GlobalPanelRegistration[] {
  return globalPanels;
}

export function getSettingsTabs(): SettingsTabRegistration[] {
  return settingsTabs.slice().sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
}

export function getNavTabs(): NavTabRegistration[] {
  return navTabs.slice().sort((a, b) => a.order - b.order);
}

export function getToolbarItems(): ToolbarItemRegistration[] {
  return toolbarItems.slice().sort((a, b) => a.order - b.order);
}
