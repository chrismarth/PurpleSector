'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import uPlot from 'uplot';
import { UPlotChart, type UPlotSeries, type UPlotAxis } from './UPlotChart';
import { TelemetryFrame } from '@/types/telemetry';
import { PlotConfig, TelemetryChannel } from '@/types/plotConfig';
import {
  RAW_CHANNELS,
  RawTelemetryChannel,
  TelemetryChannelDefinition,
  MathTelemetryChannel,
  evaluateMathChannelSeries,
  TimeSeries,
} from '@purplesector/telemetry';
import { Button } from '@/components/ui/button';
import { PlotConfigDialog } from './PlotConfigDialog';

interface ConfigurableTelemetryChartProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  config: PlotConfig;
  onConfigChange: (config: PlotConfig) => void;
  onDelete?: () => void;
  height?: number;
  syncedHoverValue?: number | null;
  onHoverChange?: (value: number | null) => void;
  // Allow parent toolbars to trigger a zoom reset via changing token.
  externalResetZoomToken?: number;
  // Allow parent toolbars to open the config dialog via changing token.
  externalOpenConfigToken?: number;
  mathChannels?: MathTelemetryChannel[];
}

export function ConfigurableTelemetryChart({
  data,
  compareData,
  config,
  onConfigChange,
  onDelete,
  height = 250,
  syncedHoverValue,
  onHoverChange,
  externalResetZoomToken,
  externalOpenConfigToken,
  mathChannels = [],
}: ConfigurableTelemetryChartProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const chartRef = useRef<uPlot | null>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [syncedHoverIndex, setSyncedHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (config.channels.length > 0) return;

    const throttleDef = RAW_CHANNELS.find((ch) => ch.id === 'throttle');
    const brakeDef = RAW_CHANNELS.find((ch) => ch.id === 'brake');

    onConfigChange({
      ...config,
      title: config.title && config.title !== 'New Plot' ? config.title : 'Throttle & Brake',
      xAxis: 'time',
      xAxisLabel: 'Time (s)',
      yAxisLabel: 'Input (%)',
      channels: [
        {
          id: `throttle-${Date.now()}`,
          channelId: 'throttle',
          color: throttleDef?.defaultColor ?? '#10b981',
          useSecondaryAxis: false,
        },
        {
          id: `brake-${Date.now() + 1}`,
          channelId: 'brake',
          color: brakeDef?.defaultColor ?? '#ef4444',
          useSecondaryAxis: false,
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build a lookup map from RAW_CHANNELS and mathChannels for metadata
  const channelDefsById = useMemo(
    () => {
      const allChannels: TelemetryChannelDefinition[] = [...RAW_CHANNELS, ...mathChannels];
      return new Map<string, TelemetryChannelDefinition>(allChannels.map((ch) => [ch.id, ch]));
    },
    [mathChannels],
  );

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
      const channelDef = channelDefsById.get(channelConfig.channelId);
      
      // Skip invalid math channels
      if (channelDef?.kind === 'math' && !channelDef.validated) {
        return;
      }
      
      let values: number[];
      
      if (!channelDef || channelDef.kind === 'raw') {
        // Raw channel: use existing getChannelValue path
        values = data.map((frame) =>
          getChannelValue(frame, channelConfig.channelId as TelemetryChannel),
        );
      } else {
        // Math channel: channelDef.kind === 'math'
        const mathDef = channelDef; // TypeScript now knows this is MathTelemetryChannel
        const inputSeries: Record<string, TimeSeries> = {};
        
        // Build input series for each required channel
        for (const input of mathDef.inputs) {
          const inputDef = channelDefsById.get(input.channelId);
          if (inputDef && inputDef.kind === 'raw') {
            inputSeries[input.channelId] = data.map((frame) => ({
              t: frame.lapTime / 1000,
              v: getChannelValue(frame, input.channelId as TelemetryChannel),
            }));
          }
        }
        
        // Evaluate the math channel
        const resultSeries = evaluateMathChannelSeries(mathDef, inputSeries);
        values = resultSeries.map(s => s.v ?? 0);
      }
      
      seriesData.push(values);
      series.push({
        label: channelDef?.label ?? channelConfig.channelId,
        color: channelConfig.color ?? channelDef?.defaultColor ?? '#000000',
        scale: 'y',
      });
    });

    secondaryChannels.forEach((channelConfig) => {
      const channelDef = channelDefsById.get(channelConfig.channelId);
      
      // Skip invalid math channels
      if (channelDef?.kind === 'math' && !channelDef.validated) {
        return;
      }
      
      let values: number[];
      
      if (!channelDef || channelDef.kind === 'raw') {
        // Raw channel: use existing getChannelValue path
        values = data.map((frame) =>
          getChannelValue(frame, channelConfig.channelId as TelemetryChannel),
        );
      } else {
        // Math channel: channelDef.kind === 'math'
        const mathDef = channelDef as MathTelemetryChannel;
        const inputSeries: Record<string, TimeSeries> = {};
        
        // Build input series for each required channel
        for (const input of mathDef.inputs) {
          const inputDef = channelDefsById.get(input.channelId);
          if (inputDef && inputDef.kind === 'raw') {
            inputSeries[input.channelId] = data.map((frame) => ({
              t: frame.lapTime / 1000,
              v: getChannelValue(frame, input.channelId as TelemetryChannel),
            }));
          }
        }
        
        // Evaluate the math channel
        const resultSeries = evaluateMathChannelSeries(mathDef, inputSeries);
        values = resultSeries.map(s => s.v ?? 0);
      }
      
      seriesData.push(values);
      series.push({
        label: channelDef?.label ?? channelConfig.channelId,
        color: channelConfig.color ?? channelDef?.defaultColor ?? '#000000',
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
  }, [data, config, getChannelValue, channelDefsById]);

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

  const resetZoom = useCallback(() => {
    if (!chartRef.current) return;

    const xVals = chartData.uplotData[0];
    if (!xVals || xVals.length === 0) return;

    const min = xVals[0] as number;
    const max = xVals[xVals.length - 1] as number;

    chartRef.current.setScale('x', { min, max });
    chartRef.current.setSelect({ left: 0, top: 0, width: 0, height: 0 });
  }, [chartData.uplotData]);

  useEffect(() => {
    if (externalResetZoomToken !== undefined) {
      resetZoom();
    }
  }, [externalResetZoomToken, resetZoom]);

  useEffect(() => {
    if (externalOpenConfigToken !== undefined && externalOpenConfigToken > 0) {
      setShowConfigDialog(true);
    }
  }, [externalOpenConfigToken]);

  const handleChartReady = useCallback((chart: uPlot) => {
    chartRef.current = chart;
  }, []);

  const renderCustomLegend = () => {
    if (!data || data.length === 0 || chartData.series.length === 0) return null;

    // hoveredIndex can sometimes be out of bounds (e.g. -1) depending on chart hover behavior.
    let currentIndex = hoveredIndex ?? data.length - 1;
    if (currentIndex < 0 || currentIndex >= data.length) {
      currentIndex = data.length - 1;
    }
    if (currentIndex < 0 || currentIndex >= data.length) {
      return null;
    }

    const currentTime = data[currentIndex].lapTime / 1000;

    const values = chartData.series.map((series, seriesIndex) => {
      const channelConfig = config.channels[seriesIndex];
      const channelDef = channelDefsById.get(channelConfig.channelId);
      
      // Get value from chartData.uplotData instead of getChannelValue
      // seriesIndex + 1 because uplotData[0] is the time/x-axis data
      const value = chartData.uplotData[seriesIndex + 1]?.[currentIndex] ?? 0;

      return {
        label: channelDef?.label ?? channelConfig.channelId,
        value,
        unit: channelDef?.unit ?? '',
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
    <div ref={containerRef} className="bg-card rounded-lg border p-4 space-y-3">
      {config.title && (
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm truncate">{config.title}</span>
        </div>
      )}

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
          <div style={{ height: `${height}px` }} className="overflow-hidden">
            <UPlotChart
              data={chartData.uplotData}
              series={chartData.series}
              axes={chartData.axes}
              width={containerWidth - 32}
              height={height}
              onHover={handleHover}
              syncedHoverIndex={syncedHoverIndex}
              onReady={handleChartReady}
            />
          </div>
        )}

      {config.channels.length > 0 && renderCustomLegend()}

      <PlotConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={config}
        onSave={onConfigChange}
        mathChannels={mathChannels}
      />
    </div>
  );
}
