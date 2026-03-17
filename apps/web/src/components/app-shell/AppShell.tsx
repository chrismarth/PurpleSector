'use client';

import React from 'react';
import { AppShellProvider } from './AppShellContext';
import { NavProvider } from './NavContext';
import { TitleBar } from './TitleBar';
import { NavPane } from './NavPane';
import { ToolbarPane } from './ToolbarPane';
import { StatusBar } from './StatusBar';
import { AgentSlidePanel } from './AgentSlidePanel';

export function AppShell(props: { children?: React.ReactNode }) {
  const { children } = props;
  return (
    <AppShellProvider>
      <NavProvider>
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
          {/* Title Bar */}
          <TitleBar />

          {/* Main area: nav + content + agent panel + toolbar */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Navigation Pane (vtabs + tree) */}
            <NavPane />

            {/* Content Pane */}
            {children ? (
              <div className="flex-1 min-w-0 overflow-hidden">{children}</div>
            ) : (
              <div className="flex-1 min-w-0 overflow-hidden flex items-center justify-center text-muted-foreground">
                <p className="text-sm">No route content</p>
              </div>
            )}

            {/* Agent Slide-out Panel */}
            <AgentSlidePanel />

            {/* Toolbar Pane (right icon bar) */}
            <ToolbarPane />
          </div>

          {/* Status Bar */}
          <StatusBar />
        </div>
      </NavProvider>
    </AppShellProvider>
  );
}
