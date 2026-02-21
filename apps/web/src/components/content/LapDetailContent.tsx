'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { TelemetryDataPanel } from '@/components/TelemetryDataPanel';
import { Brain, Clock, TrendingUp, AlertCircle, Info, MessageSquare, X, Tag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import type { AnalysisLayoutJSON } from '@/lib/analysisLayout';
import { DEFAULT_ANALYSIS_LAYOUT } from '@/lib/analysisLayout';
import { SaveLayoutDialog } from '@/components/SaveLayoutDialog';
import { AnalysisLoadLayoutDialog } from '@/components/AnalysisLoadLayoutDialog';
import { AnalysisManageLayoutsDialog } from '@/components/AnalysisManageLayoutsDialog';

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
    event: { name: string };
    vehicle?: { id: string; name: string; description?: string | null } | null;
    vehicleConfiguration?: { id: string; name: string; description?: string | null; parts: string } | null;
    vehicleSetup?: { id: string; name: string; description?: string | null; parameters: string } | null;
  };
  chatMessages: Array<{ id: string; role: string; content: string; createdAt: string }>;
}

interface EventLap {
  id: string;
  lapNumber: number;
  lapTime: number | null;
  sessionId: string;
  sessionName: string;
}

const DEFAULT_TAGS = [
  'Qualifying', 'Race Pace', 'Cool Down', 'Full Fuel', 'Low Fuel',
  'New Tires', 'Worn Tires', 'Setup A', 'Setup B', 'Baseline', 'Wet', 'Dry',
];

interface LapDetailContentProps {
  entityId: string;
}

