'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppShell } from './AppShellContext';
import { NavTabBar } from './NavTabBar';
import { EventsTree } from './EventsTree';
import { CreateVehicleDialog } from './CreateVehicleDialog';
import { getNavTabs } from '@/plugins';

const MIN_WIDTH = 180;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 260;
const NAV_WIDTH_KEY = 'ps:navWidth';

function loadWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  try {
    const v = localStorage.getItem(NAV_WIDTH_KEY);
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
    localStorage.setItem(NAV_WIDTH_KEY, String(w));
  } catch {
    // ignore
  }
}

export function NavPane() {
  const { state, openTab } = useAppShell();
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [width, setWidth] = useState(loadWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const pluginNavTabs = getNavTabs();

  // Persist width
  useEffect(() => {
    saveWidth(width);
  }, [width]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width]
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    }

    function onMouseUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Listen for plugin create-entity requests
  useEffect(() => {
    function handleCreateVehicle() {
      setVehicleDialogOpen(true);
    }
    window.addEventListener('appshell:createVehicle', handleCreateVehicle);
    return () => window.removeEventListener('appshell:createVehicle', handleCreateVehicle);
  }, []);

  function handleVehicleCreated(vehicle: { id: string; name: string }) {
    window.dispatchEvent(new Event('agent:data-mutated'));
    openTab({
      id: `vehicle-detail:${vehicle.id}`,
      type: 'vehicle-detail',
      label: vehicle.name,
      breadcrumbs: [vehicle.name],
      entityId: vehicle.id,
      closable: true,
    });
  }

  // Determine which tree to render
  function renderTree() {
    if (state.activeNavTab === 'events') {
      return <EventsTree />;
    }
    // Check plugin nav tabs
    const pluginTab = pluginNavTabs.find((t) => t.id === state.activeNavTab);
    if (pluginTab && !pluginTab.disabled) {
      return pluginTab.renderTree({
        openTab: (tab) => {
          const event = new CustomEvent('appshell:openTab', { detail: tab });
          window.dispatchEvent(event);
        },
        refreshNav: () => {
          window.dispatchEvent(new Event('agent:data-mutated'));
        },
      });
    }
    return (
      <div className="p-3 text-sm text-muted-foreground">
        Select a navigation tab
      </div>
    );
  }

  return (
    <div className="flex shrink-0">
      {/* Vertical tab bar (always visible) */}
      <NavTabBar />

      {/* Tree panel (collapsible) */}
      <div
        className="relative overflow-hidden border-r transition-[width] duration-200 ease-in-out"
        style={{ width: state.navCollapsed ? 0 : width }}
      >
        {!state.navCollapsed && (
          <div className="h-full overflow-hidden" style={{ width }}>
            {renderTree()}
          </div>
        )}

        {/* Drag handle */}
        {!state.navCollapsed && (
          <div
            onMouseDown={onMouseDown}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500/30 active:bg-purple-500/50 transition-colors z-10"
          />
        )}
      </div>
      <CreateVehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        onCreated={handleVehicleCreated}
      />
    </div>
  );
}
