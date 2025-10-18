'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Maximize2, Minimize2, Flag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfigurableTelemetryChart } from '@/components/ConfigurableTelemetryChart';
import { TelemetryFrame } from '@/types/telemetry';
import { PlotConfig, DEFAULT_PLOT_CONFIGS } from '@/types/plotConfig';
import { formatLapTime } from '@/lib/utils';

interface TelemetryPlotPanelProps {
  data: TelemetryFrame[];
  compareData?: TelemetryFrame[];
  compareLapId?: string | null;
  initialPlotConfigs?: PlotConfig[];
  onPlotConfigsChange?: (configs: PlotConfig[]) => void;
  showFullscreenToggle?: boolean;
  currentLapNumber?: number;
  showLapHeader?: boolean;
}

export function TelemetryPlotPanel({
  data,
  compareData,
  compareLapId,
  initialPlotConfigs,
  onPlotConfigsChange,
  showFullscreenToggle = true,
  currentLapNumber,
  showLapHeader = false,
}: TelemetryPlotPanelProps) {
  const [plotConfigs, setPlotConfigs] = useState<PlotConfig[]>(
    initialPlotConfigs || DEFAULT_PLOT_CONFIGS
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [syncedHoverValue, setSyncedHoverValue] = useState<number | null>(null);

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const lastNotifiedConfigs = useRef<string>('');
  const lastInitialConfigs = useRef<string>('');

  // Update plot configs when initialPlotConfigs changes (only if actually different)
  useEffect(() => {
    if (initialPlotConfigs) {
      const newConfigsStr = JSON.stringify(initialPlotConfigs);
      if (newConfigsStr !== lastInitialConfigs.current) {
        lastInitialConfigs.current = newConfigsStr;
        setPlotConfigs(initialPlotConfigs);
      }
    }
  }, [initialPlotConfigs]);

  // Notify parent when plot configs change (skip initial mount and duplicates)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastNotifiedConfigs.current = JSON.stringify(plotConfigs);
      return;
    }
    
    const currentConfigsStr = JSON.stringify(plotConfigs);
    if (currentConfigsStr !== lastNotifiedConfigs.current) {
      lastNotifiedConfigs.current = currentConfigsStr;
      if (onPlotConfigsChange) {
        onPlotConfigsChange(plotConfigs);
      }
    }
  }, [plotConfigs, onPlotConfigsChange]);

  const handleConfigChange = useCallback((index: number, newConfig: PlotConfig) => {
    setPlotConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = newConfig;
      return newConfigs;
    });
  }, []);

  const handleDelete = useCallback((index: number) => {
    setPlotConfigs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddPlot = useCallback(() => {
    const newPlot: PlotConfig = {
      id: `plot_${Date.now()}`,
      title: 'New Plot',
      xAxis: 'time',
      xAxisLabel: 'Time (s)',
      yAxisLabel: 'Value',
      yAxisLabelSecondary: '',
      channels: [],
    };
    setPlotConfigs(prev => [...prev, newPlot]);
  }, []);

  return (
    <Card className={isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            {showLapHeader && currentLapNumber ? (
              <div className="flex items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Current Lap: #{currentLapNumber}
                </CardTitle>
                {data.length > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono">
                      {formatLapTime(data[data.length - 1].lapTime / 1000)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <CardTitle>Telemetry Data</CardTitle>
                <CardDescription>
                  Customize plots to analyze different telemetry channels
                  {compareLapId && <span className="text-purple-600"> • Comparison lap shown in dashed lines</span>}
                </CardDescription>
              </>
            )}
          </div>
          {showFullscreenToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={isFullscreen ? 'h-[calc(100vh-8rem)] overflow-y-auto' : ''}>
        <div className="space-y-6">
          {plotConfigs.map((config, index) => (
            <ConfigurableTelemetryChart
              key={config.id}
              data={data}
              compareData={compareData}
              config={config}
              onConfigChange={(newConfig) => handleConfigChange(index, newConfig)}
              onDelete={() => handleDelete(index)}
              height={isFullscreen ? 350 : 250}
              syncedHoverValue={syncedHoverValue}
              onHoverChange={setSyncedHoverValue}
            />
          ))}
          
          {/* Add Plot Button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleAddPlot}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Plot
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
