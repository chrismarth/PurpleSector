'use client';

import { useMemo, memo, useRef, useEffect, useState } from 'react';
import uPlot from 'uplot';
import { UPlotChart, type UPlotSeries } from './UPlotChart';
import { TelemetryFrame } from '@/types/telemetry';

interface TelemetryChartProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  height?: number;
  disableWindowing?: boolean;
}

const TelemetryChartComponent = ({ 
  data, 
  compareData, 
  height = 300, 
  disableWindowing = false 
}: TelemetryChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 32); // Subtract padding
      }
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Transform data for throttle & brake chart
  const throttleBrakeData = useMemo(() => {
    if (!data || data.length === 0) {
      return { uplotData: [[0], [0], [0]] as uPlot.AlignedData, series: [] as UPlotSeries[] };
    }

    const timeValues = data.map(frame => frame.lapTime / 1000);
    const throttleValues = data.map(frame => frame.throttle * 100);
    const brakeValues = data.map(frame => frame.brake * 100);
    
    const seriesData: number[][] = [timeValues, throttleValues, brakeValues];
    const series: UPlotSeries[] = [
      { label: 'Throttle', color: '#10b981', width: 2 },
      { label: 'Brake', color: '#ef4444', width: 2 },
    ];

    // Add compare data if available
    if (compareData && compareData.length > 0) {
      const compareThrottle = compareData.map((frame, idx) => 
        idx < data.length ? frame.throttle * 100 : 0
      );
      const compareBrake = compareData.map((frame, idx) => 
        idx < data.length ? frame.brake * 100 : 0
      );
      
      seriesData.push(compareThrottle, compareBrake);
      series.push(
        { label: 'Compare Throttle', color: '#a855f7', width: 2, dash: [5, 5] },
        { label: 'Compare Brake', color: '#c084fc', width: 2, dash: [5, 5] }
      );
    }

    return { uplotData: seriesData as uPlot.AlignedData, series };
  }, [data, compareData]);

  // Transform data for steering chart
  const steeringData = useMemo(() => {
    if (!data || data.length === 0) {
      return { uplotData: [[0], [0]] as uPlot.AlignedData, series: [] as UPlotSeries[] };
    }

    const timeValues = data.map(frame => frame.lapTime / 1000);
    const steeringValues = data.map(frame => Math.abs(frame.steering) * 100);
    
    const seriesData: number[][] = [timeValues, steeringValues];
    const series: UPlotSeries[] = [
      { label: 'Steering', color: '#8b5cf6', width: 2 },
    ];

    // Add compare data if available
    if (compareData && compareData.length > 0) {
      const compareSteering = compareData.map((frame, idx) => 
        idx < data.length ? Math.abs(frame.steering) * 100 : 0
      );
      
      seriesData.push(compareSteering);
      series.push(
        { label: 'Compare Steering', color: '#a855f7', width: 2, dash: [5, 5] }
      );
    }

    return { uplotData: seriesData as uPlot.AlignedData, series };
  }, [data, compareData]);

  // Transform data for speed chart
  const speedData = useMemo(() => {
    if (!data || data.length === 0) {
      return { uplotData: [[0], [0]] as uPlot.AlignedData, series: [] as UPlotSeries[] };
    }

    const timeValues = data.map(frame => frame.lapTime / 1000);
    const speedValues = data.map(frame => frame.speed);
    
    const seriesData: number[][] = [timeValues, speedValues];
    const series: UPlotSeries[] = [
      { label: 'Speed', color: '#3b82f6', width: 2 },
    ];

    // Add compare data if available
    if (compareData && compareData.length > 0) {
      const compareSpeed = compareData.map((frame, idx) => 
        idx < data.length ? frame.speed : 0
      );
      
      seriesData.push(compareSpeed);
      series.push(
        { label: 'Compare Speed', color: '#a855f7', width: 2, dash: [5, 5] }
      );
    }

    return { uplotData: seriesData as uPlot.AlignedData, series };
  }, [data, compareData]);

  // Common axes configuration
  const commonAxes = [
    {
      scale: 'x',
      space: 50,
      grid: { show: true },
      label: 'Time (s)',
    },
    {
      scale: 'y',
      space: 50,
      side: 3 as const,
      grid: { show: true },
    },
  ];

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Throttle & Brake Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Throttle & Brake</h3>
        <UPlotChart
          data={throttleBrakeData.uplotData}
          series={throttleBrakeData.series}
          axes={[
            commonAxes[0],
            { ...commonAxes[1], label: 'Input (%)' },
          ]}
          width={containerWidth}
          height={height}
        />
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          {throttleBrakeData.series.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ 
                  backgroundColor: s.color,
                  border: s.dash ? '1px dashed ' + s.color : 'none'
                }}
              />
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Steering Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Steering Input</h3>
        <UPlotChart
          data={steeringData.uplotData}
          series={steeringData.series}
          axes={[
            commonAxes[0],
            { ...commonAxes[1], label: 'Steering (%)' },
          ]}
          width={containerWidth}
          height={height}
        />
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          {steeringData.series.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ 
                  backgroundColor: s.color,
                  border: s.dash ? '1px dashed ' + s.color : 'none'
                }}
              />
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Speed Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Speed</h3>
        <UPlotChart
          data={speedData.uplotData}
          series={speedData.series}
          axes={[
            commonAxes[0],
            { ...commonAxes[1], label: 'Speed (km/h)' },
          ]}
          width={containerWidth}
          height={height}
        />
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-4">
          {speedData.series.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ 
                  backgroundColor: s.color,
                  border: s.dash ? '1px dashed ' + s.color : 'none'
                }}
              />
              <span className="text-sm">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memoize component to prevent re-renders when props haven't changed
export const TelemetryChart = memo(TelemetryChartComponent);
