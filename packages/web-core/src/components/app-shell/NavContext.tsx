import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useNavUiStore } from '@/stores/navUiStore';
import { fetchJson } from '@/lib/client-fetch';
import { useAuth } from '@/components/AuthProvider';
import { decodeMessage } from '@/lib/telemetry-proto-browser';
import { useLiveLapIndexStore } from '@/stores/liveLapIndexStore';
import type { EventSummary, SessionSummary, LapSummary } from '@/types/core';

// ── Context value ──

interface NavContextValue {
  events: EventSummary[];
  loading: boolean;
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  toggleExpand: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  refresh: () => Promise<void>;
  // Lazy-loaded children keyed by parent id
  sessionsByEventId: Record<string, SessionSummary[] | undefined>;
  lapsBySessionId: Record<string, LapSummary[] | undefined>;
  sessionsLoading: Record<string, boolean>;
  lapsLoading: Record<string, boolean>;
}

const NavCtx = createContext<NavContextValue | null>(null);

// ── Provider ──

export function NavProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const observeFrameLapNumber = useLiveLapIndexStore((s) => s.observeFrameLapNumber);
  const setDbLapSummaries = useLiveLapIndexStore((s) => s.setDbLapSummaries);

  const wsBySessionIdRef = useRef<Record<string, WebSocket | undefined>>({});
  const backfilledSessionIdsRef = useRef<Set<string>>(new Set());

  const expandedNodeIds = useNavUiStore((s) => s.expandedNodeIds);
  const selectedNodeId = useNavUiStore((s) => s.selectedNodeId);
  const toggleExpand = useNavUiStore((s) => s.toggleExpand);
  const setSelectedNode = useNavUiStore((s) => s.setSelectedNode);

  const expandedNodes = useMemo(() => new Set(expandedNodeIds), [expandedNodeIds]);
  const expandNode = useNavUiStore((s) => s.expandNode);

  const pathname = window.location.pathname;

  // ── Level 1: Load EventSummary[] ──
  const eventsQuery = useQuery({
    queryKey: queryKeys.navEvents,
    queryFn: async (): Promise<EventSummary[]> => {
      return fetchJson<EventSummary[]>('/api/events', {
        unauthorized: { kind: 'return_fallback' },
        fallback: [],
      });
    },
    staleTime: 15_000,
  });

  const events = eventsQuery.data ?? [];
  const loading = eventsQuery.isLoading;

  useEffect(() => {
    setSessionsByEventId({});
    setLapsBySessionId({});
  }, [eventsQuery.dataUpdatedAt]);

  // ── Level 2: Load SessionSummary[] per expanded event ──
  const expandedEventIds = useMemo(
    () => events.filter((e) => expandedNodes.has(`event:${e.id}`)).map((e) => e.id),
    [events, expandedNodes],
  );

  const sessionQueriesMap = useRef<Record<string, boolean>>({});
  const [sessionsByEventId, setSessionsByEventId] = React.useState<Record<string, SessionSummary[] | undefined>>({});
  const [sessionsLoading, setSessionsLoading] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    for (const eventId of expandedEventIds) {
      if (sessionsByEventId[eventId] !== undefined || sessionQueriesMap.current[eventId]) continue;
      sessionQueriesMap.current[eventId] = true;
      setSessionsLoading((prev) => ({ ...prev, [eventId]: true }));
      fetchJson<SessionSummary[]>(`/api/sessions?eventId=${eventId}`, {
        unauthorized: { kind: 'return_fallback' },
        fallback: [],
      })
        .then((sessions) => {
          setSessionsByEventId((prev) => ({ ...prev, [eventId]: sessions }));
          setSessionsLoading((prev) => ({ ...prev, [eventId]: false }));
          delete sessionQueriesMap.current[eventId];
        })
        .catch(() => {
          setSessionsLoading((prev) => ({ ...prev, [eventId]: false }));
          delete sessionQueriesMap.current[eventId];
        });
    }
  }, [expandedEventIds, sessionsByEventId]);

  // ── Level 3: Load LapSummary[] per expanded session ──
  const expandedSessionIds = useMemo(() => {
    const ids: string[] = [];
    for (const sessions of Object.values(sessionsByEventId)) {
      if (!sessions) continue;
      for (const s of sessions) {
        if (expandedNodes.has(`session:${s.id}`)) ids.push(s.id);
      }
    }
    return ids;
  }, [sessionsByEventId, expandedNodes]);

  const lapQueriesMap = useRef<Record<string, boolean>>({});
  const [lapsBySessionId, setLapsBySessionId] = React.useState<Record<string, LapSummary[] | undefined>>({});
  const [lapsLoading, setLapsLoading] = React.useState<Record<string, boolean>>({});

  // ── Sync selected nav node from URL ──
  // Parses /event/:id, /session/:id, /lap/:id and updates selectedNodeId.
  // Also fetches parent entity to get eventId so we can expand ancestors
  // and trigger the lazy-loading chain even on fresh page load.
  useEffect(() => {
    const eventMatch = pathname.match(/^\/event\/([^/]+)/);
    const sessionMatch = pathname.match(/^\/session\/([^/]+)/);
    const lapMatch = pathname.match(/^\/lap\/([^/]+)/);

    if (eventMatch) {
      const id = eventMatch[1];
      setSelectedNode(`event:${id}`);
      expandNode(`event:${id}`);
    } else if (sessionMatch) {
      const sessionId = sessionMatch[1];
      setSelectedNode(`session:${sessionId}`);
      expandNode(`session:${sessionId}`);
      // Try in-memory first, then fetch to get eventId
      let foundEventId: string | undefined;
      for (const [eventId, sessions] of Object.entries(sessionsByEventId)) {
        if (sessions?.some((s) => s.id === sessionId)) {
          foundEventId = eventId;
          break;
        }
      }
      if (foundEventId) {
        expandNode(`event:${foundEventId}`);
      } else {
        fetchJson<{ eventId: string }>(`/api/sessions/${sessionId}`, {
          unauthorized: { kind: 'return_fallback' },
          fallback: { eventId: '' },
        }).then((res) => {
          if (res.eventId) expandNode(`event:${res.eventId}`);
        }).catch(() => { /* ignore */ });
      }
    } else if (lapMatch) {
      const lapId = lapMatch[1];
      setSelectedNode(`lap:${lapId}`);
      // Try in-memory first, then fetch to get sessionId + eventId
      let foundSessionId: string | undefined;
      for (const [sessionId, laps] of Object.entries(lapsBySessionId)) {
        if (laps?.some((l) => l.id === lapId)) {
          foundSessionId = sessionId;
          break;
        }
      }
      if (foundSessionId) {
        expandNode(`session:${foundSessionId}`);
        for (const [eventId, sessions] of Object.entries(sessionsByEventId)) {
          if (sessions?.some((s) => s.id === foundSessionId)) {
            expandNode(`event:${eventId}`);
            break;
          }
        }
      } else {
        fetchJson<{ sessionId: string; session?: { eventId: string } }>(`/api/laps/${lapId}`, {
          unauthorized: { kind: 'return_fallback' },
          fallback: { sessionId: '' },
        }).then((res) => {
          if (res.sessionId) expandNode(`session:${res.sessionId}`);
          if (res.session?.eventId) expandNode(`event:${res.session.eventId}`);
        }).catch(() => { /* ignore */ });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Expand ancestors when lazy data loads ──
  // On initial load sessionsByEventId/lapsBySessionId are empty when the URL
  // effect runs. Re-run ancestor expansion whenever data arrives.
  useEffect(() => {
    const sessionMatch = pathname.match(/^\/session\/([^/]+)/);
    const lapMatch = pathname.match(/^\/lap\/([^/]+)/);

    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      for (const [eventId, sessions] of Object.entries(sessionsByEventId)) {
        if (sessions?.some((s) => s.id === sessionId)) {
          expandNode(`event:${eventId}`);
          break;
        }
      }
    } else if (lapMatch) {
      const lapId = lapMatch[1];
      for (const [sessionId, laps] of Object.entries(lapsBySessionId)) {
        if (laps?.some((l) => l.id === lapId)) {
          expandNode(`session:${sessionId}`);
          for (const [eventId, sessions] of Object.entries(sessionsByEventId)) {
            if (sessions?.some((s) => s.id === sessionId)) {
              expandNode(`event:${eventId}`);
              break;
            }
          }
          break;
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsByEventId, lapsBySessionId]);

  useEffect(() => {
    for (const sessionId of expandedSessionIds) {
      if (lapsBySessionId[sessionId] !== undefined || lapQueriesMap.current[sessionId]) continue;
      lapQueriesMap.current[sessionId] = true;
      setLapsLoading((prev) => ({ ...prev, [sessionId]: true }));
      fetchJson<{ laps: LapSummary[] }>(`/api/laps?sessionId=${sessionId}`, {
        unauthorized: { kind: 'return_fallback' },
        fallback: { laps: [] },
      })
        .then((res) => {
          setLapsBySessionId((prev) => ({ ...prev, [sessionId]: res.laps ?? [] }));
          setLapsLoading((prev) => ({ ...prev, [sessionId]: false }));
          delete lapQueriesMap.current[sessionId];
        })
        .catch(() => {
          setLapsLoading((prev) => ({ ...prev, [sessionId]: false }));
          delete lapQueriesMap.current[sessionId];
        });
    }
  }, [expandedSessionIds, lapsBySessionId]);

  // ── WebSocket connections for live sessions ──
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    const liveSessionIds = new Set<string>();
    for (const sessions of Object.values(sessionsByEventId)) {
      if (!sessions) continue;
      for (const s of sessions) {
        const isLive = s.status === 'live' || s.status === 'recording' || s.status === 'active';
        if (isLive) liveSessionIds.add(s.id);
      }
    }

    for (const sessionId of liveSessionIds) {
      if (!backfilledSessionIdsRef.current.has(sessionId)) {
        backfilledSessionIdsRef.current.add(sessionId);
        fetchJson<{ laps: { lapNumber: number; lapTime?: number | null }[] }>(`/api/laps?sessionId=${sessionId}`, {
          unauthorized: { kind: 'return_fallback' },
          fallback: { laps: [] },
        })
          .then((res) => {
            setDbLapSummaries(sessionId, res.laps ?? []);
          })
          .catch(() => {
            // ignore
          });
      }

      if (!wsBySessionIdRef.current[sessionId]) {
        const ws = new WebSocket(`ws://localhost:8080?userId=${userId}&sessionId=${sessionId}`);
        ws.binaryType = 'arraybuffer';

        ws.onmessage = (event) => {
          if (!(event.data instanceof ArrayBuffer)) return;
          try {
            const decoded = decodeMessage(event.data);
            if (decoded.type !== 'telemetry' || !decoded.data) return;
            const lapNumber = decoded.data.lapNumber;
            if (typeof lapNumber !== 'number') return;
            observeFrameLapNumber(sessionId, lapNumber);
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (wsBySessionIdRef.current[sessionId] === ws) {
            delete wsBySessionIdRef.current[sessionId];
          }
        };

        ws.onerror = () => {
          // ignore
        };

        wsBySessionIdRef.current[sessionId] = ws;
      }
    }

    for (const [sessionId, ws] of Object.entries(wsBySessionIdRef.current)) {
      if (!liveSessionIds.has(sessionId) && ws) {
        ws.close();
        delete wsBySessionIdRef.current[sessionId];
      }
    }
  }, [sessionsByEventId, observeFrameLapNumber, setDbLapSummaries, user?.id]);

  // Listen for agent:data-mutated to auto-refresh
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
      // Clear cached children so they reload on next expand
      setSessionsByEventId({});
      setLapsBySessionId({});
    };
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, [queryClient]);

  useEffect(() => {
    return () => {
      for (const ws of Object.values(wsBySessionIdRef.current)) {
        ws?.close();
      }
      wsBySessionIdRef.current = {};
      backfilledSessionIdsRef.current = new Set();
    };
  }, []);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
    // Clear cached children so they reload on next expand
    setSessionsByEventId({});
    setLapsBySessionId({});
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
      sessionsByEventId,
      lapsBySessionId,
      sessionsLoading,
      lapsLoading,
    }),
    [events, loading, expandedNodes, selectedNodeId, toggleExpand, setSelectedNode, refresh, sessionsByEventId, lapsBySessionId, sessionsLoading, lapsLoading]
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
