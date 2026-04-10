'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import type { TabDescriptor } from '@purplesector/plugin-api';
import { fetchJson } from '@/lib/client-fetch';

// ── State ──

interface AppShellState {
  agentPanelOpen: boolean;
  navCollapsed: boolean;
  activeNavTab: string;
}

// ── Actions ──

type AppShellAction =
  | { type: 'TOGGLE_AGENT_PANEL' }
  | { type: 'SET_AGENT_PANEL'; open: boolean }
  | { type: 'TOGGLE_NAV' }
  | { type: 'SET_NAV_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_ACTIVE_NAV_TAB'; tabId: string };

function reducer(state: AppShellState, action: AppShellAction): AppShellState {
  switch (action.type) {
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
  toggleAgentPanel: () => void;
  setAgentPanel: (open: boolean) => void;
  toggleNav: () => void;
  setNavCollapsed: (collapsed: boolean) => void;
  setActiveNavTab: (tabId: string) => void;
}

const AppShellCtx = createContext<AppShellContextValue | null>(null);

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
  agentPanelOpen: false,
  navCollapsed: false,
  activeNavTab: 'events',
};

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    navCollapsed: loadNavCollapsed(),
  });

  // Persist navCollapsed to localStorage
  useEffect(() => {
    saveNavCollapsed(state.navCollapsed);
  }, [state.navCollapsed]);

  const openTab = useCallback(
    (tab: TabDescriptor) => {
      const type = String((tab as any)?.type || '');
      const entityId = (tab as any)?.entityId as string | undefined;
      const parentIds = ((tab as any)?.parentIds || {}) as Record<string, string>;

      // Events
      if (type === 'event-detail' && entityId) return router.push(`/event/${entityId}`);
      if (type === 'event-edit' && entityId) return router.push(`/event/${entityId}/edit`);
      if (type === 'event-new') return router.push('/event/new');

      // Sessions
      if (type === 'session-detail' && entityId) return router.push(`/session/${entityId}`);
      if (type === 'session-edit' && entityId) return router.push(`/session/${entityId}/edit`);
      if (type === 'session-new') {
        const eventId = parentIds.eventId;
        return router.push(eventId ? `/session/new?eventId=${encodeURIComponent(eventId)}` : '/session/new');
      }

      // Laps
      if (type === 'lap-detail' && entityId) {
        return router.push(`/lap/${entityId}`);
      }

      // Run plan
      if (type === 'run-plan-new' && entityId) return router.push(`/event/${entityId}/run-plan`);

      // Vehicles
      if (type === 'vehicle-detail' && entityId) return router.push(`/vehicle/${entityId}`);
      if (type === 'vehicle-edit' && entityId) return router.push(`/vehicle/${entityId}/edit`);
      if (type === 'vehicle-new') return router.push('/vehicle/new');

      if (type === 'vehicle-config-detail' && entityId && parentIds.vehicleId) {
        return router.push(`/vehicle/${parentIds.vehicleId}/configuration/${entityId}`);
      }
      if (type === 'vehicle-config-new' && parentIds.vehicleId) {
        return router.push(`/vehicle/${parentIds.vehicleId}/configuration/new`);
      }
      if (type === 'vehicle-setup-detail' && entityId && parentIds.vehicleId) {
        return router.push(`/vehicle/${parentIds.vehicleId}/setup/${entityId}`);
      }
      if (type === 'vehicle-setup-new' && parentIds.vehicleId) {
        return router.push(`/vehicle/${parentIds.vehicleId}/setup/new`);
      }
    },
    [router]
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

  const value = useMemo<AppShellContextValue>(
    () => ({
      state,
      openTab,
      toggleAgentPanel,
      setAgentPanel,
      toggleNav,
      setNavCollapsed,
      setActiveNavTab,
    }),
    [state, openTab, toggleAgentPanel, setAgentPanel, toggleNav, setNavCollapsed, setActiveNavTab]
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
export type { AppShellState };
