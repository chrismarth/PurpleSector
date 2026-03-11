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
export declare function generateDefaultLayout(plotConfigs: PlotConfig[]): PlotLayout;
export declare const DEFAULT_PLOT_CONFIGS: PlotConfig[];
//# sourceMappingURL=plotConfig.d.ts.map