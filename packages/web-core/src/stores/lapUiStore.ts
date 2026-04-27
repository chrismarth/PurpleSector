

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface LapUiState {
  compareLapIdByLapId: Record<string, string | null | undefined>;
  referenceLapIdByLapId: Record<string, string | null | undefined>;
  useAutoReferenceByLapId: Record<string, boolean | undefined>;

  getCompareLapId: (lapId: string) => string | null;
  setCompareLapId: (lapId: string, compareLapId: string | null) => void;

  getReferenceLapId: (lapId: string) => string | null;
  setReferenceLapId: (lapId: string, referenceLapId: string | null) => void;

  getUseAutoReference: (lapId: string) => boolean;
  setUseAutoReference: (lapId: string, useAuto: boolean) => void;

  clearLap: (lapId: string) => void;
}

const storage =
  typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useLapUiStore = create<LapUiState>()(
  persist(
    (set, get) => ({
      compareLapIdByLapId: {},
      referenceLapIdByLapId: {},
      useAutoReferenceByLapId: {},

      getCompareLapId: (lapId) => {
        const v = get().compareLapIdByLapId[lapId];
        return v ?? null;
      },
      setCompareLapId: (lapId, compareLapId) =>
        set((state) => ({
          compareLapIdByLapId: { ...state.compareLapIdByLapId, [lapId]: compareLapId },
        })),

      getReferenceLapId: (lapId) => {
        const v = get().referenceLapIdByLapId[lapId];
        return v ?? null;
      },
      setReferenceLapId: (lapId, referenceLapId) =>
        set((state) => ({
          referenceLapIdByLapId: { ...state.referenceLapIdByLapId, [lapId]: referenceLapId },
        })),

      getUseAutoReference: (lapId) => {
        const v = get().useAutoReferenceByLapId[lapId];
        return v ?? true;
      },
      setUseAutoReference: (lapId, useAuto) =>
        set((state) => ({
          useAutoReferenceByLapId: { ...state.useAutoReferenceByLapId, [lapId]: useAuto },
        })),

      clearLap: (lapId) =>
        set((state) => {
          const { [lapId]: _a, ...compareRest } = state.compareLapIdByLapId;
          const { [lapId]: _b, ...refRest } = state.referenceLapIdByLapId;
          const { [lapId]: _c, ...autoRest } = state.useAutoReferenceByLapId;
          return {
            compareLapIdByLapId: compareRest,
            referenceLapIdByLapId: refRest,
            useAutoReferenceByLapId: autoRest,
          };
        }),
    }),
    {
      name: 'ps.lap-ui',
      version: 1,
      storage: storage as any,
      partialize: (state) => ({
        compareLapIdByLapId: state.compareLapIdByLapId,
        referenceLapIdByLapId: state.referenceLapIdByLapId,
        useAutoReferenceByLapId: state.useAutoReferenceByLapId,
      }),
    },
  ),
);
