'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TelemetryFrame } from '@/types/telemetry';
import { getAnalysisPanelTypes, getDefaultProviderForType } from '@/plugins';
import type {
  AnalysisPanelContext,
  AnalysisPanelRenderResult,
} from '@purplesector/plugin-api';
import type { AnalysisLayoutJSON } from '@/lib/analysisLayout';
import { splitColumn, splitRow, addRowBelowPanel, deletePanelAndCompact } from '@/lib/analysisLayout';

interface AnalysisPanelGridProps {
  context: AnalysisPanelContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  layout: AnalysisLayoutJSON;
  onLayoutChange?: (layout: AnalysisLayoutJSON) => void;
}

export function AnalysisPanelGrid({
  context,
  telemetry,
  compareTelemetry,
  compareLapId,
  layout,
  onLayoutChange,
}: AnalysisPanelGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef(layout);
  const [resizing, setResizing] = useState<
    | {
        type: 'column';
        leftPanelId: string;
        rightPanelId: string;
        startX: number;
        leftStartX: number;
        startLeftSpan: number;
        startRightSpan: number;
      }
    | {
        type: 'height';
        panelId: string;
        startY: number;
        startHeight: number;
      }
    | null
  >(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    if (!resizing || !onLayoutChange) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentLayout = layoutRef.current;

      if (resizing.type === 'column') {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        if (containerWidth === 0) return;

        const deltaX = e.clientX - resizing.startX;
        const deltaCols = Math.round((deltaX / containerWidth) * currentLayout.cols);

        const totalSpan = resizing.startLeftSpan + resizing.startRightSpan;
        let newLeftSpan = resizing.startLeftSpan + deltaCols;
        newLeftSpan = Math.max(1, Math.min(totalSpan - 1, newLeftSpan));
        const newRightSpan = totalSpan - newLeftSpan;

        const panels = currentLayout.panels.map((p) => {
          if (p.id === resizing.leftPanelId) {
            return { ...p, colSpan: newLeftSpan };
          }
          if (p.id === resizing.rightPanelId) {
            // Base the right panel's x on the original left panel position so we don't
            // accumulate drift as the user drags.
            const newRightX = resizing.leftStartX + newLeftSpan;
            return { ...p, x: newRightX, colSpan: newRightSpan };
          }
          return p;
        });

        const next = { ...currentLayout, panels };
        if (next !== currentLayout) {
          onLayoutChange(next);
        }
      } else if (resizing.type === 'height') {
        const deltaY = e.clientY - resizing.startY;
        const newHeight = Math.max(120, resizing.startHeight + deltaY);

        const panels = currentLayout.panels.map((p) =>
          p.id === resizing.panelId
            ? { ...p, minHeight: newHeight, maxHeight: newHeight }
            : p,
        );

        const next = { ...currentLayout, panels };
        if (next !== currentLayout) {
          onLayoutChange(next);
        }
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, onLayoutChange]);
  const handleSetPanelType = (panelId: string, typeId: string) => {
    if (!onLayoutChange) return;
    const nextPanels = layout.panels.map((p) =>
      p.id === panelId ? { ...p, typeId } : p,
    );
    onLayoutChange({ ...layout, panels: nextPanels });
  };

  const availableTypes = useMemo(() => getAnalysisPanelTypes(), []);

  const sortedPanels = useMemo(
    () =>
      [...layout.panels].sort((a, b) =>
        a.y === b.y ? a.x - b.x : a.y - b.y,
      ),
    [layout.panels],
  );

  const [fullscreenPanelId, setFullscreenPanelId] = useState<string | null>(null);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [panelTitles, setPanelTitles] = useState<Record<string, React.ReactNode | undefined>>({});

  return (
    <div
      ref={containerRef}
      className="gap-4"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
      }}
    >
      {sortedPanels.map((panel) => {
        const hasType = !!panel.typeId;
        const provider = hasType ? getDefaultProviderForType(panel.typeId!) : undefined;

        const provided = hasType && provider
          ? provider.render({
              context,
              telemetry,
              compareTelemetry,
              compareLapId,
              host: {
                setTitle: (title) => {
                  setPanelTitles((prev) => ({
                    ...prev,
                    [panel.id]: title,
                  }));
                },
              },
              syncedHoverValue: hoverValue,
              onHoverChange: setHoverValue,
            })
          : null;

        const renderResult: AnalysisPanelRenderResult | null =
          provided && (provided as any).content
            ? (provided as AnalysisPanelRenderResult)
            : provided
            ? {
                content: provided as React.ReactElement,
              }
            : null;

        const isFullscreen = fullscreenPanelId === panel.id;
        const panelTitle = panelTitles[panel.id] ?? renderResult?.title;

        const minHeight = isFullscreen ? undefined : panel.minHeight ?? 200;
        const maxHeight = isFullscreen ? undefined : panel.maxHeight;

        const rightNeighbor = layout.panels.find(
          (p) =>
            p.y === panel.y &&
            p.rowSpan === panel.rowSpan &&
            p.x === panel.x + panel.colSpan,
        );

        return (
          <Card
            key={panel.id}
            className={`relative ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
            }`}
            style={
              isFullscreen
                ? {}
                : {
                    gridColumn: `${panel.x + 1} / span ${panel.colSpan}`,
                    gridRow: `${panel.y + 1} / span ${panel.rowSpan}`,
                    minHeight,
                    maxHeight,
                  }
            }
          >
            <CardContent
              className={`pt-4 ${
                isFullscreen ? 'h-[calc(100vh-4rem)] overflow-y-auto' : ''
              }`}
            >
              {onLayoutChange && (
                <div className="flex justify-between items-center gap-2 mb-2 text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {panelTitle && (
                      <span className="font-medium truncate">
                        {panelTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {renderResult?.toolbarActions}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenPanelId((current) =>
                          current === panel.id ? null : panel.id,
                        );
                      }}
                      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-3 w-3" />
                      ) : (
                        <Maximize2 className="h-3 w-3" />
                      )}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = splitColumn(layout, panel.id);
                            if (next !== layout) {
                              onLayoutChange(next);
                            }
                          }}
                        >
                          Split horizontally
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = splitRow(layout, panel.id);
                            if (next !== layout) {
                              onLayoutChange(next);
                            }
                          }}
                        >
                          Split vertically
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = addRowBelowPanel(layout, panel.id);
                            if (next !== layout) {
                              onLayoutChange(next);
                            }
                          }}
                        >
                          Add row below
                        </DropdownMenuItem>
                        {layout.panels.length > 1 && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = deletePanelAndCompact(layout, panel.id);
                              if (next !== layout) {
                                onLayoutChange(next);
                              }
                            }}
                          >
                            Delete panel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
              {onLayoutChange && rightNeighbor && (
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 z-10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setResizing({
                      type: 'column',
                      leftPanelId: panel.id,
                      rightPanelId: rightNeighbor.id,
                      startX: e.clientX,
                      leftStartX: panel.x,
                      startLeftSpan: panel.colSpan,
                      startRightSpan: rightNeighbor.colSpan,
                    });
                  }}
                />
              )}
              {onLayoutChange && (
                <div
                  className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary/20 z-10"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startHeight = panel.minHeight ?? 200;
                    setResizing({
                      type: 'height',
                      panelId: panel.id,
                      startY: e.clientY,
                      startHeight,
                    });
                  }}
                />
              )}
              {renderResult ? (
                renderResult.content
              ) : (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      const first = availableTypes[0];
                      if (first) {
                        handleSetPanelType(panel.id, first.id);
                      }
                    }}
                  >
                    Add Analysis Panel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
