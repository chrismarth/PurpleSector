'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TelemetryFrame } from '@/types/telemetry';
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
  hasSavedLayout?: boolean;
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
}: TelemetryDataPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Telemetry Data</CardTitle>
            <CardDescription>
              {hasSavedLayout ? 'Layout saved' : 'No saved layout active'}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Layout options"
                >
                  <MoreHorizontal className="h-4 w-4" />
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
          </div>
        </div>
      </CardHeader>
      <CardContent className={isFullscreen ? 'h-[calc(100vh-6rem)] overflow-y-auto' : ''}>
        <AnalysisPanelGrid
          context={context}
          telemetry={telemetry}
          compareTelemetry={compareTelemetry}
          compareLapId={compareLapId}
          layout={layout}
          onLayoutChange={onLayoutChange}
        />
      </CardContent>
    </Card>
  );
}
