

import { useEffect, useState, useRef } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { ArrowLeft, Plus, X, MoreVertical, Upload, FileText } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

interface ParameterField { key: string; value: string; units: string; }
interface VehicleConfiguration { id: string; name: string; }

export default function VehicleSetupEditPage() {
  const { id: vehicleId, setupId } = usePage().props as unknown as { id: string; setupId: string };
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', description: '', vehicleConfigurationId: '' });
  const [parameters, setParameters] = useState<ParameterField[]>([{ key: '', value: '', units: '' }]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<'csv' | 'ac' | 'acc' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setupQuery = useQuery({
    queryKey: queryKeys.vehicleSetupDetail(vehicleId, setupId),
    queryFn: async () => fetchJson<any>(`/api/vehicles/${vehicleId}/setups/${setupId}`, { unauthorized: { kind: 'redirect_to_login' } }),
    enabled: !!vehicleId && !!setupId,
  });

  const configurationsQuery = useQuery({
    queryKey: queryKeys.vehicleConfigurations(vehicleId),
    queryFn: async (): Promise<VehicleConfiguration[]> => {
      const data = await fetchJson<unknown>(`/api/vehicles/${vehicleId}/configurations`, { unauthorized: { kind: 'redirect_to_login' }, fallback: [] });
      return Array.isArray(data) ? (data as VehicleConfiguration[]) : [];
    },
    enabled: !!vehicleId,
    staleTime: 15_000,
  });
  const configurations = configurationsQuery.data ?? [];

  useEffect(() => {
    if (!setupQuery.data) return;
    const data = setupQuery.data;
    setFormData({ name: data.name, description: data.description || '', vehicleConfigurationId: data.vehicleConfigurationId || '' });
    const paramsData = JSON.parse(data.parameters);
    if (Object.keys(paramsData).length > 0) {
      setParameters(Object.entries(paramsData).map(([key, value]) => {
        if (typeof value === 'object' && value !== null && 'value' in value) {
          return { key, value: String((value as any).value), units: (value as any).units || '' };
        }
        return { key, value: value as string, units: '' };
      }));
    }
  }, [setupQuery.data]);

  const updateSetupMutation = useMutation({
    mutationFn: async () => {
      const parametersObject: Record<string, any> = {};
      parameters.forEach((param) => {
        if (param.key.trim() && param.value.trim()) parametersObject[param.key.trim()] = { value: param.value.trim(), units: param.units.trim() };
      });
      return mutationJson<any>(`/api/vehicles/${vehicleId}/setups/${setupId}`, {
        method: 'PATCH',
        body: { ...formData, vehicleConfigurationId: formData.vehicleConfigurationId || null, parameters: parametersObject },
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.vehicleSetupDetail(vehicleId, setupId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleDetail(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleSetups(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehiclesList });
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try { await updateSetupMutation.mutateAsync(); router.visit(`/vehicle/${vehicleId}/setup/${setupId}`); }
    catch (error) { console.error('Error updating setup:', error); alert('Failed to update setup'); }
  }

  function addParameterField() { setParameters([...parameters, { key: '', value: '', units: '' }]); }
  function removeParameterField(index: number) { setParameters(parameters.filter((_, i) => i !== index)); }
  function updateParameterField(index: number, field: 'key' | 'value' | 'units', value: string) {
    const newParameters = [...parameters]; newParameters[index][field] = value; setParameters(newParameters);
  }
  function handleImportClick(type: 'csv' | 'ac' | 'acc') {
    setImportType(type);
    if (type === 'csv') fileInputRef.current?.click();
    else setShowImportDialog(true);
  }
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(file);
  }
  function parseCSV(csvText: string) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const newParameters: ParameterField[] = [];
    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('parameter') || line.toLowerCase().includes('name'))) return;
      const p = line.split(',').map(p => p.trim());
      if (p.length >= 2) newParameters.push({ key: p[0], value: p[1], units: p[2] || '' });
    });
    if (newParameters.length > 0) setParameters(newParameters);
  }

  const loading = setupQuery.isLoading;
  const saving = updateSetupMutation.isPending;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href={`/vehicle/${vehicleId}/setup/${setupId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
              <div>
                <CardTitle>Edit Setup</CardTitle>
                <CardDescription>Update the setup parameters for this vehicle</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Monza Low Drag" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description of this setup" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="configuration">Configuration (Optional)</Label>
                <Select value={formData.vehicleConfigurationId || 'none'} onValueChange={(value) => setFormData({ ...formData, vehicleConfigurationId: value === 'none' ? '' : value })}>
                  <SelectTrigger><SelectValue placeholder="Select a configuration (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {configurations.map((config) => <SelectItem key={config.id} value={config.id}>{config.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Setup Parameters</Label>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addParameterField} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />Add Parameter
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span><Button type="button" variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button></span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleImportClick('csv')} className="gap-2"><FileText className="h-4 w-4" />Import from CSV</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleImportClick('ac')} className="gap-2"><Upload className="h-4 w-4" />Import from Assetto Corsa</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImportClick('acc')} className="gap-2"><Upload className="h-4 w-4" />Import from ACC</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-2">
                  {parameters.map((param, index) => (
                    <div key={index} className="flex gap-2">
                      <Input placeholder="Parameter (e.g., Ride Height)" value={param.key} onChange={(e) => updateParameterField(index, 'key', e.target.value)} className="flex-[2]" />
                      <Input placeholder="Value (e.g., 50)" value={param.value} onChange={(e) => updateParameterField(index, 'value', e.target.value)} className="flex-1" />
                      <Input placeholder="Units (e.g., mm)" value={param.units} onChange={(e) => updateParameterField(index, 'units', e.target.value)} className="flex-1" />
                      {parameters.length > 1 && (
                        <Button type="button" variant="outline" size="icon" onClick={() => removeParameterField(index)}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save Changes'}</Button>
                <Link href={`/vehicle/${vehicleId}/setup/${setupId}`}><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import from {importType === 'ac' ? 'Assetto Corsa' : 'Assetto Corsa Competizione'}</DialogTitle>
              <DialogDescription>This feature is coming soon.</DialogDescription>
            </DialogHeader>
            <div className="py-4"><p className="text-sm text-muted-foreground">In the meantime, you can export your setup to CSV and use the "Import from CSV" option.</p></div>
            <Button onClick={() => setShowImportDialog(false)}>Close</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
