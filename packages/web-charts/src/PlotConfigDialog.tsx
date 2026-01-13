'use client';

import { useState } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  PlotConfig,
  ChannelConfig,
  TelemetryChannel,
  CHANNEL_METADATA,
} from '@/types/plotConfig';

interface PlotConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PlotConfig;
  onSave: (config: PlotConfig) => void;
}

export function PlotConfigDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: PlotConfigDialogProps) {
  const [editedConfig, setEditedConfig] = useState<PlotConfig>(config);

  // Get all available channels
  const allChannels = Object.values(CHANNEL_METADATA);
  
  // Get channels that can be used as X-axis (time-based)
  const xAxisChannels = allChannels.filter(ch => ch.isTimeAxis);
  
  // Get channels that can be plotted (non-time-based)
  const dataChannels = allChannels.filter(ch => !ch.isTimeAxis);

  const handleAddChannel = () => {
    const newChannel: ChannelConfig = {
      id: `channel-${Date.now()}`,
      channel: 'throttle',
      color: CHANNEL_METADATA.throttle.defaultColor,
      useSecondaryAxis: false,
    };

    setEditedConfig({
      ...editedConfig,
      channels: [...editedConfig.channels, newChannel],
    });
  };

  const handleRemoveChannel = (channelId: string) => {
    setEditedConfig({
      ...editedConfig,
      channels: editedConfig.channels.filter((ch) => ch.id !== channelId),
    });
  };

  const handleChannelChange = (
    channelId: string,
    field: keyof ChannelConfig,
    value: string | boolean
  ) => {
    setEditedConfig({
      ...editedConfig,
      channels: editedConfig.channels.map((ch) => {
        if (ch.id === channelId) {
          const updated = { ...ch, [field]: value };
          
          // Auto-update color when channel changes
          if (field === 'channel') {
            const metadata = CHANNEL_METADATA[value as TelemetryChannel];
            updated.color = metadata.defaultColor;
          }
          
          return updated;
        }
        return ch;
      }),
    });
  };

  const handleAutoGenerate = () => {
    const xMeta = CHANNEL_METADATA[editedConfig.xAxis];
    const primaryChannels = editedConfig.channels.filter(ch => !ch.useSecondaryAxis);
    const secondaryChannels = editedConfig.channels.filter(ch => ch.useSecondaryAxis);
    
    // Generate plot title from channel names
    let title = '';
    if (editedConfig.channels.length > 0) {
      const channelNames = editedConfig.channels.map(ch => CHANNEL_METADATA[ch.channel].label);
      if (channelNames.length === 1) {
        title = channelNames[0];
      } else if (channelNames.length === 2) {
        title = `${channelNames[0]} & ${channelNames[1]}`;
      } else {
        title = `${channelNames[0]}, ${channelNames[1]} & More`;
      }
    }
    
    // Generate X-axis label
    const xAxisLabel = `${xMeta.label}${xMeta.unit ? ` (${xMeta.unit})` : ''}`;
    
    // Generate primary Y-axis label
    let yAxisLabel = '';
    if (primaryChannels.length > 0) {
      const channelLabels = primaryChannels.map(ch => CHANNEL_METADATA[ch.channel].label);
      const units = [...new Set(primaryChannels.map(ch => CHANNEL_METADATA[ch.channel].unit))];
      
      if (channelLabels.length === 1) {
        yAxisLabel = `${channelLabels[0]}${units[0] ? ` (${units[0]})` : ''}`;
      } else if (units.length === 1 && units[0]) {
        // Multiple channels with same unit
        yAxisLabel = `${channelLabels[0]}, ${channelLabels[1]}${channelLabels.length > 2 ? ', ...' : ''} (${units[0]})`;
      } else {
        // Multiple channels with different units
        yAxisLabel = `${channelLabels[0]}, ${channelLabels[1]}${channelLabels.length > 2 ? ', ...' : ''}`;
      }
    }
    
    // Generate secondary Y-axis label
    let yAxisLabelSecondary = '';
    if (secondaryChannels.length > 0) {
      const channelLabels = secondaryChannels.map(ch => CHANNEL_METADATA[ch.channel].label);
      const units = [...new Set(secondaryChannels.map(ch => CHANNEL_METADATA[ch.channel].unit))];
      
      if (channelLabels.length === 1) {
        yAxisLabelSecondary = `${channelLabels[0]}${units[0] ? ` (${units[0]})` : ''}`;
      } else if (units.length === 1 && units[0]) {
        // Multiple channels with same unit
        yAxisLabelSecondary = `${channelLabels[0]}, ${channelLabels[1]}${channelLabels.length > 2 ? ', ...' : ''} (${units[0]})`;
      } else {
        // Multiple channels with different units
        yAxisLabelSecondary = `${channelLabels[0]}, ${channelLabels[1]}${channelLabels.length > 2 ? ', ...' : ''}`;
      }
    }
    
    setEditedConfig({
      ...editedConfig,
      title,
      xAxisLabel,
      yAxisLabel,
      yAxisLabelSecondary,
    });
  };

  const handleSave = () => {
    onSave(editedConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Plot</DialogTitle>
          <DialogDescription>
            Customize the plot title, axes, and data channels
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plot Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Plot Title</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleAutoGenerate}
                      disabled={editedConfig.channels.length === 0}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" sideOffset={5}>
                    <p>Auto-Generate Labels</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              value={editedConfig.title}
              onChange={(e) =>
                setEditedConfig({ ...editedConfig, title: e.target.value })
              }
              placeholder="Enter plot title"
            />
          </div>

          {/* Primary X-Axis and Label */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">X-Axis</label>
              <Select
                value={editedConfig.xAxis}
                onValueChange={(value) =>
                  setEditedConfig({
                    ...editedConfig,
                    xAxis: value as TelemetryChannel,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {xAxisChannels.map((ch) => (
                    <SelectItem key={ch.key} value={ch.key}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">X-Axis Label</label>
              <Input
                value={editedConfig.xAxisLabel}
                onChange={(e) =>
                  setEditedConfig({
                    ...editedConfig,
                    xAxisLabel: e.target.value,
                  })
                }
                placeholder="e.g., Time (s)"
              />
            </div>
          </div>

          {/* Y-Axis Labels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Y-Axis Label (Primary)</label>
              <Input
                value={editedConfig.yAxisLabel}
                onChange={(e) =>
                  setEditedConfig({
                    ...editedConfig,
                    yAxisLabel: e.target.value,
                  })
                }
                placeholder="e.g., Input (%)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Y-Axis Label (Secondary)</label>
              <Input
                value={editedConfig.yAxisLabelSecondary || ''}
                onChange={(e) =>
                  setEditedConfig({
                    ...editedConfig,
                    yAxisLabelSecondary: e.target.value,
                  })
                }
                placeholder="e.g., Speed (km/h)"
                disabled={!editedConfig.channels.some(ch => ch.useSecondaryAxis)}
              />
              {!editedConfig.channels.some(ch => ch.useSecondaryAxis) && (
                <p className="text-xs text-muted-foreground">
                  Enable "2nd Axis" on a channel to use
                </p>
              )}
            </div>
          </div>

          {/* Channels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Data Channels</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddChannel}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Channel
              </Button>
            </div>

            {editedConfig.channels.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                No channels configured. Click "Add Channel" to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {editedConfig.channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      {/* Channel Select */}
                      <div className="flex-1">
                        <Select
                          value={channel.channel}
                          onValueChange={(value) =>
                            handleChannelChange(
                              channel.id,
                              'channel',
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select channel" />
                          </SelectTrigger>
                          <SelectContent>
                            {dataChannels.map((ch) => (
                              <SelectItem key={ch.key} value={ch.key}>
                                {ch.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Color Picker */}
                      <div className="w-20">
                        <Input
                          type="color"
                          value={channel.color || '#000000'}
                          onChange={(e) =>
                            handleChannelChange(
                              channel.id,
                              'color',
                              e.target.value
                            )
                          }
                          className="h-10 p-1 cursor-pointer"
                        />
                      </div>

                      {/* Secondary Axis Checkbox */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`secondary-${channel.id}`}
                          checked={channel.useSecondaryAxis || false}
                          onChange={(e) =>
                            handleChannelChange(
                              channel.id,
                              'useSecondaryAxis',
                              e.target.checked
                            )
                          }
                          className="rounded"
                        />
                        <label
                          htmlFor={`secondary-${channel.id}`}
                          className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer"
                        >
                          2nd Axis
                        </label>
                      </div>

                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChannel(channel.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
