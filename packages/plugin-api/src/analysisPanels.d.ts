import type * as React from 'react';
import type { TelemetryFrame } from '@purplesector/core';
import type { MathTelemetryChannel } from '@purplesector/telemetry';
export type AnalysisPanelContext = 'live' | 'singleLap' | 'lapComparison';
export interface AnalysisHostAPI {
    setTitle?: (title: React.ReactNode) => void;
    availableHeight?: number;
}
export interface AnalysisPanelProps {
    context: AnalysisPanelContext;
    telemetry: TelemetryFrame[];
    compareTelemetry?: TelemetryFrame[];
    compareLapId?: string | null;
    host: AnalysisHostAPI;
    panelId?: string;
    panelState?: unknown;
    syncedHoverValue?: number | null;
    onHoverChange?: (value: number | null) => void;
    mathChannels?: MathTelemetryChannel[];
}
export interface AnalysisPanelRenderResult {
    title?: React.ReactNode;
    toolbarActions?: React.ReactNode;
    content: React.ReactElement;
}
export type AnalysisPanelRender = React.ReactElement | AnalysisPanelRenderResult;
export interface AnalysisPanelType {
    id: string;
    label: string;
}
export interface AnalysisPanelProvider {
    id: string;
    typeId: string;
    isDefault?: boolean;
    render: (props: AnalysisPanelProps) => AnalysisPanelRender;
}
//# sourceMappingURL=analysisPanels.d.ts.map