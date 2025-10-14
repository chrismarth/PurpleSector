// Plot configuration types for configurable telemetry charts

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

// Channel metadata for UI
export interface ChannelMetadata {
  key: TelemetryChannel;
  label: string;
  unit: string;
  defaultColor: string;
  isTimeAxis: boolean; // Can be used as X axis (time-based)
}

export const CHANNEL_METADATA: Record<TelemetryChannel, ChannelMetadata> = {
  time: {
    key: 'time',
    label: 'Time',
    unit: 's',
    defaultColor: '#000000',
    isTimeAxis: true,
  },
  normalizedPosition: {
    key: 'normalizedPosition',
    label: 'Track Position',
    unit: '%',
    defaultColor: '#000000',
    isTimeAxis: true,
  },
  throttle: {
    key: 'throttle',
    label: 'Throttle',
    unit: '%',
    defaultColor: '#10b981',
    isTimeAxis: false,
  },
  brake: {
    key: 'brake',
    label: 'Brake',
    unit: '%',
    defaultColor: '#ef4444',
    isTimeAxis: false,
  },
  steering: {
    key: 'steering',
    label: 'Steering',
    unit: '%',
    defaultColor: '#8b5cf6',
    isTimeAxis: false,
  },
  speed: {
    key: 'speed',
    label: 'Speed',
    unit: 'km/h',
    defaultColor: '#3b82f6',
    isTimeAxis: false,
  },
  gear: {
    key: 'gear',
    label: 'Gear',
    unit: '',
    defaultColor: '#f59e0b',
    isTimeAxis: false,
  },
  rpm: {
    key: 'rpm',
    label: 'RPM',
    unit: 'rpm',
    defaultColor: '#ec4899',
    isTimeAxis: false,
  },
};

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
        channel: 'throttle',
        color: '#10b981',
      },
      {
        id: 'brake-1',
        channel: 'brake',
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
        channel: 'steering',
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
        channel: 'speed',
        color: '#3b82f6',
      },
    ],
  },
];
