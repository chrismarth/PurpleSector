// Plot configuration types for configurable telemetry charts

// For now we keep TelemetryChannel as the explicit union used across the app.
// These IDs correspond to the raw channels defined in the shared telemetry
// package's RAW_CHANNELS list.
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
  channelId: string; // ID of the telemetry channel to plot
  color?: string;
  useSecondaryAxis?: boolean; // If true, plot on right Y-axis
}

export interface PlotConfig {
  id: string;
  title: string;
  xAxis: TelemetryChannel; // Primary X-axis for entire plot
  xAxisLabel: string;
  yAxisLabel: string;
  yAxisLabelSecondary?: string; // Label for secondary Y-axis (right side)
  channels: ChannelConfig[];
}

// Layout item for a single plot in the grid
export interface PlotLayoutItem {
  plotId: string; // References PlotConfig.id
  x: number; // Column position (0-based)
  y: number; // Row position (0-based)
  w: number; // Width in grid units (1-12)
  h: number; // Height in pixels
  subRow?: number; // Sub-row position for vertical stacking within same column (0-based)
}

// Complete layout configuration
export interface PlotLayout {
  items: PlotLayoutItem[];
  cols: number; // Total columns in grid (default: 12)
}

// Helper function to generate default layout from plot configs
export function generateDefaultLayout(plotConfigs: PlotConfig[]): PlotLayout {
  const items: PlotLayoutItem[] = plotConfigs.map((config, index) => ({
    plotId: config.id,
    x: 0,
    y: index,
    w: 12, // Full width
    h: 300, // Default height
  }));

  return {
    items,
    cols: 12,
  };
}

// Default plot configurations
export const DEFAULT_PLOT_CONFIGS: PlotConfig[] = [
  {
    id: 'throttle-brake',
    title: 'Throttle & Brake',
    xAxis: 'time',
    xAxisLabel: 'Time (s)',
    yAxisLabel: 'Input (%)',
    channels: [
      {
        id: 'throttle-1',
        channelId: 'throttle',
        color: '#10b981',
      },
      {
        id: 'brake-1',
        channelId: 'brake',
        color: '#ef4444',
      },
    ],
  },
  {
    id: 'steering',
    title: 'Steering Input',
    xAxis: 'time',
    xAxisLabel: 'Time (s)',
    yAxisLabel: 'Steering (%)',
    channels: [
      {
        id: 'steering-1',
        channelId: 'steering',
        color: '#8b5cf6',
      },
    ],
  },
  {
    id: 'speed',
    title: 'Speed',
    xAxis: 'time',
    xAxisLabel: 'Time (s)',
    yAxisLabel: 'Speed (km/h)',
    channels: [
      {
        id: 'speed-1',
        channelId: 'speed',
        color: '#3b82f6',
      },
    ],
  },
];
