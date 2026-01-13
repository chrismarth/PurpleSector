'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Plus,
  Maximize2,
  Minimize2,
  Flag,
  Clock,
  GripVertical,
  MoreVertical,
  FolderOpen,
  Save,
  Star,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SaveLayoutDialog } from '@/components/SaveLayoutDialog';
import { LoadLayoutDialog } from '@/components/LoadLayoutDialog';
import { ManageLayoutsDialog } from '@/components/ManageLayoutsDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigurableTelemetryChart } from './ConfigurableTelemetryChart';
import { TelemetryFrame } from '@/types/telemetry';
import {
  PlotConfig,
  DEFAULT_PLOT_CONFIGS,
  PlotLayout,
  PlotLayoutItem,
  generateDefaultLayout,
} from '@/types/plotConfig';
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
  layoutContext?: 'global' | 'session' | 'lap';
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
  layoutContext = 'global',
}: TelemetryPlotPanelProps) {
  const [plotConfigs, setPlotConfigs] = useState<PlotConfig[]>(
    initialPlotConfigs || DEFAULT_PLOT_CONFIGS
  );
  const [layout, setLayout] = useState<PlotLayout>(
    initialLayout || generateDefaultLayout(initialPlotConfigs || DEFAULT_PLOT_CONFIGS)
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncedHoverValue, setSyncedHoverValue] = useState<number | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null);
  const [isLayoutModified, setIsLayoutModified] = useState(false);
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

  const isInitialMount = useRef(true);
  const lastNotifiedConfigs = useRef<string>('');
  const lastNotifiedLayout = useRef<string>('');
  const lastInitialConfigs = useRef<string>('');
  const lastInitialLayout = useRef<string>('');

  const loadedLayoutConfigs = useRef<string | null>(null);
  const loadedLayoutLayout = useRef<string | null>(null);

  useEffect(() => {
    if (initialPlotConfigs) {
      const newConfigsStr = JSON.stringify(initialPlotConfigs);
      if (newConfigsStr !== lastInitialConfigs.current) {
        lastInitialConfigs.current = newConfigsStr;
        setPlotConfigs(initialPlotConfigs);
      }
    }
  }, [initialPlotConfigs]);

  useEffect(() => {
    if (initialLayout) {
      const newLayoutStr = JSON.stringify(initialLayout);
      if (newLayoutStr !== lastInitialLayout.current) {
        lastInitialLayout.current = newLayoutStr;
        setLayout(initialLayout);
      }
    }
  }, [initialLayout]);

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
  }, [plotConfigs, onPlotConfigsChange, layout]);

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

  useEffect(() => {
    if (!currentLayoutId || !loadedLayoutConfigs.current || !loadedLayoutLayout.current) {
      setIsLayoutModified(false);
      return;
    }

    const currentConfigsStr = JSON.stringify(plotConfigs);
    const currentLayoutStr = JSON.stringify(layout);

    const hasChanged =
      currentConfigsStr !== loadedLayoutConfigs.current ||
      currentLayoutStr !== loadedLayoutLayout.current;

    setIsLayoutModified(hasChanged);
  }, [plotConfigs, layout, currentLayoutId]);

  const handleConfigChange = useCallback((index: number, newConfig: PlotConfig) => {
    setPlotConfigs((prev) => {
      const newConfigs = [...prev];
      newConfigs[index] = newConfig;
      return newConfigs;
    });
  }, []);

  const handleDelete = useCallback(
    (index: number) => {
      const plotId = plotConfigs[index].id;
      setPlotConfigs((prev) => prev.filter((_, i) => i !== index));
      setLayout((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.plotId !== plotId),
      }));
    },
    [plotConfigs]
  );

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
    setPlotConfigs((prev) => [...prev, newPlot]);

    setLayout((prev) => {
      const maxY = prev.items.length > 0 ? Math.max(...prev.items.map((item) => item.y)) : -1;
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

  const handleSplitHorizontal = useCallback(
    (layoutIndex: number) => {
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
      setPlotConfigs((prev) => [...prev, newPlot]);

      const itemsInSameRow = layout.items.filter((i) => i.y === item.y);
      const isAloneInRow = itemsInSameRow.length === 1;

      const totalWidth = isAloneInRow ? 12 : item.w;
      const newWidth = Math.floor(totalWidth / 2);
      const plotHeight = item.h;

      setLayout((prev) => ({
        ...prev,
        items: [
          ...prev.items.slice(0, layoutIndex),
          { ...item, w: newWidth, x: isAloneInRow ? 0 : item.x, h: plotHeight },
          {
            plotId: newPlot.id,
            x: (isAloneInRow ? 0 : item.x) + newWidth,
            y: item.y,
            w: totalWidth - newWidth,
            h: plotHeight,
          },
          ...prev.items.slice(layoutIndex + 1),
        ],
      }));
    },
    [layout.items]
  );

  const handleSplitVertical = useCallback(
    (layoutIndex: number) => {
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
      setPlotConfigs((prev) => [...prev, newPlot]);

      const GAP_SIZE = 8;
      const PLOT_OVERHEAD = 76;
      const availableHeight = item.h - PLOT_OVERHEAD - GAP_SIZE;
      const newHeight = Math.floor(availableHeight / 2);
      const currentSubRow = item.subRow || 0;

      setLayout((prev) => ({
        ...prev,
        items: [
          ...prev.items.slice(0, layoutIndex),
          { ...item, h: newHeight, subRow: currentSubRow },
          {
            plotId: newPlot.id,
            x: item.x,
            y: item.y,
            w: item.w,
            h: newHeight,
            subRow: currentSubRow + 1,
          },
          ...prev.items.slice(layoutIndex + 1),
        ],
      }));
    },
    [layout.items]
  );

  const handleAddRowBelow = useCallback(
    (layoutIndex: number) => {
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
      setPlotConfigs((prev) => [...prev, newPlot]);

      setLayout((prev) => ({
        ...prev,
        items: [
          ...prev.items.map((i) => (i.y > item.y ? { ...i, y: i.y + 1 } : i)),
          {
            plotId: newPlot.id,
            x: 0,
            y: item.y + 1,
            w: 12,
            h: 300,
          },
        ],
      }));
    },
    [layout.items]
  );

  const handleSaveLayout = useCallback(
    async (name: string, description?: string) => {
      try {
        const response = await fetch('/api/plot-layouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            plotConfigs,
            layout,
            context: layoutContext,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save layout');
        }
      } catch (error) {
        console.error('Error saving layout:', error);
        throw error;
      }
    },
    [plotConfigs, layout, layoutContext]
  );

  const handleLoadLayout = useCallback(async (layoutId: string) => {
    try {
      const response = await fetch(`/api/plot-layouts/${layoutId}`);
      if (!response.ok) {
        throw new Error('Failed to load layout');
      }

      const savedLayout = await response.json();
      const loadedPlotConfigs = JSON.parse(savedLayout.plotConfigs);
      const loadedLayout = JSON.parse(savedLayout.layout);

      setPlotConfigs(loadedPlotConfigs);
      setLayout(loadedLayout);

      setCurrentLayoutId(savedLayout.id);
      setCurrentLayoutName(savedLayout.name);
      loadedLayoutConfigs.current = JSON.stringify(loadedPlotConfigs);
      loadedLayoutLayout.current = JSON.stringify(loadedLayout);
      setIsLayoutModified(false);
    } catch (error) {
      console.error('Error loading layout:', error);
      throw error;
    }
  }, []);

  const handleUpdateCurrentLayout = useCallback(async () => {
    if (!currentLayoutId) return;

    try {
      const response = await fetch(`/api/plot-layouts/${currentLayoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plotConfigs,
          layout,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update layout');
      }

      loadedLayoutConfigs.current = JSON.stringify(plotConfigs);
      loadedLayoutLayout.current = JSON.stringify(layout);
      setIsLayoutModified(false);
    } catch (error) {
      console.error('Error updating layout:', error);
      throw error;
    }
  }, [currentLayoutId, plotConfigs, layout]);

  const handleSetAsDefault = useCallback(async () => {
    try {
      const response = await fetch('/api/plot-layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Default ${layoutContext} Layout`,
          description: 'Auto-saved default layout',
          plotConfigs,
          layout,
          context: layoutContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save layout');
      }

      const savedLayout = await response.json();

      const defaultResponse = await fetch('/api/plot-layouts/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutId: savedLayout.id,
          context: layoutContext,
        }),
      });

      if (!defaultResponse.ok) {
        throw new Error('Failed to set default layout');
      }
    } catch (error) {
      console.error('Error setting default layout:', error);
    }
  }, [plotConfigs, layout, layoutContext]);

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

      const preview = previewSizeRef.current;
      if (preview.width !== undefined || preview.height !== undefined) {
        setLayout((prev) => {
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
                      {formatLapTime(
                        data[data.length - 1]?.lapTime
                          ? data[data.length - 1].lapTime / 1000
                          : undefined
                      )}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <CardTitle>Telemetry Data</CardTitle>
                <CardDescription>
                  {currentLayoutName ? (
                    <span className="flex items-center gap-2">
                      <span>Layout: {currentLayoutName}</span>
                      {isLayoutModified && (
                        <span className="text-orange-600 dark:text-orange-400 text-xs font-medium">
                          (Modified)
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No saved layout active</span>
                  )}
                  {compareLapId && (
                    <span className="text-purple-600"> • Comparison lap shown in dashed lines</span>
                  )}
                </CardDescription>
              </>
            )}
          </div>
          <div className="flex gap-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Layout options">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowLoadDialog(true)}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Apply Saved Layout
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleUpdateCurrentLayout}
                  disabled={!currentLayoutId}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Current Layout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSetAsDefault}>
                  <Star className="h-4 w-4 mr-2" />
                  Set Current as Default
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Layout As...
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowManageDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Layouts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent
        ref={containerRef}
        className={isFullscreen ? 'h-[calc(100vh-8rem)] overflow-y-auto' : ''}
      >
        <div className="space-y-4">
          {(() => {
            const rows = layout.items.reduce((acc, item) => {
              if (!acc[item.y]) acc[item.y] = [];
              acc[item.y].push(item);
              return acc;
            }, {} as Record<number, typeof layout.items>);

            const sortedRows = Object.entries(rows)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([, items]) => {
                const columns = items.reduce((acc, item) => {
                  const key = `${item.x}-${item.w}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {} as Record<string, typeof items>);

                return Object.values(columns)
                  .map((colItems) => colItems.sort((a, b) => (a.subRow || 0) - (b.subRow || 0)))
                  .sort((a, b) => a[0].x - b[0].x);
              });

            return sortedRows.map((rowColumns, rowIndex) => {
              const singlePlotHeights = rowColumns
                .filter((col) => col.length === 1)
                .map((col) => {
                  const layoutIndex = layout.items.findIndex((i) => i.plotId === col[0].plotId);
                  const isResizingThis = resizing?.layoutIndex === layoutIndex;
                  if (
                    isResizingThis &&
                    resizing?.type === 'height' &&
                    previewSizeRef.current.height !== undefined
                  ) {
                    return previewSizeRef.current.height;
                  }
                  return col[0].h;
                });

              const maxSinglePlotHeight =
                singlePlotHeights.length > 0 ? Math.max(...singlePlotHeights) : 0;

              return (
                <div key={rowIndex} className="flex gap-2 relative">
                  {rowColumns.map((columnItems, colIndex) => {
                    const firstLayoutIndex = layout.items.findIndex(
                      (i) => i.plotId === columnItems[0].plotId
                    );
                    const isResizingThisColumn = resizing?.layoutIndex === firstLayoutIndex;

                    let columnWidth = columnItems[0].w;
                    if (
                      isResizingThisColumn &&
                      resizing?.type === 'width' &&
                      previewSizeRef.current.width !== undefined
                    ) {
                      columnWidth = previewSizeRef.current.width;
                    }

                    const widthPercent =
                      rowColumns.length === 1 ? 100 : (columnWidth / layout.cols) * 100;
                    const isLastColumn = colIndex === rowColumns.length - 1;

                    return (
                      <div
                        key={`col-${colIndex}`}
                        className="relative flex flex-col gap-2"
                        style={{ width: `${widthPercent}%` }}
                      >
                        {columnItems.map((layoutItem, subIndex) => {
                          const plotIndex = plotConfigs.findIndex(
                            (p) => p.id === layoutItem.plotId
                          );
                          if (plotIndex === -1) return null;

                          const config = plotConfigs[plotIndex];
                          const layoutIndex = layout.items.findIndex(
                            (i) => i.plotId === layoutItem.plotId
                          );

                          const isResizingThisPlot = resizing?.layoutIndex === layoutIndex;

                          let itemHeight = layoutItem.h;
                          if (
                            isResizingThisPlot &&
                            resizing?.type === 'height' &&
                            previewSizeRef.current.height !== undefined
                          ) {
                            itemHeight = previewSizeRef.current.height;
                          }

                          const shouldNormalize =
                            rowColumns.length > 1 && columnItems.length === 1;
                          const plotHeight = shouldNormalize
                            ? maxSinglePlotHeight
                            : itemHeight;

                          return (
                            <div key={layoutItem.plotId} className="relative">
                              <ConfigurableTelemetryChart
                                data={data}
                                compareData={compareData}
                                config={config}
                                onConfigChange={(newConfig) =>
                                  handleConfigChange(plotIndex, newConfig)
                                }
                                onDelete={() => handleDelete(plotIndex)}
                                onSplitHorizontal={() =>
                                  handleSplitHorizontal(layoutIndex)
                                }
                                onSplitVertical={() => handleSplitVertical(layoutIndex)}
                                onAddRowBelow={() => handleAddRowBelow(layoutIndex)}
                                height={plotHeight}
                                syncedHoverValue={syncedHoverValue}
                                onHoverChange={setSyncedHoverValue}
                              />

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

                        {!isLastColumn && (
                          <div
                            className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-blue-500/20 flex items-center justify-center group/handle z-10"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const layoutIndex = layout.items.findIndex(
                                (i) => i.plotId === columnItems[0].plotId
                              );
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

          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={handleAddPlot}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plot
            </Button>
          </div>
        </div>
      </CardContent>

      <SaveLayoutDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveLayout}
      />
      <LoadLayoutDialog
        open={showLoadDialog}
        onOpenChange={setShowLoadDialog}
        onLoad={handleLoadLayout}
        context={layoutContext}
      />
      <ManageLayoutsDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        context={layoutContext}
      />
    </Card>
  );
}
