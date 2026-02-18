"use client";

import * as React from 'react';
import type {
  PluginModule,
  PluginClientContext,
  LapAnalysisView,
  LapAnalysisViewProps,
  PluginManifest,
  AnalysisPanelProps,
  AnalysisPanelRenderResult,
} from '@purplesector/plugin-api';
import { TelemetryPlotPanel, SimpleTelemetryPlotPanel } from '@purplesector/web-charts';
import { Button } from '@/components/ui/button';
import { ZoomOut, Pencil } from 'lucide-react';

const lapTelemetryPlotsView: LapAnalysisView = {
  id: 'core-lap-telemetry-plots',
  title: 'Telemetry Plots',
  context: 'singleLap',
  render: (props: LapAnalysisViewProps) => {
    const {
      telemetry,
      compareTelemetry,
      compareLapId,
      plotConfigs,
      plotLayout,
      onPlotConfigsChange,
      onPlotLayoutChange,
    } = props;

    return (
      <TelemetryPlotPanel
        data={telemetry}
        compareData={compareTelemetry}
        compareLapId={compareLapId ?? undefined}
        initialPlotConfigs={plotConfigs}
        initialLayout={plotLayout}
        onPlotConfigsChange={onPlotConfigsChange}
        onLayoutChange={onPlotLayoutChange}
      />
    );
  },
};

const manifest: PluginManifest = {
  id: 'purple-sector.core-lap-views',
  name: 'Core Lap Telemetry Views',
  version: '0.1.0',
  description: 'Built-in lap telemetry plot views',
  capabilities: ['lapAnalysisView'],
  entry: './plugin',
};

const plugin: PluginModule = {
  manifest,
  register(ctx: PluginClientContext) {
    // Legacy lap analysis view (will be phased out in favor of generic panel grid)
    ctx.registerLapAnalysisView(lapTelemetryPlotsView);

    // Generic analysis panel type for telemetry plots
    ctx.registerAnalysisPanelType({
      id: 'plot',
      label: 'Telemetry Plot',
    });

    // Per-panel stable action refs so toolbar buttons can reach the
    // imperative actions registered by each SimpleTelemetryPlotPanel instance.
    type PanelActions = { resetZoom: () => void; openConfig: () => void };
    const panelActionsMap = new Map<string, PanelActions>();

    ctx.registerAnalysisPanelProvider({
      id: 'core-telemetry-plot-panel',
      typeId: 'plot',
      isDefault: true,
      render: (props: AnalysisPanelProps): AnalysisPanelRenderResult => {
        // Use the panel id from the host to key actions per panel instance.
        const panelId = props.panelId ?? `plot-${panelActionsMap.size}`;

        const toolbarActions = (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                panelActionsMap.get(panelId)?.resetZoom?.();
              }}
              title="Reset zoom"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                panelActionsMap.get(panelId)?.openConfig?.();
              }}
              title="Edit plot"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </>
        );

        return {
          title: undefined,
          toolbarActions,
          content: (
            <SimpleTelemetryPlotPanel
              data={props.telemetry}
              compareData={props.compareTelemetry}
              syncedHoverValue={props.syncedHoverValue}
              onHoverChange={props.onHoverChange}
              initialConfig={props.panelState as any}
              onTitleChange={(title) => props.host.setTitle?.(title)}
              onRegisterActions={(a) => {
                panelActionsMap.set(panelId, a);
              }}
              mathChannels={props.mathChannels}
            />
          ),
        };
      },
    });
  },
};

export default plugin;
