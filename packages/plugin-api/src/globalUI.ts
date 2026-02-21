import type * as React from 'react';

export interface GlobalPanelRegistration {
  id: string;
  position: 'sidebar-right' | 'sidebar-left' | 'drawer-bottom';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  render: () => React.ReactElement;
}

export interface SettingsTabRegistration {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  order?: number;
  render: () => React.ReactElement;
}

// ── App Shell: Tab descriptor shared across nav, content, and toolbar ──

export interface TabDescriptor {
  id: string;
  type: string;
  label: string;
  breadcrumbs: string[];
  entityId?: string;
  parentIds?: Record<string, string>;
  closable?: boolean;
}

// ── App Shell: Navigation pane plugin slots ──

export interface NavTreeContext {
  openTab: (tab: TabDescriptor) => void;
  refreshNav: () => void;
}

export interface NavTabRegistration {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  order: number;
  disabled?: boolean;
  renderTree: (ctx: NavTreeContext) => React.ReactElement;
}

// ── App Shell: Content pane plugin slots ──

export interface ContentTabRegistration {
  type: string;
  render: (props: {
    entityId?: string;
    parentIds?: Record<string, string>;
  }) => React.ReactElement;
}

// ── App Shell: Toolbar pane plugin slots ──

export interface ToolbarItemRegistration {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  position: 'top' | 'bottom';
  order: number;
  onClick?: (ctx: { openTab: (tab: TabDescriptor) => void }) => void;
  renderPanel?: () => React.ReactElement;
}
