'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigurableTelemetryChart } from './ConfigurableTelemetryChart';
import type { TelemetryFrame } from '@/types/telemetry';
import { CHANNEL_METADATA, type PlotConfig } from '@/types/plotConfig';

interface SimpleTelemetryPlotPanelProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  syncedHoverValue?: number | null;
  onHoverChange?: (value: number | null) => void;
  // Called when the plot title changes so an outer toolbar can reflect it.
  onTitleChange?: (title: string) => void;
  // Allows the host/provider to get imperative actions for toolbar buttons.
  onRegisterActions?: (actions: {
    resetZoom: () => void;
    openConfig: () => void;
  }) => void;
}

export function SimpleTelemetryPlotPanel({
  data,
  compareData,
  syncedHoverValue,
  onHoverChange,
  onTitleChange,
  onRegisterActions,
}: SimpleTelemetryPlotPanelProps) {
  const [config, setConfig] = useState<PlotConfig>({
    id: `plot_${Date.now()}`,
    title: 'New Plot',
    xAxis: 'time',
    xAxisLabel: 'Time (s)',
    yAxisLabel: 'Value',
    yAxisLabelSecondary: '',
    channels: [],
  });

  const handleConfigChange = useCallback(
    (next: PlotConfig) => {
      // If no custom title/axis labels have been set yet, derive sensible
      // defaults from the primary channel when one is configured.
      const primaryChannelConfig = next.channels.find((c) => !c.useSecondaryAxis) ?? next.channels[0];
      if (primaryChannelConfig) {
        const channelMeta = CHANNEL_METADATA[primaryChannelConfig.channel];

        if (next.title === 'New Plot' || !next.title) {
          next = {
            ...next,
            title: channelMeta.label,
          };
        }

        if (next.yAxisLabel === 'Value' || !next.yAxisLabel) {
          const unitSuffix = channelMeta.unit ? ` (${channelMeta.unit})` : '';
          next = {
            ...next,
            yAxisLabel: `${channelMeta.label}${unitSuffix}`,
          };
        }
      }

      setConfig(next);
      if (onTitleChange && next.title) {
        onTitleChange(next.title);
      }
    },
    [onTitleChange],
  );
  const [resetZoomToken, setResetZoomToken] = useState(0);
  const [openConfigToken, setOpenConfigToken] = useState(0);

  useEffect(() => {
    if (!onRegisterActions) return;

    onRegisterActions({
      resetZoom: () => setResetZoomToken((prev) => prev + 1),
      openConfig: () => setOpenConfigToken((prev) => prev + 1),
    });
  }, [onRegisterActions]);

  return (
    <ConfigurableTelemetryChart
      data={data}
      compareData={compareData}
      config={config}
      onConfigChange={handleConfigChange}
      syncedHoverValue={syncedHoverValue}
      onHoverChange={onHoverChange}
      externalResetZoomToken={resetZoomToken}
      externalOpenConfigToken={openConfigToken}
    />
  );
}
