'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Calculator, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RAW_CHANNELS,
  MathTelemetryChannel,
  TelemetryChannelDefinition,
} from '@purplesector/telemetry';
import { MathChannelForm } from '@/components/channel-editor/MathChannelForm';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

interface ChannelEditorContentProps {
  /** Called whenever the math channels list changes (create/update/delete). */
  onChannelsChange?: (channels: MathTelemetryChannel[]) => void;
}

export default function ChannelEditorContent({ onChannelsChange }: ChannelEditorContentProps = {}) {
  const queryClient = useQueryClient();
  const [mathChannels, setMathChannels] = useState<MathTelemetryChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<TelemetryChannelDefinition | null>(null);
  const [editingMathChannel, setEditingMathChannel] = useState<MathTelemetryChannel | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['raw', 'math']));
  const [pendingChannelLabel, setPendingChannelLabel] = useState<string | null>(null);

  const mathChannelsQuery = useQuery({
    queryKey: ['channels', 'math'] as const,
    queryFn: async (): Promise<MathTelemetryChannel[]> => {
      const data = await fetchJson<unknown>('/api/channels/math', {
        unauthorized: { kind: 'return_fallback' },
        fallback: [],
      });
      return Array.isArray(data) ? (data as MathTelemetryChannel[]) : [];
    },
  });

  useEffect(() => {
    if (mathChannelsQuery.data) {
      setMathChannels(mathChannelsQuery.data);
    }
  }, [mathChannelsQuery.data]);

  const createMathChannelMutation = useMutation({
    mutationFn: async (channel: MathTelemetryChannel) => {
      return mutationJson<MathTelemetryChannel>('/api/channels/math', {
        method: 'POST',
        body: {
          label: channel.label,
          unit: channel.unit,
          expression: channel.expression,
          inputs: channel.inputs,
          validated: channel.validated,
        },
      });
    },
    onSuccess: (newChannel) => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'math'] });
      onChannelsChange?.([...mathChannels, newChannel]);
      setPendingChannelLabel(newChannel.label);
    },
  });

  const updateMathChannelMutation = useMutation({
    mutationFn: async (channel: MathTelemetryChannel) => {
      return mutationJson<MathTelemetryChannel>(`/api/channels/math/${channel.id}`, {
        method: 'PUT',
        body: {
          label: channel.label,
          unit: channel.unit,
          expression: channel.expression,
          inputs: channel.inputs,
          validated: channel.validated,
        },
      });
    },
    onSuccess: (updatedChannel) => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'math'] });
      setSelectedChannel(updatedChannel);
      setEditingMathChannel(updatedChannel);
      onChannelsChange?.(mathChannels.map((ch) => (ch.id === updatedChannel.id ? updatedChannel : ch)));
    },
  });

  const deleteMathChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      await mutationJson(`/api/channels/math/${channelId}`, {
        method: 'DELETE',
      });
      return channelId;
    },
    onSuccess: (channelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels', 'math'] });
      onChannelsChange?.(mathChannels.filter((ch) => ch.id !== channelId));
      setSelectedChannel(null);
      setEditingMathChannel(null);
    },
  });

  // Watch for newly created channel to appear in the list
  useEffect(() => {
    if (pendingChannelLabel) {
      const createdChannel = mathChannels.find(ch => ch.label === pendingChannelLabel);
      if (createdChannel) {
        setSelectedChannel(createdChannel);
        setEditingMathChannel(createdChannel);
        setIsCreatingNew(false);
        setPendingChannelLabel(null);
      }
    }
  }, [mathChannels, pendingChannelLabel]);

  const handleCreate = async (channel: MathTelemetryChannel) => {
    try {
      await createMathChannelMutation.mutateAsync(channel);
    } catch (error) {
      console.error('Error creating math channel:', error);
      alert(`Failed to create math channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdate = async (channel: MathTelemetryChannel) => {
    try {
      await updateMathChannelMutation.mutateAsync(channel);
    } catch (error) {
      console.error('Error updating math channel:', error);
      alert(`Failed to update math channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this math channel?')) return;
    try {
      await deleteMathChannelMutation.mutateAsync(channelId);
    } catch (error) {
      console.error('Error deleting math channel:', error);
      alert(`Failed to delete math channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveMathChannel = async (channel: MathTelemetryChannel) => {
    if (editingMathChannel) {
      await handleUpdate(channel);
    } else {
      await handleCreate(channel);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleSelectChannel = (channel: TelemetryChannelDefinition) => {
    setSelectedChannel(channel);
    setIsCreatingNew(false);
    if (channel.kind === 'math') {
      setEditingMathChannel(channel as MathTelemetryChannel);
    } else {
      setEditingMathChannel(null);
    }
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingMathChannel(null);
    setSelectedChannel(null);
  };

  const rawChannels = RAW_CHANNELS;

  return (
    <div className="flex h-full">
      {/* Left Panel - Channel Tree */}
      <div className="w-72 border-r flex flex-col shrink-0">
        <div className="p-3 border-b">
          <Button onClick={handleCreateNew} size="sm" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            New Math Channel
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Raw Channels Group */}
          <div>
            <button
              onClick={() => toggleGroup('raw')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent text-sm font-medium"
            >
              {expandedGroups.has('raw') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Database className="h-4 w-4" />
              Raw Channels
              <span className="ml-auto text-muted-foreground">{rawChannels.length}</span>
            </button>
            {expandedGroups.has('raw') && (
              <div className="ml-6">
                {rawChannels.map((ch) => {
                  const isSelected = selectedChannel?.id === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch)}
                      className={`w-full text-left px-4 py-1.5 text-sm hover:bg-accent ${isSelected ? 'bg-accent' : ''}`}
                    >
                      <span className="truncate">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Math Channels Group */}
          <div>
            <button
              onClick={() => toggleGroup('math')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent text-sm font-medium"
            >
              {expandedGroups.has('math') ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Calculator className="h-4 w-4" />
              Math Channels
              <span className="ml-auto text-muted-foreground">{mathChannels.length}</span>
            </button>
            {expandedGroups.has('math') && (
              <div className="ml-6">
                {mathChannels.length === 0 ? (
                  <div className="px-4 py-2 text-sm text-muted-foreground">No math channels yet</div>
                ) : (
                  mathChannels.map((ch) => {
                    const isSelected = selectedChannel?.id === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleSelectChannel(ch)}
                        className={`w-full text-left px-4 py-1.5 text-sm hover:bg-accent ${isSelected ? 'bg-accent' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{ch.label}</span>
                          {!ch.validated && (
                            <Badge variant="destructive" className="text-xs ml-auto">Invalid</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Detail View (inline, no modal) */}
      <div className="flex-1 overflow-y-auto p-6">
        {isCreatingNew ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">Create Math Channel</h3>
            <MathChannelForm
              open={false}
              onOpenChange={() => {}}
              channel={null}
              onSave={handleSaveMathChannel}
              embedded={true}
            />
          </div>
        ) : selectedChannel ? (
          selectedChannel.kind === 'raw' ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-2">{selectedChannel.label}</h3>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary">
                  <Database className="h-3 w-3 mr-1" />
                  Raw Channel
                </Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Channel ID:</span>
                  <span className="text-sm text-muted-foreground ml-2 font-mono">{selectedChannel.id}</span>
                </div>
                {selectedChannel.unit && (
                  <div>
                    <span className="text-sm font-medium">Unit:</span>
                    <span className="text-sm text-muted-foreground ml-2">{selectedChannel.unit}</span>
                  </div>
                )}
                {selectedChannel.defaultColor && (
                  <div>
                    <span className="text-sm font-medium">Default Color:</span>
                    <span className="inline-block w-4 h-4 rounded ml-2 border" style={{ backgroundColor: selectedChannel.defaultColor }} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{selectedChannel.label}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(selectedChannel.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
              <MathChannelForm
                open={false}
                onOpenChange={() => {}}
                channel={editingMathChannel}
                onSave={handleSaveMathChannel}
                embedded={true}
              />
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a channel to view details</p>
              <p className="text-sm mt-2">or create a new math channel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
