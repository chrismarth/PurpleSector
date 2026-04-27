

import { create } from 'zustand';

export interface SessionLapSummary {
  lapNumber: number;
  lapTime?: number | null;
}

interface LiveLapStateForSession {
  currentLapNumber: number | null;
  completedLapNumbers: number[];
  dbLapSummaries: SessionLapSummary[] | null;
  lastDbSyncAtMs: number | null;
}

interface LiveLapIndexState {
  bySessionId: Record<string, LiveLapStateForSession | undefined>;

  getSessionState: (sessionId: string) => LiveLapStateForSession;

  setDbLapSummaries: (sessionId: string, laps: SessionLapSummary[]) => void;
  observeFrameLapNumber: (sessionId: string, lapNumber: number) => void;

  clearSession: (sessionId: string) => void;
}

function uniqSorted(nums: number[]): number[] {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

export const useLiveLapIndexStore = create<LiveLapIndexState>()((set, get) => ({
  bySessionId: {},

  getSessionState: (sessionId) => {
    return (
      get().bySessionId[sessionId] ?? {
        currentLapNumber: null,
        completedLapNumbers: [],
        dbLapSummaries: null,
        lastDbSyncAtMs: null,
      }
    );
  },

  setDbLapSummaries: (sessionId, laps) => {
    set((state) => {
      const prev = state.bySessionId[sessionId];
      const dbLapNumbers = uniqSorted(laps.map((l) => l.lapNumber));

      const currentLapNumber = prev?.currentLapNumber ?? null;
      const completedFromDb =
        currentLapNumber != null
          ? dbLapNumbers.filter((n) => n !== currentLapNumber)
          : dbLapNumbers;

      const mergedCompleted = uniqSorted([
        ...(prev?.completedLapNumbers ?? []),
        ...completedFromDb,
      ]);

      return {
        bySessionId: {
          ...state.bySessionId,
          [sessionId]: {
            currentLapNumber,
            completedLapNumbers: mergedCompleted,
            dbLapSummaries: laps,
            lastDbSyncAtMs: Date.now(),
          },
        },
      };
    });
  },

  observeFrameLapNumber: (sessionId, lapNumber) => {
    set((state) => {
      const prev = state.bySessionId[sessionId] ?? {
        currentLapNumber: null,
        completedLapNumbers: [],
        dbLapSummaries: null,
        lastDbSyncAtMs: null,
      };

      // Hot-path short-circuit: if the lap number hasn't changed, return the
      // same state reference so no subscribers re-render.
      if (prev.currentLapNumber === lapNumber) {
        return state;
      }

      const prevCurrent = prev.currentLapNumber;

      // When the current lap advances, we can consider the previous current lap "completed".
      const nextCompleted =
        prevCurrent != null && lapNumber > prevCurrent
          ? uniqSorted([...prev.completedLapNumbers, prevCurrent])
          : prev.completedLapNumbers;

      // Also ensure we never list current lap in completed.
      const completedWithoutCurrent = nextCompleted.filter((n) => n !== lapNumber);

      return {
        bySessionId: {
          ...state.bySessionId,
          [sessionId]: {
            ...prev,
            currentLapNumber: lapNumber,
            completedLapNumbers: completedWithoutCurrent,
          },
        },
      };
    });
  },

  clearSession: (sessionId) => {
    set((state) => {
      const { [sessionId]: _removed, ...rest } = state.bySessionId;
      return { bySessionId: rest };
    });
  },
}));
