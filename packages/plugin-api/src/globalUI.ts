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
