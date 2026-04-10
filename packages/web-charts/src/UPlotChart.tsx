"use client";

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
  className?: string;
  onReady?: (chart: uPlot) => void;
}

export function UPlotChart({
  data,
  series,
  axes,
  width: rawWidth,
  height: rawHeight,
  onHover,
  syncedHoverIndex,
  className = '',
  onReady,
}: UPlotChartProps) {
  // Guard against very small/negative values during layout transitions.
  const width = Math.max(rawWidth, 100);
  const height = Math.max(rawHeight, 50);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Keep a ref so the cursor hook always calls the latest callback without
  // requiring chart recreation on every render.
  const onHoverRef = useRef(onHover);
  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  // Suppress the setCursor hook when we're moving the cursor programmatically
  // (in response to syncedHoverIndex) so we don't echo the value back up.
  const isProgrammaticCursorMove = useRef(false);
  const isRestoringCursor = useRef(false);

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

  // Build series config - memoized to prevent unnecessary chart updates
  const buildSeries = useCallback((s: UPlotSeries[]): uPlot.Series[] => [
    {},
    ...s.map((seriesItem) => ({
      label: seriesItem.label,
      stroke: seriesItem.color,
      width: seriesItem.width || 2,
      dash: seriesItem.dash,
      points: seriesItem.points || { show: false },
      scale: seriesItem.scale || 'y',
      show: seriesItem.show !== false,
      fill: 'rgba(0,0,0,0)',
    })),
  ], []);

  // Build axes config
  const buildAxes = useCallback((textColor: string, gridColor: string, seriesData: UPlotSeries[], axesData?: UPlotAxis[]): uPlot.Axis[] => {
    const defaultAxes: uPlot.Axis[] = [
      {
        scale: 'x',
        space: 50,
        grid: { show: true, stroke: gridColor },
        stroke: textColor,
        ticks: { stroke: textColor },
        values: (_u, vals) => vals.map((v) => v.toFixed(1)),
      },
      {
        scale: 'y',
        space: 40,
        grid: { show: true, stroke: gridColor },
        side: 3,
        stroke: textColor,
        ticks: { stroke: textColor },
      },
    ];

    const hasSecondaryAxis = seriesData.some((s) => s.scale === 'y2');
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

    return axesData
      ? axesData.map((axis, idx) => {
          const baseAxis = defaultAxes[idx] || {};
          return {
            ...baseAxis,
            ...axis,
            stroke: textColor,
            ticks: { ...axis.ticks, stroke: textColor },
            grid: axis.grid ? { ...axis.grid, stroke: gridColor } : baseAxis.grid,
            values:
              axis.scale === 'x' && !axis.values
                ? (_u: uPlot, vals: number[]) => vals.map((v) => v.toFixed(1))
                : axis.values,
          } as uPlot.Axis;
        })
      : defaultAxes;
  }, []);

  // Create chart instance - only when dimensions or darkMode change
  useEffect(() => {
    if (!containerRef.current) return;

    const textColor = darkMode ? '#e5e7eb' : '#374151';
    const gridColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    const cursor: uPlot.Cursor = {
      drag: {
        x: true,
        y: false,
      },
    };

    const hooks: uPlot.Hooks.Arrays = {
      setCursor: [
        (u) => {
          // Skip the callback when we moved the cursor programmatically to
          // avoid echoing the value back up to the parent.
          if (isProgrammaticCursorMove.current || isRestoringCursor.current) return;
          
          // uPlot resets cursor to {left:-10, top:-10} when the mouse stops moving
          // or leaves - ignore these reset events entirely to keep hover stable.
          const left = u.cursor.left ?? -10;
          const top = u.cursor.top ?? -10;
          if (left < 0 || top < 0) return;

          const idx = u.cursor.idx ?? null;
          onHoverRef.current?.(idx);
        },
      ],
      setSelect: [
        (u) => {
          const select = u.select;
          if (!select || select.width <= 5) return;

          const min = u.posToVal(select.left, 'x');
          const max = u.posToVal(select.left + select.width, 'x');
          u.setScale('x', { min, max });
        },
      ],
    };

    const opts: uPlot.Options = {
      width,
      height,
      series: buildSeries(series),
      axes: buildAxes(textColor, gridColor, series, axes),
      cursor,
      hooks,
      legend: {
        show: false,
      },
      select: {
        show: true,
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      },
      scales: {
        x: { auto: true },
        y: { auto: true },
        ...(series.some((s) => s.scale === 'y2') ? { y2: { auto: true } } : {}),
      },
    };

    const chart = new uPlot(opts, data, containerRef.current);
    chartRef.current = chart;
    if (onReady) {
      onReady(chart);
    }

    // Use native mouseleave on the chart's over element to detect true mouse exit
    // (distinct from uPlot's stop-moving reset which we ignore in setCursor)
    const overEl = chart.over;
    const handleMouseLeave = () => {
      onHoverRef.current?.(null);
    };
    overEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      overEl.removeEventListener('mouseleave', handleMouseLeave);
      chart.destroy();
      chartRef.current = null;
    };
  }, [width, height, darkMode, series, axes, onReady]);

  // Update data without recreating chart
  // Preserve hover position from context across data updates
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    
    chart.setData(data);
    
    // After data update, if we have a synced hover index, restore the cursor position
    // This prevents data updates from clearing the hover state
    if (syncedHoverIndex != null && isFinite(syncedHoverIndex)) {
      // Use setTimeout to ensure uPlot has processed the data update
      setTimeout(() => {
        if (!chartRef.current) return;
        const xData = chartRef.current.data[0] as number[];
        if (xData && syncedHoverIndex < xData.length) {
          const xValue = xData[syncedHoverIndex];
          const x = chartRef.current.valToPos(xValue, 'x');
          if (x != null && isFinite(x)) {
            isRestoringCursor.current = true;
            isProgrammaticCursorMove.current = true;
            chartRef.current.setCursor({ left: x, top: 0 });
            isProgrammaticCursorMove.current = false;
            isRestoringCursor.current = false;
          }
        }
      }, 0);
    }
  }, [data, syncedHoverIndex]);

  // Update size without recreating chart
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setSize({ width, height });
  }, [width, height]);

  // Update series without recreating chart
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    
    // Update each series (skip index 0 which is the x-axis)
    series.forEach((s, i) => {
      const seriesIndex = i + 1;
      // Only update show property via setSeries - other props require chart recreation
      // uPlot's setSeries only supports { show, focus } options
      chart.setSeries(seriesIndex, {
        show: s.show !== false,
      });
    });
  }, [series]);

  // Keep a ref to the latest data to avoid dependency issues in synced hover effect
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Move the crosshair to match the synced hover position from peer charts.
  // Only runs when syncedHoverIndex changes, NOT when data changes (to prevent flickering).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || syncedHoverIndex == null) return;
    
    const positionCursor = () => {
      const xData = chart.data[0] as number[];
      if (!xData || syncedHoverIndex >= xData.length) return;
      const xValue = xData[syncedHoverIndex];
      
      // Ensure scales are computed before converting value to position
      if (chart.scales.x.min == null || chart.scales.x.max == null) {
        chart.redraw(true);
      }
      
      const x = chart.valToPos(xValue, 'x');
      if (x == null || !isFinite(x)) return;
      
      isProgrammaticCursorMove.current = true;
      chart.setCursor({ left: x, top: 0 });
      isProgrammaticCursorMove.current = false;
    };
    
    // Defer to next frame to ensure chart is fully initialized
    requestAnimationFrame(positionCursor);
  }, [syncedHoverIndex]);

  return (
    <div ref={containerRef} className={`uplot-chart ${className}`} />
  );
}
