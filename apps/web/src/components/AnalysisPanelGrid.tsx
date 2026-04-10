'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TelemetryFrame } from '@/types/telemetry';
import { MathTelemetryChannel } from '@purplesector/telemetry';
import { getAnalysisPanelTypes, getDefaultProviderForType } from '@/plugins';
import type {
  AnalysisPanelContext,
  AnalysisPanelRenderResult,
  AnalysisPanelType,
} from '@purplesector/plugin-api';
import { TelemetryHoverContext } from '@purplesector/plugin-api';
import type { AnalysisPanelCell, AnalysisLayoutJSON } from '@/lib/analysisLayout';
import { splitColumn, splitRow, addRowBelowPanel, deletePanelAndCompact } from '@/lib/analysisLayout';

interface DragOverride {
  panelId: string;
  /** Column resize: override colSpan for left/right panels */
  colSpan?: number;
  rightPanelId?: string;
  rightColSpan?: number;
  rightX?: number;
  /** Height resize: override height */
  height?: number;
}

function ColumnResizeHandle({
  leftPanelId,
  rightPanelId,
  leftStartX,
  startLeftSpan,
  startRightSpan,
  containerRef,
  layoutRef,
  onLayoutChange,
  onDragOverride,
}: {
  leftPanelId: string;
  rightPanelId: string;
  leftStartX: number;
  startLeftSpan: number;
  startRightSpan: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  layoutRef: React.RefObject<AnalysisLayoutJSON>;
  onLayoutChange: (layout: AnalysisLayoutJSON) => void;
  onDragOverride: (override: DragOverride | null) => void;
}) {
  const bind = useDrag(
    ({ movement: [mx], last, event }) => {
      event?.preventDefault();
      const currentLayout = layoutRef.current;
      if (!currentLayout || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      if (containerWidth === 0) return;

      const deltaCols = Math.round((mx / containerWidth) * currentLayout.cols);
      const totalSpan = startLeftSpan + startRightSpan;
      let newLeftSpan = startLeftSpan + deltaCols;
      newLeftSpan = Math.max(1, Math.min(totalSpan - 1, newLeftSpan));
      const newRightSpan = totalSpan - newLeftSpan;

      if (last) {
        onDragOverride(null);
        const panels = currentLayout.panels.map((p) => {
          if (p.id === leftPanelId) return { ...p, colSpan: newLeftSpan };
          if (p.id === rightPanelId) {
            return { ...p, x: leftStartX + newLeftSpan, colSpan: newRightSpan };
          }
          return p;
        });
        onLayoutChange({ ...currentLayout, panels } as AnalysisLayoutJSON);
      } else {
        onDragOverride({
          panelId: leftPanelId,
          colSpan: newLeftSpan,
          rightPanelId,
          rightColSpan: newRightSpan,
          rightX: leftStartX + newLeftSpan,
        });
      }
    },
    { pointer: { touch: true }, filterTaps: true },
  );

  return (
    <div
      {...bind()}
      className="absolute top-0 right-0 w-3 h-full cursor-col-resize hover:bg-primary/20 z-10"
      style={{ touchAction: 'none' }}
    />
  );
}

function HeightResizeHandle({
  panelId,
  startHeight,
  layoutRef,
  onLayoutChange,
  onDragOverride,
}: {
  panelId: string;
  startHeight: number;
  layoutRef: React.RefObject<AnalysisLayoutJSON>;
  onLayoutChange: (layout: AnalysisLayoutJSON) => void;
  onDragOverride: (override: DragOverride | null) => void;
}) {
  const bind = useDrag(
    ({ movement: [, my], last, event }) => {
      event?.preventDefault();
      const currentLayout = layoutRef.current;
      if (!currentLayout) return;
      const newHeight = Math.max(120, startHeight + my);

      if (last) {
        onDragOverride(null);
        const panels = currentLayout.panels.map((p) =>
          p.id === panelId
            ? { ...p, minHeight: newHeight, maxHeight: newHeight }
            : p,
        );
        onLayoutChange({ ...currentLayout, panels } as AnalysisLayoutJSON);
      } else {
        onDragOverride({ panelId, height: newHeight });
      }
    },
    { pointer: { touch: true }, filterTaps: true },
  );

  return (
    <div
      {...bind()}
      className="absolute bottom-0 left-0 w-full h-3 cursor-row-resize hover:bg-primary/20 z-10"
      style={{ touchAction: 'none' }}
    />
  );
}

interface AnalysisPanelGridProps {
  context: AnalysisPanelContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  layout: AnalysisLayoutJSON;
  onLayoutChange?: (layout: AnalysisLayoutJSON) => void;
  mathChannels?: MathTelemetryChannel[];
  /** When set, only this panel is rendered (used by parent for per-panel fullscreen). */
  focusPanelId?: string | null;
  /** Called when a panel requests fullscreen toggle. */
  onPanelFullscreenToggle?: (panelId: string | null) => void;
  /** Height hint for the focused panel's chart. */
  focusPanelHeight?: number;
}

export function AnalysisPanelGrid({
  context,
  telemetry,
  compareTelemetry,
  compareLapId,
  layout,
  onLayoutChange,
  mathChannels,
  focusPanelId,
  onPanelFullscreenToggle,
  focusPanelHeight,
}: AnalysisPanelGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef(layout);
  const [dragOverride, setDragOverride] = useState<DragOverride | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);
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

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [panelTitles, setPanelTitles] = useState<Record<string, React.ReactNode | undefined>>({});
  const panelTitlesRef = useRef(panelTitles);
  panelTitlesRef.current = panelTitles;

  // Stable setTitle that only triggers a state update when the title actually changes
  const stableSetTitle = useCallback((panelId: string, title: React.ReactNode) => {
    const prev = panelTitlesRef.current[panelId];
    if (prev === title) return;
    if (typeof prev === 'string' && typeof title === 'string' && prev === title) return;
    setPanelTitles((p) => ({ ...p, [panelId]: title }));
  }, []);

  return (
    <TelemetryHoverContext.Provider value={{ hoverIndex, setHoverIndex }}>
      <div
        ref={containerRef}
        className="gap-2"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        }}
      >
        {sortedPanels.map((panel) => (
          <PanelCell
            key={panel.id}
            panel={panel}
            layout={layout}
            context={context}
            telemetry={telemetry}
            compareTelemetry={compareTelemetry}
            compareLapId={compareLapId}
            mathChannels={mathChannels}
            focusPanelId={focusPanelId}
            focusPanelHeight={focusPanelHeight}
            onPanelFullscreenToggle={onPanelFullscreenToggle}
            onLayoutChange={onLayoutChange}
            stableSetTitle={stableSetTitle}
            panelTitles={panelTitles}
            dragOverride={dragOverride}
            setDragOverride={setDragOverride}
            containerRef={containerRef}
            layoutRef={layoutRef}
            availableTypes={availableTypes}
            handleSetPanelType={handleSetPanelType}
          />
        ))}
      </div>
    </TelemetryHoverContext.Provider>
  );
}

