"use client";

import * as React from 'react';
import type {
  PluginModule,
  PluginContext,
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
  register(ctx: PluginContext) {
    // Legacy lap analysis view (will be phased out in favor of generic panel grid)
    ctx.registerLapAnalysisView(lapTelemetryPlotsView);

    // Generic analysis panel type for telemetry plots
    ctx.registerAnalysisPanelType({
      id: 'plot',
      label: 'Telemetry Plot',
    });

    // Default provider for plot panels using a lightweight inner plot panel
    ctx.registerAnalysisPanelProvider({
      id: 'core-telemetry-plot-panel',
      typeId: 'plot',
      isDefault: true,
      render: (props: AnalysisPanelProps): AnalysisPanelRenderResult => {
        let actions:
          | {
              resetZoom: () => void;
              openConfig: () => void;
            }
          | null = null;

        const toolbarActions = (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                actions?.resetZoom?.();
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
                actions?.openConfig?.();
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
              onTitleChange={(title) => props.host.setTitle?.(title)}
              onRegisterActions={(a) => {
                actions = a;
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
