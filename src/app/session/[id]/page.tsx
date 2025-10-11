'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Archive, Clock, Flag, Tag, Plus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TelemetryChart } from '@/components/TelemetryChart';
import { TelemetryFrame } from '@/types/telemetry';
import { formatLapTime } from '@/lib/utils';
import { Breadcrumbs } from '@/components/Breadcrumbs';

const SESSION_TAGS = [
  'Testing',
  'Practice',
  'Qualifying',
  'Race',
  'Setup Development',
  'Baseline',
  'Wet Weather',
  'Dry Weather',
];

interface Session {
  id: string;
  eventId: string;
  name: string;
  source: string;
  status: string;
  tags: string | null;
  laps: Lap[];
  event?: {
    name: string;
  };
}

interface Lap {
  id: string;
  lapNumber: number;
  lapTime: number | null;
  analyzed: boolean;
  tags?: string | null;
  driverComments?: string | null;
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

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

  const wsRef = useRef<WebSocket | null>(null);
  const lastLapNumberRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentLapFramesRef = useRef<TelemetryFrame[]>([]);
  const lastUpdateTimeRef = useRef(0);
  const savingLapRef = useRef(false); // Prevent duplicate saves
  const isPausedRef = useRef(false); // Track pause state in ref for WebSocket closure

