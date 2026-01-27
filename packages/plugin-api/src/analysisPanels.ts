import type * as React from 'react';
import type { TelemetryFrame } from '@purplesector/core';

export type AnalysisPanelContext = 'live' | 'singleLap' | 'lapComparison';

export interface AnalysisHostAPI {
  // Optional hook for a panel to publish a dynamic title that the host can
  // render in the panel toolbar.
  setTitle?: (title: React.ReactNode) => void;
  // Reserved for future helpers (navigation, theming, commands, etc.)
}

export interface AnalysisPanelProps {
  context: AnalysisPanelContext;
  telemetry: TelemetryFrame[];
  compareTelemetry?: TelemetryFrame[];
  compareLapId?: string | null;
  host: AnalysisHostAPI;
  // Optional cross-panel hover synchronization value (e.g. time in seconds).
  syncedHoverValue?: number | null;
  // Called by a panel when its local hover changes so the host can sync others.
  onHoverChange?: (value: number | null) => void;
}

// Result returned by an analysis panel provider. This allows providers to
// participate in the host-rendered panel toolbar while still supplying their
// own content. For backwards compatibility, providers may also return a plain
// React element instead of this object.
export interface AnalysisPanelRenderResult {
  // Optional title to show in the panel toolbar (left side).
  title?: React.ReactNode;
  // Optional set of actions (buttons, menus, etc.) to render next to the title
  // in the panel toolbar. The host will place its own controls (fullscreen,
  // layout actions) on the right-hand side.
  toolbarActions?: React.ReactNode;
  // Main body content of the panel.
  content: React.ReactElement;
}

export type AnalysisPanelRender = React.ReactElement | AnalysisPanelRenderResult;

export interface AnalysisPanelType {
  id: string; // e.g. 'plot', 'track-map'
  label: string; // Human-friendly name for UI
}

export interface AnalysisPanelProvider {
  id: string; // Unique per provider
  typeId: string; // References AnalysisPanelType.id
  isDefault?: boolean; // Whether this is the default provider for its type
  // Providers may return either a plain React element (legacy behavior) or a
  // structured render result that lets the host compose a unified toolbar.
  render: (props: AnalysisPanelProps) => AnalysisPanelRender;
}
