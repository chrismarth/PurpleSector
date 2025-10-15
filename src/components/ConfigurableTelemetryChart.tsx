'use client';

import { useMemo, useState } from 'react';
import { Pencil, ZoomOut } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
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
  
  // Zoom state
  const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
  const [refAreaRight, setRefAreaRight] = useState<string | number>('');
  const [zoomDomain, setZoomDomain] = useState<{ x?: [number, number]; yLeft?: [number, number]; yRight?: [number, number] } | null>(null);
  
  // Hover state for legend
  const [hoveredData, setHoveredData] = useState<any>(null);

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

  // Zoom handlers
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel !== undefined) {
      setRefAreaLeft(e.activeLabel);
    }
  };

  const handleMouseMove = (e: any) => {
    // Update hover data for legend
    if (e && e.activePayload) {
      setHoveredData(e.activePayload[0]?.payload);
    }
    
    // Handle zoom selection
    if (refAreaLeft && e && e.activeLabel !== undefined) {
      setRefAreaRight(e.activeLabel);
    }
  };
  
  const handleMouseLeave = () => {
    setHoveredData(null);
  };

  const handleMouseUp = () => {
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      // Zoom in
      const left = Math.min(Number(refAreaLeft), Number(refAreaRight));
      const right = Math.max(Number(refAreaLeft), Number(refAreaRight));
      
      // Get Y-axis ranges for the zoomed region
      const zoomedData = chartData.filter(
        (item) => item.xAxis >= left && item.xAxis <= right
      );
      
      let yLeftMin = Infinity;
      let yLeftMax = -Infinity;
      let yRightMin = Infinity;
      let yRightMax = -Infinity;
      
      zoomedData.forEach((item) => {
        config.channels.forEach((ch) => {
          const value = item[ch.id];
          if (value !== undefined && value !== null) {
            if (ch.useSecondaryAxis) {
              yRightMin = Math.min(yRightMin, value);
              yRightMax = Math.max(yRightMax, value);
            } else {
              yLeftMin = Math.min(yLeftMin, value);
              yLeftMax = Math.max(yLeftMax, value);
            }
          }
        });
      });
      
      // Add 5% padding to Y-axis ranges
      const yLeftPadding = (yLeftMax - yLeftMin) * 0.05;
      const yRightPadding = (yRightMax - yRightMin) * 0.05;
      
      setZoomDomain({
        x: [left, right],
        yLeft: yLeftMin !== Infinity ? [yLeftMin - yLeftPadding, yLeftMax + yLeftPadding] : undefined,
        yRight: yRightMin !== Infinity ? [yRightMin - yRightPadding, yRightMax + yRightPadding] : undefined,
      });
    }
    
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const handleZoomOut = () => {
    setZoomDomain(null);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  // Custom legend component that shows current values on hover
  const renderCustomLegend = () => {
    // Get X-axis metadata
    const xAxisMeta = CHANNEL_METADATA[config.xAxis];
    const xAxisValue = hoveredData?.xAxis;
    
    return (
      <div className="flex flex-wrap gap-4 justify-center mt-4 px-2">
        {/* X-Axis value - only show when hovering */}
        {hoveredData && xAxisValue !== undefined && (
          <div className="flex items-center gap-2 pr-4 border-r border-gray-300">
            <span className="text-sm">
              {xAxisMeta.label}:{' '}
              <span className="font-semibold">
                {xAxisValue.toFixed(1)}{xAxisMeta.unit ? ` ${xAxisMeta.unit}` : ''}
              </span>
            </span>
          </div>
        )}
        
        {config.channels.map((channelConfig) => {
          const channelLabel = CHANNEL_METADATA[channelConfig.channel].label;
          const channelUnit = CHANNEL_METADATA[channelConfig.channel].unit;
          const value = hoveredData?.[channelConfig.id];
          const compareValue = compareData && hoveredData?.[`compare_${channelConfig.id}`];
          
          return (
            <div key={channelConfig.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: channelConfig.color || '#000000' }}
              />
              <span className="text-sm">
                {channelLabel}:{' '}
                <span className="font-semibold">
                  {value !== undefined && value !== null
                    ? `${value.toFixed(1)}${channelUnit ? ` ${channelUnit}` : ''}`
                    : '—'}
                </span>
                {compareValue !== undefined && compareValue !== null && (
                  <span className="text-muted-foreground ml-1">
                    (vs {compareValue.toFixed(1)}{channelUnit ? ` ${channelUnit}` : ''})
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{config.title}</h3>
          <div className="flex gap-2">
            {zoomDomain && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset Zoom</p>
                </TooltipContent>
              </Tooltip>
            )}
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
          <LineChart 
            data={chartData}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="xAxis"
              type="number"
              label={{
                value: config.xAxisLabel,
                position: 'insideBottom',
                offset: -5,
              }}
              tick={{ fontSize: 11 }}
              domain={zoomDomain?.x || ['auto', 'auto']}
              allowDataOverflow
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
              domain={zoomDomain?.yLeft || getPrimaryYAxisDomain()}
              allowDataOverflow
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
                domain={zoomDomain?.yRight || getSecondaryYAxisDomain()}
                allowDataOverflow
              />
            )}

            {/* Vertical reference line at hover position */}
            {hoveredData && (
              <ReferenceLine
                x={hoveredData.xAxis}
                yAxisId="left"
                stroke="#888"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

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
                  dot={(props: any) => {
                    if (hoveredData && props.payload.xAxis === hoveredData.xAxis) {
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill={channelConfig.color || '#000000'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }
                    return <></>;
                  }}
                  name={channelLabel}
                  isAnimationActive={false}
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
                    dot={(props: any) => {
                      if (hoveredData && props.payload.xAxis === hoveredData.xAxis) {
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={3.5}
                            fill={channelConfig.color || '#000000'}
                            stroke="#fff"
                            strokeWidth={2}
                            opacity={0.8}
                          />
                        );
                      }
                      return <></>;
                    }}
                    name={`Compare ${channelLabel}`}
                    opacity={0.6}
                    isAnimationActive={false}
                  />
                );
              })}
            
            {/* Zoom selection area */}
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                yAxisId="left"
                x1={refAreaLeft}
                x2={refAreaRight}
                strokeOpacity={0.3}
                fill="#8884d8"
                fillOpacity={0.3}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {/* Custom legend with values */}
      {config.channels.length > 0 && renderCustomLegend()}

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
