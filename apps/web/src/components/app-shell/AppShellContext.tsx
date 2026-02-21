'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { TabDescriptor } from '@purplesector/plugin-api';

// ── State ──

interface AppShellState {
  tabs: TabDescriptor[];
  activeTabId: string | null;
  agentPanelOpen: boolean;
  navCollapsed: boolean;
  activeNavTab: string;
}

// ── Actions ──

type AppShellAction =
  | { type: 'OPEN_TAB'; tab: TabDescriptor }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string }
  | { type: 'UPDATE_TAB'; tabId: string; updates: Partial<Pick<TabDescriptor, 'label' | 'breadcrumbs'>> }
  | { type: 'TOGGLE_AGENT_PANEL' }
  | { type: 'SET_AGENT_PANEL'; open: boolean }
  | { type: 'TOGGLE_NAV' }
  | { type: 'SET_NAV_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_ACTIVE_NAV_TAB'; tabId: string };

function reducer(state: AppShellState, action: AppShellAction): AppShellState {
  switch (action.type) {
    case 'OPEN_TAB': {
      // Deduplicate by type + entityId
      const existing = state.tabs.find(
        (t) => t.type === action.tab.type && t.entityId === action.tab.entityId
      );
      if (existing) {
        return { ...state, activeTabId: existing.id };
      }
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };
    }
    case 'CLOSE_TAB': {
      const idx = state.tabs.findIndex((t) => t.id === action.tabId);
      if (idx === -1) return state;
      const newTabs = state.tabs.filter((t) => t.id !== action.tabId);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === action.tabId) {
        // Activate the next tab, or previous, or null
        if (newTabs.length === 0) {
          newActiveId = null;
        } else if (idx < newTabs.length) {
          newActiveId = newTabs[idx].id;
        } else {
          newActiveId = newTabs[newTabs.length - 1].id;
        }
      }
      return { ...state, tabs: newTabs, activeTabId: newActiveId };
    }
    case 'SET_ACTIVE_TAB': {
      if (!state.tabs.find((t) => t.id === action.tabId)) return state;
      return { ...state, activeTabId: action.tabId };
    }
    case 'UPDATE_TAB': {
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, ...action.updates } : t
        ),
      };
    }
    case 'TOGGLE_AGENT_PANEL':
      return { ...state, agentPanelOpen: !state.agentPanelOpen };
    case 'SET_AGENT_PANEL':
      return { ...state, agentPanelOpen: action.open };
    case 'TOGGLE_NAV':
      return { ...state, navCollapsed: !state.navCollapsed };
    case 'SET_NAV_COLLAPSED':
      return { ...state, navCollapsed: action.collapsed };
    case 'SET_ACTIVE_NAV_TAB': {
      // If clicking the already-active tab while expanded, collapse
      if (state.activeNavTab === action.tabId && !state.navCollapsed) {
        return { ...state, navCollapsed: true };
      }
      // If collapsed, expand and switch
      return { ...state, activeNavTab: action.tabId, navCollapsed: false };
    }
    default:
      return state;
  }
}

// ── Context value ──

interface AppShellContextValue {
  state: AppShellState;
  openTab: (tab: TabDescriptor) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<Pick<TabDescriptor, 'label' | 'breadcrumbs'>>) => void;
  toggleAgentPanel: () => void;
  setAgentPanel: (open: boolean) => void;
  toggleNav: () => void;
  setNavCollapsed: (collapsed: boolean) => void;
  setActiveNavTab: (tabId: string) => void;
}

const AppShellCtx = createContext<AppShellContextValue | null>(null);

// ── Deep linking helpers ──

function serializeTabToUrl(tab: TabDescriptor | undefined): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!tab) {
    url.searchParams.delete('tab');
    url.searchParams.delete('id');
    url.searchParams.delete('p');
  } else {
    url.searchParams.set('tab', tab.type);
    if (tab.entityId) {
      url.searchParams.set('id', tab.entityId);
    } else {
      url.searchParams.delete('id');
    }
    if (tab.parentIds && Object.keys(tab.parentIds).length > 0) {
      url.searchParams.set('p', JSON.stringify(tab.parentIds));
    } else {
      url.searchParams.delete('p');
    }
  }
  window.history.replaceState({}, '', url.toString());
}

