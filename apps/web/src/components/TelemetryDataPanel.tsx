'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MoreVertical, Sliders } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TelemetryFrame } from '@/types/telemetry';
import type { MathTelemetryChannel } from '@purplesector/telemetry';
import type { AnalysisLayoutJSON } from '@/lib/analysisLayout';
import type { AnalysisPanelContext } from '@purplesector/plugin-api';
import { AnalysisPanelGrid } from '@/components/AnalysisPanelGrid';

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
  onManageChannels?: () => void;
  hasSavedLayout?: boolean;
  mathChannels?: MathTelemetryChannel[];
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
  onManageChannels,
  mathChannels,
}: TelemetryDataPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'flex flex-col h-full'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Telemetry Data</CardTitle>
            <CardDescription>
              {hasSavedLayout ? 'Layout saved' : 'No saved layout active'}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onManageChannels}
              title="Manage channels"
            >
              <Sliders className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen((v) => !v)}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Layout options"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onSaveLayout}>
                  Save layout…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onLoadLayout}>
                  Load layout…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onManageLayouts}>
                  Manage layouts…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isFullscreen ? 'h-[calc(100vh-6rem)] overflow-y-auto' : 'flex-1 flex flex-col'}>
        <AnalysisPanelGrid
          context={context}
          telemetry={telemetry}
          compareTelemetry={compareTelemetry}
          compareLapId={compareLapId}
          layout={layout}
          onLayoutChange={onLayoutChange}
          mathChannels={mathChannels}
        />
      </CardContent>
    </Card>
  );
}
