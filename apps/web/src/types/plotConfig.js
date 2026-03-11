"use strict";
// Plot configuration types for configurable telemetry charts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PLOT_CONFIGS = void 0;
exports.generateDefaultLayout = generateDefaultLayout;
// Helper function to generate default layout from plot configs
function generateDefaultLayout(plotConfigs) {
    const items = plotConfigs.map((config, index) => ({
        plotId: config.id,
        x: 0,
        y: index,
        w: 12, // Full width
        h: 300, // Default height
    }));
    return {
        items,
        cols: 12,
    };
}
// Default plot configurations
exports.DEFAULT_PLOT_CONFIGS = [
    {
        id: 'throttle-brake',
        title: 'Throttle & Brake',
        xAxis: 'time',
        xAxisLabel: 'Time (s)',
        yAxisLabel: 'Input (%)',
        channels: [
            {
                id: 'throttle-1',
                channelId: 'throttle',
                color: '#10b981',
            },
            {
                id: 'brake-1',
                channelId: 'brake',
                color: '#ef4444',
            },
        ],
    },
    {
        id: 'steering',
        title: 'Steering Input',
        xAxis: 'time',
        xAxisLabel: 'Time (s)',
        yAxisLabel: 'Steering (%)',
        channels: [
            {
                id: 'steering-1',
                channelId: 'steering',
                color: '#8b5cf6',
            },
        ],
    },
    {
        id: 'speed',
        title: 'Speed',
        xAxis: 'time',
        xAxisLabel: 'Time (s)',
        yAxisLabel: 'Speed (km/h)',
        channels: [
            {
                id: 'speed-1',
                channelId: 'speed',
                color: '#3b82f6',
            },
        ],
    },
];
