/**
 * Public plugin API for app-shell consumers.
 *
 * All accessor functions are re-exported from registry.ts.
 * Plugin loading happens in loader.ts, called from inertia.tsx before
 * React boots — so all registrations are in place by first render.
 */

export {
  getLoadedPlugins,
  getAnalysisPanelTypes,
  getDefaultProviderForType,
  getGlobalPanels,
  getSettingsTabs,
  getNavTabs,
  getToolbarItems,
} from './registry';

export { loadPlugins } from './loader';
