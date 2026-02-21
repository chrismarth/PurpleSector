'use client';

import React, { useRef, useEffect } from 'react';
import { X, Inbox, Calendar, Flag, Car, Columns2 } from 'lucide-react';
import { useAppShell } from './AppShellContext';
import { useNav } from './NavContext';
import { TabContentRouter } from './TabContentRouter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const VEHICLE_TAB_TYPES = new Set(['vehicle-detail', 'vehicle-edit', 'vehicle-new', 'vehicle-config-detail', 'vehicle-config-new', 'vehicle-setup-detail', 'vehicle-setup-new']);

export function ContentPane() {
  const { state, setActiveTab, closeTab, setActiveNavTab } = useAppShell();
  const { setSelectedNode } = useNav();
  const tabBarRef = useRef<HTMLDivElement>(null);
  const activeNavTabRef = useRef(state.activeNavTab);
  activeNavTabRef.current = state.activeNavTab;

  // Scroll active tab into view & sync nav tree selection
  useEffect(() => {
    if (!state.activeTabId) return;
    // Scroll tab into view
    if (tabBarRef.current) {
      const el = tabBarRef.current.querySelector(`[data-tab-id="${state.activeTabId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
    // Sync nav tree selection based on active tab
    const tab = state.tabs.find((t) => t.id === state.activeTabId);
    if (tab) {
      const isVehicleTab = VEHICLE_TAB_TYPES.has(tab.type);
      // Switch nav tab bar to match the content tab's domain (only if different, to avoid toggle-collapse)
      const targetNavTab = isVehicleTab ? 'vehicles' : 'events';
      if (activeNavTabRef.current !== targetNavTab) {
        setActiveNavTab(targetNavTab);
      }

      if (isVehicleTab) {
        // Dispatch selection event for the vehicle tree
        const nodeId = tab.entityId
          ? `${tab.type.replace('-detail', '').replace('-edit', '').replace('-new', '')}:${tab.entityId}`
          : tab.parentIds?.vehicleId
            ? `vehicle:${tab.parentIds.vehicleId}`
            : null;
        // parentId is the vehicle that should be expanded; for vehicle-detail/edit tabs the vehicle IS the entity
        const expandId = tab.parentIds?.vehicleId || (tab.type.startsWith('vehicle-detail') || tab.type.startsWith('vehicle-edit') ? tab.entityId : undefined);
        if (nodeId) {
          const detail = { nodeId, parentId: expandId };
          // Store pending selection for VehiclesTree to pick up on mount
          (window as any).__vehiclesPendingSelection = detail;
          // Also dispatch event for when tree is already mounted
          requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent('vehicles:selectNode', { detail }));
          });
        }
      } else if (tab.entityId) {
        const typePrefix = tab.type.replace('-detail', '').replace('-edit', '').replace('-new', '');
        setSelectedNode(`${typePrefix}:${tab.entityId}`);
      }
    }
  }, [state.activeTabId, state.tabs, setSelectedNode, setActiveNavTab]);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Tab bar */}
      {state.tabs.length > 0 && (
        <TooltipProvider delayDuration={300}>
        <div
          ref={tabBarRef}
          className="flex items-center border-b bg-gray-50 dark:bg-gray-900 overflow-x-auto shrink-0 scrollbar-thin"
        >
          {state.tabs.map((tab) => {
            const isActive = tab.id === state.activeTabId;
            const breadcrumbLabel = tab.breadcrumbs.join(' › ');

            const TabIcon = tab.type.startsWith('event') ? Calendar
              : tab.type.startsWith('session') || tab.type.startsWith('lap') || tab.type === 'run-plan-new' ? Flag
              : tab.type.startsWith('vehicle') ? Car
              : tab.type === 'channel-editor' ? Columns2
              : null;

            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-background text-foreground border-t-2 border-t-purple-600'
                    : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {TabIcon && <TabIcon className="h-3 w-3 shrink-0" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate max-w-[200px]">
                      {breadcrumbLabel}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{breadcrumbLabel}</TooltipContent>
                </Tooltip>
                {tab.closable !== false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 transition-opacity"
                    aria-label={`Close ${tab.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        </TooltipProvider>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab ? (
          <div className="mx-auto w-full max-w-7xl h-full">
            <TabContentRouter tab={activeTab} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Inbox className="h-12 w-12 opacity-30" />
            <p className="text-sm">Select an item from the navigation pane</p>
          </div>
        )}
      </div>
    </div>
  );
}
