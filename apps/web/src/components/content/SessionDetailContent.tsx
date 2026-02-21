'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Pause, Play, Archive, Clock, Flag, Tag, Plus, X, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { TelemetryFrame } from '@/types/telemetry';
import { formatLapTime } from '@/lib/utils';
import { decodeMessage, createStartDemoMessage, createStopDemoMessage, createPingMessage } from '@/lib/telemetry-proto-browser';
import type { AnalysisLayoutJSON } from '@/lib/analysisLayout';
import { DEFAULT_ANALYSIS_LAYOUT } from '@/lib/analysisLayout';
import { useAuth } from '@/components/AuthProvider';
import { TelemetryDataPanel } from '@/components/TelemetryDataPanel';
import { useAppShell } from '@/components/app-shell/AppShellContext';
import { useNav } from '@/components/app-shell/NavContext';

const SESSION_TAGS = [
  'Testing', 'Practice', 'Qualifying', 'Race',
  'Setup Development', 'Baseline', 'Wet Weather', 'Dry Weather',
];

interface Session {
  id: string;
  eventId: string;
  name: string;
  source: string;
  status: string;
  started: boolean;
  tags: string | null;
  laps: Lap[];
  event?: { name: string };
}

interface Lap {
  id: string;
  lapNumber: number;
  lapTime: number | null;
  analyzed: boolean;
  tags?: string | null;
  driverComments?: string | null;
}

interface SessionDetailContentProps {
  entityId: string;
}

