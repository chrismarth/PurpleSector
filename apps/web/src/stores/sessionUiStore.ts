'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SessionUiState {
  isPausedBySessionId: Record<string, boolean | undefined>;

  getIsPaused: (sessionId: string) => boolean;
  setIsPaused: (sessionId: string, isPaused: boolean) => void;

  clearSession: (sessionId: string) => void;
}

const storage =
  typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useSessionUiStore = create<SessionUiState>()(
  persist(
    (set, get) => ({
      isPausedBySessionId: {},

      getIsPaused: (sessionId) => {
        const v = get().isPausedBySessionId[sessionId];
        return v ?? false;
      },

      setIsPaused: (sessionId, isPaused) =>
        set((state) => ({
          isPausedBySessionId: { ...state.isPausedBySessionId, [sessionId]: isPaused },
        })),

      clearSession: (sessionId) =>
        set((state) => {
          const { [sessionId]: _a, ...rest } = state.isPausedBySessionId;
          return { isPausedBySessionId: rest };
        }),
    }),
    {
      name: 'ps.session-ui',
      version: 1,
      storage: storage as any,
      partialize: (state) => ({
        isPausedBySessionId: state.isPausedBySessionId,
      }),
    },
  ),
);
