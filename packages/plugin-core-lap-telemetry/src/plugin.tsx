"use client";

import * as React from 'react';
import type {
  PluginModule,
  PluginContext,
  LapAnalysisView,
  LapAnalysisViewProps,
  PluginManifest,
} from '@purplesector/plugin-api';
import { TelemetryPlotPanel } from '@purplesector/web-charts';

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
    ctx.registerLapAnalysisView(lapTelemetryPlotsView);
  },
};

export default plugin;
