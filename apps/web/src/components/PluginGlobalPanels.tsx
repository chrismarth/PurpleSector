'use client';

import { useState } from 'react';
import { getGlobalPanels } from '@/plugins';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { GlobalPanelRegistration } from '@purplesector/plugin-api';

/**
 * Renders plugin-registered global panels (sidebars, drawers).
 * Each panel gets a toggle button and a slide-out container.
 */
export function PluginGlobalPanels() {
  const panels = getGlobalPanels();
  const [openPanelId, setOpenPanelId] = useState<string | null>(null);

  if (panels.length === 0) return null;

  const openPanel = panels.find((p) => p.id === openPanelId) ?? null;

  return (
    <>
      {/* Toggle buttons — fixed to the right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-1">
        {panels.map((panel) => (
          <PanelToggleButton
            key={panel.id}
            panel={panel}
            isOpen={openPanelId === panel.id}
            onToggle={() =>
              setOpenPanelId((prev) => (prev === panel.id ? null : panel.id))
            }
          />
        ))}
      </div>

      {/* Panel slide-out */}
      {openPanel && (
        <div className="fixed right-0 top-0 h-full z-30 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-30"
            onClick={() => setOpenPanelId(null)}
          />
          {/* Panel container */}
          <div className="relative z-40 ml-auto h-full w-[400px] max-w-[90vw] bg-background border-l shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm font-medium">
                <openPanel.icon className="h-4 w-4" />
                {openPanel.label}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setOpenPanelId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              {openPanel.render()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PanelToggleButton({
  panel,
  isOpen,
  onToggle,
}: {
  panel: GlobalPanelRegistration;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant={isOpen ? 'default' : 'outline'}
      size="icon"
      className="h-9 w-9 rounded-l-lg rounded-r-none shadow-md"
      onClick={onToggle}
      title={panel.label}
    >
      <panel.icon className="h-4 w-4" />
    </Button>
  );
}
