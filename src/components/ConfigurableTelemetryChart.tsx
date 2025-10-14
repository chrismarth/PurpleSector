'use client';

import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TelemetryFrame } from '@/types/telemetry';
import { PlotConfig, CHANNEL_METADATA, TelemetryChannel } from '@/types/plotConfig';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlotConfigDialog } from '@/components/PlotConfigDialog';

interface ConfigurableTelemetryChartProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  config: PlotConfig;
  onConfigChange: (config: PlotConfig) => void;
  height?: number;
}

export function ConfigurableTelemetryChart({
  data,
  compareData,
  config,
  onConfigChange,
  height = 250,
}: ConfigurableTelemetryChartProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // Transform telemetry data based on configuration
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Helper to get channel value from frame
    const getChannelValue = (frame: TelemetryFrame, channel: TelemetryChannel): number => {
      switch (channel) {
        case 'time':
          return frame.lapTime / 1000; // Convert to seconds
        case 'normalizedPosition':
          return frame.normalizedPosition * 100; // Convert to percentage
        case 'throttle':
          return frame.throttle * 100;
        case 'brake':
          return frame.brake * 100;
        case 'steering':
          return Math.abs(frame.steering) * 100; // Convert to 0-100 range
        case 'speed':
          return frame.speed;
        case 'gear':
          return frame.gear;
        case 'rpm':
          return frame.rpm;
        default:
          return 0;
      }
    };

    // Build chart data points
    return data.map((frame, index) => {
      const point: any = { index };

      // Set primary X-axis value
      point.xAxis = getChannelValue(frame, config.xAxis);

      // Add configured channels
      config.channels.forEach((channelConfig) => {
        const yValue = getChannelValue(frame, channelConfig.channel);
        point[channelConfig.id] = yValue;

        // Add compare data if available
        if (compareData && compareData[index]) {
          const compareYValue = getChannelValue(compareData[index], channelConfig.channel);
          point[`compare_${channelConfig.id}`] = compareYValue;
        }
      });

      return point;
    });
  }, [data, compareData, config]);

  // Get domain for primary Y axis based on channel types
  const getPrimaryYAxisDomain = (): [number, number] | ['auto', 'auto'] => {
    const primaryChannels = config.channels.filter(ch => !ch.useSecondaryAxis);
    if (primaryChannels.length === 0) return ['auto', 'auto'];
    
    // Check if all primary channels are percentage-based
    const allPercentage = primaryChannels.every((ch) => {
      const metadata = CHANNEL_METADATA[ch.channel];
      return metadata.unit === '%';
    });

    if (allPercentage) {
      return [0, 100];
    }

    return ['auto', 'auto'];
  };

  // Get domain for secondary Y axis
  const getSecondaryYAxisDomain = (): [number, number] | ['auto', 'auto'] => {
    const secondaryChannels = config.channels.filter(ch => ch.useSecondaryAxis);
    if (secondaryChannels.length === 0) return ['auto', 'auto'];
    
    // Check if all secondary channels are percentage-based
    const allPercentage = secondaryChannels.every((ch) => {
      const metadata = CHANNEL_METADATA[ch.channel];
      return metadata.unit === '%';
    });

    if (allPercentage) {
      return [0, 100];
    }

    return ['auto', 'auto'];
  };

  // Check if any channel uses secondary axis
  const hasSecondaryAxis = config.channels.some(ch => ch.useSecondaryAxis);

  return (
    <TooltipProvider>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConfigDialog(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit Plot</p>
            </TooltipContent>
          </Tooltip>
        </div>

      {config.channels.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <p className="mb-2">No channels configured</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfigDialog(true)}
            >
              Configure Plot
            </Button>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="xAxis"
              label={{
                value: config.xAxisLabel,
                position: 'insideBottom',
                offset: -5,
              }}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            
            {/* Primary Y-Axis (Left) */}
            <YAxis
              yAxisId="left"
              label={{
                value: config.yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                offset: 0,
                style: { textAnchor: 'middle' },
              }}
              domain={getPrimaryYAxisDomain()}
            />
            
            {/* Secondary Y-Axis (Right) - only if needed */}
            {hasSecondaryAxis && (
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: config.yAxisLabelSecondary || 'Secondary',
                  angle: 90,
                  position: 'insideRight',
                  offset: 0,
                  style: { textAnchor: 'middle' },
                }}
                domain={getSecondaryYAxisDomain()}
              />
            )}
            
            <ChartTooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />

            {/* Render lines for each configured channel */}
            {config.channels.map((channelConfig) => {
              const channelLabel = CHANNEL_METADATA[channelConfig.channel].label;
              return (
                <Line
                  key={channelConfig.id}
                  yAxisId={channelConfig.useSecondaryAxis ? 'right' : 'left'}
                  type="monotone"
                  dataKey={channelConfig.id}
                  stroke={channelConfig.color || '#000000'}
                  strokeWidth={2}
                  dot={false}
                  name={channelLabel}
                />
              );
            })}

            {/* Render compare lines if available */}
            {compareData &&
              config.channels.map((channelConfig) => {
                const channelLabel = CHANNEL_METADATA[channelConfig.channel].label;
                return (
                  <Line
                    key={`compare_${channelConfig.id}`}
                    yAxisId={channelConfig.useSecondaryAxis ? 'right' : 'left'}
                    type="monotone"
                    dataKey={`compare_${channelConfig.id}`}
                    stroke={channelConfig.color || '#000000'}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name={`Compare ${channelLabel}`}
                    opacity={0.6}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
      )}

      <PlotConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={config}
        onSave={onConfigChange}
      />
      </div>
    </TooltipProvider>
  );
}
