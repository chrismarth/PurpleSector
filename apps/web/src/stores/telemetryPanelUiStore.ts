'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface TelemetryPanelUiState {
  isFullscreenByScopeKey: Record<string, boolean | undefined>;
  focusPanelIdByScopeKey: Record<string, string | null | undefined>;

  getIsFullscreen: (scopeKey: string) => boolean;
  setIsFullscreen: (scopeKey: string, isFullscreen: boolean) => void;

  getFocusPanelId: (scopeKey: string) => string | null;
  setFocusPanelId: (scopeKey: string, panelId: string | null) => void;

  clearScope: (scopeKey: string) => void;
}

const storage =
  typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useTelemetryPanelUiStore = create<TelemetryPanelUiState>()(
  persist(
    (set, get) => ({
      isFullscreenByScopeKey: {},
      focusPanelIdByScopeKey: {},

      getIsFullscreen: (scopeKey) => {
        const v = get().isFullscreenByScopeKey[scopeKey];
        return v ?? false;
      },
      setIsFullscreen: (scopeKey, isFullscreen) =>
        set((state) => ({
          isFullscreenByScopeKey: { ...state.isFullscreenByScopeKey, [scopeKey]: isFullscreen },
        })),

      getFocusPanelId: (scopeKey) => {
        const v = get().focusPanelIdByScopeKey[scopeKey];
        return v ?? null;
      },
      setFocusPanelId: (scopeKey, panelId) =>
        set((state) => ({
          focusPanelIdByScopeKey: { ...state.focusPanelIdByScopeKey, [scopeKey]: panelId },
        })),

      clearScope: (scopeKey) =>
        set((state) => {
          const { [scopeKey]: _a, ...fsRest } = state.isFullscreenByScopeKey;
          const { [scopeKey]: _b, ...focusRest } = state.focusPanelIdByScopeKey;
          return {
            isFullscreenByScopeKey: fsRest,
            focusPanelIdByScopeKey: focusRest,
          };
        }),
    }),
    {
      name: 'ps.telemetry-panel-ui',
      version: 1,
      storage: storage as any,
      partialize: (state) => ({
        isFullscreenByScopeKey: state.isFullscreenByScopeKey,
        focusPanelIdByScopeKey: state.focusPanelIdByScopeKey,
      }),
    },
  ),
);
