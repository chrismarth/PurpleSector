'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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
  const [events, setEvents] = useState<NavEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/events?include=sessions.laps', { signal });
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if ((error as any)?.name !== 'AbortError') {
        console.error('NavContext: Error fetching events:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetchData(controller.signal).finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchData]);

  // Listen for agent:data-mutated to auto-refresh
  useEffect(() => {
    const handler = () => {
      fetchData();
    };
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, [fetchData]);

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const setSelectedNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      await fetchData(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }, [fetchData]);

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
