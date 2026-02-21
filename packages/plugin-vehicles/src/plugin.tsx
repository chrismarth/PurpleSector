"use client";

import * as React from 'react';
import type {
  PluginModule,
  PluginClientContext,
  PluginManifest,
  NavTreeContext,
  TabDescriptor,
} from '@purplesector/plugin-api';

// ── Vehicle Tree Component ──────────────────────────────────────────────────

interface Vehicle {
  id: string;
  name: string;
  configurations: Array<{ id: string; name: string }>;
  setups: Array<{ id: string; name: string }>;
}

function VehiclesTree({ openTab, refreshNav }: NavTreeContext) {
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ps:vehiclesExpanded');
      if (stored) return new Set(JSON.parse(stored));
    } catch { /* ignore */ }
    return new Set();
  });

  // Persist expanded state
  React.useEffect(() => {
    try {
      localStorage.setItem('ps:vehiclesExpanded', JSON.stringify([...expanded]));
    } catch { /* ignore */ }
  }, [expanded]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchVehicles();
    // Re-fetch when data is mutated (e.g. after vehicle creation)
    const handler = () => fetchVehicles();
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, []);

  // Listen for selection events from ContentPane
  React.useEffect(() => {
    function applySelection(nodeId: string, parentId?: string) {
      setSelectedNodeId(nodeId);
      // Auto-expand the parent vehicle so the child node is visible
      if (parentId) {
        setExpanded((prev) => {
          if (prev.has(parentId)) return prev;
          const next = new Set(prev);
          next.add(parentId);
          return next;
        });
      }
    }

    function handleSelect(e: Event) {
      const { nodeId, parentId } = (e as CustomEvent).detail;
      applySelection(nodeId, parentId);
    }

    // Check for pending selection set before this tree mounted
    const pending = (window as any).__vehiclesPendingSelection;
    if (pending) {
      applySelection(pending.nodeId, pending.parentId);
      delete (window as any).__vehiclesPendingSelection;
    }

    window.addEventListener('vehicles:selectNode', handleSelect);
    return () => window.removeEventListener('vehicles:selectNode', handleSelect);
  }, []);

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        console.error('Vehicles API returned', response.status);
        return;
      }
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddVehicle() {
    window.dispatchEvent(new Event('appshell:createVehicle'));
  }

  function handleVehicleClick(vehicle: Vehicle) {
    setSelectedNodeId(`vehicle:${vehicle.id}`);
    openTab({
      id: `vehicle-detail:${vehicle.id}`,
      type: 'vehicle-detail',
      label: vehicle.name,
      breadcrumbs: [vehicle.name],
      entityId: vehicle.id,
      closable: true,
    });
  }

  function handleConfigClick(vehicle: Vehicle, config: { id: string; name: string }) {
    setSelectedNodeId(`vehicle-config:${config.id}`);
    openTab({
      id: `vehicle-config-detail:${config.id}`,
      type: 'vehicle-config-detail',
      label: config.name,
      breadcrumbs: [vehicle.name, 'Configurations', config.name],
      entityId: config.id,
      parentIds: { vehicleId: vehicle.id },
      closable: true,
    });
  }

  function handleSetupClick(vehicle: Vehicle, setup: { id: string; name: string }) {
    setSelectedNodeId(`vehicle-setup:${setup.id}`);
    openTab({
      id: `vehicle-setup-detail:${setup.id}`,
      type: 'vehicle-setup-detail',
      label: setup.name,
      breadcrumbs: [vehicle.name, 'Setups', setup.name],
      entityId: setup.id,
      parentIds: { vehicleId: vehicle.id },
      closable: true,
    });
  }

  function handleAddConfig(vehicle: Vehicle) {
    openTab({
      id: `vehicle-config-new:${vehicle.id}:${Date.now()}`,
      type: 'vehicle-config-new',
      label: 'New Configuration',
      breadcrumbs: [vehicle.name, 'New Configuration'],
      parentIds: { vehicleId: vehicle.id },
      closable: true,
    });
  }

  function handleAddSetup(vehicle: Vehicle) {
    openTab({
      id: `vehicle-setup-new:${vehicle.id}:${Date.now()}`,
      type: 'vehicle-setup-new',
      label: 'New Setup',
      breadcrumbs: [vehicle.name, 'New Setup'],
      parentIds: { vehicleId: vehicle.id },
      closable: true,
    });
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading vehicles...</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with add button */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Vehicles
        </span>
        <button
          onClick={handleAddVehicle}
          className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="New Vehicle"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-1">
        {vehicles.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-muted-foreground mb-2">No vehicles yet</p>
            <button
              onClick={handleAddVehicle}
              className="text-xs text-primary hover:underline"
            >
              Create your first vehicle
            </button>
          </div>
        ) : (
          vehicles.map((vehicle) => {
            const isExpanded = expanded.has(vehicle.id);

            return (
              <div key={vehicle.id}>
                {/* Vehicle node */}
                <div className={`flex items-center gap-1 px-2 py-1 hover:bg-accent/50 cursor-pointer group ${selectedNodeId === `vehicle:${vehicle.id}` ? 'bg-accent' : ''}`}>
                  <button
                    onClick={() => toggleExpand(vehicle.id)}
                    className="h-4 w-4 flex items-center justify-center shrink-0"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleVehicleClick(vehicle)}
                    className="flex-1 text-left text-sm truncate"
                  >
                    {vehicle.name}
                  </button>
                </div>

                {/* Children */}
                {isExpanded && (
                  <div className="ml-4">
                    {/* Configurations */}
                    <div>
                      <div className="flex items-center justify-between px-2 py-0.5">
                        <span className="text-xs text-muted-foreground font-medium">Configurations</span>
                        <button
                          onClick={() => handleAddConfig(vehicle)}
                          className="h-4 w-4 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="New Configuration"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                      {vehicle.configurations.length > 0 ? (
                        vehicle.configurations.map((config) => (
                          <button
                            key={config.id}
                            onClick={() => handleConfigClick(vehicle, config)}
                            className={`w-full text-left px-4 py-1 text-sm hover:bg-accent/50 truncate ${selectedNodeId === `vehicle-config:${config.id}` ? 'bg-accent' : ''}`}
                          >
                            {config.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-1 text-xs text-muted-foreground italic">None</div>
                      )}
                    </div>
                    {/* Setups */}
                    <div>
                      <div className="flex items-center justify-between px-2 py-0.5">
                        <span className="text-xs text-muted-foreground font-medium">Setups</span>
                        <button
                          onClick={() => handleAddSetup(vehicle)}
                          className="h-4 w-4 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                          title="New Setup"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </button>
                      </div>
                      {vehicle.setups.length > 0 ? (
                        vehicle.setups.map((setup) => (
                          <button
                            key={setup.id}
                            onClick={() => handleSetupClick(vehicle, setup)}
                            className={`w-full text-left px-4 py-1 text-sm hover:bg-accent/50 truncate ${selectedNodeId === `vehicle-setup:${setup.id}` ? 'bg-accent' : ''}`}
                          >
                            {setup.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-1 text-xs text-muted-foreground italic">None</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Vehicle Content Components (rendered by plugin content tabs) ─────────────

interface VehicleDetail {
  id: string;
  name: string;
  description: string | null;
  inServiceDate: string | null;
  outOfServiceDate: string | null;
  tags: string | null;
  createdAt: string;
  configurations: Array<{ id: string; name: string; description: string | null; _count: { setups: number; sessions: number } }>;
  setups: Array<{ id: string; name: string; description: string | null; vehicleConfiguration: { name: string } | null; _count: { sessions: number } }>;
  _count: { sessions: number };
}

function dispatchOpenTab(tab: TabDescriptor) {
  window.dispatchEvent(new CustomEvent('appshell:openTab', { detail: tab }));
}

function VehicleDetailContent({ entityId }: { entityId?: string }) {
  const [vehicle, setVehicle] = React.useState<VehicleDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchVehicle = React.useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    fetch(`/api/vehicles/${entityId}`)
      .then((r) => r.json())
      .then(setVehicle)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId]);

  React.useEffect(() => {
    fetchVehicle();
    const handler = () => fetchVehicle();
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, [fetchVehicle]);

  async function handleDeleteVehicle() {
    if (!confirm(`Are you sure you want to delete "${vehicle?.name}"? This will also delete all configurations and setups.`)) return;
    try {
      const response = await fetch(`/api/vehicles/${entityId}`, { method: 'DELETE' });
      if (response.ok) {
        window.dispatchEvent(new Event('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  }

  async function handleDeleteConfig(configId: string) {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      await fetch(`/api/vehicles/${entityId}/configurations/${configId}`, { method: 'DELETE' });
      fetchVehicle();
      window.dispatchEvent(new Event('agent:data-mutated'));
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  }

  async function handleDeleteSetup(setupId: string) {
    if (!confirm('Are you sure you want to delete this setup?')) return;
    try {
      await fetch(`/api/vehicles/${entityId}/setups/${setupId}`, { method: 'DELETE' });
      fetchVehicle();
      window.dispatchEvent(new Event('agent:data-mutated'));
    } catch (error) {
      console.error('Error deleting setup:', error);
    }
  }

  function handleAddConfig() {
    dispatchOpenTab({
      id: `vehicle-config-new:${entityId}:${Date.now()}`,
      type: 'vehicle-config-new',
      label: 'New Configuration',
      breadcrumbs: [vehicle?.name || 'Vehicle', 'New Configuration'],
      parentIds: { vehicleId: entityId! },
      closable: true,
    });
  }

  function handleAddSetup() {
    dispatchOpenTab({
      id: `vehicle-setup-new:${entityId}:${Date.now()}`,
      type: 'vehicle-setup-new',
      label: 'New Setup',
      breadcrumbs: [vehicle?.name || 'Vehicle', 'New Setup'],
      parentIds: { vehicleId: entityId! },
      closable: true,
    });
  }

  function handleEditVehicle() {
    dispatchOpenTab({
      id: `vehicle-edit:${entityId}`,
      type: 'vehicle-edit',
      label: `Edit ${vehicle?.name || 'Vehicle'}`,
      breadcrumbs: [vehicle?.name || 'Vehicle', 'Edit'],
      entityId: entityId!,
      closable: true,
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  }
  if (!vehicle) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Vehicle not found</p></div>;
  }

  const tags: string[] = vehicle.tags ? (() => { try { return JSON.parse(vehicle.tags!); } catch { return []; } })() : [];

  return (
    <div className="p-6 space-y-6">
      {/* Vehicle Info */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{vehicle.name}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>Created {new Date(vehicle.createdAt).toLocaleDateString()}</span>
                {vehicle._count.sessions > 0 && (
                  <span>{vehicle._count.sessions} session{vehicle._count.sessions === 1 ? '' : 's'}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleEditVehicle} className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Edit
              </button>
              <button onClick={handleDeleteVehicle} className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          </div>
          {vehicle.description && <p className="text-muted-foreground mt-3">{vehicle.description}</p>}
          {(vehicle.inServiceDate || vehicle.outOfServiceDate || tags.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {vehicle.inServiceDate && (
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                  In service: {new Date(vehicle.inServiceDate).toLocaleDateString()}
                </span>
              )}
              {vehicle.outOfServiceDate && (
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                  Out of service: {new Date(vehicle.outOfServiceDate).toLocaleDateString()}
                </span>
              )}
              {tags.map((tag: string) => (
                <span key={tag} className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Configurations */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Configurations</h3>
              <p className="text-sm text-muted-foreground">
                {vehicle.configurations.length === 0
                  ? 'No configurations yet.'
                  : `${vehicle.configurations.length} configuration${vehicle.configurations.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <button onClick={handleAddConfig} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Configuration
            </button>
          </div>
        </div>
        <div className="p-6 pt-0">
          {vehicle.configurations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Add a configuration to define your vehicle's parts and components.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicle.configurations.map((config) => (
                <div key={config.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{config.name}</p>
                      {config.description && <p className="text-sm text-muted-foreground mt-1">{config.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteConfig(config.id)} className="text-muted-foreground hover:text-destructive p-1" title="Delete configuration">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{config._count.setups} setup{config._count.setups === 1 ? '' : 's'}</span>
                    <span>{config._count.sessions} session{config._count.sessions === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setups */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Setups</h3>
              <p className="text-sm text-muted-foreground">
                {vehicle.setups.length === 0
                  ? 'No setups yet.'
                  : `${vehicle.setups.length} setup${vehicle.setups.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <button onClick={handleAddSetup} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Setup
            </button>
          </div>
        </div>
        <div className="p-6 pt-0">
          {vehicle.setups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Add a setup to define suspension, alignment, and other parameters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vehicle.setups.map((setup) => (
                <div key={setup.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">{setup.name}</p>
                      {setup.description && <p className="text-sm text-muted-foreground mt-1">{setup.description}</p>}
                    </div>
                    <button onClick={() => handleDeleteSetup(setup.id)} className="text-muted-foreground hover:text-destructive p-1" title="Delete setup">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {setup.vehicleConfiguration && (
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5">
                        {setup.vehicleConfiguration.name}
                      </span>
                    )}
                    <span>{setup._count.sessions} session{setup._count.sessions === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleNewContent() {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, tags: [] }),
      });
      if (response.ok) {
        // Dispatch custom event so nav tree refreshes
        window.dispatchEvent(new CustomEvent('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error creating vehicle:', error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Create New Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Car #42"
            required
            className="w-full p-2 rounded-md border border-input bg-background"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            rows={3}
            className="w-full p-2 rounded-md border border-input bg-background resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={!name || creating}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Vehicle'}
        </button>
      </form>
    </div>
  );
}

// ── Vehicle Config New ──

function VehicleConfigNewContent({ parentIds }: { parentIds?: Record<string, string> }) {
  const vehicleId = parentIds?.vehicleId;
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) return;
    setCreating(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, parts: {} }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event('agent:data-mutated'));
        setName('');
        setDescription('');
      }
    } catch (error) {
      console.error('Error creating configuration:', error);
    } finally {
      setCreating(false);
    }
  }

  if (!vehicleId) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">No vehicle specified.</p></div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">New Configuration</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Race Spec, Endurance Config"
                  required
                  className="w-full p-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of this configuration"
                  rows={3}
                  className="w-full p-2 rounded-md border border-input bg-background resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!name || creating}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Configuration'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vehicle Setup New ──

function VehicleSetupNewContent({ parentIds }: { parentIds?: Record<string, string> }) {
  const vehicleId = parentIds?.vehicleId;
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [configId, setConfigId] = React.useState('');
  const [configs, setConfigs] = React.useState<Array<{ id: string; name: string }>>([]);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    if (!vehicleId) return;
    fetch(`/api/vehicles/${vehicleId}/configurations`)
      .then((r) => r.json())
      .then((data) => setConfigs(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [vehicleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) return;
    setCreating(true);
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/setups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          vehicleConfigurationId: configId || null,
          parameters: {},
        }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event('agent:data-mutated'));
        setName('');
        setDescription('');
        setConfigId('');
      }
    } catch (error) {
      console.error('Error creating setup:', error);
    } finally {
      setCreating(false);
    }
  }

  if (!vehicleId) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">No vehicle specified.</p></div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">New Setup</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monza Low Downforce, Wet Setup"
                  required
                  className="w-full p-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description of this setup"
                  rows={3}
                  className="w-full p-2 rounded-md border border-input bg-background resize-none"
                />
              </div>
              {configs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Configuration (optional)</label>
                  <select
                    value={configId}
                    onChange={(e) => setConfigId(e.target.value)}
                    className="w-full p-2 rounded-md border border-input bg-background"
                  >
                    <option value="">None</option>
                    {configs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                disabled={!name || creating}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Setup'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vehicle Edit ──

function VehicleEditContent({ entityId }: { entityId?: string }) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!entityId) return;
    fetch(`/api/vehicles/${entityId}`)
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || '');
        setDescription(data.description || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entityId) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/vehicles/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      });
      if (response.ok) {
        window.dispatchEvent(new Event('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Edit Vehicle</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded-md border border-input bg-background resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!name || saving}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vehicle Config Detail ──

function VehicleConfigDetailContent({ entityId, parentIds }: { entityId?: string; parentIds?: Record<string, string> }) {
  const vehicleId = parentIds?.vehicleId;
  const [config, setConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editParts, setEditParts] = React.useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }]);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchConfig = React.useCallback(() => {
    if (!entityId || !vehicleId) return;
    setLoading(true);
    fetch(`/api/vehicles/${vehicleId}/configurations/${entityId}`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId, vehicleId]);

  React.useEffect(() => {
    fetchConfig();
    const handler = () => fetchConfig();
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, [fetchConfig]);

  function startEditing() {
    if (!config) return;
    setEditName(config.name);
    setEditDescription(config.description || '');
    const partsData = (() => { try { return JSON.parse(config.parts); } catch { return {}; } })();
    const entries = Object.entries(partsData);
    setEditParts(entries.length > 0 ? entries.map(([k, v]) => ({ key: k, value: v as string })) : [{ key: '', value: '' }]);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const partsObject: Record<string, string> = {};
    editParts.forEach((p) => { if (p.key.trim() && p.value.trim()) partsObject[p.key.trim()] = p.value.trim(); });
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription || null, parts: partsObject }),
      });
      if (response.ok) {
        setEditing(false);
        fetchConfig();
        window.dispatchEvent(new Event('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${config?.name}"?`)) return;
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations/${entityId}`, { method: 'DELETE' });
      if (response.ok) {
        window.dispatchEvent(new Event('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  }

  function handleCSVImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const newParts: Array<{ key: string; value: string }> = [];
      lines.forEach((line, i) => {
        if (i === 0 && (line.toLowerCase().includes('part') || line.toLowerCase().includes('name'))) return;
        const cols = line.split(',').map((c) => c.trim());
        if (cols.length >= 2) newParts.push({ key: cols[0], value: cols[1] });
      });
      if (newParts.length > 0) setEditParts(newParts);
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  }
  if (!config) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Configuration not found</p></div>;
  }

  if (editing) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Edit Configuration</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full p-2 rounded-md border border-input bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full p-2 rounded-md border border-input bg-background resize-none" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Parts</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditParts([...editParts, { key: '', value: '' }])} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Part
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                      Import CSV
                    </button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                <div className="space-y-2">
                  {editParts.map((part, index) => (
                    <div key={index} className="flex gap-2">
                      <input placeholder="Part name (e.g., Front Wing)" value={part.key} onChange={(e) => { const n = [...editParts]; n[index].key = e.target.value; setEditParts(n); }} className="flex-1 p-2 rounded-md border border-input bg-background text-sm" />
                      <input placeholder="Part value (e.g., High Downforce)" value={part.value} onChange={(e) => { const n = [...editParts]; n[index].value = e.target.value; setEditParts(n); }} className="flex-1 p-2 rounded-md border border-input bg-background text-sm" />
                      {editParts.length > 1 && (
                        <button type="button" onClick={() => setEditParts(editParts.filter((_, i) => i !== index))} className="px-2 rounded-md border border-input hover:bg-accent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Add parts like Front Wing, Rear Wing, Floor, Suspension, etc.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={!editName || saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const parts: Record<string, string> = (() => { try { return JSON.parse(config.parts); } catch { return {}; } })();
  const partEntries = Object.entries(parts);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{config.name}</h2>
              {config.vehicle && (
                <p className="text-sm text-muted-foreground mt-1">Vehicle: {config.vehicle.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startEditing} className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Edit
              </button>
              <button onClick={handleDelete} className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          </div>
          {config.description && <p className="text-muted-foreground mt-3">{config.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {config._count && <span>{config._count.sessions} session{config._count.sessions === 1 ? '' : 's'}</span>}
          </div>
        </div>
      </div>

      {/* Parts */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-3">Parts</h3>
          {partEntries.length === 0 ? (
            <p className="text-muted-foreground">No parts defined. Click Edit to add parts.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {partEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{key}</span>
                  <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linked Setups */}
      {config.setups && config.setups.length > 0 && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-3">Setups ({config.setups.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.setups.map((s: any) => (
                <div key={s.id} className="rounded-lg border p-4">
                  <p className="font-semibold">{s.name}</p>
                  {s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vehicle Setup Detail ──

function VehicleSetupDetailContent({ entityId, parentIds }: { entityId?: string; parentIds?: Record<string, string> }) {
  const vehicleId = parentIds?.vehicleId;
  const [setup, setSetup] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editConfigId, setEditConfigId] = React.useState('');
  const [editParams, setEditParams] = React.useState<Array<{ key: string; value: string; units: string }>>([{ key: '', value: '', units: '' }]);
  const [configs, setConfigs] = React.useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchSetup = React.useCallback(() => {
    if (!entityId || !vehicleId) return;
    setLoading(true);
    fetch(`/api/vehicles/${vehicleId}/setups/${entityId}`)
      .then((r) => r.json())
      .then(setSetup)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityId, vehicleId]);

  React.useEffect(() => {
    fetchSetup();
    const handler = () => fetchSetup();
    window.addEventListener('agent:data-mutated', handler);
    return () => window.removeEventListener('agent:data-mutated', handler);
  }, [fetchSetup]);

  function startEditing() {
    if (!setup) return;
    setEditName(setup.name);
    setEditDescription(setup.description || '');
    setEditConfigId(setup.vehicleConfiguration?.id || '');
    const paramsData = (() => { try { return JSON.parse(setup.parameters); } catch { return {}; } })();
    const entries = Object.entries(paramsData);
    setEditParams(entries.length > 0
      ? entries.map(([k, v]) => {
          if (typeof v === 'object' && v !== null && 'value' in v) {
            return { key: k, value: (v as any).value, units: (v as any).units || '' };
          }
          return { key: k, value: v as string, units: '' };
        })
      : [{ key: '', value: '', units: '' }]);
    // Fetch configs for the dropdown
    fetch(`/api/vehicles/${vehicleId}/configurations`)
      .then((r) => r.json())
      .then((data) => setConfigs(Array.isArray(data) ? data : []))
      .catch(console.error);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const paramsObject: Record<string, any> = {};
    editParams.forEach((p) => {
      if (p.key.trim() && p.value.trim()) {
        paramsObject[p.key.trim()] = { value: p.value.trim(), units: p.units.trim() };
      }
    });
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/setups/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
          vehicleConfigurationId: editConfigId || null,
          parameters: paramsObject,
        }),
      });
      if (response.ok) {
        setEditing(false);
        fetchSetup();
        window.dispatchEvent(new Event('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error updating setup:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${setup?.name}"?`)) return;
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/setups/${entityId}`, { method: 'DELETE' });
      if (response.ok) {
        window.dispatchEvent(new Event('agent:data-mutated'));
      }
    } catch (error) {
      console.error('Error deleting setup:', error);
    }
  }

  function handleCSVImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      const newParams: Array<{ key: string; value: string; units: string }> = [];
      lines.forEach((line, i) => {
        if (i === 0 && (line.toLowerCase().includes('parameter') || line.toLowerCase().includes('name'))) return;
        const cols = line.split(',').map((c) => c.trim());
        if (cols.length >= 2) newParams.push({ key: cols[0], value: cols[1], units: cols[2] || '' });
      });
      if (newParams.length > 0) setEditParams(newParams);
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function exportCSV() {
    if (!setup) return;
    const paramsData = (() => { try { return JSON.parse(setup.parameters); } catch { return {}; } })();
    const lines = ['Parameter,Value,Units'];
    Object.entries(paramsData).forEach(([key, val]) => {
      if (typeof val === 'object' && val !== null && 'value' in val) {
        lines.push(`${key},${(val as any).value},${(val as any).units || ''}`);
      } else {
        lines.push(`${key},${val},`);
      }
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${setup.name.replace(/\s+/g, '_')}_setup.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;
  }
  if (!setup) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Setup not found</p></div>;
  }

  if (editing) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Edit Setup</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full p-2 rounded-md border border-input bg-background" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full p-2 rounded-md border border-input bg-background resize-none" />
              </div>
              {configs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Configuration (optional)</label>
                  <select value={editConfigId} onChange={(e) => setEditConfigId(e.target.value)} className="w-full p-2 rounded-md border border-input bg-background">
                    <option value="">None</option>
                    {configs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Setup Parameters</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setEditParams([...editParams, { key: '', value: '', units: '' }])} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Parameter
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                      Import CSV
                    </button>
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                <div className="space-y-2">
                  {editParams.map((param, index) => (
                    <div key={index} className="flex gap-2">
                      <input placeholder="Parameter (e.g., Ride Height)" value={param.key} onChange={(e) => { const n = [...editParams]; n[index].key = e.target.value; setEditParams(n); }} className="flex-[2] p-2 rounded-md border border-input bg-background text-sm" />
                      <input placeholder="Value (e.g., 50)" value={param.value} onChange={(e) => { const n = [...editParams]; n[index].value = e.target.value; setEditParams(n); }} className="flex-1 p-2 rounded-md border border-input bg-background text-sm" />
                      <input placeholder="Units (e.g., mm)" value={param.units} onChange={(e) => { const n = [...editParams]; n[index].units = e.target.value; setEditParams(n); }} className="flex-1 p-2 rounded-md border border-input bg-background text-sm" />
                      {editParams.length > 1 && (
                        <button type="button" onClick={() => setEditParams(editParams.filter((_, i) => i !== index))} className="px-2 rounded-md border border-input hover:bg-accent">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Add parameters like Ride Height, Weight Distribution, Tire Pressure, etc.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={!editName || saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const parameters = (() => { try { return JSON.parse(setup.parameters); } catch { return {}; } })();
  const paramEntries = Object.entries(parameters);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{setup.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                {setup.vehicle && <span>Vehicle: {setup.vehicle.name}</span>}
                {setup.vehicleConfiguration && (
                  <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold">
                    Config: {setup.vehicleConfiguration.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={startEditing} className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                Edit
              </button>
              <button onClick={handleDelete} className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          </div>
          {setup.description && <p className="text-muted-foreground mt-3">{setup.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            {setup._count && <span>{setup._count.sessions} session{setup._count.sessions === 1 ? '' : 's'}</span>}
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Setup Parameters</h3>
            {paramEntries.length > 0 && (
              <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export CSV
              </button>
            )}
          </div>
          {paramEntries.length === 0 ? (
            <p className="text-muted-foreground">No parameters defined. Click Edit to add parameters.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paramEntries.map(([key, val]) => {
                const displayValue = typeof val === 'object' && val !== null && 'value' in val
                  ? `${(val as any).value}${(val as any).units ? ' ' + (val as any).units : ''}`
                  : val as string;
                return (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{key}</span>
                    <span className="inline-flex items-center rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Car Icon (inline SVG to avoid dependency on lucide in the plugin) ────────

function CarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}

// ── Plugin Manifest & Registration ──────────────────────────────────────────

const manifest: PluginManifest = {
  id: 'purple-sector.vehicles',
  name: 'Vehicles',
  version: '0.1.0',
  description: 'Vehicle management — configurations, setups, and fleet tracking',
  capabilities: ['navTab', 'contentTab'],
  entry: './plugin',
};

const plugin: PluginModule = {
  manifest,
  register(ctx: PluginClientContext) {
    // Register the Vehicles navigation tab
    ctx.registerNavTab({
      id: 'vehicles',
      label: 'Vehicles',
      icon: CarIcon,
      order: 20,
      renderTree: (navCtx: NavTreeContext) => <VehiclesTree {...navCtx} />,
    });

    // Register content tab types for vehicle entities
    ctx.registerContentTab({
      type: 'vehicle-detail',
      render: (props) => <VehicleDetailContent entityId={props.entityId} />,
    });

    ctx.registerContentTab({
      type: 'vehicle-new',
      render: () => <VehicleNewContent />,
    });

    ctx.registerContentTab({
      type: 'vehicle-edit',
      render: (props) => <VehicleEditContent entityId={props.entityId} />,
    });

    ctx.registerContentTab({
      type: 'vehicle-config-new',
      render: (props) => <VehicleConfigNewContent parentIds={props.parentIds} />,
    });

    ctx.registerContentTab({
      type: 'vehicle-setup-new',
      render: (props) => <VehicleSetupNewContent parentIds={props.parentIds} />,
    });

    ctx.registerContentTab({
      type: 'vehicle-config-detail',
      render: (props) => <VehicleConfigDetailContent entityId={props.entityId} parentIds={props.parentIds} />,
    });

    ctx.registerContentTab({
      type: 'vehicle-setup-detail',
      render: (props) => <VehicleSetupDetailContent entityId={props.entityId} parentIds={props.parentIds} />,
    });
  },
};

export default plugin;
