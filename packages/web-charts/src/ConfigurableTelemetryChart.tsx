'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, ZoomOut, MoreVertical, SplitSquareHorizontal, SplitSquareVertical, Pencil, Plus } from 'lucide-react';
import uPlot from 'uplot';
import { UPlotChart, type UPlotSeries, type UPlotAxis } from './UPlotChart';
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
import { PlotConfigDialog } from '@purplesector/web-charts';

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

  const [zoomDomain, setZoomDomain] = useState<{
    x?: [number, number];
    y?: [number, number];
    y2?: [number, number];
  } | null>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [syncedHoverIndex, setSyncedHoverIndex] = useState<number | null>(null);

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

  const getChannelValue = useCallback((frame: TelemetryFrame, channel: TelemetryChannel): number => {
    switch (channel) {
      case 'time':
        return frame.lapTime / 1000;
      case 'normalizedPosition':
        return frame.normalizedPosition * 100;
      case 'throttle':
        return frame.throttle * 100;
      case 'brake':
        return frame.brake * 100;
      case 'steering':
        return frame.steering * 100;
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

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        uplotData: [[0], [0]] as uPlot.AlignedData,
        series: [] as UPlotSeries[],
        axes: [] as UPlotAxis[],
      };
    }

    const timeValues = data.map((frame) => frame.lapTime / 1000);

    const primaryChannels = config.channels.filter((c) => !c.useSecondaryAxis);
    const secondaryChannels = config.channels.filter((c) => c.useSecondaryAxis);

    const seriesData: number[][] = [timeValues];
    const series: UPlotSeries[] = [];

    primaryChannels.forEach((channelConfig) => {
      const values = data.map((frame) => getChannelValue(frame, channelConfig.channel));
      seriesData.push(values);
      series.push({
        label: CHANNEL_METADATA[channelConfig.channel].label,
        color: channelConfig.color || CHANNEL_METADATA[channelConfig.channel].defaultColor,
        scale: 'y',
      });
    });

    secondaryChannels.forEach((channelConfig) => {
      const values = data.map((frame) => getChannelValue(frame, channelConfig.channel));
      seriesData.push(values);
      series.push({
        label: CHANNEL_METADATA[channelConfig.channel].label,
        color: channelConfig.color || CHANNEL_METADATA[channelConfig.channel].defaultColor,
        scale: 'y2',
      });
    });

    const uplotData: uPlot.AlignedData = [timeValues, ...seriesData.slice(1)];

    const axes: UPlotAxis[] = [
      {
        scale: 'x',
        label: config.xAxisLabel,
      },
      {
        scale: 'y',
        label: config.yAxisLabel,
      },
    ];

    if (secondaryChannels.length > 0 && config.yAxisLabelSecondary) {
      axes.push({
        scale: 'y2',
        label: config.yAxisLabelSecondary,
        side: 1,
      });
    }

    return { uplotData, series, axes };
  }, [data, config, getChannelValue]);

  useEffect(() => {
    if (syncedHoverValue == null || !data || data.length === 0) {
      setSyncedHoverIndex(null);
      return;
    }

    let bestIndex = 0;
    let bestDiff = Math.abs(data[0].lapTime / 1000 - syncedHoverValue);

    for (let i = 1; i < data.length; i++) {
      const diff = Math.abs(data[i].lapTime / 1000 - syncedHoverValue);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIndex = i;
      }
    }

    setSyncedHoverIndex(bestIndex);
  }, [syncedHoverValue, data]);

  const handleHover = useCallback(
    (index: number | null) => {
      setHoveredIndex(index);
      if (index == null || !data || data.length === 0) {
        onHoverChange?.(null);
        return;
      }
      const t = data[index].lapTime / 1000;
      onHoverChange?.(t);
    },
    [data, onHoverChange]
  );

  const handleZoom = useCallback(
    (min: number, max: number) => {
      setZoomDomain({
        x: [min, max],
      });
    },
    []
  );

  const resetZoom = useCallback(() => {
    setZoomDomain(null);
  }, []);

  const renderCustomLegend = () => {
    if (!data || data.length === 0 || chartData.series.length === 0) return null;

    const currentIndex = hoveredIndex ?? data.length - 1;
    const currentTime = data[currentIndex].lapTime / 1000;

    const values = chartData.series.map((series, seriesIndex) => {
      const channelConfig = config.channels[seriesIndex];
      const channel = CHANNEL_METADATA[channelConfig.channel];
      const value = getChannelValue(data[currentIndex], channelConfig.channel);

      return {
        label: channel.label,
        value,
        unit: channel.unit,
        color: series.color,
      };
    });

    return (
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="font-mono">
          t = {currentTime.toFixed(2)} s
        </div>
        {values.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}:</span>
            <span className="font-mono">{item.value.toFixed(1)}</span>
            {item.unit && <span>{item.unit}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div ref={containerRef} className="bg-card rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">{config.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetZoom}
                  disabled={!zoomDomain}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset zoom</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowConfigDialog(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Configure Plot
                </DropdownMenuItem>
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
                {onDelete && (
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Plot
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {config.channels.length === 0 ? (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height: `${height}px` }}
          >
            <div className="text-center">
              <p className="mb-2">No channels configured</p>
              <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
                Configure Plot
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ height: `${height}px` }}>
            <UPlotChart
              data={chartData.uplotData}
              series={chartData.series}
              axes={chartData.axes}
              width={containerWidth - 32}
              height={height}
              onHover={handleHover}
              syncedHoverIndex={syncedHoverIndex}
              onZoom={handleZoom}
            />
          </div>
        )}

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
