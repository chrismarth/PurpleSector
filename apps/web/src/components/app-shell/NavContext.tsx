'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useNavUiStore } from '@/stores/navUiStore';
import { fetchJson } from '@/lib/client-fetch';

// ── Types ──

export interface NavEvent {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  sessions: NavSession[];
}

export interface NavSession {
  id: string;
  name: string;
  source: string;
  status: string;
  tags: string | null;
  createdAt: string;
  laps: NavLap[];
}

export interface NavLap {
  id: string;
  lapNumber: number;
  lapTime: number | null;
}

interface NavContextValue {
  events: NavEvent[];
  loading: boolean;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  toggleExpand: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  refresh: () => Promise<void>;
}

const NavCtx = createContext<NavContextValue | null>(null);

// ── Provider ──

export function NavProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const expandedNodeIds = useNavUiStore((s) => s.expandedNodeIds);
  const selectedNodeId = useNavUiStore((s) => s.selectedNodeId);
  const toggleExpand = useNavUiStore((s) => s.toggleExpand);
  const setSelectedNode = useNavUiStore((s) => s.setSelectedNode);

  const expandedNodes = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);

  const fetchNavEventsTree = useCallback(async (): Promise<NavEvent[]> => {
    return fetchJson<NavEvent[]>('/api/events?include=sessions.laps', {
      unauthorized: { kind: 'return_fallback' },
      fallback: [],
    });
  }, []);

  const navQuery = useQuery({
    queryKey: queryKeys.navEventsTree,
    queryFn: fetchNavEventsTree,
    staleTime: 15_000,
  });

  const events = navQuery.data ?? [];
  const loading = navQuery.isLoading;

  // Listen for agent:data-mutated to auto-refresh
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.navEventsTree });
    };
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.navEventsTree });
  }, [queryClient]);

  const value = useMemo<NavContextValue>(
    () => ({
      events,
      loading,
      expandedNodes,
      selectedNodeId,
      toggleExpand,
      setSelectedNode,
      refresh,
    }),
    // note: expandedNodes changes when expandedNodeIds changes
    [events, loading, expandedNodes, selectedNodeId, toggleExpand, setSelectedNode, refresh]
  );

  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavCtx);
  if (!ctx) {
    throw new Error('useNav must be used within NavProvider');
  }
  return ctx;
}
