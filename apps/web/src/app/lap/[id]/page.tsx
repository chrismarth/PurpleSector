'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TelemetryDataPanel } from '@/components/TelemetryDataPanel';
import Link from 'next/link';
import { Brain, Clock, TrendingUp, AlertCircle, Info, MessageSquare, GitCompare, X, Tag, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { VehicleInfoPanel } from '@/components/VehicleInfoPanel';
import { formatLapTime } from '@/lib/utils';
import { TelemetryFrame, LapSuggestion } from '@/types/telemetry';
import {
  RAW_CHANNELS,
  CompositeChannelRegistry,
  MathTelemetryChannel,
} from '@purplesector/telemetry';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ChannelEditorContent from '@/components/content/ChannelEditorContent';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import type { AnalysisLayoutJSON } from '@/lib/analysisLayout';
import { DEFAULT_ANALYSIS_LAYOUT } from '@/lib/analysisLayout';
import { SaveLayoutDialog } from '@/components/SaveLayoutDialog';
import { AnalysisLoadLayoutDialog } from '@/components/AnalysisLoadLayoutDialog';
import { AnalysisManageLayoutsDialog } from '@/components/AnalysisManageLayoutsDialog';
import { queryKeys } from '@/lib/queryKeys';
import { useLapUiStore } from '@/stores/lapUiStore';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

interface Lap {
  id: string;
  lapNumber: number;
  lapTime: number | null;
  telemetryData: string;
  analyzed: boolean;
  suggestions: string | null;
  driverComments: string | null;
  tags: string | null;
  session: {
    id: string;
    name: string;
    eventId: string;
    event?: {
      name: string;
    } | null;
    vehicle?: {
      id: string;
      name: string;
      description?: string | null;
    } | null;
    vehicleConfiguration?: {
      id: string;
      name: string;
      description?: string | null;
      parts: string;
    } | null;
    vehicleSetup?: {
      id: string;
      name: string;
      description?: string | null;
      parameters: string;
    } | null;
  };
  chatMessages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface EventLap {
  id: string;
  lapNumber: number;
  lapTime: number | null;
  sessionId: string;
  sessionName: string;
}

interface EventDetail {
  id: string;
  name: string;
}

const DEFAULT_TAGS = [
  'Qualifying',
  'Race Pace',
  'Cool Down',
  'Full Fuel',
  'Low Fuel',
  'New Tires',
  'Worn Tires',
  'Setup A',
  'Setup B',
  'Baseline',
  'Wet',
  'Dry',
];

export default function LapPage() {
  const params = useParams();
  const router = useRouter();
  const lapId = params.id as string;

  const queryClient = useQueryClient();

  const [lap, setLap] = useState<Lap | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [telemetryFrames, setTelemetryFrames] = useState<TelemetryFrame[]>([]);
  const [suggestions, setSuggestions] = useState<LapSuggestion[]>([]);
  const [driverComments, setDriverComments] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const compareLapId = useLapUiStore((s) => s.getCompareLapId(lapId));
  const setCompareLapId = useLapUiStore((s) => s.setCompareLapId);
  const [compareTelemetry, setCompareTelemetry] = useState<TelemetryFrame[]>([]);
  const [availableLaps, setAvailableLaps] = useState<Lap[]>([]);
  const [showLapSelector, setShowLapSelector] = useState(false);
  const referenceLapId = useLapUiStore((s) => s.getReferenceLapId(lapId));
  const setReferenceLapId = useLapUiStore((s) => s.setReferenceLapId);
  const useAutoReference = useLapUiStore((s) => s.getUseAutoReference(lapId));
  const setUseAutoReference = useLapUiStore((s) => s.setUseAutoReference);
  const [showReferenceSelector, setShowReferenceSelector] = useState(false);
  const [eventLaps, setEventLaps] = useState<EventLap[]>([]);
  const [analysisReferenceLap, setAnalysisReferenceLap] = useState<EventLap | null>(null);
  const [analysisLayoutId, setAnalysisLayoutId] = useState<string | null>(null);
  const [analysisLayout, setAnalysisLayout] = useState<AnalysisLayoutJSON | null>(null);
  const [isSaveLayoutDialogOpen, setIsSaveLayoutDialogOpen] = useState(false);
  const [isLoadLayoutDialogOpen, setIsLoadLayoutDialogOpen] = useState(false);
  const [isManageLayoutsDialogOpen, setIsManageLayoutsDialogOpen] = useState(false);

  // Math channels loaded from backend
  const [mathChannels, setMathChannels] = useState<MathTelemetryChannel[]>([]);
  const [showChannelEditor, setShowChannelEditor] = useState(false);

  const analysisLayoutsQuery = useQuery({
    queryKey: ['analysis-layouts', 'lap', lapId] as const,
    queryFn: async () => {
      const contextKey = `lap:${lapId}`;
      const data = await fetchJson<unknown>(
        `/api/analysis-layouts?context=${encodeURIComponent(contextKey)}`,
        {
          unauthorized: { kind: 'redirect_to_login' },
          fallback: [],
        },
      );
      return Array.isArray(data) ? (data as any[]) : ([] as any[]);
    },
    enabled: !!lapId,
  });

  const patchLapMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      return mutationJson<Lap, Record<string, any>>(`/api/laps/${lapId}`, {
        method: 'PATCH',
        body: payload,
      });
    },
    onSuccess: (updated) => {
      // PATCH /api/laps/:id returns a minimal Lap record (no session includes).
      // Merge into the existing cached Lap so we don't lose nested session/event.
      queryClient.setQueryData<Lap | undefined>(queryKeys.lapDetail(lapId), (prev) => {
        if (!prev) return updated;
        return {
          ...prev,
          ...updated,
          session: prev.session ?? (updated as any).session,
          chatMessages: prev.chatMessages ?? (updated as any).chatMessages,
        } as Lap;
      });
    },
  });

  const analyzeLapMutation = useMutation({
    mutationFn: async (payload: { driverComments: string; referenceLapId: string | null; forceReanalyze: boolean }) => {
      return mutationJson<any, { driverComments: string; referenceLapId: string | null; forceReanalyze: boolean }>(
        `/api/laps/${lapId}/analyze`,
        {
          method: 'POST',
          body: payload,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lapDetail(lapId) });
    },
  });

  const saveAnalysisLayoutMutation = useMutation({
    mutationFn: async (payload: { id?: string; body: any }) => {
      const hasId = Boolean(payload.id);
      return mutationJson<any>(hasId ? `/api/analysis-layouts/${payload.id}` : '/api/analysis-layouts', {
        method: hasId ? 'PATCH' : 'POST',
        body: payload.body,
      });
    },
    onSuccess: (record) => {
      if (record?.id) {
        setAnalysisLayoutId(record.id as string);
      }
      queryClient.invalidateQueries({ queryKey: ['analysis-layouts', 'lap', lapId] });
    },
  });

  const loadAnalysisLayoutMutation = useMutation({
    mutationFn: async (layoutId: string) => {
      return fetchJson<any>(`/api/analysis-layouts/${layoutId}`, {
        unauthorized: { kind: 'redirect_to_login' },
      });
    },
  });

  const lapQuery = useQuery({
    queryKey: queryKeys.lapDetail(lapId),
    queryFn: async (): Promise<Lap> => {
      return fetchJson<Lap>(`/api/laps/${lapId}`, {
        unauthorized: { kind: 'redirect_to_login' },
      });
    },
    enabled: !!lapId,
  });

  const eventId = lapQuery.data?.session?.eventId;

  const eventQuery = useQuery({
    queryKey: queryKeys.eventDetail(eventId ?? ''),
    queryFn: async (): Promise<EventDetail> => {
      if (!eventId) throw new Error('Missing eventId');
      return fetchJson<EventDetail>(`/api/events/${eventId}`, {
        unauthorized: { kind: 'redirect_to_login' },
      });
    },
    enabled: Boolean(eventId) && !lapQuery.data?.session?.event,
    staleTime: 30_000,
  });

  const framesQuery = useQuery({
    queryKey: ['laps', lapId, 'frames'] as const,
    queryFn: async (): Promise<TelemetryFrame[]> => {
      const data = await fetchJson<any>(`/api/laps/${lapId}/frames`, {
        unauthorized: { kind: 'redirect_to_login' },
        fallback: { frames: [] },
      });
      return Array.isArray(data?.frames) ? (data.frames as TelemetryFrame[]) : [];
    },
    enabled: !!lapId,
    staleTime: 15_000,
  });

  const mathChannelsQuery = useQuery({
    queryKey: ['channels', 'math'] as const,
    queryFn: async (): Promise<MathTelemetryChannel[]> => {
      const data = await fetchJson<unknown>('/api/channels/math', {
        unauthorized: { kind: 'redirect_to_login' },
        fallback: [],
      });
      return Array.isArray(data) ? (data as MathTelemetryChannel[]) : [];
    },
    staleTime: 30_000,
  });

  const sessionQuery = useQuery({
    queryKey: lapQuery.data?.session?.id ? queryKeys.sessionDetail(lapQuery.data.session.id) : ['sessions', 'unknown'] as const,
    queryFn: async () => {
      const sessionId = lapQuery.data?.session?.id;
      if (!sessionId) throw new Error('Missing sessionId');
      return fetchJson<any>(`/api/sessions/${sessionId}`, {
        unauthorized: { kind: 'redirect_to_login' },
      });
    },
    enabled: !!lapQuery.data?.session?.id,
  });

  const eventLapsQuery = useQuery({
    queryKey: lapQuery.data?.session?.id ? ['sessions', lapQuery.data.session.id, 'event-laps'] as const : ['sessions', 'unknown', 'event-laps'] as const,
    queryFn: async (): Promise<EventLap[]> => {
      const sessionId = lapQuery.data?.session?.id;
      if (!sessionId) return [];
      const data = await fetchJson<unknown>(`/api/sessions/${sessionId}/event-laps`, {
        unauthorized: { kind: 'redirect_to_login' },
        fallback: [],
      });
      return Array.isArray(data) ? (data as EventLap[]) : [];
    },
    enabled: !!lapQuery.data?.session?.id,
    staleTime: 15_000,
  });

  // Instantiate the composite channel registry with raw + math channels
  const channelRegistry = useMemo(
    () => new CompositeChannelRegistry(RAW_CHANNELS, mathChannels),
    [mathChannels],
  );

  useEffect(() => {
    if (mathChannelsQuery.data) {
      setMathChannels(mathChannelsQuery.data);
    }
  }, [mathChannelsQuery.data]);

  useEffect(() => {
    if (lapQuery.isError) {
      setLoading(false);
      return;
    }
    if (lapQuery.isLoading) {
      setLoading(true);
      return;
    }
    if (!lapQuery.data) return;

    const data = lapQuery.data;
    setLap(data);

    if (data.suggestions) {
      try {
        setSuggestions(JSON.parse(data.suggestions));
      } catch {
        setSuggestions([]);
      }
    }

    if (data.driverComments) {
      setDriverComments(data.driverComments);
    }

    if (data.tags) {
      try {
        setTags(JSON.parse(data.tags));
      } catch {
        setTags([]);
      }
    }

    setLoading(false);
  }, [lapQuery.data, lapQuery.isError, lapQuery.isLoading]);

  // Sync analysis layout from backend list (or use default)
  useEffect(() => {
    if (!lap) return;

    const layouts = analysisLayoutsQuery.data ?? [];
    if (Array.isArray(layouts) && layouts.length > 0) {
      const layoutRecord = (layouts.find((l: any) => l.isDefault) ?? layouts[0]) as any;
      try {
        const parsed: AnalysisLayoutJSON = JSON.parse(layoutRecord.layout);
        setAnalysisLayoutId(layoutRecord.id as string);
        setAnalysisLayout(parsed);
        return;
      } catch (e) {
        console.error('Failed to parse saved analysis layout JSON:', e);
      }
    }

    setAnalysisLayoutId(null);
    setAnalysisLayout(DEFAULT_ANALYSIS_LAYOUT);
  }, [analysisLayoutsQuery.data, lap]);

  useEffect(() => {
    if (framesQuery.data) {
      setTelemetryFrames(framesQuery.data);
    }
  }, [framesQuery.data]);

  useEffect(() => {
    if (!sessionQuery.data || !lapId) return;
    const laps = Array.isArray(sessionQuery.data?.laps) ? (sessionQuery.data.laps as Lap[]) : [];
    const otherLaps = laps.filter((l) => l.id !== lapId);
    setAvailableLaps(otherLaps);
  }, [lapId, sessionQuery.data]);

  useEffect(() => {
    if (eventLapsQuery.data) {
      setEventLaps(eventLapsQuery.data);
    }
  }, [eventLapsQuery.data]);

  // Handle back button - close tab if opened in new tab
  function handleBack() {
    // Check if this lap was marked as opened in a new tab (use localStorage for cross-tab)
    const wasOpenedInTab = localStorage.getItem(`lap-${lapId}-opened-in-tab`);
    
    if (wasOpenedInTab === 'true') {
      // Clean up the flag
      localStorage.removeItem(`lap-${lapId}-opened-in-tab`);
      // Close the tab
      window.close();
    } else {
      // Otherwise navigate back to session
      router.push(`/session/${lap?.session.id}`);
    }
  }

  useEffect(() => {
    // fetched by TanStack Query
  }, [lapId]);

  // Fetch available laps after lap is loaded and poll for updates
  useEffect(() => {
    if (!lap) return;

    const sessionId = lap.session.id;

    // Poll every 5 seconds for new laps
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionDetail(sessionId) });
      queryClient.invalidateQueries({ queryKey: ['sessions', sessionId, 'event-laps'] });
    }, 5000);

    return () => clearInterval(interval);
  }, [lap, queryClient]);


  // Load analysis layout for this lap from backend (or use default if none exists)
  useEffect(() => {
    // Loaded via analysisLayoutsQuery
  }, [lap, lapId]);

  const handleSaveAnalysisLayout = useCallback(
    async (name: string, description?: string) => {
      if (!lap || !analysisLayout) return;

      const contextKey = `lap:${lapId}`;

      try {
        if (!analysisLayoutId) {
          await saveAnalysisLayoutMutation.mutateAsync({
            body: {
              name,
              description: description ?? null,
              context: contextKey,
              layout: analysisLayout,
              isDefault: true,
            },
          });
        } else {
          await saveAnalysisLayoutMutation.mutateAsync({
            id: analysisLayoutId,
            body: {
              layout: analysisLayout,
              name,
              description: description ?? null,
            },
          });
        }
      } catch (error) {
        console.error('Error saving analysis layout:', error);
      }
    },
    [analysisLayout, analysisLayoutId, lap, lapId, saveAnalysisLayoutMutation],
  );

  const handleLoadAnalysisLayout = useCallback(async (layoutId: string) => {
    try {
      const record = await loadAnalysisLayoutMutation.mutateAsync(layoutId);
      if (!record?.layout) return;

      try {
        const parsed: AnalysisLayoutJSON = JSON.parse(record.layout as string);
        setAnalysisLayoutId(record.id as string);
        setAnalysisLayout(parsed);
      } catch (e) {
        console.error('Failed to parse analysis layout JSON:', e);
      }
    } catch (error) {
      console.error('Error loading analysis layout:', error);
    }
  }, [loadAnalysisLayoutMutation]);

  async function analyzeLap() {
    setAnalyzing(true);

    try {
      // Determine which reference lap to use
      const referenceId = useAutoReference ? null : referenceLapId;
      
      // Store reference lap info for display
      if (referenceId) {
        const refLap = eventLaps.find(l => l.id === referenceId);
        setAnalysisReferenceLap(refLap || null);
      } else if (useAutoReference) {
        // Find fastest lap in session for display
        const fastest = availableLaps.length > 0 
          ? availableLaps.reduce((prev, curr) => 
              (curr.lapTime || Infinity) < (prev.lapTime || Infinity) ? curr : prev
            )
          : null;
        if (fastest) {
          setAnalysisReferenceLap({
            id: fastest.id,
            lapNumber: fastest.lapNumber,
            lapTime: fastest.lapTime,
            sessionId: lap?.session.id || '',
            sessionName: lap?.session.name || '',
          });
        }
      } else {
        setAnalysisReferenceLap(null);
      }
      
      // Check if this is a re-analysis (lap already analyzed)
      const forceReanalyze = lap?.analyzed || false;
      
      const data = await analyzeLapMutation.mutateAsync({
        driverComments,
        referenceLapId: referenceId,
        forceReanalyze,
      });

      if (data.success) {
        setSuggestions(data.suggestions);
        setLap(prev => prev ? { ...prev, analyzed: true } : null);
      } else if (data.error) {
        // Show error to user
        alert(`Analysis failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error analyzing lap:', error);
      alert('Failed to analyze lap. Please check your API key and quota.');
    } finally {
      setAnalyzing(false);
    }
  }

  // Auto-save comments with debounce
  const autoSaveComments = useCallback(async (comments: string) => {
    try {
      await patchLapMutation.mutateAsync({ driverComments: comments });
    } catch (error) {
      console.error('Error saving comments:', error);
    }
  }, [patchLapMutation]);

  // Auto-save tags
  const autoSaveTags = useCallback(async (newTags: string[]) => {
    try {
      await patchLapMutation.mutateAsync({ tags: JSON.stringify(newTags) });
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }, [patchLapMutation]);


  // Debounced auto-save for comments
  useEffect(() => {
    if (!lap) return; // Don't save until lap is loaded
    const timer = setTimeout(() => {
      autoSaveComments(driverComments);
    }, 1000); // Save 1 second after user stops typing
    return () => clearTimeout(timer);
  }, [driverComments, lap, autoSaveComments]);

  // Save tags immediately when changed
  useEffect(() => {
    if (!lap) return; // Don't save until lap is loaded
    if (tags.length > 0 || lap.tags) { // Only save if tags exist or existed
      autoSaveTags(tags);
    }
  }, [tags, lap, autoSaveTags]);

  // Plot/analysis panel layouts are now owned by plugins and backend layout APIs.

  function addTag(tag: string) {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag));
  }

  function addCustomTag() {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  }

  async function selectCompareLap(selectedLapId: string) {
    setCompareLapId(lapId, selectedLapId);
    setShowLapSelector(false);
    try {
      const framesData = await fetchJson<any>(`/api/laps/${selectedLapId}/frames`, {
        unauthorized: { kind: 'redirect_to_login' },
        fallback: { frames: [] },
      });
      setCompareTelemetry(Array.isArray(framesData?.frames) ? framesData.frames : []);
    } catch (error) {
      console.error('Error fetching compare lap telemetry:', error);
      setCompareTelemetry([]);
    }
  }

  function removeCompareLap() {
    setCompareLapId(lapId, null);
    setCompareTelemetry([]);
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading lap data...</p>
        </div>
      </div>
    );
  }

  if (!lap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Lap Not Found</CardTitle>
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
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumbs 
                items={[
                  {
                    label: lap.session?.event?.name ?? eventQuery.data?.name ?? 'Event',
                    href: `/event/${lap.session?.eventId ?? eventId ?? ''}`,
                  },
                  { label: lap.session?.name ?? 'Session', href: `/session/${lap.session?.id ?? ''}`, onClick: (e) => { e.preventDefault(); handleBack(); } },
                  { label: `Lap ${lap.lapNumber}`, href: `/lap/${lap.id}` },
                ]}
              />
              <h1 className="text-2xl font-bold mt-1">Lap {lap.lapNumber} Analysis</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Lap Time</div>
                <div className="text-2xl font-bold font-mono flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {formatLapTime(lap.lapTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left Column - Telemetry & Lap Comparison */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Telemetry Data panel using generic analysis layout */}
            {analysisLayout && (
              <div className="flex-1 flex flex-col">
                <TelemetryDataPanel
                  context={compareLapId ? 'lapComparison' : 'singleLap'}
                  telemetry={telemetryFrames}
                  compareTelemetry={
                    compareTelemetry.length > 0 ? compareTelemetry : undefined
                  }
                  compareLapId={compareLapId}
                  layout={analysisLayout}
                  onLayoutChange={setAnalysisLayout}
                  onSaveLayout={() => setIsSaveLayoutDialogOpen(true)}
                  onLoadLayout={() => setIsLoadLayoutDialogOpen(true)}
                  onManageLayouts={() => setIsManageLayoutsDialogOpen(true)}

                  hasSavedLayout={!!analysisLayoutId}
                  mathChannels={mathChannels}
                />

                <SaveLayoutDialog
                  open={isSaveLayoutDialogOpen}
                  onOpenChange={setIsSaveLayoutDialogOpen}
                  onSave={handleSaveAnalysisLayout}
                />

                <AnalysisLoadLayoutDialog
                  open={isLoadLayoutDialogOpen}
                  onOpenChange={setIsLoadLayoutDialogOpen}
                  onLoad={handleLoadAnalysisLayout}
                  context={`lap:${lapId}`}
                />

                <AnalysisManageLayoutsDialog
                  open={isManageLayoutsDialogOpen}
                  onOpenChange={setIsManageLayoutsDialogOpen}
                  context={`lap:${lapId}`}
                />
              </div>
            )}

            {/* Lap Comparison */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <GitCompare className="h-5 w-5" />
                      Lap Comparison
                    </CardTitle>
                    <CardDescription>
                      Compare this lap with another lap from the same session
                    </CardDescription>
                  </div>
                  {!compareLapId ? (
                    <Button
                      onClick={() => setShowLapSelector(!showLapSelector)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <GitCompare className="h-4 w-4" />
                      Select Lap
                    </Button>
                  ) : (
                    <Button
                      onClick={removeCompareLap}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Remove Comparison
                    </Button>
                  )}
                </div>
              </CardHeader>
              {showLapSelector && (
                <CardContent>
                  <div className="space-y-2">
                    {availableLaps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No other laps available for comparison
                      </p>
                    ) : (
                      availableLaps.map((availableLap) => (
                        <button
                          key={availableLap.id}
                          onClick={() => selectCompareLap(availableLap.id)}
                          className="w-full p-3 rounded-lg border hover:bg-accent transition-colors text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Lap {availableLap.lapNumber}</span>
                            <span className="text-sm text-muted-foreground font-mono">
                              {formatLapTime(availableLap.lapTime)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              )}
              {compareLapId && (
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      Comparing with Lap {availableLaps.find(l => l.id === compareLapId)?.lapNumber}
                    </Badge>
                    <span className="font-mono">
                      {formatLapTime(availableLaps.find(l => l.id === compareLapId)?.lapTime || 0)}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Right Column - AI Analysis, Tags & Comments */}
          <div className="space-y-6 flex flex-col lg:h-full">
            {/* AI Performance Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Performance Analysis
                    </CardTitle>
                    <CardDescription>
                      Suggestions to improve your lap time
                    </CardDescription>
                  </div>
                  {(!lap.analyzed || (suggestions.length === 1 && suggestions[0].id === 'fallback-1')) && (
                    <Button onClick={analyzeLap} disabled={analyzing} size="sm" className="gap-2">
                      <Brain className="h-4 w-4" />
                      {analyzing ? 'Analyzing...' : lap.analyzed ? 'Re-analyze' : 'Analyze'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Reference Lap Selector */}
                {!lap.analyzed && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useAutoReference"
                        checked={useAutoReference}
                        onChange={(e) => {
                          setUseAutoReference(lapId, e.target.checked);
                          if (e.target.checked) {
                            setReferenceLapId(lapId, null);
                          }
                        }}
                        className="rounded"
                      />
                      <label htmlFor="useAutoReference" className="text-sm font-medium cursor-pointer">
                        Use fastest lap as reference
                      </label>
                    </div>
                    {!useAutoReference && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          Select reference lap from event:
                        </label>
                        <select
                          value={referenceLapId || ''}
                          onChange={(e) => setReferenceLapId(lapId, e.target.value || null)}
                          className="w-full p-2 text-sm rounded-md border border-input bg-background"
                        >
                          <option value="">No reference</option>
                          {eventLaps && eventLaps.filter(l => l.id !== lapId).map((eventLap) => (
                            <option key={eventLap.id} value={eventLap.id}>
                              {eventLap.sessionName} - Lap {eventLap.lapNumber} ({formatLapTime(eventLap.lapTime || 0)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {!lap.analyzed && suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Click "Analyze" to get AI suggestions
                    </p>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
                    <p className="text-sm text-muted-foreground">Analyzing...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Reference Lap Info */}
                    {analysisReferenceLap && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <span className="font-semibold">Reference:</span> {analysisReferenceLap.sessionName} - Lap {analysisReferenceLap.lapNumber} ({formatLapTime(analysisReferenceLap.lapTime || 0)})
                        </p>
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border-2 ${getSeverityColor(suggestion.severity)}`}
                        >
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(suggestion.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.type}
                                </Badge>
                                {suggestion.corner && (
                                  <Badge variant="secondary" className="text-xs">
                                    {suggestion.corner}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs">{suggestion.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lap Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Lap Tags
                </CardTitle>
                <CardDescription>
                  Add tags to categorize this lap (auto-saved)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Selected Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="default"
                          className="gap-1 cursor-pointer hover:bg-destructive"
                          onClick={() => removeTag(tag)}
                        >
                          {tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Default Tags */}
                  <div>
                    <p className="text-sm font-medium mb-2">Quick Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_TAGS.map((tag) => (
                        <Badge
                          key={tag}
                          variant={tags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => tags.includes(tag) ? removeTag(tag) : addTag(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Custom Tag Input */}
                  <div className="flex gap-2">
                    <Input
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                      placeholder="Add custom tag..."
                      className="flex-1"
                    />
                    <Button
                      onClick={addCustomTag}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Information */}
            {lap?.session && (
              <VehicleInfoPanel
                vehicle={lap.session.vehicle}
                configuration={lap.session.vehicleConfiguration}
                setup={lap.session.vehicleSetup}
              />
            )}

            {/* Driver Comments - Grows to fill space */}
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Driver Comments
                </CardTitle>
                <CardDescription>
                  Add notes about this lap (auto-saved after 1 second)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <textarea
                  value={driverComments}
                  onChange={(e) => setDriverComments(e.target.value)}
                  placeholder="Example: Tried softer front springs. Car felt more responsive but had oversteer in Turn 3..."
                  className="w-full h-full min-h-[150px] p-3 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      {/* Channel Editor Dialog */}
      <Dialog open={showChannelEditor} onOpenChange={setShowChannelEditor}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 py-2 border-b bg-muted/40 shrink-0">
            <DialogTitle className="text-sm font-semibold">Channel Library</DialogTitle>
            <DialogDescription className="sr-only">View raw telemetry channels and manage math channels</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <ChannelEditorContent onChannelsChange={setMathChannels} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Analysis Layout Dialogs */}
      <SaveLayoutDialog
        open={isSaveLayoutDialogOpen}
        onOpenChange={setIsSaveLayoutDialogOpen}
        onSave={handleSaveAnalysisLayout}
      />
      <AnalysisLoadLayoutDialog
        open={isLoadLayoutDialogOpen}
        onOpenChange={setIsLoadLayoutDialogOpen}
        context={`lap:${lapId}`}
        onLoad={handleLoadAnalysisLayout}
      />
      <AnalysisManageLayoutsDialog
        open={isManageLayoutsDialogOpen}
        onOpenChange={setIsManageLayoutsDialogOpen}
        context={`lap:${lapId}`}
      />
    </div>
  );
}
