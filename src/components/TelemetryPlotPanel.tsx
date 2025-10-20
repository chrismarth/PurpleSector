'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Maximize2, Minimize2, Flag, Clock, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigurableTelemetryChart } from '@/components/ConfigurableTelemetryChart';
import { TelemetryFrame } from '@/types/telemetry';
import { PlotConfig, DEFAULT_PLOT_CONFIGS, PlotLayout, PlotLayoutItem, generateDefaultLayout } from '@/types/plotConfig';
import { formatLapTime } from '@/lib/utils';

interface TelemetryPlotPanelProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  compareLapId?: string | null;
  initialPlotConfigs?: PlotConfig[];
  initialLayout?: PlotLayout;
  onPlotConfigsChange?: (configs: PlotConfig[]) => void;
  onLayoutChange?: (layout: PlotLayout) => void;
  showFullscreenToggle?: boolean;
  currentLapNumber?: number;
  showLapHeader?: boolean;
}

export function TelemetryPlotPanel({
  data,
  compareData,
  compareLapId,
  initialPlotConfigs,
  initialLayout,
  onPlotConfigsChange,
  onLayoutChange,
  showFullscreenToggle = true,
  currentLapNumber,
  showLapHeader = false,
}: TelemetryPlotPanelProps) {
  const [plotConfigs, setPlotConfigs] = useState<PlotConfig[]>(
    initialPlotConfigs || DEFAULT_PLOT_CONFIGS
  );
  const [layout, setLayout] = useState<PlotLayout>(
    initialLayout || generateDefaultLayout(initialPlotConfigs || DEFAULT_PLOT_CONFIGS)
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncedHoverValue, setSyncedHoverValue] = useState<number | null>(null);
  const [resizing, setResizing] = useState<{
    type: 'width' | 'height';
    layoutIndex: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewSizeRef = useRef<{ width?: number; height?: number }>({});
  const [, forceUpdate] = useState({});

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const lastNotifiedConfigs = useRef<string>('');
  const lastNotifiedLayout = useRef<string>('');
  const lastInitialConfigs = useRef<string>('');
  const lastInitialLayout = useRef<string>('');

  // Update plot configs when initialPlotConfigs changes (only if actually different)
  useEffect(() => {
    if (initialPlotConfigs) {
      const newConfigsStr = JSON.stringify(initialPlotConfigs);
      if (newConfigsStr !== lastInitialConfigs.current) {
        lastInitialConfigs.current = newConfigsStr;
        setPlotConfigs(initialPlotConfigs);
      }
    }
  }, [initialPlotConfigs]);

  // Update layout when initialLayout changes
  useEffect(() => {
    if (initialLayout) {
      const newLayoutStr = JSON.stringify(initialLayout);
      if (newLayoutStr !== lastInitialLayout.current) {
        lastInitialLayout.current = newLayoutStr;
        setLayout(initialLayout);
      }
    }
  }, [initialLayout]);

  // Notify parent when plot configs change (skip initial mount and duplicates)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastNotifiedConfigs.current = JSON.stringify(plotConfigs);
      lastNotifiedLayout.current = JSON.stringify(layout);
      return;
    }
    
    const currentConfigsStr = JSON.stringify(plotConfigs);
    if (currentConfigsStr !== lastNotifiedConfigs.current) {
      lastNotifiedConfigs.current = currentConfigsStr;
      if (onPlotConfigsChange) {
        onPlotConfigsChange(plotConfigs);
      }
    }
  }, [plotConfigs, onPlotConfigsChange]);

  // Notify parent when layout changes
  useEffect(() => {
    if (isInitialMount.current) return;
    
    const currentLayoutStr = JSON.stringify(layout);
    if (currentLayoutStr !== lastNotifiedLayout.current) {
      lastNotifiedLayout.current = currentLayoutStr;
      if (onLayoutChange) {
        onLayoutChange(layout);
      }
    }
  }, [layout, onLayoutChange]);

  const handleConfigChange = useCallback((index: number, newConfig: PlotConfig) => {
    setPlotConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = newConfig;
      return newConfigs;
    });
  }, []);

  const handleDelete = useCallback((index: number) => {
    const plotId = plotConfigs[index].id;
    setPlotConfigs(prev => prev.filter((_, i) => i !== index));
    setLayout(prev => ({
      ...prev,
      items: prev.items.filter(item => item.plotId !== plotId),
    }));
  }, [plotConfigs]);

  const handleAddPlot = useCallback(() => {
    const newPlot: PlotConfig = {
      id: `plot_${Date.now()}`,
      title: 'New Plot',
      xAxis: 'time',
      xAxisLabel: 'Time (s)',
      yAxisLabel: 'Value',
      yAxisLabelSecondary: '',
      channels: [],
    };
    setPlotConfigs(prev => [...prev, newPlot]);
    
    // Add to layout at the bottom
    setLayout(prev => {
      const maxY = prev.items.length > 0 ? Math.max(...prev.items.map(item => item.y)) : -1;
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            plotId: newPlot.id,
            x: 0,
            y: maxY + 1,
            w: 12,
            h: 300,
          },
        ],
      };
    });
  }, []);

  // Split plot horizontally (side by side)
  const handleSplitHorizontal = useCallback((layoutIndex: number) => {
    const item = layout.items[layoutIndex];
    
    const newPlot: PlotConfig = {
      id: `plot_${Date.now()}`,
      title: 'New Plot',
      xAxis: 'time',
      xAxisLabel: 'Time (s)',
      yAxisLabel: 'Value',
      yAxisLabelSecondary: '',
      channels: [],
    };
    setPlotConfigs(prev => [...prev, newPlot]);
    
    // Check if this item is alone in its row
    const itemsInSameRow = layout.items.filter(i => i.y === item.y);
    const isAloneInRow = itemsInSameRow.length === 1;
    
    // If alone in row, split the full width (12 columns)
    // Otherwise, split the current width
    const totalWidth = isAloneInRow ? 12 : item.w;
    const newWidth = Math.floor(totalWidth / 2);
    
    // Both plots should have the same height
    const plotHeight = item.h;
    
    setLayout(prev => ({
      ...prev,
      items: [
        ...prev.items.slice(0, layoutIndex),
        { ...item, w: newWidth, x: isAloneInRow ? 0 : item.x, h: plotHeight },
        {
          plotId: newPlot.id,
          x: (isAloneInRow ? 0 : item.x) + newWidth,
          y: item.y,
          w: totalWidth - newWidth,
          h: plotHeight, // Same height as the original plot
        },
        ...prev.items.slice(layoutIndex + 1),
      ],
    }));
  }, [layout.items]);

  // Split plot vertically (top and bottom in same column, stacked)
  const handleSplitVertical = useCallback((layoutIndex: number) => {
    const item = layout.items[layoutIndex];
    
    const newPlot: PlotConfig = {
      id: `plot_${Date.now()}`,
      title: 'New Plot',
      xAxis: 'time',
      xAxisLabel: 'Time (s)',
      yAxisLabel: 'Value',
      yAxisLabelSecondary: '',
      channels: [],
    };
    setPlotConfigs(prev => [...prev, newPlot]);
    
    // When splitting vertically, we need to account for:
    // - 8px gap between plots
    // - Each plot has its own padding (32px) and header (44px) = 76px overhead per plot
    // Original total height = 32 + 44 + item.h = 76 + item.h
    // After split: (76 + h1) + 8 + (76 + h2) = 76 + item.h
    // Solving: h1 + h2 = item.h - 76 - 8 = item.h - 84
    const GAP_SIZE = 8;
    const PLOT_OVERHEAD = 76; // 32px padding + 44px header per plot
    const availableHeight = item.h - PLOT_OVERHEAD - GAP_SIZE;
    const newHeight = Math.floor(availableHeight / 2);
    const currentSubRow = item.subRow || 0;
    
    // Split the current plot vertically - both plots stay in the same row and column
    // Use subRow to stack them vertically
    setLayout(prev => ({
      ...prev,
      items: [
        ...prev.items.slice(0, layoutIndex),
        { ...item, h: newHeight, subRow: currentSubRow }, // First half height
        {
          plotId: newPlot.id,
          x: item.x,
          y: item.y,
          w: item.w,
          h: newHeight, // Second half height (same as first)
          subRow: currentSubRow + 1, // Stack below
        },
        ...prev.items.slice(layoutIndex + 1),
      ],
    }));
  }, [layout.items]);

  // Add a new row below (full width)
  const handleAddRowBelow = useCallback((layoutIndex: number) => {
    const item = layout.items[layoutIndex];
    
    const newPlot: PlotConfig = {
      id: `plot_${Date.now()}`,
      title: 'New Plot',
      xAxis: 'time',
      xAxisLabel: 'Time (s)',
      yAxisLabel: 'Value',
      yAxisLabelSecondary: '',
      channels: [],
    };
    setPlotConfigs(prev => [...prev, newPlot]);
    
    // Move all items below this one down by 1
    setLayout(prev => ({
      ...prev,
      items: [
        ...prev.items.map(i => 
          i.y > item.y ? { ...i, y: i.y + 1 } : i
        ),
        {
          plotId: newPlot.id,
          x: 0,
          y: item.y + 1,
          w: 12,
          h: 300,
        },
      ],
    }));
  }, [layout.items]);

  // Handle mouse move for resizing
  useEffect(() => {
    if (!resizing || !containerRef.current) return;

    const { type, layoutIndex, startX, startY, startWidth, startHeight } = resizing;
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        if (type === 'width') {
          const containerWidth = containerRef.current!.offsetWidth;
          const deltaX = e.clientX - startX;
          const deltaColumns = Math.round((deltaX / containerWidth) * 12);
          const newWidth = Math.max(1, Math.min(12, startWidth + deltaColumns));
          previewSizeRef.current = { width: newWidth };
          forceUpdate({});
        } else if (type === 'height') {
          const deltaY = e.clientY - startY;
          const newHeight = Math.max(150, startHeight + deltaY);
          previewSizeRef.current = { height: newHeight };
          forceUpdate({});
        }
      });
    };

    const handleMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      
      // Apply the final size to layout
      const preview = previewSizeRef.current;
      if (preview.width !== undefined || preview.height !== undefined) {
        setLayout(prev => {
          const newItems = [...prev.items];
          const item = newItems[layoutIndex];
          if (!item) return prev;
          
          const updates: Partial<PlotLayoutItem> = {};
          if (preview.width !== undefined) updates.w = preview.width;
          if (preview.height !== undefined) updates.h = preview.height;
          
          newItems[layoutIndex] = { ...item, ...updates };
          return { ...prev, items: newItems };
        });
      }
      
      setResizing(null);
      previewSizeRef.current = {};
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            {showLapHeader && currentLapNumber ? (
              <div className="flex items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Current Lap: #{currentLapNumber}
                </CardTitle>
                {data.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono">
                      {formatLapTime(data[data.length - 1].lapTime / 1000)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <CardTitle>Telemetry Data</CardTitle>
                <CardDescription>
                  Customize plots to analyze different telemetry channels
                  {compareLapId && <span className="text-purple-600"> • Comparison lap shown in dashed lines</span>}
                </CardDescription>
              </>
            )}
          </div>
          {showFullscreenToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent ref={containerRef} className={isFullscreen ? 'h-[calc(100vh-8rem)] overflow-y-auto' : ''}>
        <div className="space-y-4">
          {/* Group plots by row, then column, then subRow */}
          {(() => {
            // Group layout items by row (y)
            const rows = layout.items.reduce((acc, item) => {
              if (!acc[item.y]) acc[item.y] = [];
              acc[item.y].push(item);
              return acc;
            }, {} as Record<number, typeof layout.items>);

            // Sort rows
            const sortedRows = Object.entries(rows)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([, items]) => {
                // Group by column (x) within each row
                const columns = items.reduce((acc, item) => {
                  const key = `${item.x}-${item.w}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {} as Record<string, typeof items>);
                
                // Sort columns by x, and within each column sort by subRow
                return Object.values(columns)
                  .map(colItems => colItems.sort((a, b) => (a.subRow || 0) - (b.subRow || 0)))
                  .sort((a, b) => a[0].x - b[0].x);
              });

            return sortedRows.map((rowColumns, rowIndex) => {
              // Calculate max height for columns with single plots in this row
              // Account for preview heights during resize
              const singlePlotHeights = rowColumns
                .filter(col => col.length === 1)
                .map(col => {
                  const layoutIndex = layout.items.findIndex(i => i.plotId === col[0].plotId);
                  const isResizingThis = resizing?.layoutIndex === layoutIndex;
                  if (isResizingThis && resizing?.type === 'height' && previewSizeRef.current.height !== undefined) {
                    return previewSizeRef.current.height;
                  }
                  return col[0].h;
                });
              
              const maxSinglePlotHeight = singlePlotHeights.length > 0 ? Math.max(...singlePlotHeights) : 0;
              
              return (
                <div key={rowIndex} className="flex gap-2 relative">
                  {rowColumns.map((columnItems, colIndex) => {
                    const firstLayoutIndex = layout.items.findIndex(i => i.plotId === columnItems[0].plotId);
                    const isResizingThisColumn = resizing?.layoutIndex === firstLayoutIndex;
                    
                    // Use preview width if resizing this column
                    let columnWidth = columnItems[0].w;
                    if (isResizingThisColumn && resizing?.type === 'width' && previewSizeRef.current.width !== undefined) {
                      columnWidth = previewSizeRef.current.width;
                    }
                    
                    // If this is the only column in the row, make it full width
                    const widthPercent = rowColumns.length === 1 ? 100 : (columnWidth / layout.cols) * 100;
                    const isLastColumn = colIndex === rowColumns.length - 1;
                    
                    return (
                      <div
                        key={`col-${colIndex}`}
                        className="relative flex flex-col gap-2"
                        style={{ 
                          width: `${widthPercent}%`
                        }}
                      >
                        {columnItems.map((layoutItem, subIndex) => {
                          const plotIndex = plotConfigs.findIndex(p => p.id === layoutItem.plotId);
                          if (plotIndex === -1) return null;
                          
                          const config = plotConfigs[plotIndex];
                          const layoutIndex = layout.items.findIndex(i => i.plotId === layoutItem.plotId);
                          
                          // Check if this specific plot is being resized
                          const isResizingThisPlot = resizing?.layoutIndex === layoutIndex;
                          
                          // Use preview height if resizing this plot
                          let itemHeight = layoutItem.h;
                          if (isResizingThisPlot && resizing?.type === 'height' && previewSizeRef.current.height !== undefined) {
                            itemHeight = previewSizeRef.current.height;
                          }
                          
                          // If multiple columns exist and this column has a single plot, normalize to max height
                          const shouldNormalize = rowColumns.length > 1 && columnItems.length === 1;
                          const plotHeight = shouldNormalize ? maxSinglePlotHeight : itemHeight;
                          
                          return (
                            <div key={layoutItem.plotId} className="relative">
                              <ConfigurableTelemetryChart
                                data={data}
                                compareData={compareData}
                                config={config}
                                onConfigChange={(newConfig) => handleConfigChange(plotIndex, newConfig)}
                                onDelete={() => handleDelete(plotIndex)}
                                onSplitHorizontal={() => handleSplitHorizontal(layoutIndex)}
                                onSplitVertical={() => handleSplitVertical(layoutIndex)}
                                onAddRowBelow={() => handleAddRowBelow(layoutIndex)}
                                height={plotHeight}
                                syncedHoverValue={syncedHoverValue}
                                onHoverChange={setSyncedHoverValue}
                              />
                              
                              {/* Height resize handle at bottom */}
                              {subIndex === columnItems.length - 1 && (
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-blue-500/20 flex items-center justify-center group/handle z-10"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setResizing({
                                      type: 'height',
                                      layoutIndex,
                                      startX: e.clientX,
                                      startY: e.clientY,
                                      startWidth: layoutItem.w,
                                      startHeight: layoutItem.h,
                                    });
                                  }}
                                >
                                  <GripVertical className="h-4 w-4 rotate-90 text-gray-400 group-hover/handle:text-blue-500" />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Resize handle for column width */}
                        {!isLastColumn && (
                          <div
                            className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-blue-500/20 flex items-center justify-center group/handle z-10"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const layoutIndex = layout.items.findIndex(i => i.plotId === columnItems[0].plotId);
                              setResizing({
                                type: 'width',
                                layoutIndex,
                                startX: e.clientX,
                                startY: e.clientY,
                                startWidth: columnItems[0].w,
                                startHeight: columnItems[0].h,
                              });
                            }}
                          >
                            <GripVertical className="h-4 w-4 text-gray-400 group-hover/handle:text-blue-500" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
          
          {/* Add Plot Button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleAddPlot}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Plot
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
