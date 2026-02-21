'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Wifi, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppShell } from '@/components/app-shell/AppShellContext';
import { useNav } from '@/components/app-shell/NavContext';

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

interface RunPlanNewContentProps {
  entityId: string; // eventId
}

export default function RunPlanNewContent({ entityId }: RunPlanNewContentProps) {
  const eventId = entityId;
  const { openTab, closeTab, state } = useAppShell();
  const { refresh: refreshNav } = useNav();

  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allConfigurations, setAllConfigurations] = useState<Record<string, VehicleConfiguration[]>>({});
  const [allSetups, setAllSetups] = useState<Record<string, VehicleSetup[]>>({});

  const [globalSource, setGlobalSource] = useState<'live' | 'demo'>('live');
  const [globalVehicleId, setGlobalVehicleId] = useState<string>('');

  const [plannedSessions, setPlannedSessions] = useState<PlannedSession[]>([
    { name: '', vehicleConfigurationId: '', vehicleSetupId: '' },
  ]);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      setVehicles(data);
      for (const vehicle of data) {
        await fetchConfigurationsForVehicle(vehicle.id);
        await fetchSetupsForVehicle(vehicle.id);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }

  async function fetchConfigurationsForVehicle(vehicleId: string) {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations`);
      const data = await response.json();
      setAllConfigurations((prev) => ({ ...prev, [vehicleId]: data }));
    } catch (error) {
      console.error('Error fetching configurations:', error);
    }
  }

  async function fetchSetupsForVehicle(vehicleId: string) {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/setups`);
      const data = await response.json();
      setAllSetups((prev) => ({ ...prev, [vehicleId]: data }));
    } catch (error) {
      console.error('Error fetching setups:', error);
    }
  }

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
        const config = allConfigurations[globalVehicleId]?.find((c) => c.id === session.vehicleConfigurationId);
        const setup = allSetups[globalVehicleId]?.find((s) => s.id === session.vehicleSetupId);
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
    if (plannedSessions.some((s) => !s.name)) {
      alert('Please fill in all session names');
      return;
    }

    setLoading(true);
    try {
      const promises = plannedSessions.map((session) =>
        fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId,
            name: session.name,
            source: globalSource,
            vehicleId: globalVehicleId,
            vehicleConfigurationId: session.vehicleConfigurationId || null,
            vehicleSetupId: session.vehicleSetupId || null,
            started: false,
          }),
        }),
      );
      await Promise.all(promises);
      refreshNav();
      // Close this tab and go to event detail
      const currentTab = state.tabs.find((t) => t.type === 'run-plan-new');
      if (currentTab) closeTab(currentTab.id);
      openTab({
        id: `event-detail:${eventId}`,
        type: 'event-detail',
        label: 'Event',
        breadcrumbs: ['Event'],
        entityId: eventId,
        closable: true,
      });
    } catch (error) {
      console.error('Error creating run plan:', error);
      alert('Failed to create run plan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 overflow-auto">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create Run Plan</CardTitle>
          <CardDescription>Pre-configure multiple sessions for this event</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Settings */}
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
                    setPlannedSessions(
                      plannedSessions.map((s) => ({ ...s, vehicleConfigurationId: '', vehicleSetupId: '', name: '' })),
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Planned Sessions */}
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
                        onValueChange={(value) => updateSession(index, 'vehicleConfigurationId', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a configuration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(allConfigurations[globalVehicleId] || []).map((config) => (
                            <SelectItem key={config.id} value={config.id}>
                              {config.name}
                            </SelectItem>
                          ))}
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
                        onValueChange={(value) => updateSession(index, 'vehicleSetupId', value === 'none' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a setup" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(allSetups[globalVehicleId] || []).map((setup) => (
                            <SelectItem key={setup.id} value={setup.id}>
                              {setup.name}
                              {setup.vehicleConfiguration && (
                                <span className="text-muted-foreground ml-2">({setup.vehicleConfiguration.name})</span>
                              )}
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
            <Plus className="h-4 w-4" />
            Add Another Session
          </Button>

          <div className="flex gap-4 pt-4">
            <Button onClick={createRunPlan} disabled={loading} className="flex-1">
              {loading ? 'Creating Run Plan...' : 'Create Run Plan'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const currentTab = state.tabs.find((t) => t.type === 'run-plan-new');
                if (currentTab) closeTab(currentTab.id);
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
