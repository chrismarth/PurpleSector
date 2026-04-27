import * as React from 'react';
import type {
  PluginModule,
  PluginClientContext,
  PluginManifest,
  AnalysisPanelProps,
  AnalysisPanelRenderResult,
} from '@purplesector/plugin-api';
import { SimpleTelemetryPlotPanel } from '@purplesector/web-charts';
import { ZoomOut, Pencil } from 'lucide-react';

const manifest: PluginManifest = {
  id: 'purple-sector.core-lap-views',
  name: 'Core Lap Telemetry Views',
  version: '0.1.0',
  description: 'Built-in lap telemetry plot views',
  capabilities: ['analysisPanelType', 'analysisPanelProvider'],
  entry: './plugin',
};

const plugin: PluginModule = {
  manifest,
  register(ctx: PluginClientContext) {
    // Generic analysis panel type for telemetry plots
    ctx.registerAnalysisPanelType({
      id: 'plot',
      label: 'Telemetry Plot',
    });

    // Per-panel stable action refs so toolbar buttons can reach the
    // imperative actions registered by each SimpleTelemetryPlotPanel instance.
    type PanelActions = { resetZoom: () => void; openConfig: () => void };
    const panelActionsMap = new Map<string, PanelActions>();

    ctx.registerAnalysisPanelProvider({
      id: 'core-telemetry-plot-panel',
      typeId: 'plot',
      isDefault: true,
      render: (props: AnalysisPanelProps): AnalysisPanelRenderResult => {
        // Use the panel id from the host to key actions per panel instance.
        const panelId = props.panelId ?? `plot-${panelActionsMap.size}`;

        const toolbarActions = (
          <>
            <button
              type="button"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                panelActionsMap.get(panelId)?.resetZoom?.();
              }}
              title="Reset zoom"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                panelActionsMap.get(panelId)?.openConfig?.();
              }}
              title="Edit plot"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </>
        );

        return {
          title: undefined,
          toolbarActions,
          content: (
            <SimpleTelemetryPlotPanel
              data={props.telemetry}
              compareData={props.compareTelemetry}
              initialConfig={props.panelState as any}
              onTitleChange={(title) => props.host.setTitle?.(title)}
              onRegisterActions={(a) => {
                panelActionsMap.set(panelId, a);
              }}
              mathChannels={props.mathChannels}
              height={props.host.availableHeight}
            />
          ),
        };
      },
    });
  },
};

export default plugin;
