'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, MoreVertical, Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ParameterField {
  key: string;
  value: string;
  units: string;
}

interface VehicleConfiguration {
  id: string;
  name: string;
}

export default function EditSetupPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const setupId = params.setupId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configurations, setConfigurations] = useState<VehicleConfiguration[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    vehicleConfigurationId: '',
  });
  const [parameters, setParameters] = useState<ParameterField[]>([
    { key: '', value: '', units: '' }
  ]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<'csv' | 'ac' | 'acc' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSetup();
    fetchConfigurations();
  }, [setupId, vehicleId]);

  async function fetchSetup() {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/setups/${setupId}`);
      const data = await response.json();
      
      setFormData({
        name: data.name,
        description: data.description || '',
        vehicleConfigurationId: data.vehicleConfiguration?.id || '',
      });

      // Parse parameters from JSON
      const params = JSON.parse(data.parameters);
      if (Object.keys(params).length > 0) {
        setParameters(
          Object.entries(params).map(([key, value]) => {
            if (typeof value === 'object' && value !== null && 'value' in value) {
              return { key, value: (value as any).value, units: (value as any).units || '' };
            }
            return { key, value: value as string, units: '' };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching setup:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConfigurations() {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations`);
      const data = await response.json();
      setConfigurations(data);
    } catch (error) {
      console.error('Error fetching configurations:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Convert parameters array to object
    const parametersObject: Record<string, any> = {};
    parameters.forEach(param => {
      if (param.key.trim() && param.value.trim()) {
        parametersObject[param.key.trim()] = {
          value: param.value.trim(),
          units: param.units.trim()
        };
      }
    });

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/setups/${setupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          vehicleConfigurationId: formData.vehicleConfigurationId || null,
          parameters: parametersObject,
        }),
      });

      if (response.ok) {
        router.push(`/vehicle/${vehicleId}/setup/${setupId}`);
      } else {
        alert('Failed to update setup');
      }
    } catch (error) {
      console.error('Error updating setup:', error);
      alert('Failed to update setup');
    } finally {
      setSaving(false);
    }
  }

  function addParameterField() {
    setParameters([...parameters, { key: '', value: '', units: '' }]);
  }

  function removeParameterField(index: number) {
    setParameters(parameters.filter((_, i) => i !== index));
  }

  function updateParameterField(index: number, field: 'key' | 'value' | 'units', value: string) {
    const newParameters = [...parameters];
    newParameters[index][field] = value;
    setParameters(newParameters);
  }

  function handleImportClick(type: 'csv' | 'ac' | 'acc') {
    setImportType(type);
    if (type === 'csv') {
      fileInputRef.current?.click();
    } else {
      setShowImportDialog(true);
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }

  function parseCSV(csvText: string) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const newParameters: ParameterField[] = [];

    lines.forEach((line, index) => {
      // Skip header row if it exists
      if (index === 0 && (line.toLowerCase().includes('parameter') || line.toLowerCase().includes('name'))) {
        return;
      }

      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        newParameters.push({
          key: parts[0],
          value: parts[1],
          units: parts[2] || ''
        });
      }
    });

    if (newParameters.length > 0) {
      setParameters(newParameters);
    }
  }

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
              <Link href={`/vehicle/${vehicleId}/setup/${setupId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <CardTitle>Edit Setup</CardTitle>
                <CardDescription>
                  Update setup parameters
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monza Low Drag"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this setup"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="configuration">Configuration (Optional)</Label>
                <Select
                  value={formData.vehicleConfigurationId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, vehicleConfigurationId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a configuration (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {configurations.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Link this setup to a specific configuration
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Setup Parameters</Label>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addParameterField} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Parameter
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleImportClick('csv')} className="gap-2">
                          <FileText className="h-4 w-4" />
                          Import from CSV
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleImportClick('ac')} className="gap-2">
                          <Upload className="h-4 w-4" />
                          Import from Assetto Corsa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleImportClick('acc')} className="gap-2">
                          <Upload className="h-4 w-4" />
                          Import from ACC
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-2">
                  {parameters.map((param, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Parameter (e.g., Ride Height)"
                        value={param.key}
                        onChange={(e) => updateParameterField(index, 'key', e.target.value)}
                        className="flex-[2]"
                      />
                      <Input
                        placeholder="Value (e.g., 50)"
                        value={param.value}
                        onChange={(e) => updateParameterField(index, 'value', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Units (e.g., mm)"
                        value={param.units}
                        onChange={(e) => updateParameterField(index, 'units', e.target.value)}
                        className="flex-1"
                      />
                      {parameters.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeParameterField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Add parameters like Ride Height, Weight Distribution, Tire Pressure, etc.
                </p>
              </div>
              
              {/* Hidden file input for CSV import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href={`/vehicle/${vehicleId}/setup/${setupId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Import Dialog for AC/ACC */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Import from {importType === 'ac' ? 'Assetto Corsa' : 'Assetto Corsa Competizione'}
              </DialogTitle>
              <DialogDescription>
                This feature is coming soon. You'll be able to import setup files directly from {importType === 'ac' ? 'Assetto Corsa' : 'ACC'}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                In the meantime, you can export your setup to CSV and use the "Import from CSV" option.
              </p>
            </div>
            <Button onClick={() => setShowImportDialog(false)}>Close</Button>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
