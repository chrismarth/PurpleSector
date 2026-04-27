import { useMemo, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Wifi, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

interface Vehicle {
  id: string;
  name: string;
}

interface VehicleConfiguration {
  id: string;
  name: string;
}

interface VehicleSetup {
  id: string;
  name: string;
  vehicleConfiguration: { name: string } | null;
}

interface PlannedSession {
  name: string;
  vehicleConfigurationId: string;
  vehicleSetupId: string;
}

export default function EventRunPlan() {
  const { id: eventId } = usePage().props as unknown as { id: string };
  const queryClient = useQueryClient();

  const [globalSource, setGlobalSource] = useState<'live' | 'demo'>('live');
  const [globalVehicleId, setGlobalVehicleId] = useState<string>('');
  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([
    { name: '', vehicleConfigurationId: '', vehicleSetupId: '' }
  ]);

  const vehiclesQuery = useQuery({
    queryKey: queryKeys.vehiclesList,
    queryFn: () => fetchJson<Vehicle[]>('/api/vehicles', { unauthorized: { kind: 'redirect_to_login' }, fallback: [] }),
    staleTime: 15_000,
  });

  const configurationsQuery = useQuery({
    queryKey: queryKeys.vehicleConfigurations(globalVehicleId),
    queryFn: async () => {
      const data = await fetchJson<unknown>(`/api/vehicles/${globalVehicleId}/configurations`, {
        unauthorized: { kind: 'redirect_to_login' }, fallback: [],
      });
      return Array.isArray(data) ? (data as VehicleConfiguration[]) : [];
    },
    enabled: !!globalVehicleId,
    staleTime: 15_000,
  });

  const setupsQuery = useQuery({
    queryKey: queryKeys.vehicleSetups(globalVehicleId),
    queryFn: async () => {
      const data = await fetchJson<unknown>(`/api/vehicles/${globalVehicleId}/setups`, {
        unauthorized: { kind: 'redirect_to_login' }, fallback: [],
      });
      return Array.isArray(data) ? (data as VehicleSetup[]) : [];
    },
    enabled: !!globalVehicleId,
    staleTime: 15_000,
  });

  const vehicles = vehiclesQuery.data ?? [];
  const configurations = configurationsQuery.data ?? [];
  const setups = setupsQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      Promise.all(
        plannedSessions.map((session) =>
          mutationJson('/api/sessions', {
            method: 'POST',
            body: {
              eventId,
              name: session.name,
              source: globalSource,
              vehicleId: globalVehicleId,
              vehicleConfigurationId: session.vehicleConfigurationId || null,
              vehicleSetupId: session.vehicleSetupId || null,
              started: false,
            },
          })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventDetail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
      router.visit(`/event/${eventId}`);
    },
  });

  function addSession() {
    setPlannedSessions([...plannedSessions, { name: '', vehicleConfigurationId: '', vehicleSetupId: '' }]);
  }

  function removeSession(index: number) {
    setPlannedSessions(plannedSessions.filter((_, i) => i !== index));
  }

  function updateSession(index: number, field: keyof PlannedSession, value: string) {
    const newSessions = [...plannedSessions];
    newSessions[index] = { ...newSessions[index], [field]: value };

    if (field === 'vehicleConfigurationId' || field === 'vehicleSetupId') {
      const session = newSessions[index];
      if (globalVehicleId) {
        const config = configurations.find((c) => c.id === session.vehicleConfigurationId);
        const setup = setups.find((s) => s.id === session.vehicleSetupId);
        if (config || setup) {
          const parts = [];
          if (config) parts.push(config.name);
          if (setup) parts.push(setup.name);
          newSessions[index].name = parts.join(' - ');
        }
      }
    }
    setPlannedSessions(newSessions);
  }

  async function createRunPlan() {
    if (!globalVehicleId) {
      alert('Please select a vehicle');
      return;
    }
    if (plannedSessions.some(s => !s.name)) {
      alert('Please fill in all session names');
      return;
    }
    createMutation.mutate();
  }

  const isLoadingPrereqs = useMemo(() => {
    if (vehiclesQuery.isLoading) return true;
    if (globalVehicleId && (configurationsQuery.isLoading || setupsQuery.isLoading)) return true;
    return false;
  }, [vehiclesQuery.isLoading, globalVehicleId, configurationsQuery.isLoading, setupsQuery.isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.visit(`/event/${eventId}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle>Create Run Plan</CardTitle>
                <CardDescription>Pre-configure multiple sessions for this event</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Run Plan Settings</CardTitle>
                <CardDescription>These settings will apply to all sessions in this run plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Telemetry Source *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGlobalSource('live')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        globalSource === 'live' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium">Live</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGlobalSource('demo')}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        globalSource === 'demo' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Demo</span>
                      </div>
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vehicle *</Label>
                  <Select
                    value={globalVehicleId || 'none'}
                    onValueChange={(value) => {
                      const newVehicleId = value === 'none' ? '' : value;
                      setGlobalVehicleId(newVehicleId);
                      setPlannedSessions(plannedSessions.map(s => ({
                        ...s, vehicleConfigurationId: '', vehicleSetupId: '', name: ''
                      })));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Sessions</h3>
              {plannedSessions.map((session, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Session {index + 1}</CardTitle>
                      {plannedSessions.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeSession(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Session Name *</Label>
                      <Input
                        value={session.name}
                        onChange={(e) => updateSession(index, 'name', e.target.value)}
                        placeholder="Auto-generated from configuration/setup"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Configuration (Optional)</Label>
                      {!globalVehicleId ? (
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          Select a vehicle first to choose configurations
                        </div>
                      ) : (
                        <Select
                          value={session.vehicleConfigurationId || 'none'}
                          onValueChange={(v) => updateSession(index, 'vehicleConfigurationId', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select a configuration" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {configurations.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Setup (Optional)</Label>
                      {!globalVehicleId ? (
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          Select a vehicle first to choose setups
                        </div>
                      ) : (
                        <Select
                          value={session.vehicleSetupId || 'none'}
                          onValueChange={(v) => updateSession(index, 'vehicleSetupId', v === 'none' ? '' : v)}
                        >
                          <SelectTrigger><SelectValue placeholder="Select a setup" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {setups.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                                {s.vehicleConfiguration && <span className="text-muted-foreground ml-2">({s.vehicleConfiguration.name})</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addSession} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Add Another Session
            </Button>

            <div className="flex gap-4 pt-4">
              <Button onClick={createRunPlan} disabled={createMutation.isPending} className="flex-1">
                {createMutation.isPending ? 'Creating Run Plan...' : 'Create Run Plan'}
              </Button>
              <Button variant="outline" onClick={() => router.visit(`/event/${eventId}`)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
