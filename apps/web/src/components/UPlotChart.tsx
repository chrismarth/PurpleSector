'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface UPlotSeries {
  label: string;
  color: string;
  show?: boolean;
  stroke?: string;
  width?: number;
  dash?: number[];
  points?: { show?: boolean };
  scale?: string; // 'y' or 'y2' for dual axes
}

export interface UPlotAxis {
  label?: string;
  scale?: string;
  side?: 0 | 1 | 2 | 3; // 0=top, 1=right, 2=bottom, 3=left
  grid?: { show?: boolean };
  ticks?: { show?: boolean };
  values?: (u: uPlot, vals: number[]) => string[];
  space?: number;
  size?: number;
}

export interface UPlotChartProps {
  data: uPlot.AlignedData;
  series: UPlotSeries[];
  axes?: UPlotAxis[];
  width: number;
  height: number;
  onHover?: (index: number | null) => void;
  syncedHoverIndex?: number | null;
  onZoom?: (min: number, max: number) => void;
  className?: string;
}

export function UPlotChart({
  data,
  series,
  axes,
  width,
  height,
  onHover,
  syncedHoverIndex,
  onZoom,
  className = '',
}: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Detect dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // Create chart instance
  useEffect(() => {
    if (!containerRef.current || data.length === 0 || data[0].length === 0) return;

    // Use dark mode state
    const textColor = darkMode ? '#e5e7eb' : '#374151';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    // Build series configuration
    const uplotSeries: uPlot.Series[] = [
      {}, // First series is always the x-axis (time/position)
      ...series.map((s) => ({
        label: s.label,
        stroke: s.color,
        width: s.width || 2,
        dash: s.dash,
        points: s.points || { show: false },
        scale: s.scale || 'y',
        show: s.show !== false,
        fill: 'rgba(0,0,0,0)', // Transparent fill to render clean lines only
      })),
    ];

    // Build axes configuration
    const defaultAxes: uPlot.Axis[] = [
      {
        // X-axis
        scale: 'x',
        space: 50,
        grid: { show: true, stroke: gridColor },
        stroke: textColor,
        ticks: { stroke: textColor },
        // Format as numbers, not timestamps
        values: (u, vals) => vals.map(v => v.toFixed(1)),
      },
      {
        // Primary Y-axis (left)
        scale: 'y',
        space: 40,
        grid: { show: true, stroke: gridColor },
        side: 3,
        stroke: textColor,
        ticks: { stroke: textColor },
      },
    ];

    // Add secondary Y-axis if any series uses it
    const hasSecondaryAxis = series.some((s) => s.scale === 'y2');
    if (hasSecondaryAxis) {
      defaultAxes.push({
        scale: 'y2',
        space: 40,
        grid: { show: false },
        side: 1,
        stroke: textColor,
        ticks: { stroke: textColor },
      });
    }

    // Merge with custom axes if provided, applying dark mode colors
    const finalAxes = axes ? axes.map((axis, idx) => {
      const baseAxis = defaultAxes[idx] || {};
      return {
        ...baseAxis,
        ...axis,
        // Always apply dark mode colors
        stroke: textColor,
        ticks: { ...axis.ticks, stroke: textColor },
        grid: axis.grid ? { ...axis.grid, stroke: gridColor } : baseAxis.grid,
        // Apply timestamp fix to x-axis if not already provided
        values: axis.scale === 'x' && !axis.values 
          ? (u: uPlot, vals: number[]) => vals.map(v => v.toFixed(1))
          : axis.values,
      };
    }) : defaultAxes;

    // Cursor sync and hover handling
    const cursor: uPlot.Cursor = {
      drag: {
        x: true,
        y: false,
      },
      // Don't use uPlot's built-in sync - we handle it manually via onHover callback
      // This prevents zoom/selection from syncing across charts
      bind: {
        mousedown: (u, targ, handler) => {
          setIsSelecting(true);
          return handler;
        },
        mouseup: (u, targ, handler) => {
          setIsSelecting(false);
          return handler;
        },
      },
    };

    const hooks: uPlot.Hooks.Arrays = {
      setCursor: [
        (u) => {
          const idx = u.cursor.idx;
          if (onHover) {
            onHover(idx !== null && idx !== undefined ? idx : null);
          }
        },
      ],
      setSelect: [
        (u) => {
          const select = u.select;
          if (select && select.width > 5 && onZoom) {
            const min = u.posToVal(select.left, 'x');
            const max = u.posToVal(select.left + select.width, 'x');
            onZoom(min, max);
            // Clear selection
            setTimeout(() => {
              u.setSelect({ left: 0, top: 0, width: 0, height: 0 });
            }, 0);
          }
        },
      ],
    };

    const opts: uPlot.Options = {
      width,
      height,
      series: uplotSeries,
      axes: finalAxes,
      cursor,
      hooks,
      legend: {
        show: false, // We'll render custom legend outside
      },
      scales: {
        x: {},
        y: {},
        ...(hasSecondaryAxis ? { y2: {} } : {}),
      },
    };

    const chart = new uPlot(opts, data, containerRef.current);
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [data, series, axes, width, height, onHover, onZoom, darkMode]);

  // Handle synced hover from parent
  useEffect(() => {
    if (!chartRef.current || syncedHoverIndex === undefined) return;

    const chart = chartRef.current;
    if (syncedHoverIndex === null) {
      chart.setCursor({ left: -10, top: -10 });
    } else {
      // Find the x-value at this index
      const xVal = data[0][syncedHoverIndex];
      if (xVal !== undefined && xVal !== null) {
        const left = chart.valToPos(xVal, 'x');
        chart.setCursor({ left, top: chart.cursor.top || 0 });
      }
    }
  }, [syncedHoverIndex, data]);

  // Update chart data when it changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setData(data);
  }, [data]);

  // Update chart size when dimensions change
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setSize({ width, height });
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      className={`uplot-chart ${className}`}
      style={{ cursor: isSelecting ? 'crosshair' : 'default' }}
    />
  );
}