export default function SessionDetailContent({ entityId }: SessionDetailContentProps) {
  const sessionId = entityId;
  const { user } = useAuth();
  const { openTab, closeTab } = useAppShell();
  const { refresh: refreshNav, setSelectedNode, expandedNodes, toggleExpand } = useNav();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLapFrames, setCurrentLapFrames] = useState<TelemetryFrame[]>([]);
  const [currentLapNumber, setCurrentLapNumber] = useState(1);
  const [wsConnected, setWsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [sessionTags, setSessionTags] = useState<string[]>([]);
  const [customSessionTag, setCustomSessionTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [sessionAlreadyOpen, setSessionAlreadyOpen] = useState(false);
  const [analysisLayoutId, setAnalysisLayoutId] = useState<string | null>(null);
  const [analysisLayout, setAnalysisLayout] = useState<AnalysisLayoutJSON | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentLapFramesRef = useRef<TelemetryFrame[]>([]);
  const currentLapNumberRef = useRef(1);
  const lastUpdateTimeRef = useRef(0);
  const savingLapRef = useRef(false);
  const isPausedRef = useRef(false);
  const isMountedRef = useRef(true);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTagsRef = useRef<string>('[]');
  const lastLapTimeRef = useRef(0);
  const seenLapBoundaryRef = useRef(false);

  useEffect(() => {
    currentLapFramesRef.current = [];
    setCurrentLapFrames([]);
    currentLapNumberRef.current = 1;
    setCurrentLapNumber(1);
    lastLapTimeRef.current = 0;
    lastUpdateTimeRef.current = 0;
    seenLapBoundaryRef.current = false;

    const sessionLockKey = `session-${sessionId}-lock`;
    const existingLock = localStorage.getItem(sessionLockKey);

    if (existingLock) {
      const lockTime = parseInt(existingLock);
      const now = Date.now();
      if (now - lockTime < 5000) {
        setSessionAlreadyOpen(true);
        setLoading(false);
        return;
      }
    }

    localStorage.setItem(sessionLockKey, Date.now().toString());
    const lockInterval = setInterval(() => {
      localStorage.setItem(sessionLockKey, Date.now().toString());
    }, 2000);

    fetchSession();

    return () => {
      clearInterval(lockInterval);
      localStorage.removeItem(sessionLockKey);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    if (session && session.status === 'active' && session.started && !wsRef.current) {
      isPausedRef.current = isPaused;
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
    };
  }, [session?.status, session?.started]);

  async function fetchSession() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        console.error('Session not found');
        setLoading(false);
        return;
      }
      const data = await response.json();
      setSession(data);
      const nextLapNumber = (data.laps?.length || 0) + 1;
      setCurrentLapNumber(nextLapNumber);
      if (data.tags) {
        const newTags = JSON.parse(data.tags);
        setSessionTags(newTags);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const loadLayout = async () => {
      const contextKey = `session:${sessionId}`;
      try {
        const response = await fetch(`/api/analysis-layouts?context=${encodeURIComponent(contextKey)}`, { signal: controller.signal });
        if (response.ok) {
          const layouts = await response.json();
          if (Array.isArray(layouts) && layouts.length > 0) {
            const layoutRecord = layouts.find((l: any) => l.isDefault) ?? layouts[0];
            try {
              const parsed: AnalysisLayoutJSON = JSON.parse(layoutRecord.layout);
              const hasAnyType = parsed.panels.some((p) => !!p.typeId);
              const nextLayout = hasAnyType ? parsed : { ...parsed, panels: parsed.panels.map((p, idx) => idx === 0 ? { ...p, typeId: 'plot' } : p) };
              setAnalysisLayoutId(layoutRecord.id);
              setAnalysisLayout(nextLayout);
              return;
            } catch (e) { console.error('Failed to parse layout:', e); }
          }
        }
      } catch (error) {
        if ((error as any).name !== 'AbortError') console.error('Error loading layout:', error);
      }
      setAnalysisLayoutId(null);
      setAnalysisLayout(DEFAULT_ANALYSIS_LAYOUT);
    };
    loadLayout();
    return () => controller.abort();
  }, [session, sessionId]);

  function connectWebSocket() {
    if (!session || wsRef.current) return;
    // Clear any existing timers
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    const userId = user?.id;
    if (!userId) {
      console.error('Cannot connect WebSocket: no authenticated user');
      return;
    }
    const ws = new WebSocket(`ws://localhost:8080?userId=${userId}`);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      if (isMountedRef.current) {
        setWsConnected(true);
        setReconnecting(false);
      }
      reconnectAttemptsRef.current = 0;
      // Notify status bar
      window.dispatchEvent(new CustomEvent('statusbar:connection', {
        detail: { sessionId, sessionName: session.name, connected: true },
      }));
      // Heartbeat to keep connection alive
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(createPingMessage());
          } catch (error) {
            console.error('Error sending heartbeat:', error);
          }
        }
      }, 30000);
      // Telemetry arrives via Kafka pipeline — no need to request demo playback
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        if (!(event.data instanceof ArrayBuffer)) return;
        const decoded = decodeMessage(event.data);
        handleDecodedMessage(decoded);
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    function handleDecodedMessage(message: any) {
      if (!isMountedRef.current) return;
      try {
        if (message.type === 'demo_complete') {
          if (currentLapFramesRef.current.length > 0 && !savingLapRef.current) {
            savingLapRef.current = true;
            saveLap(currentLapNumberRef.current, currentLapFramesRef.current).finally(() => {
              savingLapRef.current = false;
            });
          }
          return;
        }

        if (message.type === 'telemetry') {
          if (isPausedRef.current) return;
          const frame: TelemetryFrame = message.data;

          const isNewLap = frame.lapTime < lastLapTimeRef.current && lastLapTimeRef.current > 1000;

          if (isNewLap) {
            if (!seenLapBoundaryRef.current && session?.source === 'demo') {
              seenLapBoundaryRef.current = true;
              currentLapNumberRef.current = 1;
              currentLapFramesRef.current = [frame];
              if (isMountedRef.current) {
                setCurrentLapFrames([frame]);
                setCurrentLapNumber(1);
              }
              lastUpdateTimeRef.current = Date.now();
            } else {
              seenLapBoundaryRef.current = true;
              if (currentLapFramesRef.current.length > 0 && !savingLapRef.current) {
                savingLapRef.current = true;
                const lapToSave = currentLapFramesRef.current;
                const lapNum = currentLapNumberRef.current;
                saveLap(lapNum, lapToSave).finally(() => {
                  savingLapRef.current = false;
                });
              }
              const nextLapNumber = currentLapNumberRef.current + 1;
              currentLapNumberRef.current = nextLapNumber;
              currentLapFramesRef.current = [frame];
              if (isMountedRef.current) {
                setCurrentLapFrames([frame]);
                setCurrentLapNumber(nextLapNumber);
              }
              lastUpdateTimeRef.current = Date.now();
            }
          } else {
            currentLapFramesRef.current = [...currentLapFramesRef.current, frame];
            const now = Date.now();
            const isFirstFrame = currentLapFramesRef.current.length === 1;
            if ((isFirstFrame || now - lastUpdateTimeRef.current >= 67) && isMountedRef.current) {
              setCurrentLapFrames([...currentLapFramesRef.current]);
              lastUpdateTimeRef.current = now;
            }
          }

          lastLapTimeRef.current = frame.lapTime;
        }
      } catch (error) {
        console.error('Error handling decoded message:', error);
      }
    }

    ws.onclose = () => {
      setWsConnected(false);
      wsRef.current = null;
      // Notify status bar
      window.dispatchEvent(new CustomEvent('statusbar:connection', {
        detail: { sessionId, sessionName: session.name, connected: false },
      }));
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
      if (isMountedRef.current && session.status === 'active') {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        setReconnecting(true);
        reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(), delay);
      }
    };

    ws.onerror = () => { ws.close(); };
  }

  async function saveLap(lapNumber: number, frames: TelemetryFrame[]) {
    if (frames.length === 0) return;
    try {
      const response = await fetch('/api/laps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          lapNumber,
          telemetryData: JSON.stringify(frames),
        }),
      });
      if (!response.ok) {
        console.error('Failed to save lap:', await response.json());
        return;
      }
      const savedLap = await response.json();
      if (isMountedRef.current && session) {
        setSession((prev) => {
          if (!prev) return prev;
          const lapExists = prev.laps?.some((lap) => lap.lapNumber === savedLap.lapNumber);
          if (lapExists) return prev;
          return { ...prev, laps: [...(prev.laps || []), savedLap] };
        });
      }
      refreshNav();
    } catch (error) {
      console.error('Error saving lap:', error);
    }
  }

  function togglePause() {
    setIsPaused((prev) => {
      isPausedRef.current = !prev;
      return !prev;
    });
  }

  async function startSession() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ started: true }),
      });
      if (response.ok) fetchSession();
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }

  async function endSession() {
    if (!confirm('Are you sure you want to end this session?')) return;
    try {
      // Prevent the onclose handler from reconnecting
      isMountedRef.current = false;

      // Clear all timers first
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Send stop_demo if applicable, guarding readyState
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          if (session?.source === 'demo') {
            wsRef.current.send(createStopDemoMessage());
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error sending stop message:', error);
        }
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Save current lap in background
      if (currentLapFramesRef.current.length > 0 && seenLapBoundaryRef.current) {
        saveLap(currentLapNumberRef.current, currentLapFramesRef.current).catch((err) =>
          console.error('Error saving final lap:', err)
        );
      }

      // Update session status
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      // Re-enable mounted flag and refresh
      isMountedRef.current = true;
      fetchSession();
      refreshNav();
    } catch (error) {
      console.error('Error ending session:', error);
      isMountedRef.current = true;
    }
  }

  async function addSessionTag(tag: string) {
    const newTags = [...sessionTags, tag];
    setSessionTags(newTags);
    await saveSessionTags(newTags);
  }

  async function removeSessionTag(tag: string) {
    const newTags = sessionTags.filter((t) => t !== tag);
    setSessionTags(newTags);
    await saveSessionTags(newTags);
  }

  async function addCustomSessionTag() {
    if (customSessionTag.trim() && !sessionTags.includes(customSessionTag.trim())) {
      await addSessionTag(customSessionTag.trim());
      setCustomSessionTag('');
    }
  }

  async function saveSessionTags(tags: string[]) {
    const tagsJson = JSON.stringify(tags);
    if (tagsJson === lastSavedTagsRef.current) return;
    lastSavedTagsRef.current = tagsJson;
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }

  async function handleDeleteSession() {
    if (!confirm(`Are you sure you want to delete the session "${session?.name}"? This will also delete all laps within it.`)) return;
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (response.ok) {
        closeTab(`session-detail:${sessionId}`);
        refreshNav();
      } else {
        console.error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  function handleLapClick(lap: Lap) {
    // Highlight the lap in the nav tree
    setSelectedNode(`lap:${lap.id}`);
    // Ensure parent event and session nodes are expanded so the lap is visible
    if (session?.eventId && !expandedNodes.has(`event:${session.eventId}`)) {
      toggleExpand(`event:${session.eventId}`);
    }
    if (sessionId && !expandedNodes.has(`session:${sessionId}`)) {
      toggleExpand(`session:${sessionId}`);
    }
    openTab({
      id: `lap-detail:${lap.id}`,
      type: 'lap-detail',
      label: `Lap ${lap.lapNumber}`,
      breadcrumbs: [session?.event?.name || 'Event', session?.name || 'Session', `Lap ${lap.lapNumber}`],
      entityId: lap.id,
      closable: true,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (sessionAlreadyOpen) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Session Already Open</h3>
                <p className="text-sm text-muted-foreground">
                  This session appears to be open in another tab. Only one tab can manage a live session at a time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Session header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div>
          <h2 className="text-lg font-semibold">{session.name}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                  {session.status}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">{session.status === 'active' ? 'Session is active and accepting telemetry' : `Session status: ${session.status}`}</TooltipContent>
            </Tooltip>
            {wsConnected && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="default" className="bg-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-300 mr-1 inline-block animate-pulse" />
                    Connected
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">WebSocket connected to telemetry server</TooltipContent>
              </Tooltip>
            )}
            {reconnecting && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary">Reconnecting...</Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">Attempting to reconnect to telemetry server</TooltipContent>
              </Tooltip>
            )}
            </TooltipProvider>
            {session.status === 'active' && session.started && (
              <span className="flex items-center gap-1">
                <Flag className="h-3 w-3" />
                Lap {currentLapNumber}
              </span>
            )}
          </div>
          {/* Tags */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {sessionTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer"
                onClick={() => removeSessionTag(tag)}
              >
                {tag}
                <X className="h-2 w-2 ml-1" />
              </Badge>
            ))}
            {!showTagInput ? (
              <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs" onClick={() => setShowTagInput(true)}>
                <Tag className="h-3 w-3 mr-1" />
                Tag
              </Button>
            ) : (
              <div className="flex gap-1 items-center">
                {SESSION_TAGS.filter((t) => !sessionTags.includes(t)).slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs cursor-pointer" onClick={() => addSessionTag(tag)}>
                    {tag}
                  </Badge>
                ))}
                <Input
                  value={customSessionTag}
                  onChange={(e) => setCustomSessionTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSessionTag()}
                  placeholder="Custom..."
                  className="h-5 w-20 text-xs"
                />
                <Button size="sm" variant="ghost" className="h-5 px-1" onClick={() => setShowTagInput(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session.status === 'active' && (
            <>
              {!session.started && (
                <Button variant="default" onClick={startSession} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start Session
                </Button>
              )}
              {session.started && (
                <Button variant={isPaused ? 'default' : 'outline'} onClick={togglePause} className="gap-2">
                  {isPaused ? <><Play className="h-4 w-4" />Resume</> : <><Pause className="h-4 w-4" />Pause</>}
                </Button>
              )}
              <Button variant="destructive" onClick={endSession} className="gap-2">
                <Archive className="h-4 w-4" />
                End Session
              </Button>
            </>
          )}
          {session.status !== 'active' && (
            <Button variant="ghost" size="sm" onClick={handleDeleteSession} className="gap-1 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className={`grid grid-cols-1 ${session.status === 'active' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {session.status === 'active' && (
            <div className="lg:col-span-2 space-y-6">
              {!session.started && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Session Not Started</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Click <strong>"Start Session"</strong> above to begin collecting telemetry data.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {session.started && analysisLayout && (
                <TelemetryDataPanel
                  context="live"
                  telemetry={currentLapFrames}
                  layout={analysisLayout}
                  onLayoutChange={setAnalysisLayout}
                  hasSavedLayout={!!analysisLayoutId}
                />
              )}
            </div>
          )}

          <div className={session.status === 'active' ? 'space-y-4' : 'w-full max-w-6xl mx-auto'}>
            <Card>
              <CardHeader>
                <CardTitle>Completed Laps</CardTitle>
              </CardHeader>
              <CardContent>
                {session.laps.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No laps completed yet</p>
                ) : (
                  <div className="space-y-2">
                    {session.laps.map((lap) => {
                      const lapTags = lap.tags ? JSON.parse(lap.tags) : [];
                      return (
                        <button
                          key={lap.id}
                          onClick={() => handleLapClick(lap)}
                          className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Lap {lap.lapNumber}</span>
                            <div className="flex items-center gap-2">
                              {lap.lapTime != null && (
                                <span className="text-sm text-muted-foreground">{formatLapTime(lap.lapTime)}</span>
                              )}
                              {lap.analyzed && (
                                <Badge variant="secondary" className="text-xs">Analyzed</Badge>
                              )}
                            </div>
                          </div>
                          {lapTags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {lapTags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
