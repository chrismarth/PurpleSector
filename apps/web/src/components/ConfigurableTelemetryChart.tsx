'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, ZoomOut, MoreVertical, SplitSquareHorizontal, SplitSquareVertical, Pencil, Plus } from 'lucide-react';
import uPlot from 'uplot';
import { UPlotChart, UPlotSeries, UPlotAxis } from '@/components/UPlotChart';
import { TelemetryFrame } from '@/types/telemetry';
import { PlotConfig, CHANNEL_METADATA, TelemetryChannel } from '@/types/plotConfig';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlotConfigDialog } from '@/components/PlotConfigDialog';

interface ConfigurableTelemetryChartProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  config: PlotConfig;
  onConfigChange: (config: PlotConfig) => void;
  onDelete?: () => void;
  onSplitHorizontal?: () => void;
  onSplitVertical?: () => void;
  onAddRowBelow?: () => void;
  height?: number;
  syncedHoverValue?: number | null;
  onHoverChange?: (value: number | null) => void;
}

export function ConfigurableTelemetryChart({
  data,
  compareData,
  config,
  onConfigChange,
  onDelete,
  onSplitHorizontal,
  onSplitVertical,
  onAddRowBelow,
  height = 250,
  syncedHoverValue,
  onHoverChange,
}: ConfigurableTelemetryChartProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  
  // Zoom state
  const [zoomDomain, setZoomDomain] = useState<{ x?: [number, number]; y?: [number, number]; y2?: [number, number] } | null>(null);
  
  // Hover state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [syncedHoverIndex, setSyncedHoverIndex] = useState<number | null>(null);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Helper to get channel value from frame
  const getChannelValue = useCallback((frame: TelemetryFrame, channel: TelemetryChannel): number => {
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
  }, []);

  // Transform telemetry data to uPlot format: [xValues, y1Values, y2Values, ...]
  const { uplotData, seriesConfig } = useMemo(() => {
    if (!data || data.length === 0 || config.channels.length === 0) {
      return { uplotData: [[0], [0]] as uPlot.AlignedData, seriesConfig: [] };
    }

    // Build x-axis data
    let filteredData = data;
    
    // Apply zoom domain if set
    if (zoomDomain?.x) {
      const [minX, maxX] = zoomDomain.x;
      filteredData = data.filter((frame) => {
        const xVal = getChannelValue(frame, config.xAxis);
        return xVal >= minX && xVal <= maxX;
      });
      
      // If no data in zoom range, use all data
      if (filteredData.length === 0) {
        filteredData = data;
      }
    }
    
    const xValues = filteredData.map((frame) => getChannelValue(frame, config.xAxis));
    
    // Pre-calculate compare data x-values and create index mapping if compare data exists
    let compareXValues: number[] = [];
    let compareIndexMap: number[] = [];
    
    if (compareData && compareData.length > 0) {
      compareXValues = compareData.map((frame) => getChannelValue(frame, config.xAxis));
      
      // For each x-value in main data, find the closest index in compare data
      compareIndexMap = xValues.map((xVal) => {
        let closestIdx = 0;
        let minDiff = Math.abs(compareXValues[0] - xVal);
        
        for (let i = 1; i < compareXValues.length; i++) {
          const diff = Math.abs(compareXValues[i] - xVal);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
          // Early exit if we've passed the target (data is sorted)
          if (compareXValues[i] > xVal) break;
        }
        
        return closestIdx;
      });
    }
    
    // Build series data for each channel
    // Strategy: Add all main series first, then all compare series
    // This makes indexing more predictable
    const seriesData: number[][] = [xValues];
    const series: UPlotSeries[] = [];
    
    // First pass: Add all main channel data
    config.channels.forEach((channelConfig, channelIndex) => {
      const yValues = filteredData.map((frame) => getChannelValue(frame, channelConfig.channel));
      seriesData.push(yValues);
      
      const channelMeta = CHANNEL_METADATA[channelConfig.channel];
      const dataIndex = seriesData.length - 1;
      const seriesIndex = series.length;
      
      series.push({
        label: channelMeta.label,
        color: channelConfig.color || '#000000',
        scale: channelConfig.useSecondaryAxis ? 'y2' : 'y',
        width: 2,
      });
      
      console.log(`[Chart] DATA[${dataIndex}] → SERIES[${seriesIndex}]: ${channelMeta.label} (${channelConfig.channel}) - Sample values: [${yValues.slice(0, 3).map(v => v.toFixed(1)).join(', ')}...]`);
    });
    
    // Second pass: Add all compare channel data (if available)
    if (compareData && compareData.length > 0) {
      config.channels.forEach((channelConfig, channelIndex) => {
        // Use pre-calculated index mapping to get compare y-values for this channel
        const compareYValues = compareIndexMap.map((compareIdx) => 
          getChannelValue(compareData[compareIdx], channelConfig.channel)
        );
        
        seriesData.push(compareYValues);
        const channelMeta = CHANNEL_METADATA[channelConfig.channel];
        const dataIndex = seriesData.length - 1;
        const seriesIndex = series.length;
        
        series.push({
          label: `Compare ${channelMeta.label}`,
          color: channelConfig.color || '#000000',
          scale: channelConfig.useSecondaryAxis ? 'y2' : 'y',
          width: 2,
          dash: [5, 5],
        });
        
        console.log(`[Chart] DATA[${dataIndex}] → SERIES[${seriesIndex}]: Compare ${channelMeta.label} (${channelConfig.channel}) - Sample values: [${compareYValues.slice(0, 3).map(v => v.toFixed(1)).join(', ')}...], DASHED`);
      });
    }
    
    return { uplotData: seriesData as uPlot.AlignedData, seriesConfig: series };
  }, [data, compareData, config, getChannelValue, zoomDomain]);

  // Build axes configuration
  const axesConfig = useMemo((): UPlotAxis[] => {
    const hasSecondaryAxis = config.channels.some(ch => ch.useSecondaryAxis === true);
    
    const axes: UPlotAxis[] = [
      // X-axis
      {
        scale: 'x',
        space: 50,
        grid: { show: true },
      },
      // Primary Y-axis (left)
      {
        label: config.yAxisLabel,
        scale: 'y',
        space: 50,
        side: 3,
        grid: { show: true },
      },
    ];
    
    // Add secondary Y-axis if needed
    if (hasSecondaryAxis) {
      axes.push({
        label: config.yAxisLabelSecondary || 'Secondary',
        scale: 'y2',
        space: 50,
        side: 1,
        grid: { show: false },
      });
    }
    
    return axes;
  }, [config]);

  // Handle hover from chart
  const handleHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
    
    // Notify parent with x-axis value for syncing
    if (onHoverChange && index !== null && uplotData[0][index] !== undefined) {
      onHoverChange(uplotData[0][index]);
    } else if (onHoverChange && index === null) {
      onHoverChange(null);
    }
  }, [onHoverChange, uplotData]);

  // Convert synced hover value to index
  useEffect(() => {
    if (syncedHoverValue === null || syncedHoverValue === undefined) {
      setSyncedHoverIndex(null);
      return;
    }
    
    // Find closest index to synced value
    const xValues = uplotData[0];
    let closestIdx = null;
    let minDiff = Infinity;
    
    for (let i = 0; i < xValues.length; i++) {
      const diff = Math.abs(xValues[i] - syncedHoverValue);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    
    setSyncedHoverIndex(closestIdx);
  }, [syncedHoverValue, uplotData]);

  // Handle zoom
  const handleZoom = useCallback((min: number, max: number) => {
    setZoomDomain({ x: [min, max] });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomDomain(null);
  }, []);

  // Get hovered data for legend
  const hoveredData = useMemo(() => {
    const idx = syncedHoverIndex !== null ? syncedHoverIndex : hoveredIndex;
    if (idx === null || !uplotData || uplotData.length === 0) return null;
    
    const xValue = uplotData[0][idx];
    const values: Record<string, number> = {};
    
    config.channels.forEach((channelConfig, i) => {
      const seriesIdx = i + 1; // +1 because first series is x-axis
      const val = uplotData[seriesIdx]?.[idx];
      if (val !== undefined && val !== null) {
        values[channelConfig.id] = val;
      }
      
      // Add compare value if available
      if (compareData && compareData.length > 0) {
        const compareSeriesIdx = seriesIdx + config.channels.length;
        const compareVal = uplotData[compareSeriesIdx]?.[idx];
        if (compareVal !== undefined && compareVal !== null) {
          values[`compare_${channelConfig.id}`] = compareVal;
        }
      }
    });
    
    return { xValue, values };
  }, [syncedHoverIndex, hoveredIndex, uplotData, config.channels, compareData]);

  // Custom legend component
  const renderCustomLegend = () => {
    const xAxisMeta = CHANNEL_METADATA[config.xAxis];
    const xValue = hoveredData?.xValue;
    
    return (
      <div className="flex flex-wrap gap-4 justify-center mt-4 px-2">
        {/* X-Axis value - only show when hovering */}
        {hoveredData && xValue !== undefined && (
          <div className="flex items-center gap-2 pr-4 border-r border-gray-300 dark:border-gray-600">
            <span className="text-sm">
              {xAxisMeta.label}:{' '}
              <span className="font-semibold">
                {xValue.toFixed(1)}{xAxisMeta.unit ? ` ${xAxisMeta.unit}` : ''}
              </span>
            </span>
          </div>
        )}
        
        {config.channels.map((channelConfig) => {
          const channelLabel = CHANNEL_METADATA[channelConfig.channel].label;
          const channelUnit = CHANNEL_METADATA[channelConfig.channel].unit;
          const value = hoveredData?.values[channelConfig.id];
          const compareValue = hoveredData?.values[`compare_${channelConfig.id}`];
          const hasCompareData = compareData && compareData.length > 0;
          
          return (
            <div key={channelConfig.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: channelConfig.color || '#000000' }}
              />
              <span className="text-sm">
                {channelLabel}
                {hoveredData && value !== undefined && value !== null && (
                  <>
                    :{' '}
                    <span className="font-semibold">
                      {value.toFixed(1)}{channelUnit ? ` ${channelUnit}` : ''}
                    </span>
                  </>
                )}
                {hasCompareData && hoveredData && compareValue !== undefined && compareValue !== null && (
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

  // Calculate total container height (including legend space)
  const PADDING_VERTICAL = 32;
  const HEADER_HEIGHT = 44;
  const LEGEND_HEIGHT = config.channels.length > 0 ? 48 : 0; // Space for legend
  const totalHeight = PADDING_VERTICAL + HEADER_HEIGHT + height + LEGEND_HEIGHT;

  return (
    <TooltipProvider>
      <div 
        ref={containerRef}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow select-none flex flex-col"
        style={{ minHeight: `${totalHeight}px` }}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
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
            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Plot</p>
                </TooltipContent>
              </Tooltip>
            )}
            {(onSplitHorizontal || onSplitVertical || onAddRowBelow) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onSplitHorizontal && (
                    <DropdownMenuItem onClick={onSplitHorizontal}>
                      <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                      Split Horizontally
                    </DropdownMenuItem>
                  )}
                  {onSplitVertical && (
                    <DropdownMenuItem onClick={onSplitVertical}>
                      <SplitSquareVertical className="h-4 w-4 mr-2" />
                      Split Vertically
                    </DropdownMenuItem>
                  )}
                  {onAddRowBelow && (
                    <DropdownMenuItem onClick={onAddRowBelow}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row Below
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {config.channels.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground" style={{ height: `${height}px` }}>
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
          <div style={{ height: `${height}px` }}>
            <UPlotChart
              data={uplotData}
              series={seriesConfig}
              axes={axesConfig}
              width={containerWidth - 32} // Subtract padding
              height={height}
              onHover={handleHover}
              syncedHoverIndex={syncedHoverIndex}
              onZoom={handleZoom}
            />
          </div>
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
