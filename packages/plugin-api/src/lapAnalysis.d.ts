import type * as React from 'react';
import type { TelemetryFrame } from '@purplesector/core';
export type TelemetryChannel = 'time' | 'throttle' | 'brake' | 'steering' | 'speed' | 'gear' | 'rpm' | 'normalizedPosition';
export interface ChannelConfig {
    id: string;
    channelId: string;
    color?: string;
    useSecondaryAxis?: boolean;
}
export interface PlotConfig {
    id: string;
    title: string;
    xAxis: TelemetryChannel;
    xAxisLabel: string;
    yAxisLabel: string;
    yAxisLabelSecondary?: string;
    channels: ChannelConfig[];
}
export interface PlotLayoutItem {
    plotId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    subRow?: number;
}
export interface PlotLayout {
    items: PlotLayoutItem[];
    cols: number;
}
export type LapAnalysisViewContext = 'singleLap' | 'lapComparison';
export interface LapAnalysisHostAPI {
}
export interface LapAnalysisViewProps {
    context: LapAnalysisViewContext;
    telemetry: TelemetryFrame[];
    compareTelemetry?: TelemetryFrame[];
    compareLapId?: string | null;
    plotConfigs: PlotConfig[];
    plotLayout: PlotLayout;
    onPlotConfigsChange: (configs: PlotConfig[]) => void;
    onPlotLayoutChange: (layout: PlotLayout) => void;
    host: LapAnalysisHostAPI;
}
export interface LapAnalysisView {
    id: string;
    title: string;
    context: LapAnalysisViewContext;
    render: (props: LapAnalysisViewProps) => React.ReactElement;
}
//# sourceMappingURL=lapAnalysis.d.ts.map