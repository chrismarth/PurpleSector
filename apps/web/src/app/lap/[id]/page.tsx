'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Brain, Clock, TrendingUp, AlertCircle, Info, MessageSquare, GitCompare, X, Tag, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getLapAnalysisViews } from '@/plugins';
import { ChatInterface } from '@/components/ChatInterface';
import { VehicleInfoPanel } from '@/components/VehicleInfoPanel';
import { formatLapTime } from '@/lib/utils';
import { TelemetryFrame, LapSuggestion } from '@/types/telemetry';
import { PlotConfig, DEFAULT_PLOT_CONFIGS, PlotLayout, generateDefaultLayout } from '@/types/plotConfig';
import { Breadcrumbs } from '@/components/Breadcrumbs';

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
    event: {
      name: string;
    };
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
  const [showLapSelector, setShowLapSelector] = useState(false);
  const [referenceLapId, setReferenceLapId] = useState<string | null>(null);
  const [useAutoReference, setUseAutoReference] = useState(true);
  const [showReferenceSelector, setShowReferenceSelector] = useState(false);
  const [eventLaps, setEventLaps] = useState<EventLap[]>([]);
  const [analysisReferenceLap, setAnalysisReferenceLap] = useState<EventLap | null>(null);
  const [plotConfigs, setPlotConfigs] = useState<PlotConfig[]>(DEFAULT_PLOT_CONFIGS);
  const [plotLayout, setPlotLayout] = useState<PlotLayout>(generateDefaultLayout(DEFAULT_PLOT_CONFIGS));

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
    fetchLap();
  }, [lapId]);

  // Fetch available laps after lap is loaded and poll for updates
  useEffect(() => {
    if (lap) {
      fetchAvailableLaps();
      fetchEventLaps();
      
      // Poll every 5 seconds for new laps
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

  async function fetchLap() {
    try {
      const response = await fetch(`/api/laps/${lapId}`);
      const data = await response.json();
      setLap(data);

      // Parse telemetry data
      const frames = JSON.parse(data.telemetryData);
      setTelemetryFrames(frames);

      // Parse suggestions if available
      if (data.suggestions) {
        setSuggestions(JSON.parse(data.suggestions));
      }

      // Load driver comments
      if (data.driverComments) {
        setDriverComments(data.driverComments);
      }

      // Load tags
      if (data.tags) {
        setTags(JSON.parse(data.tags));
      }

      // Load plot configurations (lap-specific or inherit from session)
      if (data.plotConfigs) {
        const parsed = JSON.parse(data.plotConfigs);
        // Check if it's the new format with layout
        if (parsed.configs && parsed.layout) {
          setPlotConfigs(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(parsed.configs)) {
              return parsed.configs;
            }
            return prev;
          });
          setPlotLayout(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(parsed.layout)) {
              return parsed.layout;
            }
            return prev;
          });
        } else {
          // Old format - just configs
          const newConfigs = parsed;
          setPlotConfigs(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newConfigs)) {
              return newConfigs;
            }
            return prev;
          });
          setPlotLayout(generateDefaultLayout(newConfigs));
        }
      } else if (data.session?.plotConfigs) {
        // Inherit from session if lap doesn't have its own
        const parsed = JSON.parse(data.session.plotConfigs);
        if (parsed.configs && parsed.layout) {
          setPlotConfigs(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(parsed.configs)) {
              return parsed.configs;
            }
            return prev;
          });
          setPlotLayout(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(parsed.layout)) {
              return parsed.layout;
            }
            return prev;
          });
        } else {
          const newConfigs = parsed;
          setPlotConfigs(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(newConfigs)) {
              return newConfigs;
            }
            return prev;
          });
          setPlotLayout(generateDefaultLayout(newConfigs));
        }
      }
    } catch (error) {
      console.error('Error fetching lap:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableLaps() {
    try {
      if (!lap) return;
      const response = await fetch(`/api/sessions/${lap.session.id}`);
      const sessionData = await response.json();
      // Filter out current lap
      const otherLaps = sessionData.laps.filter((l: Lap) => l.id !== lapId);
      setAvailableLaps(otherLaps);
    } catch (error) {
      console.error('Error fetching available laps:', error);
    }
  }

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
      
      const response = await fetch(`/api/laps/${lapId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driverComments,
          referenceLapId: referenceId,
          forceReanalyze,
        }),
      });

      const data = await response.json();

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
      await fetch(`/api/laps/${lapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverComments: comments }),
      });
    } catch (error) {
      console.error('Error saving comments:', error);
    }
  }, [lapId]);

  // Auto-save tags
  const autoSaveTags = useCallback(async (newTags: string[]) => {
    try {
      await fetch(`/api/laps/${lapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: JSON.stringify(newTags) }),
      });
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }, [lapId]);

  // Auto-save plot configurations
  const autoSavePlotConfigs = useCallback(async (configs: PlotConfig[], layout: PlotLayout) => {
    if (!lap) return;
    
    try {
      const plotData = {
        configs,
        layout,
      };
      await fetch(`/api/laps/${lapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plotConfigs: JSON.stringify(plotData) }),
      });
    } catch (error) {
      console.error('Error saving plot configs:', error);
    }
  }, [lap, lapId]);

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

  // Save plot configurations and layout immediately when changed
  useEffect(() => {
    if (!lap) return; // Don't save until lap is loaded
    autoSavePlotConfigs(plotConfigs, plotLayout);
  }, [plotConfigs, plotLayout, lap, autoSavePlotConfigs]);

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
    try {
      const response = await fetch(`/api/laps/${selectedLapId}`);
      const data = await response.json();
      const frames = JSON.parse(data.telemetryData);
      setCompareTelemetry(frames);
      setCompareLapId(selectedLapId);
      setShowLapSelector(false);
    } catch (error) {
      console.error('Error loading compare lap:', error);
    }
  }

  function removeCompareLap() {
    setCompareLapId(null);
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
                  { label: lap.session.event.name, href: `/event/${lap.session.eventId}` },
                  { label: lap.session.name, href: `/session/${lap.session.id}`, onClick: (e) => { e.preventDefault(); handleBack(); } },
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Left Column - Telemetry & Lap Comparison */}
          <div className="lg:col-span-2 space-y-6">
            {/* Telemetry Charts (provided by plugin) */}
            {(() => {
              const views = getLapAnalysisViews().filter(v => v.context === 'singleLap');
              const view = views[0];
              return view
                ? view.render({
                    context: compareLapId ? 'lapComparison' : 'singleLap',
                    telemetry: telemetryFrames,
                    compareTelemetry: compareTelemetry.length > 0 ? compareTelemetry : undefined,
                    compareLapId,
                    plotConfigs,
                    plotLayout,
                    onPlotConfigsChange: setPlotConfigs,
                    onPlotLayoutChange: setPlotLayout,
                    host: {},
                  })
                : null;
            })()}

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
                          setUseAutoReference(e.target.checked);
                          if (e.target.checked) {
                            setReferenceLapId(null);
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
                          onChange={(e) => setReferenceLapId(e.target.value || null)}
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

        {/* AI Coach Chat - Full Width, Compact */}
        <div className="mt-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Ask the AI Coach</CardTitle>
              <CardDescription>
                Get specific advice about your driving technique
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[300px] overflow-hidden">
              <ChatInterface
                lapId={lapId}
                initialMessages={lap.chatMessages.map(msg => ({
                  id: msg.id,
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                  createdAt: new Date(msg.createdAt),
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
