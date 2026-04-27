

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { useAppShell } from './AppShellContext';
import { getGlobalPanels } from '@/plugins';
import { AlertCircle } from 'lucide-react';

const MIN_WIDTH = 260;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 320;
const AGENT_WIDTH_KEY = 'ps:agentPanelWidth';

function loadWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const v = localStorage.getItem(AGENT_WIDTH_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTH;
}

function saveWidth(w: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AGENT_WIDTH_KEY, String(w));
  } catch {
    // ignore
  }
}

export function AgentSlidePanel() {
  const { state } = useAppShell();
  const [width, setWidth] = useState(loadWidth);
  const [isDragging, setIsDragging] = useState(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  // Find the sidebar-right global panel (typically the agent)
  const panels = getGlobalPanels();
  const sidebarPanel = panels.find((p) => p.position === 'sidebar-right');

  // Persist width
  useEffect(() => {
    saveWidth(width);
  }, [width]);

  const bindDrag = useDrag(
    ({ movement: [mx], first, last, memo }) => {
      if (first) {
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        setIsDragging(true);
        memo = widthRef.current;
      }
      // Dragging left increases width (panel is on the right side)
      const base = memo as number;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, base - mx)));
      if (last) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        setIsDragging(false);
      }
      return memo;
    },
    { pointer: { touch: true }, filterTaps: true },
  );

  if (!state.agentPanelOpen || !sidebarPanel) {
    return null;
  }

  return (
    <div
      className={`relative border-l bg-background shrink-0 overflow-hidden flex flex-col ${isDragging ? '' : 'transition-[width] duration-200 ease-in-out'}`}
      style={{ width }}
    >
      {/* Drag handle */}
      <div
        {...bindDrag()}
        className="absolute top-0 left-0 w-3 h-full cursor-col-resize hover:bg-purple-500/30 active:bg-purple-500/50 transition-colors z-10"
        style={{ touchAction: 'none' }}
      />
      <PanelContentWrapper panel={sidebarPanel} />
    </div>
  );
}

// Wrapper to catch render errors and show fallback UI
function PanelContentWrapper({ panel }: { panel: { id: string; render: () => React.ReactNode } }) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Reset error when panel changes
    setError(null);
  }, [panel.id]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">
          Failed to load panel: {panel.id}
        </p>
        <p className="text-xs text-destructive mt-1">{error.message}</p>
      </div>
    );
  }

  try {
    return <>{panel.render()}</>;
  } catch (err) {
    console.error(`Error rendering panel ${panel.id}:`, err);
    setError(err instanceof Error ? err : new Error(String(err)));
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground">Panel error</p>
      </div>
    );
  }
}
