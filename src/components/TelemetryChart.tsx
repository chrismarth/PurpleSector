'use client';

import { useMemo, memo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TelemetryFrame } from '@/types/telemetry';

interface TelemetryChartProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  height?: number;
  disableWindowing?: boolean; // For lap detail page - show entire lap
}

interface ChartDataPoint {
  index: number;
  time: string;
  throttle: number;
  brake: number;
  steering: number;
  speed: number;
  compareThrottle?: number;
  compareBrake?: number;
  compareSteering?: number;
  compareSpeed?: number;
}

const TelemetryChartComponent = ({ data, compareData, height = 300, disableWindowing = false }: TelemetryChartProps) => {
  // Cache for transformed data - only transform new frames
  const transformedCacheRef = useRef<ChartDataPoint[]>([]);
  const lastProcessedIndexRef = useRef(0);

  const chartData = useMemo(() => {
    const windowSize = 1000; // Show last 1000 frames (~16 seconds at 60Hz)
    
    // Detect lap reset (data array got smaller)
    if (data.length < lastProcessedIndexRef.current) {
      transformedCacheRef.current = [];
      lastProcessedIndexRef.current = 0;
    }
    
    // Only transform frames we haven't processed yet
    const newFramesStart = lastProcessedIndexRef.current;
    const newFrames = data.slice(newFramesStart);
    
    // If no new frames and no compare data, return cached data
    if (newFrames.length === 0 && !compareData) {
      return transformedCacheRef.current;
    }
    
    // Transform only the NEW frames (incremental update!)
    const newTransformedFrames = newFrames.map((frame, idx) => ({
      index: newFramesStart + idx,
      time: (frame.lapTime / 1000).toFixed(2),
      throttle: frame.throttle * 100,
      brake: frame.brake * 100,
      steering: frame.steering * 100, // -100 to 100 (left to right)
      speed: frame.speed,
    }));
    
    // Append new transformed frames to cache
    transformedCacheRef.current = [...transformedCacheRef.current, ...newTransformedFrames];
    lastProcessedIndexRef.current = data.length;
    
    // Keep only the sliding window (most recent frames) unless windowing is disabled
    if (!disableWindowing && transformedCacheRef.current.length > windowSize) {
      transformedCacheRef.current = transformedCacheRef.current.slice(-windowSize);
    }
    
    // If we have compare data, merge it in by matching lap times
    if (compareData && compareData.length > 0) {
      // Create a map of compare data by lap time for efficient lookup
      const compareMap = new Map<string, TelemetryFrame>();
      compareData.forEach(frame => {
        const timeKey = (frame.lapTime / 1000).toFixed(2);
        compareMap.set(timeKey, frame);
      });
      
      const mergedData = transformedCacheRef.current.map((point) => {
        const compareFrame = compareMap.get(point.time);
        if (compareFrame) {
          return {
            ...point,
            compareThrottle: compareFrame.throttle * 100,
            compareBrake: compareFrame.brake * 100,
            compareSteering: compareFrame.steering * 100, // -100 to 100 (left to right)
            compareSpeed: compareFrame.speed,
          };
        }
        return point;
      });
      return mergedData;
    }
    
    return transformedCacheRef.current;
  }, [data, compareData, disableWindowing]);

  return (
    <div className="space-y-6">
      {/* Throttle & Brake Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Throttle & Brake</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="time"
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              label={{ value: 'Input (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="throttle"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Throttle"
            />
            <Line
              type="monotone"
              dataKey="brake"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Brake"
            />
            {compareData && (
              <>
                <Line
                  type="monotone"
                  dataKey="compareThrottle"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Compare Throttle"
                />
                <Line
                  type="monotone"
                  dataKey="compareBrake"
                  stroke="#c084fc"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Compare Brake"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Steering Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Steering Input</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="time"
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              label={{ value: 'Steering (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="steering"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Steering"
            />
            {compareData && (
              <Line
                type="monotone"
                dataKey="compareSteering"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Compare Steering"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Speed Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold mb-4">Speed</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="time"
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="speed"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Speed"
            />
            {compareData && (
              <Line
                type="monotone"
                dataKey="compareSpeed"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Compare Speed"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Memoize component to prevent re-renders when props haven't changed
export const TelemetryChart = memo(TelemetryChartComponent);