function deserializeTabFromUrl(): { type: string; entityId?: string; parentIds?: Record<string, string> } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const type = params.get('tab');
  if (!type) return null;
  const entityId = params.get('id') || undefined;
  let parentIds: Record<string, string> | undefined;
  const pStr = params.get('p');
  if (pStr) {
    try {
      parentIds = JSON.parse(pStr);
    } catch {
      // ignore malformed
    }
  }
  return { type, entityId, parentIds };
}

// ── localStorage helpers ──

const NAV_COLLAPSED_KEY = 'ps:navCollapsed';

function loadNavCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveNavCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NAV_COLLAPSED_KEY, String(collapsed));
  } catch {
    // ignore
  }
}

// ── Provider ──

const initialState: AppShellState = {
  tabs: [],
  activeTabId: null,
  agentPanelOpen: false,
  navCollapsed: false,
  activeNavTab: 'events',
};

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    navCollapsed: loadNavCollapsed(),
  });

  // Persist navCollapsed to localStorage
  useEffect(() => {
    saveNavCollapsed(state.navCollapsed);
  }, [state.navCollapsed]);

  // Sync active tab to URL
  useEffect(() => {
    const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
    serializeTabToUrl(activeTab);
  }, [state.activeTabId, state.tabs]);

  const openTab = useCallback((tab: TabDescriptor) => {
    dispatch({ type: 'OPEN_TAB', tab });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: 'CLOSE_TAB', tabId });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  }, []);

  const updateTab = useCallback(
    (tabId: string, updates: Partial<Pick<TabDescriptor, 'label' | 'breadcrumbs'>>) => {
      dispatch({ type: 'UPDATE_TAB', tabId, updates });
    },
    []
  );

  const toggleAgentPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_AGENT_PANEL' });
  }, []);

  const setAgentPanel = useCallback((open: boolean) => {
    dispatch({ type: 'SET_AGENT_PANEL', open });
  }, []);

  const toggleNav = useCallback(() => {
    dispatch({ type: 'TOGGLE_NAV' });
  }, []);

  const setNavCollapsed = useCallback((collapsed: boolean) => {
    dispatch({ type: 'SET_NAV_COLLAPSED', collapsed });
  }, []);

  const setActiveNavTab = useCallback((tabId: string) => {
    dispatch({ type: 'SET_ACTIVE_NAV_TAB', tabId });
  }, []);

  // Listen for appshell:openTab custom events (used by plugin nav trees)
  useEffect(() => {
    function handleOpenTab(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        openTab(detail as TabDescriptor);
      }
    }
    window.addEventListener('appshell:openTab', handleOpenTab);
    return () => window.removeEventListener('appshell:openTab', handleOpenTab);
  }, [openTab]);

  // Restore tab from URL on initial mount
  useEffect(() => {
    const urlTab = deserializeTabFromUrl();
    if (urlTab) {
      const tabId = urlTab.entityId
        ? `${urlTab.type}:${urlTab.entityId}`
        : `${urlTab.type}:${Date.now()}`;
      openTab({
        id: tabId,
        type: urlTab.type,
        label: urlTab.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        breadcrumbs: [urlTab.type.replace(/-/g, ' ')],
        entityId: urlTab.entityId,
        parentIds: urlTab.parentIds,
        closable: true,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AppShellContextValue>(
    () => ({
      state,
      openTab,
      closeTab,
      setActiveTab,
      updateTab,
      toggleAgentPanel,
      setAgentPanel,
      toggleNav,
      setNavCollapsed,
      setActiveNavTab,
    }),
    [state, openTab, closeTab, setActiveTab, updateTab, toggleAgentPanel, setAgentPanel, toggleNav, setNavCollapsed, setActiveNavTab]
  );

  return <AppShellCtx.Provider value={value}>{children}</AppShellCtx.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellCtx);
  if (!ctx) {
    throw new Error('useAppShell must be used within AppShellProvider');
  }
  return ctx;
}

export { deserializeTabFromUrl };
export type { AppShellState };