interface PanelCellProps {
  panel: AnalysisPanelCell;
  layout: AnalysisLayoutJSON;
  context: AnalysisPanelContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  mathChannels?: MathTelemetryChannel[];
  focusPanelId?: string | null;
  focusPanelHeight?: number;
  onPanelFullscreenToggle?: (panelId: string | null) => void;
  onLayoutChange?: (layout: AnalysisLayoutJSON) => void;
  stableSetTitle: (panelId: string, title: React.ReactNode) => void;
  panelTitles: Record<string, React.ReactNode | undefined>;
  dragOverride: DragOverride | null;
  setDragOverride: (override: DragOverride | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  layoutRef: React.RefObject<AnalysisLayoutJSON>;
  availableTypes: AnalysisPanelType[];
  handleSetPanelType: (panelId: string, typeId: string) => void;
}

function PanelCell({
  panel,
  layout,
  context,
  telemetry,
  compareTelemetry,
  compareLapId,
  mathChannels,
  focusPanelId,
  focusPanelHeight,
  onPanelFullscreenToggle,
  onLayoutChange,
  stableSetTitle,
  panelTitles,
  dragOverride,
  setDragOverride,
  containerRef,
  layoutRef,
  availableTypes,
  handleSetPanelType,
}: PanelCellProps) {
  // Read hover state from context to avoid re-renders on hover changes
  const { hoverIndex } = useContext(TelemetryHoverContext);
  const hasType = !!panel.typeId;
  const provider = hasType ? getDefaultProviderForType(panel.typeId!) : undefined;

  const isFocused = focusPanelId === panel.id;

  // Memoize setTitle for this specific panel
  const setTitle = useCallback(
    (title: React.ReactNode) => stableSetTitle(panel.id, title),
    [stableSetTitle, panel.id]
  );

  // Build provider props - memoized to prevent unnecessary re-renders
  // Note: hover state is handled via TelemetryHoverContext, not passed through props
  const providerProps = useMemo(
    () => ({
      context,
      telemetry,
      compareTelemetry,
      compareLapId,
      host: {
        setTitle,
        availableHeight: isFocused ? focusPanelHeight : undefined,
      },
      panelId: panel.id,
      panelState: panel.state,
      mathChannels,
    }),
    [
      context,
      telemetry,
      compareTelemetry,
      compareLapId,
      setTitle,
      panel.id,
      panel.state,
      // Hover state is intentionally NOT here - handled via TelemetryHoverContext
      mathChannels,
      isFocused,
      focusPanelHeight,
    ]
  );

  // Render the panel content - only re-render when providerProps changes
  const provided = useMemo(
    () => (hasType && provider ? provider.render(providerProps) : null),
    [hasType, provider, providerProps]
  );

  const renderResult: AnalysisPanelRenderResult | null =
    provided && (provided as any).content
      ? (provided as AnalysisPanelRenderResult)
      : provided
      ? {
          content: provided as React.ReactElement,
        }
      : null;

  const panelTitle = panelTitles[panel.id] ?? renderResult?.title;

  // Apply drag overrides for instant visual feedback without re-rendering parent
  let effectiveColSpan = panel.colSpan;
  let effectiveX = panel.x;
  let effectiveMinHeight: number | undefined = panel.minHeight ?? 200;
  let effectiveMaxHeight: number | undefined = panel.maxHeight;
  if (dragOverride) {
    if (dragOverride.panelId === panel.id && dragOverride.colSpan !== undefined) {
      effectiveColSpan = dragOverride.colSpan;
    }
    if (dragOverride.rightPanelId === panel.id && dragOverride.rightColSpan !== undefined) {
      effectiveColSpan = dragOverride.rightColSpan;
      effectiveX = dragOverride.rightX ?? effectiveX;
    }
    if (dragOverride.panelId === panel.id && dragOverride.height !== undefined) {
      effectiveMinHeight = dragOverride.height;
      effectiveMaxHeight = dragOverride.height;
    }
  }
  const minHeight = isFocused ? undefined : effectiveMinHeight;
  const maxHeight = isFocused ? undefined : effectiveMaxHeight;

  const rightNeighbor = layout.panels.find(
    (p) =>
      p.y === panel.y &&
      p.rowSpan === panel.rowSpan &&
      p.x === panel.x + panel.colSpan,
  );

  // When a panel is focused (parent is fullscreen), hide others
  if (focusPanelId && !isFocused) {
    return <div className="hidden" />;
  }

  return (
    <div
      className="relative rounded-md border bg-card overflow-hidden"
      style={
        focusPanelId
          ? {}
          : {
              gridColumn: `${effectiveX + 1} / span ${effectiveColSpan}`,
              gridRow: `${panel.y + 1} / span ${panel.rowSpan}`,
              minHeight,
              maxHeight,
            }
      }
    >
      {onLayoutChange && (
        <div className="flex justify-between items-center gap-2 px-3 py-1.5 border-b bg-muted/40 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            {panelTitle && (
              <span className="font-semibold truncate">
                {panelTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {renderResult?.toolbarActions}
            <button
              type="button"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              onClick={(e) => {
                e.stopPropagation();
                onPanelFullscreenToggle?.(isFocused ? null : panel.id);
              }}
              title={isFocused ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFocused ? (
                <Minimize2 className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                className="inline-flex items-center justify-center h-6 w-6 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                onClick={(e) => e.stopPropagation()}
                title="Panel options"
              >
                <MoreVertical className="h-4 w-4" />
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
      <div
        className={`px-3 pt-2 pb-1 min-w-0 ${focusPanelId ? 'flex-1 min-h-0 overflow-auto' : 'overflow-hidden'}`}
      >
        {onLayoutChange && rightNeighbor && (
          <ColumnResizeHandle
            leftPanelId={panel.id}
            rightPanelId={rightNeighbor.id}
            leftStartX={panel.x}
            startLeftSpan={panel.colSpan}
            startRightSpan={rightNeighbor.colSpan}
            containerRef={containerRef}
            layoutRef={layoutRef}
            onLayoutChange={onLayoutChange}
            onDragOverride={setDragOverride}
          />
        )}
        {onLayoutChange && (
          <HeightResizeHandle
            panelId={panel.id}
            startHeight={panel.minHeight ?? 200}
            layoutRef={layoutRef}
            onLayoutChange={onLayoutChange}
            onDragOverride={setDragOverride}
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
      </div>
    </div>
  );
}
