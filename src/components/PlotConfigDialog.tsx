'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

  // Get all available channels for both axes
  const allChannels = Object.values(CHANNEL_METADATA);

  const handleAddChannel = () => {
    const newChannel: ChannelConfig = {
      id: `channel-${Date.now()}`,
      xChannel: 'time',
      yChannel: 'throttle',
      color: CHANNEL_METADATA.throttle.defaultColor,
      label: CHANNEL_METADATA.throttle.label,
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
    value: string
  ) => {
    setEditedConfig({
      ...editedConfig,
      channels: editedConfig.channels.map((ch) => {
        if (ch.id === channelId) {
          const updated = { ...ch, [field]: value };
          
          // Auto-update label and color when Y channel changes
          if (field === 'yChannel') {
            const metadata = CHANNEL_METADATA[value as TelemetryChannel];
            updated.label = metadata.label;
            updated.color = metadata.defaultColor;
          }
          
          return updated;
        }
        return ch;
      }),
    });
  };

  const handleSave = () => {
    // Auto-update axis labels based on channels if they match defaults
    const firstChannel = editedConfig.channels[0];
    if (firstChannel) {
      const xMeta = CHANNEL_METADATA[firstChannel.xChannel];
      const yMeta = CHANNEL_METADATA[firstChannel.yChannel];
      
      // Smart default for X axis
      if (!editedConfig.xAxisLabel || editedConfig.xAxisLabel === config.xAxisLabel) {
        editedConfig.xAxisLabel = `${xMeta.label}${xMeta.unit ? ` (${xMeta.unit})` : ''}`;
      }
      
      // Smart default for Y axis - use first channel's unit
      if (!editedConfig.yAxisLabel || editedConfig.yAxisLabel === config.yAxisLabel) {
        editedConfig.yAxisLabel = `${yMeta.label}${yMeta.unit ? ` (${yMeta.unit})` : ''}`;
      }
    }
    
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
            <label className="text-sm font-medium">Plot Title</label>
            <Input
              value={editedConfig.title}
              onChange={(e) =>
                setEditedConfig({ ...editedConfig, title: e.target.value })
              }
              placeholder="Enter plot title"
            />
          </div>

          {/* Axis Labels */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Y-Axis Label</label>
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
              <div className="space-y-3">
                {editedConfig.channels.map((channel, index) => (
                  <div
                    key={channel.id}
                    className="p-4 border rounded-lg space-y-3 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Channel {index + 1}
                      </span>
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          X-Axis (Primary)
                        </label>
                        <Select
                          value={channel.xChannel}
                          onValueChange={(value) =>
                            handleChannelChange(
                              channel.id,
                              'xChannel',
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allChannels.map((ch) => (
                              <SelectItem key={ch.key} value={ch.key}>
                                {ch.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          Y-Axis (Secondary)
                        </label>
                        <Select
                          value={channel.yChannel}
                          onValueChange={(value) =>
                            handleChannelChange(
                              channel.id,
                              'yChannel',
                              value
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allChannels.map((ch) => (
                              <SelectItem key={ch.key} value={ch.key}>
                                {ch.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          Label
                        </label>
                        <Input
                          value={channel.label || ''}
                          onChange={(e) =>
                            handleChannelChange(
                              channel.id,
                              'label',
                              e.target.value
                            )
                          }
                          placeholder="Channel label"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          Color
                        </label>
                        <div className="flex gap-2">
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
                            className="w-16 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={channel.color || '#000000'}
                            onChange={(e) =>
                              handleChannelChange(
                                channel.id,
                                'color',
                                e.target.value
                              )
                            }
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
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
