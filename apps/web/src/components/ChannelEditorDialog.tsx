'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Database, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RAW_CHANNELS,
  MathTelemetryChannel,
  TelemetryChannelDefinition,
} from '@purplesector/telemetry';
import { MathChannelForm } from './MathChannelForm';

interface ChannelEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mathChannels: MathTelemetryChannel[];
  onMathChannelCreate: (channel: MathTelemetryChannel) => void;
  onMathChannelUpdate: (channel: MathTelemetryChannel) => void;
  onMathChannelDelete: (channelId: string) => void;
  availableRawChannelIds?: Set<string>; // For showing availability
}

export function ChannelEditorDialog({
  open,
  onOpenChange,
  mathChannels,
  onMathChannelCreate,
  onMathChannelUpdate,
  onMathChannelDelete,
  availableRawChannelIds,
}: ChannelEditorDialogProps) {
  const [selectedChannel, setSelectedChannel] = useState<TelemetryChannelDefinition | null>(null);
  const [editingMathChannel, setEditingMathChannel] = useState<MathTelemetryChannel | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['raw', 'math']));
  const [pendingChannelLabel, setPendingChannelLabel] = useState<string | null>(null);

  const rawChannels = RAW_CHANNELS;
  const mathChannelsList = mathChannels;

  // Watch for newly created channel to appear in the list
  useEffect(() => {
    if (pendingChannelLabel) {
      const createdChannel = mathChannels.find(ch => ch.label === pendingChannelLabel);
      if (createdChannel) {
        setSelectedChannel(createdChannel);
        setEditingMathChannel(createdChannel);
        setIsCreatingNew(false);
        setPendingChannelLabel(null);
        console.log('Found and selected newly created channel:', createdChannel);
      }
    }
  }, [mathChannels, pendingChannelLabel]);

  // Check if a math channel's inputs are available
  const isChannelAvailable = (ch: TelemetryChannelDefinition): boolean => {
    if (ch.kind === 'raw') {
      return !availableRawChannelIds || availableRawChannelIds.has(ch.id);
    }
    // Math channel: all inputs must be available
    return ch.inputs.every(
      (input) => !availableRawChannelIds || availableRawChannelIds.has(input.channelId)
    );
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const handleSelectChannel = (channel: TelemetryChannelDefinition) => {
    setSelectedChannel(channel);
    setIsCreatingNew(false);
    if (channel.kind === 'math') {
      setEditingMathChannel(channel);
    } else {
      setEditingMathChannel(null);
    }
  };

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingMathChannel(null);
    setSelectedChannel(null);
  };

  const handleDelete = (channelId: string) => {
    if (confirm('Are you sure you want to delete this math channel?')) {
      onMathChannelDelete(channelId);
      setSelectedChannel(null);
      setEditingMathChannel(null);
    }
  };

  const handleSaveMathChannel = async (channel: MathTelemetryChannel) => {
    console.log('handleSaveMathChannel called with:', channel);
    console.log('editingMathChannel:', editingMathChannel);
    console.log('isCreatingNew:', isCreatingNew);
    
    if (editingMathChannel) {
      console.log('Updating existing channel');
      await onMathChannelUpdate(channel);
      setSelectedChannel(channel);
      setEditingMathChannel(channel);
    } else {
      console.log('Creating new channel');
      await onMathChannelCreate(channel);
      console.log('Channel creation completed');
      
      // Set the pending channel label - useEffect will select it when it appears
      setPendingChannelLabel(channel.label);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Channel Library</DialogTitle>
          <DialogDescription>
            View raw telemetry channels and manage math channels
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Channel Tree */}
          <div className="w-80 border-r flex flex-col">
            <div className="p-4 border-b">
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
                  {expandedGroups.has('raw') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Database className="h-4 w-4" />
                  Raw Channels
                  <span className="ml-auto text-muted-foreground">{rawChannels.length}</span>
                </button>
                {expandedGroups.has('raw') && (
                  <div className="ml-6">
                    {rawChannels.map((ch) => {
                      const available = isChannelAvailable(ch);
                      const isSelected = selectedChannel?.id === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => handleSelectChannel(ch)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                            isSelected ? 'bg-accent' : ''
                          } ${
                            !available ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate">{ch.label}</span>
                            {!available && (
                              <Badge variant="outline" className="text-xs ml-auto">
                                N/A
                              </Badge>
                            )}
                          </div>
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
                  {expandedGroups.has('math') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Calculator className="h-4 w-4" />
                  Math Channels
                  <span className="ml-auto text-muted-foreground">{mathChannelsList.length}</span>
                </button>
                {expandedGroups.has('math') && (
                  <div className="ml-6">
                    {mathChannelsList.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-muted-foreground">
                        No math channels yet
                      </div>
                    ) : (
                      mathChannelsList.map((ch) => {
                        const available = isChannelAvailable(ch);
                        const isSelected = selectedChannel?.id === ch.id;
                        return (
                          <button
                            key={ch.id}
                            onClick={() => handleSelectChannel(ch)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                              isSelected ? 'bg-accent' : ''
                            } ${
                              !available ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="truncate">{ch.label}</span>
                              {!ch.validated && (
                                <Badge variant="destructive" className="text-xs ml-auto">
                                  Invalid
                                </Badge>
                              )}
                              {!available && ch.validated && (
                                <Badge variant="outline" className="text-xs ml-auto">
                                  N/A
                                </Badge>
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

          {/* Right Panel - Detail View */}
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
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{selectedChannel.label}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary">
                        <Database className="h-3 w-3 mr-1" />
                        Raw Channel
                      </Badge>
                      {!isChannelAvailable(selectedChannel) && (
                        <Badge variant="outline">Not Available</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Channel ID:</span>
                      <span className="text-sm text-muted-foreground ml-2 font-mono">
                        {selectedChannel.id}
                      </span>
                    </div>
                    {selectedChannel.unit && (
                      <div>
                        <span className="text-sm font-medium">Unit:</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {selectedChannel.unit}
                        </span>
                      </div>
                    )}
                    {selectedChannel.defaultColor && (
                      <div>
                        <span className="text-sm font-medium">Default Color:</span>
                        <span
                          className="inline-block w-4 h-4 rounded ml-2 border"
                          style={{ backgroundColor: selectedChannel.defaultColor }}
                        />
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
      </DialogContent>
    </Dialog>
  );
}
