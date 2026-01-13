import type * as React from 'react';
import type { TelemetryFrame } from '@purplesector/core';

// Minimal plot configuration types shared with plugins.
// These mirror the core shape used by the web app but are kept local here
// so the plugin API does not depend on Next.js path aliases.
export type TelemetryChannel =
  | 'time'
  | 'throttle'
  | 'brake'
  | 'steering'
  | 'speed'
  | 'gear'
  | 'rpm'
  | 'normalizedPosition';

export interface ChannelConfig {
  id: string;
  channel: TelemetryChannel;
  color?: string;
  useSecondaryAxis?: boolean;
}

export interface PlotConfig {
  id: string;
  title: string;
  xAxis: TelemetryChannel;
  xAxisLabel: string;
  yAxisLabel: string;
  yAxisLabelSecondary?: string;
  channels: ChannelConfig[];
}

export interface PlotLayoutItem {
  plotId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  subRow?: number;
}

export interface PlotLayout {
  items: PlotLayoutItem[];
  cols: number;
}

export type LapAnalysisViewContext = 'singleLap' | 'lapComparison';

export interface LapAnalysisHostAPI {
  // Reserved for future helpers (navigation, theming, etc.)
}

export interface LapAnalysisViewProps {
  context: LapAnalysisViewContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  plotConfigs: PlotConfig[];
  plotLayout: PlotLayout;
  onPlotConfigsChange: (configs: PlotConfig[]) => void;
  onPlotLayoutChange: (layout: PlotLayout) => void;
  host: LapAnalysisHostAPI;
}

export interface LapAnalysisView {
  id: string;
  title: string;
  context: LapAnalysisViewContext;
  render: (props: LapAnalysisViewProps) => React.ReactElement;
}
