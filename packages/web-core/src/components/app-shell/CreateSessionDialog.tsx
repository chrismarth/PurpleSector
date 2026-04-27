import React, { useEffect, useState } from 'react';
import { Wifi, Play } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

interface Vehicle { id: string; name: string; }
interface VehicleConfiguration { id: string; name: string; }

interface CreateSessionDialogProps {
  open: boolean;
  eventId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (session: { id: string; name: string }) => void;
}

export function CreateSessionDialog({ open, eventId, onOpenChange, onCreated }: CreateSessionDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [source, setSource] = useState<'live' | 'demo' | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedConfigurationId, setSelectedConfigurationId] = useState('');

  const vehiclesQuery = useQuery({
    queryKey: queryKeys.vehiclesList,
    queryFn: () => fetchJson<Vehicle[]>('/api/vehicles', {
      unauthorized: { kind: 'return_fallback' }, fallback: [],
    }),
    enabled: open,
    staleTime: 15_000,
  });

  const configurationsQuery = useQuery({
    queryKey: queryKeys.vehicleConfigurations(selectedVehicleId),
    queryFn: () => fetchJson<VehicleConfiguration[]>(`/api/vehicles/${selectedVehicleId}/configurations`, {
      unauthorized: { kind: 'return_fallback' }, fallback: [],
    }),
    enabled: !!selectedVehicleId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!selectedVehicleId) setSelectedConfigurationId('');
  }, [selectedVehicleId]);

  const vehicles = vehiclesQuery.data ?? [];
  const configurations = configurationsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name || !source) throw new Error('Missing required fields');
      return mutationJson<{ id: string; name: string }>('/api/sessions', {
        method: 'POST',
        body: {
          eventId, name, source,
          vehicleId: selectedVehicleId || null,
          vehicleConfigurationId: selectedConfigurationId || null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
    },
  });

  function reset() {
    setName('');
    setSource(null);
    setSelectedVehicleId('');
    setSelectedConfigurationId('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const session = await createMutation.mutateAsync();
      reset();
      onOpenChange(false);
      onCreated(session);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  const creating = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name *</Label>
            <Input
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monza Practice - June 15"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Telemetry Source *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSource('live')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  source === 'live' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Live</h3>
                    <p className="text-xs text-muted-foreground">Real-time telemetry</p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSource('demo')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  source === 'demo' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Play className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Demo</h3>
                    <p className="text-xs text-muted-foreground">Pre-recorded data</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select
              value={selectedVehicleId || 'none'}
              onValueChange={(v) => setSelectedVehicleId(v === 'none' ? '' : v)}
            >
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVehicleId && (
            <div className="space-y-2">
              <Label>Configuration</Label>
              <Select
                value={selectedConfigurationId || 'none'}
                onValueChange={(v) => setSelectedConfigurationId(v === 'none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {configurations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !source || creating}>
              {creating ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