export default function LapDetailContent({ entityId }: LapDetailContentProps) {
  const lapId = entityId;

  const [lap, setLap] = useState<Lap | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [telemetryFrames, setTelemetryFrames] = useState<TelemetryFrame[]>([]);
  const [suggestions, setSuggestions] = useState<LapSuggestion[]>([]);
  const [driverComments, setDriverComments] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [compareLapId, setCompareLapId] = useState<string | null>(null);
  const [compareTelemetry, setCompareTelemetry] = useState<TelemetryFrame[]>([]);
  const [availableLaps, setAvailableLaps] = useState<Lap[]>([]);
  const [referenceLapId, setReferenceLapId] = useState<string | null>(null);
  const [useAutoReference, setUseAutoReference] = useState(true);
  const [showReferenceSelector, setShowReferenceSelector] = useState(false);
  const [eventLaps, setEventLaps] = useState<EventLap[]>([]);
  const [analysisReferenceLap, setAnalysisReferenceLap] = useState<EventLap | null>(null);
  const [analysisLayoutId, setAnalysisLayoutId] = useState<string | null>(null);
  const [analysisLayout, setAnalysisLayout] = useState<AnalysisLayoutJSON | null>(null);
  const [isSaveLayoutDialogOpen, setIsSaveLayoutDialogOpen] = useState(false);
  const [isLoadLayoutDialogOpen, setIsLoadLayoutDialogOpen] = useState(false);
  const [isManageLayoutsDialogOpen, setIsManageLayoutsDialogOpen] = useState(false);

  const [mathChannels, setMathChannels] = useState<MathTelemetryChannel[]>([]);
  const [showChannelEditor, setShowChannelEditor] = useState(false);

  const channelRegistry = useMemo(
    () => new CompositeChannelRegistry(RAW_CHANNELS, mathChannels),
    [mathChannels],
  );

  useEffect(() => {
    fetchLap();
    fetchMathChannels();
  }, [lapId]);

  useEffect(() => {
    if (lap) {
      fetchAvailableLaps();
      fetchEventLaps();
      const interval = setInterval(() => {
        fetchAvailableLaps();
        fetchEventLaps();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [lap]);

  async function fetchEventLaps() {
    if (!lap) return;
    try {
      const response = await fetch(`/api/sessions/${lap.session.id}/event-laps`);
      const data = await response.json();
      setEventLaps(data);
    } catch (error) {
      console.error('Error fetching event laps:', error);
    }
  }

  async function fetchMathChannels() {
    try {
      const response = await fetch('/api/channels/math');
      if (response.ok) {
        const data = await response.json();
        setMathChannels(data);
      }
    } catch (error) {
      console.error('Error fetching math channels:', error);
    }
  }


  async function fetchLap() {
    try {
      const response = await fetch(`/api/laps/${lapId}`);
      const data = await response.json();
      setLap(data);
      const frames = JSON.parse(data.telemetryData);
      setTelemetryFrames(frames);
      if (data.suggestions) setSuggestions(JSON.parse(data.suggestions));
      if (data.driverComments) setDriverComments(data.driverComments);
      if (data.tags) setTags(JSON.parse(data.tags));
    } catch (error) {
      console.error('Error fetching lap:', error);
    } finally {
      setLoading(false);
    }
  }

  // Load analysis layout
  useEffect(() => {
    if (!lap) return;
    const controller = new AbortController();
    const loadLayout = async () => {
      const contextKey = `lap:${lapId}`;
      try {
        const response = await fetch(`/api/analysis-layouts?context=${encodeURIComponent(contextKey)}`, { signal: controller.signal });
        if (response.ok) {
          const layouts = await response.json();
          if (Array.isArray(layouts) && layouts.length > 0) {
            const layoutRecord = layouts.find((l: any) => l.isDefault) ?? layouts[0];
            try {
              const parsed: AnalysisLayoutJSON = JSON.parse(layoutRecord.layout);
              setAnalysisLayoutId(layoutRecord.id);
              setAnalysisLayout(parsed);
              return;
            } catch (e) { console.error('Failed to parse layout:', e); }
          }
        }
      } catch (error) {
        if ((error as any).name !== 'AbortError') console.error('Error loading layout:', error);
      }
      setAnalysisLayout(DEFAULT_ANALYSIS_LAYOUT);
    };
    loadLayout();
    return () => controller.abort();
  }, [lap, lapId]);

  const handleSaveAnalysisLayout = useCallback(
    async (name: string, description?: string) => {
      if (!lap || !analysisLayout) return;
      const contextKey = `lap:${lapId}`;
      try {
        if (!analysisLayoutId) {
          const response = await fetch('/api/analysis-layouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: description ?? null, context: contextKey, layout: analysisLayout, isDefault: true }),
          });
          if (response.ok) {
            const created = await response.json();
            if (created?.id) setAnalysisLayoutId(created.id as string);
          }
        } else {
          await fetch(`/api/analysis-layouts/${analysisLayoutId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout: analysisLayout, name, description: description ?? null }),
          });
        }
      } catch (error) { console.error('Error saving layout:', error); }
    },
    [analysisLayout, analysisLayoutId, lap, lapId],
  );

  const handleLoadAnalysisLayout = useCallback(async (layoutId: string) => {
    try {
      const response = await fetch(`/api/analysis-layouts/${layoutId}`);
      if (!response.ok) return;
      const record = await response.json();
      if (!record?.layout) return;
      try {
        const parsed: AnalysisLayoutJSON = JSON.parse(record.layout as string);
        setAnalysisLayoutId(record.id as string);
        setAnalysisLayout(parsed);
      } catch (e) { console.error('Failed to parse layout:', e); }
    } catch (error) { console.error('Error loading layout:', error); }
  }, []);

  async function fetchAvailableLaps() {
    try {
      if (!lap) return;
      const response = await fetch(`/api/sessions/${lap.session.id}`);
      const sessionData = await response.json();
      const otherLaps = sessionData.laps.filter((l: Lap) => l.id !== lapId);
      setAvailableLaps(otherLaps);
    } catch (error) {
      console.error('Error fetching available laps:', error);
    }
  }

  async function analyzeLap() {
    setAnalyzing(true);
    try {
      const referenceId = useAutoReference ? null : referenceLapId;
      if (referenceId) {
        const refLap = eventLaps.find((l) => l.id === referenceId);
        setAnalysisReferenceLap(refLap || null);
      } else if (useAutoReference) {
        const fastest = availableLaps.length > 0
          ? availableLaps.reduce((prev, curr) => ((curr.lapTime || Infinity) < (prev.lapTime || Infinity) ? curr : prev))
          : null;
        if (fastest) {
          setAnalysisReferenceLap({ id: fastest.id, lapNumber: fastest.lapNumber, lapTime: fastest.lapTime, sessionId: lap?.session.id || '', sessionName: lap?.session.name || '' });
        }
      } else {
        setAnalysisReferenceLap(null);
      }
      const forceReanalyze = lap?.analyzed || false;
      const response = await fetch(`/api/laps/${lapId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverComments, referenceLapId: referenceId, forceReanalyze }),
      });
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions);
        setLap((prev) => (prev ? { ...prev, analyzed: true } : null));
      } else if (data.error) {
        alert(`Analysis failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error analyzing lap:', error);
      alert('Failed to analyze lap.');
    } finally {
      setAnalyzing(false);
    }
  }

  const autoSaveComments = useCallback(async (comments: string) => {
    try {
      await fetch(`/api/laps/${lapId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driverComments: comments }) });
    } catch (error) { console.error('Error saving comments:', error); }
  }, [lapId]);

  const autoSaveTags = useCallback(async (newTags: string[]) => {
    try {
      await fetch(`/api/laps/${lapId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: JSON.stringify(newTags) }) });
    } catch (error) { console.error('Error saving tags:', error); }
  }, [lapId]);

  useEffect(() => {
    if (!lap) return;
    const timer = setTimeout(() => { autoSaveComments(driverComments); }, 1000);
    return () => clearTimeout(timer);
  }, [driverComments, lap, autoSaveComments]);

  useEffect(() => {
    if (!lap) return;
    if (tags.length > 0 || lap.tags) { autoSaveTags(tags); }
  }, [tags, lap, autoSaveTags]);

  function addTag(tag: string) { if (!tags.includes(tag)) setTags([...tags, tag]); }
  function removeTag(tag: string) { setTags(tags.filter((t) => t !== tag)); }
  function addCustomTag() {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  }

  async function selectCompareLap(selectedLapId: string) {
    try {
      const response = await fetch(`/api/laps/${selectedLapId}`);
      const data = await response.json();
      const frames = JSON.parse(data.telemetryData);
      setCompareTelemetry(frames);
      setCompareLapId(selectedLapId);
    } catch (error) { console.error('Error loading compare lap:', error); }
  }

  function removeCompareLap() { setCompareLapId(null); setCompareTelemetry([]); }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  }

  function getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950';
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950';
      default: return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading lap data...</p>
        </div>
      </div>
    );
  }

  if (!lap) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Lap not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Lap header */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Lap {lap.lapNumber} Analysis</h2>
          <p className="text-sm text-muted-foreground">
            {lap.session.event.name} &rsaquo; {lap.session.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Lap Time</div>
          <div className="text-2xl font-bold font-mono flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {formatLapTime(lap.lapTime)}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left Column - Telemetry & Lap Comparison */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {analysisLayout && (
              <div className="flex-1 flex flex-col">
                <TelemetryDataPanel
                  context={compareLapId ? 'lapComparison' : 'singleLap'}
                  telemetry={telemetryFrames}
                  compareTelemetry={compareTelemetry.length > 0 ? compareTelemetry : undefined}
                  compareLapId={compareLapId}
                  layout={analysisLayout}
                  onLayoutChange={setAnalysisLayout}
                  onSaveLayout={() => setIsSaveLayoutDialogOpen(true)}
                  onLoadLayout={() => setIsLoadLayoutDialogOpen(true)}
                  onManageLayouts={() => setIsManageLayoutsDialogOpen(true)}
                  hasSavedLayout={!!analysisLayoutId}
                  mathChannels={mathChannels}
                  availableCompareLaps={availableLaps.map((l) => ({ id: l.id, lapNumber: l.lapNumber, lapTime: l.lapTime || 0 }))}
                  onSelectCompareLap={selectCompareLap}
                  onRemoveCompareLap={removeCompareLap}
                  formatLapTime={formatLapTime}
                />
                <SaveLayoutDialog open={isSaveLayoutDialogOpen} onOpenChange={setIsSaveLayoutDialogOpen} onSave={handleSaveAnalysisLayout} />
                <AnalysisLoadLayoutDialog open={isLoadLayoutDialogOpen} onOpenChange={setIsLoadLayoutDialogOpen} onLoad={handleLoadAnalysisLayout} context={`lap:${lapId}`} />
                <AnalysisManageLayoutsDialog open={isManageLayoutsDialogOpen} onOpenChange={setIsManageLayoutsDialogOpen} context={`lap:${lapId}`} />
              </div>
            )}
          </div>

          {/* Right Column - AI Analysis, Tags & Comments */}
          <div className="space-y-6 flex flex-col lg:h-full">
            {/* Performance Analysis */}
            <Card>
              <div className="flex items-center px-4 py-2 border-b bg-muted/40">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Brain className="h-4 w-4" />
                  Performance Analysis
                </span>
              </div>
              <CardContent className="pt-4">
                {!lap.analyzed && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="useAutoReference" checked={useAutoReference} onChange={(e) => { setUseAutoReference(e.target.checked); if (e.target.checked) setReferenceLapId(null); }} className="rounded" />
                      <label htmlFor="useAutoReference" className="text-sm font-medium cursor-pointer">Use fastest lap as reference</label>
                    </div>
                    {!useAutoReference && (
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Select reference lap from event:</label>
                        <select value={referenceLapId || ''} onChange={(e) => setReferenceLapId(e.target.value || null)} className="w-full p-2 text-sm rounded-md border border-input bg-background">
                          <option value="">No reference</option>
                          {eventLaps && eventLaps.filter((l) => l.id !== lapId).map((eventLap) => (
                            <option key={eventLap.id} value={eventLap.id}>
                              {eventLap.sessionName} - Lap {eventLap.lapNumber} ({formatLapTime(eventLap.lapTime || 0)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                {(!lap.analyzed || (suggestions.length === 1 && suggestions[0].id === 'fallback-1')) && (
                  <div className="mb-2 text-center">
                    <Button onClick={analyzeLap} disabled={analyzing} size="sm" className="gap-1.5">
                      <Brain className="h-3.5 w-3.5" />
                      {analyzing ? 'Analyzing...' : lap.analyzed ? 'Re-analyze' : 'Analyze'}
                    </Button>
                  </div>
                )}
                {!lap.analyzed && suggestions.length === 0 ? (
                  <div className="text-center py-4">
                    <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Click "Analyze" to get performance suggestions</p>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Analyzing...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analysisReferenceLap && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <span className="font-semibold">Reference:</span> {analysisReferenceLap.sessionName} - Lap {analysisReferenceLap.lapNumber} ({formatLapTime(analysisReferenceLap.lapTime || 0)})
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {suggestions.map((suggestion) => (
                        <div key={suggestion.id} className={`p-3 rounded-lg border-2 ${getSeverityColor(suggestion.severity)}`}>
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(suggestion.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-1">
                                <Badge variant="outline" className="text-xs">{suggestion.type}</Badge>
                                {suggestion.corner && <Badge variant="secondary" className="text-xs">{suggestion.corner}</Badge>}
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
              <div className="flex items-center px-4 py-2 border-b bg-muted/40">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4" />
                  Lap Tags
                </span>
              </div>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="default" className="gap-1 cursor-pointer hover:bg-destructive" onClick={() => removeTag(tag)}>
                          {tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_TAGS.map((tag) => (
                        <Badge key={tag} variant={tags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => (tags.includes(tag) ? removeTag(tag) : addTag(tag))}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustomTag()} placeholder="Add custom tag..." className="flex-1" />
                    <Button onClick={addCustomTag} size="sm" variant="outline" className="gap-2">
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

            {/* Driver Comments */}
            <Card className="flex-1 flex flex-col">
              <div className="flex items-center px-4 py-2 border-b bg-muted/40">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Driver Comments
                </span>
              </div>
              <CardContent className="flex-1 pt-4">
                <textarea
                  value={driverComments}
                  onChange={(e) => setDriverComments(e.target.value)}
                  placeholder="Example: Tried softer front springs. Car felt more responsive but had oversteer in Turn 3..."
                  className="w-full h-full min-h-[150px] p-3 bg-background resize-none focus:outline-none"
                />
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

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
    </div>
  );
}
