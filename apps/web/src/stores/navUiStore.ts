'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface NavUiState {
  expandedNodeIds: string[];
  selectedNodeId: string | null;

  toggleExpand: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  reset: () => void;
}

const storage =
  typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useNavUiStore = create<NavUiState>()(
  persist(
    (set, get) => ({
      expandedNodeIds: [],
      selectedNodeId: null,

      toggleExpand: (nodeId) => {
        const prev = get().expandedNodeIds;
        const next = prev.includes(nodeId)
          ? prev.filter((id) => id !== nodeId)
          : [...prev, nodeId];
        set({ expandedNodeIds: next });
      },

      setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

      reset: () => set({ expandedNodeIds: [], selectedNodeId: null }),
    }),
    {
      name: 'ps.nav-ui',
      version: 1,
      storage: storage as any,
      partialize: (state) => ({
        expandedNodeIds: state.expandedNodeIds,
        selectedNodeId: state.selectedNodeId,
      }),
    },
  ),
);