  useEffect(() => {
    // Check if this session is already open in another tab
    const sessionLockKey = `session-${sessionId}-lock`;
    const existingLock = localStorage.getItem(sessionLockKey);
    
    if (existingLock) {
      const lockTime = parseInt(existingLock);
      const now = Date.now();
      
      // If lock is older than 5 seconds, consider it stale and take over
      if (now - lockTime < 5000) {
        // Session is actively open in another tab
        setSessionAlreadyOpen(true);
        setLoading(false);
        return;
      }
    }
    
    // Claim the lock for this tab with current timestamp
    localStorage.setItem(sessionLockKey, Date.now().toString());
    
    // Update the lock timestamp every 2 seconds to show this tab is active
    const lockInterval = setInterval(() => {
      localStorage.setItem(sessionLockKey, Date.now().toString());
    }, 2000);
    
    fetchSession();

    return () => {
      // Release the lock when this tab closes/unmounts
      clearInterval(lockInterval);
      localStorage.removeItem(sessionLockKey);
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [sessionId]);

  // Connect WebSocket after session is loaded (only if session is active)
  useEffect(() => {
    if (session && !wsRef.current && session.status === 'active') {
      connectWebSocket();
    }
  }, [session]);

  async function fetchSession() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      
      if (!response.ok) {
        console.error('Session not found or error loading session');
        alert('Session not found. It may have been deleted. Please create a new session.');
        router.push('/');
        return;
      }
      
      const data = await response.json();
      console.log('Session data loaded:', data);
      console.log('Number of laps:', data.laps?.length || 0);
      setSession(data);
      setCurrentLapNumber(data.laps.length + 1);
      
      // Load session tags
      if (data.tags) {
        setSessionTags(JSON.parse(data.tags));
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }

  function connectWebSocket() {
    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket('ws://localhost:8080');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

      // If demo mode, request demo data
      if (session?.source === 'demo') {
        console.log('Requesting demo mode telemetry...');
        ws.send(JSON.stringify({ type: 'start_demo' }));
      } else {
        console.log('Session source:', session?.source, '- waiting for live telemetry');
      }
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'telemetry' && !isPausedRef.current) {
        const frame: TelemetryFrame = message.data;

        // Detect lap change
        if (frame.lapNumber !== lastLapNumberRef.current && lastLapNumberRef.current > 0) {
          console.log(`Lap ${lastLapNumberRef.current} completed! Saving ${currentLapFramesRef.current.length} frames`);
          
          // Prevent duplicate saves with a lock
          if (!savingLapRef.current && currentLapFramesRef.current.length > 0) {
            savingLapRef.current = true;
            // Save completed lap using ref (has current value)
            saveLap(currentLapFramesRef.current).finally(() => {
              savingLapRef.current = false;
            });
          }
          
          // Reset for new lap
          currentLapFramesRef.current = [frame];
          setCurrentLapFrames([frame]);
          setCurrentLapNumber(frame.lapNumber);
          lastUpdateTimeRef.current = Date.now();
        } else {
          // Add frame to ref (always)
          currentLapFramesRef.current = [...currentLapFramesRef.current, frame];
          
          // Throttle state updates to 15 FPS (every ~67ms) to reduce re-renders
          const now = Date.now();
          if (now - lastUpdateTimeRef.current >= 67) {
            setCurrentLapFrames([...currentLapFramesRef.current]);
            lastUpdateTimeRef.current = now;
          }
        }

        lastLapNumberRef.current = frame.lapNumber;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
      wsRef.current = null;

      // Attempt to reconnect with exponential backoff
      reconnectAttemptsRef.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000); // Max 30 seconds
      
      console.log(`Reconnecting in ${delay / 1000} seconds... (attempt ${reconnectAttemptsRef.current})`);
      setReconnecting(true);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (session) {
          console.log('Attempting to reconnect WebSocket...');
          connectWebSocket();
        }
      }, delay);
    };
  }

  async function saveLap(frames: TelemetryFrame[]) {
    if (frames.length === 0) {
      console.warn('No frames to save');
      return;
    }

    console.log(`Saving lap ${frames[0].lapNumber} with ${frames.length} frames to database...`);

    try {
      const response = await fetch('/api/laps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          lapNumber: frames[0].lapNumber,
          telemetryData: JSON.stringify(frames),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save lap:', error);
        return;
      }

      const savedLap = await response.json();
      console.log('Lap saved successfully:', savedLap);

      // Refresh session data
      fetchSession();
    } catch (error) {
      console.error('Error saving lap:', error);
    }
  }

  function togglePause() {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    isPausedRef.current = newPausedState; // Keep ref in sync
    console.log(newPausedState ? 'Telemetry paused' : 'Telemetry resumed');
  }

  // Auto-save session tags
  const autoSaveSessionTags = useCallback(async (tags: string[]) => {
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: JSON.stringify(tags) }),
      });
    } catch (error) {
      console.error('Error saving session tags:', error);
    }
  }, [sessionId]);

  // Save tags immediately when changed
  useEffect(() => {
    if (!session) return;
    if (sessionTags.length > 0 || session.tags) {
      autoSaveSessionTags(sessionTags);
    }
  }, [sessionTags, session, autoSaveSessionTags]);

  function addSessionTag(tag: string) {
    if (!sessionTags.includes(tag)) {
      setSessionTags([...sessionTags, tag]);
    }
  }

  function removeSessionTag(tag: string) {
    setSessionTags(sessionTags.filter(t => t !== tag));
  }

  function addCustomSessionTag() {
    if (customSessionTag.trim() && !sessionTags.includes(customSessionTag.trim())) {
      setSessionTags([...sessionTags, customSessionTag.trim()]);
      setCustomSessionTag('');
      setShowTagInput(false);
    }
  }

  async function endSession() {
    try {
      // Close WebSocket connection immediately
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Update session status
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      // Save current lap in background (don't wait for it)
      if (currentLapFrames.length > 0) {
        saveLap(currentLapFrames).catch(err => {
          console.error('Error saving final lap:', err);
        });
      }

      // Navigate back to event page (session list)
      if (session?.eventId) {
        router.push(`/event/${session.eventId}`);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  if (sessionAlreadyOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Session Already Open
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This session is already open in another tab. To prevent telemetry sync issues, 
              only one instance of a session can be active at a time.
            </p>
            <p className="text-sm text-muted-foreground">
              Please close this tab and return to the original session tab.
            </p>
            <Button 
              onClick={() => {
                // Try to close the tab
                window.close();
                // If that doesn't work (manually opened tab), navigate back after a delay
                setTimeout(() => {
                  router.push('/');
                }, 100);
              }}
              className="w-full"
            >
              Close This Tab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Back to Sessions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {session.event && (
                <Breadcrumbs 
                  items={[
                    { label: session.event.name, href: `/event/${session.eventId}` },
                    { label: session.name, href: `/session/${session.id}` },
                  ]}
                />
              )}
              <h1 className="text-xl font-bold mt-1">{session.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {session.status === 'active' ? (
                  <Badge variant={wsConnected ? 'default' : reconnecting ? 'secondary' : 'destructive'}>
                    {wsConnected ? 'Connected' : reconnecting ? 'Reconnecting...' : 'Disconnected'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Archived</Badge>
                )}
                <Badge variant="outline">{session.source}</Badge>
              </div>
              
              {/* Session Tags */}
              <div className="flex flex-wrap items-center gap-1 mt-2">
                {sessionTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs gap-1 cursor-pointer hover:bg-destructive"
                    onClick={() => removeSessionTag(tag)}
                  >
                    {tag}
                    <X className="h-2 w-2" />
                  </Badge>
                ))}
                {!showTagInput ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setShowTagInput(true)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    Add Tag
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <div className="flex flex-wrap gap-1">
                      {SESSION_TAGS.map((tag) => (
                        <Badge
                          key={tag}
                          variant={sessionTags.includes(tag) ? "default" : "outline"}
                          className="text-xs cursor-pointer"
                          onClick={() => sessionTags.includes(tag) ? removeSessionTag(tag) : addSessionTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={customSessionTag}
                        onChange={(e) => setCustomSessionTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomSessionTag()}
                        placeholder="Custom..."
                        className="h-6 w-24 text-xs"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => setShowTagInput(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {session.status === 'active' && (
              <div className="flex items-center gap-2">
                <Button
                  variant={isPaused ? 'default' : 'outline'}
                  onClick={togglePause}
                  className="gap-2"
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" />
                      Pause
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={endSession} className="gap-2">
                  <Archive className="h-4 w-4" />
                  End Session
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className={`grid grid-cols-1 ${session.status === 'active' ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {/* Live Telemetry - Only show for active sessions */}
          {session.status === 'active' && (
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Flag className="h-5 w-5" />
                      Current Lap: #{currentLapNumber}
                    </CardTitle>
                    {currentLapFrames.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono">
                          {formatLapTime(currentLapFrames[currentLapFrames.length - 1].lapTime / 1000)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {currentLapFrames.length > 0 ? (
                    <TelemetryChart data={currentLapFrames} height={250} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Waiting for telemetry data...</p>
                      {!wsConnected && (
                        <p className="text-sm mt-2">
                          Make sure the WebSocket server is running
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Lap Archive */}
          <div className={session.status === 'active' ? 'space-y-4' : 'w-full max-w-6xl mx-auto'}>
            <Card>
              <CardHeader>
                <CardTitle>Completed Laps</CardTitle>
              </CardHeader>
              <CardContent>
                {session.laps.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No laps completed yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {session.laps.map((lap) => {
                      const lapTags = lap.tags ? JSON.parse(lap.tags) : [];
                      return (
                        <Link 
                          key={lap.id} 
                          href={`/lap/${lap.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={() => {
                            // Mark that this lap was opened in a new tab (use localStorage for cross-tab)
                            localStorage.setItem(`lap-${lap.id}-opened-in-tab`, 'true');
                          }}
                        >
                          <div className="p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">Lap {lap.lapNumber}</span>
                              {lap.analyzed && (
                                <Badge variant="secondary" className="text-xs">
                                  Analyzed
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {formatLapTime(lap.lapTime)}
                            </div>
                            {lap.driverComments && (
                              <div className="text-sm text-muted-foreground mt-2 italic">
                                <p className="truncate" title={lap.driverComments}>
                                  "{lap.driverComments}"
                                </p>
                              </div>
                            )}
                            {lapTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {lapTags.map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
