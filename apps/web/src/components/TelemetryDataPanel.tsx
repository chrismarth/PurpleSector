'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MoreVertical, GitCompare, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TelemetryFrame } from '@/types/telemetry';
import type { MathTelemetryChannel } from '@purplesector/telemetry';
import type { AnalysisLayoutJSON } from '@/lib/analysisLayout';
import type { AnalysisPanelContext } from '@purplesector/plugin-api';
import { AnalysisPanelGrid } from '@/components/AnalysisPanelGrid';

interface CompareLap {
  id: string;
  lapNumber: number;
  lapTime: number;
}

interface TelemetryDataPanelProps {
  context: AnalysisPanelContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  layout: AnalysisLayoutJSON;
  onLayoutChange?: (layout: AnalysisLayoutJSON) => void;
  onSaveLayout?: () => void;
  onLoadLayout?: () => void;
  onManageLayouts?: () => void;
  hasSavedLayout?: boolean;
  mathChannels?: MathTelemetryChannel[];
  /** Available laps for comparison. */
  availableCompareLaps?: CompareLap[];
  /** Called when user selects a lap to compare. */
  onSelectCompareLap?: (lapId: string) => void;
  /** Called when user removes the comparison. */
  onRemoveCompareLap?: () => void;
  /** Format a lap time number to a display string. */
  formatLapTime?: (time: number) => string;
}

export function TelemetryDataPanel({
  context,
  telemetry,
  compareTelemetry,
  compareLapId,
  layout,
  onLayoutChange,
  onSaveLayout,
  onLoadLayout,
  onManageLayouts,
  hasSavedLayout,
  mathChannels,
  availableCompareLaps,
  onSelectCompareLap,
  onRemoveCompareLap,
  formatLapTime: formatTime,
}: TelemetryDataPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comparePopoverOpen, setComparePopoverOpen] = useState(false);
  const [focusPanelId, setFocusPanelId] = useState<string | null>(null);
  const [focusPanelHeight, setFocusPanelHeight] = useState<number | undefined>(undefined);

  // When a panel is focused, force the whole TelemetryDataPanel fullscreen
  const handlePanelFullscreenToggle = useCallback((panelId: string | null) => {
    if (panelId) {
      setFocusPanelId(panelId);
      setIsFullscreen(true);
    } else {
      setFocusPanelId(null);
      setIsFullscreen(false);
    }
  }, []);

  // Compute available chart height when in per-panel fullscreen
  useEffect(() => {
    if (!focusPanelId) {
      setFocusPanelHeight(undefined);
      return;
    }
    const compute = () => {
      // viewport - TelemetryDataPanel title bar (~42px) - panel title bar (~30px) - chart chrome (~80px)
      const h = window.innerHeight - 152;
      setFocusPanelHeight(h > 100 ? h : undefined);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [focusPanelId]);

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'flex flex-col h-full'}>
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Telemetry Data</span>
            {compareLapId && availableCompareLaps && (
              <Badge variant="secondary" className="text-xs gap-1">
                vs Lap {availableCompareLaps.find((l) => l.id === compareLapId)?.lapNumber}
                {formatTime && (
                  <span className="font-mono ml-1">{formatTime(availableCompareLaps.find((l) => l.id === compareLapId)?.lapTime || 0)}</span>
                )}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 items-center">
            {onSelectCompareLap && (
              compareLapId ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={onRemoveCompareLap}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Remove comparison</TooltipContent>
                </Tooltip>
              ) : (
                <Popover open={comparePopoverOpen} onOpenChange={setComparePopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                        >
                          <GitCompare className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Compare lap</TooltipContent>
                  </Tooltip>
                  <PopoverContent align="end" className="w-64 p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Select lap to compare</p>
                    <div className="space-y-1 max-h-48 overflow-auto">
                      {(!availableCompareLaps || availableCompareLaps.length === 0) ? (
                        <p className="text-xs text-muted-foreground text-center py-3">No other laps available</p>
                      ) : (
                        availableCompareLaps.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => { onSelectCompareLap(l.id); setComparePopoverOpen(false); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                          >
                            <span className="font-medium">Lap {l.lapNumber}</span>
                            {formatTime && <span className="text-xs text-muted-foreground font-mono">{formatTime(l.lapTime)}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setIsFullscreen((v) => !v);
                    if (isFullscreen) setFocusPanelId(null);
                  }}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</TooltipContent>
            </Tooltip>
            {(onSaveLayout || onLoadLayout || onManageLayouts) && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Layout options</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  {onSaveLayout && (
                    <DropdownMenuItem onClick={onSaveLayout}>
                      Save layout…
                    </DropdownMenuItem>
                  )}
                  {onLoadLayout && (
                    <DropdownMenuItem onClick={onLoadLayout}>
                      Load layout…
                    </DropdownMenuItem>
                  )}
                  {onManageLayouts && (
                    <DropdownMenuItem onClick={onManageLayouts}>
                      Manage layouts…
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </TooltipProvider>
      <CardContent className={isFullscreen ? 'h-[calc(100vh-6rem)] overflow-y-auto pt-4' : 'flex-1 flex flex-col pt-4'}>
        <AnalysisPanelGrid
          context={context}
          telemetry={telemetry}
          compareTelemetry={compareTelemetry}
          compareLapId={compareLapId}
          layout={layout}
          onLayoutChange={onLayoutChange}
          mathChannels={mathChannels}
          focusPanelId={focusPanelId}
          onPanelFullscreenToggle={handlePanelFullscreenToggle}
          focusPanelHeight={focusPanelHeight}
        />
      </CardContent>
    </Card>
  );
}
