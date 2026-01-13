'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Archive, Clock, Flag, Tag, Plus, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TelemetryFrame } from '@/types/telemetry';
import { PlotConfig, PlotLayout, DEFAULT_PLOT_CONFIGS, generateDefaultLayout } from '@/types/plotConfig';
import { formatLapTime } from '@/lib/utils';
import { msToSeconds } from '@purplesector/telemetry';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { decodeMessage, createStartDemoMessage, createStopDemoMessage, createPingMessage } from '@/lib/telemetry-proto-browser';
import { getLapAnalysisViews } from '@/plugins';

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
  started: boolean;
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
  const [plotConfigs, setPlotConfigs] = useState<PlotConfig[]>(DEFAULT_PLOT_CONFIGS);
  const [plotLayout, setPlotLayout] = useState<PlotLayout>(
    generateDefaultLayout(DEFAULT_PLOT_CONFIGS)
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const currentLapFramesRef = useRef<TelemetryFrame[]>([]);
  const currentLapNumberRef = useRef(1); // Track current lap number in ref for WebSocket closure
  const lastUpdateTimeRef = useRef(0);
  const savingLapRef = useRef(false); // Prevent duplicate saves
  const isPausedRef = useRef(false); // Track pause state in ref for WebSocket closure
  const isMountedRef = useRef(true); // Track if component is mounted
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null); // Heartbeat to keep connection alive
  const lastSavedTagsRef = useRef<string>('[]'); // Track last saved tags to prevent duplicate saves
  const lastLapTimeRef = useRef(0); // Track last lapTime to detect resets (new lap)

  useEffect(() => {
    // Reset lap-related state/refs whenever we switch sessions so that
    // each new session starts from lap 1 and with empty live data
    currentLapFramesRef.current = [];
    setCurrentLapFrames([]);
    currentLapNumberRef.current = 1;
    setCurrentLapNumber(1);
    lastLapTimeRef.current = 0;
    lastUpdateTimeRef.current = 0;

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

  // Connect WebSocket when session becomes active and started
  useEffect(() => {
    if (session && session.status === 'active' && session.started && !wsRef.current) {
      console.log('Session is active and started, connecting WebSocket...');
      // Initialize isPausedRef to match isPaused state
      isPausedRef.current = isPaused;
      connectWebSocket();
    }
    
    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        console.log('Cleaning up WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [session?.status, session?.started]); // Depend on both status and started flag

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
      
      // Set current lap number based on saved laps
      const nextLapNumber = (data.laps?.length || 0) + 1;
      setCurrentLapNumber(nextLapNumber);
      console.log(`Session has ${data.laps?.length || 0} laps, next lap will be #${nextLapNumber}`);
      
      // Load session tags (only if different from current)
      if (data.tags) {
        const newTags = JSON.parse(data.tags);
        setSessionTags(prev => {
          // Only update if actually different
          if (JSON.stringify(prev) !== JSON.stringify(newTags)) {
            return newTags;
          }
          return prev;
        });
      }

      // Load plot configurations (only if different from current)
      if (data.plotConfigs) {
        const newConfigs = JSON.parse(data.plotConfigs);
        setPlotConfigs(prev => {
          // Only update if actually different
          if (JSON.stringify(prev) !== JSON.stringify(newConfigs)) {
            return newConfigs;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }

  // Master cleanup effect on component unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('Component unmounting - cleaning up all resources');
      isMountedRef.current = false;
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear timeouts and intervals
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, []);

  // Memoized callback for plot config changes
  const handlePlotConfigsChange = useCallback((configs: PlotConfig[]) => {
    if (!isMountedRef.current) return;
    setPlotConfigs(configs);
    setPlotLayout(generateDefaultLayout(configs));
    // Auto-save to session
    fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plotConfigs: JSON.stringify(configs) }),
    }).catch(error => console.error('Error saving plot configs:', error));
  }, [sessionId]);

  const handlePlotLayoutChange = useCallback((layout: PlotLayout) => {
    if (!isMountedRef.current) return;
    setPlotLayout(layout);
    // (Optional) Persist layout to the session in the future
  }, []);

  function connectWebSocket() {
    // Clear any existing connection and timers
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    console.log('Connecting to WebSocket...');
    // Include userId in connection (for Kafka user-scoped topics)
    // In production, this would come from authentication
    // For now, use 'demo-user' to match the demo collector
    const userId = 'demo-user';
    const ws = new WebSocket(`ws://localhost:8080?userId=${userId}`);
    ws.binaryType = 'arraybuffer'; // Receive binary data as ArrayBuffer for protobuf
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✓ WebSocket connected');
      if (isMountedRef.current) {
        setWsConnected(true);
        setReconnecting(false);
      }
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

      // Start heartbeat to keep connection alive (ping every 30 seconds)
      heartbeatIntervalRef.current = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(createPingMessage());
          } catch (error) {
            console.error('Error sending heartbeat:', error);
          }
        }
      }, 30000);

      // If demo mode, request demo data
      if (session?.source === 'demo') {
        console.log('Requesting demo mode telemetry...');
        try {
          ws.send(createStartDemoMessage());
        } catch (error) {
          console.error('Error requesting demo:', error);
        }
      } else {
        console.log('Session source:', session?.source, '- waiting for live telemetry');
      }
    };

    ws.onmessage = (event) => {
      // Check if component is still mounted before processing
      if (!isMountedRef.current) {
        console.log('Ignoring WebSocket message - component unmounted');
        return;
      }
      
      try {
        // All messages should be protobuf (ArrayBuffer)
        if (!(event.data instanceof ArrayBuffer)) {
          console.error('Received non-ArrayBuffer message:', typeof event.data);
          return;
        }
        
        // Decode protobuf message
        const decoded = decodeMessage(event.data);
        
        // Log telemetry messages
        if (decoded.type === 'telemetry') {
          console.log('Received telemetry:', decoded.data?.speed, 'km/h, lapTime:', decoded.data?.lapTime);
        }
        
        handleDecodedMessage(decoded);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    function handleDecodedMessage(message: any) {
      if (!isMountedRef.current) return;
      
      try {
        if (message.type === 'demo_complete') {
          console.log('Demo playback completed');
          // Save final lap if any frames exist
          if (currentLapFramesRef.current.length > 0 && !savingLapRef.current) {
            savingLapRef.current = true;
            saveLap(currentLapFramesRef.current, currentLapNumberRef.current).finally(() => {
              savingLapRef.current = false;
            });
          }
          return;
        }

        if (message.type === 'telemetry') {
          console.log('Telemetry message, paused:', isPausedRef.current);
          
          if (isPausedRef.current) {
            console.log('Skipping telemetry - session is paused');
            return;
          }
          
          const frame: TelemetryFrame = message.data;

          // Detect lap change: lapTime resets to a small value (new lap started)
          const isNewLap = frame.lapTime < lastLapTimeRef.current && lastLapTimeRef.current > 1000;
          
          if (isNewLap) {
            // Lap boundary detected
            if (currentLapFramesRef.current.length > 0) {
              // We have frames from a lap, save it
              console.log(`Lap ${currentLapNumberRef.current} completed! ${currentLapFramesRef.current.length} frames`);
              
              if (!savingLapRef.current) {
                savingLapRef.current = true;
                const lapToSave = currentLapFramesRef.current;
                const lapNum = currentLapNumberRef.current;
                
                saveLap(lapToSave, lapNum).finally(() => {
                  savingLapRef.current = false;
                });
              }
            }
            
            // Start new lap
            const nextLapNumber = currentLapNumberRef.current + 1;
            currentLapNumberRef.current = nextLapNumber; // Update ref
            currentLapFramesRef.current = [frame];
            
            if (isMountedRef.current) {
              setCurrentLapFrames([frame]);
              setCurrentLapNumber(nextLapNumber);
            }
            
            lastUpdateTimeRef.current = Date.now();
          } else {
            // Same lap, add frame
            currentLapFramesRef.current = [...currentLapFramesRef.current, frame];
            
            // Throttle state updates to 15 FPS (every ~67ms) to reduce re-renders
            // But always update on first frame to ensure UI shows data immediately
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

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (isMountedRef.current) {
        setWsConnected(false);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
      
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (isMountedRef.current) {
        setWsConnected(false);
      }
      wsRef.current = null;

      // Only attempt to reconnect if component is mounted, session is still active and not paused
      if (isMountedRef.current && session?.status === 'active' && !isPausedRef.current) {
        // Use faster reconnection with cap at 5 seconds instead of 30
        reconnectAttemptsRef.current++;
        
        // Progressive delays: 1s, 2s, 3s, 4s, 5s (max)
        const delay = Math.min(reconnectAttemptsRef.current * 1000, 5000);
        
        console.log(`⟳ Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttemptsRef.current})`);
        if (isMountedRef.current) {
          setReconnecting(true);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && session?.status === 'active') {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }
        }, delay);
      } else {
        console.log('Session not active or component unmounted, skipping reconnection');
        if (isMountedRef.current) {
          setReconnecting(false);
        }
      }
    };
  }

  async function saveLap(frames: TelemetryFrame[], lapNumber: number) {
    if (frames.length === 0) {
      console.warn('No frames to save');
      return;
    }

    console.log(`Saving lap ${lapNumber} with ${frames.length} frames to database...`);

    try {
      const response = await fetch('/api/laps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          lapNumber: lapNumber,
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

      // Update session state directly instead of fetching
      // This prevents cascading re-renders
      if (isMountedRef.current && session) {
        setSession(prev => {
          if (!prev) return prev;
          
          // Check if lap already exists to prevent duplicates
          const lapExists = prev.laps?.some(lap => lap.lapNumber === savedLap.lapNumber);
          if (lapExists) {
            console.log(`Lap ${savedLap.lapNumber} already in session, skipping duplicate`);
            return prev;
          }
          
          return {
            ...prev,
            laps: [...(prev.laps || []), savedLap],
          };
        });
      }
    } catch (error) {
      console.error('Error saving lap:', error);
    }
  }

  async function startSession() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const updatedSession = await response.json();
        setSession(updatedSession);
        
        // Reset lap tracking for a fresh telemetry run within this session
        currentLapFramesRef.current = [];
        setCurrentLapFrames([]);
        currentLapNumberRef.current = 1;
        setCurrentLapNumber(1);
        lastLapTimeRef.current = 0;
        lastUpdateTimeRef.current = 0;
        
        // WebSocket will connect automatically via useEffect when session.started becomes true
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }

  function togglePause() {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    isPausedRef.current = newPausedState; // Keep ref in sync
    
    if (newPausedState) {
      // Pausing - send stop_demo and close WebSocket
      console.log('Pausing telemetry - stopping demo and closing WebSocket');
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(createStopDemoMessage());
          // Give message time to send before closing
          setTimeout(() => {
            if (wsRef.current) {
              wsRef.current.close();
              wsRef.current = null;
            }
          }, 100);
        } catch (error) {
          console.error('Error sending stop_demo:', error);
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
        }
      }
      
      // Clear timers
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    } else {
      // Resuming - reconnect WebSocket
      console.log('Resuming telemetry - reconnecting WebSocket');
      
      // Reset current lap frames and lapTime tracking
      currentLapFramesRef.current = [];
      setCurrentLapFrames([]);
      lastLapTimeRef.current = 0;
      
      // Sync the ref with current state
      currentLapNumberRef.current = currentLapNumber;
      console.log('Resuming from lap:', currentLapNumber);
      
      if (session?.status === 'active') {
        connectWebSocket();
      }
    }
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
    
    const tagsString = JSON.stringify(sessionTags);
    
    // Only save if tags have actually changed from last save
    if (tagsString !== lastSavedTagsRef.current) {
      lastSavedTagsRef.current = tagsString;
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
      // Send stop_demo message before closing connection
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(createStopDemoMessage());
          // Give message time to send before closing
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Error sending stop_demo:', error);
        }
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Clear all timers
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Update session status
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      // Save current lap in background (don't wait for it)
      if (currentLapFrames.length > 0) {
        saveLap(currentLapFrames, currentLapNumberRef.current).catch(err => {
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
                {!session.started && (
                  <Button
                    variant="default"
                    onClick={startSession}
                    className="gap-2"
                    title="Start telemetry collection for this session"
                  >
                    <Play className="h-4 w-4" />
                    Start Session
                  </Button>
                )}
                {session.started && (
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
                )}
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
              {!session.started && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Session Not Started
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          This session has been pre-configured but telemetry collection hasn't started yet. 
                          Click the <strong>"Start Session"</strong> button above to begin collecting telemetry data.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {session.started && (() => {
                const views = getLapAnalysisViews().filter(v => v.context === 'singleLap');
                const view = views[0];
                return view
                  ? view.render({
                      context: 'singleLap',
                      telemetry: currentLapFrames,
                      compareTelemetry: undefined,
                      compareLapId: null,
                      plotConfigs,
                      plotLayout,
                      onPlotConfigsChange: handlePlotConfigsChange,
                      onPlotLayoutChange: handlePlotLayoutChange,
                      host: {},
                    })
                  : null;
              })()}
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
