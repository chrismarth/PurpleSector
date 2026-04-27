

import { useState, useRef } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { ArrowLeft, Plus, X, MoreVertical, FileText } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { queryKeys } from '@/lib/queryKeys';
import { mutationJson } from '@/lib/client-fetch';

interface PartField { key: string; value: string; }

export default function VehicleConfigurationNewPage() {
  const { id: vehicleId } = usePage().props as unknown as { id: string };
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [parts, setParts] = useState<PartField[]>([{ key: '', value: '' }]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createConfigurationMutation = useMutation({
    mutationFn: async () => {
      const partsObject: Record<string, string> = {};
      parts.forEach((part) => { if (part.key.trim() && part.value.trim()) partsObject[part.key.trim()] = part.value.trim(); });
      await mutationJson(`/api/vehicles/${vehicleId}/configurations`, { method: 'POST', body: { ...formData, parts: partsObject } });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleDetail(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicleConfigurations(vehicleId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehiclesList });
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try { await createConfigurationMutation.mutateAsync(); router.visit(`/vehicle/${vehicleId}`); }
    catch (error) { console.error('Error creating configuration:', error); alert('Failed to create configuration'); }
  }

  function addPartField() { setParts([...parts, { key: '', value: '' }]); }
  function removePartField(index: number) { setParts(parts.filter((_, i) => i !== index)); }
  function updatePartField(index: number, field: 'key' | 'value', value: string) {
    const newParts = [...parts]; newParts[index][field] = value; setParts(newParts);
  }
  function handleImportClick() { fileInputRef.current?.click(); }
  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseCSV(e.target?.result as string);
    reader.readAsText(file);
  }
  function parseCSV(csvText: string) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const newParts: PartField[] = [];
    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('part') || line.toLowerCase().includes('name'))) return;
      const p = line.split(',').map(p => p.trim());
      if (p.length >= 2) newParts.push({ key: p[0], value: p[1] });
    });
    if (newParts.length > 0) setParts(newParts);
  }

  const loading = createConfigurationMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href={`/vehicle/${vehicleId}`}><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
              <div>
                <CardTitle>Create New Configuration</CardTitle>
                <CardDescription>Define the parts installed on this vehicle</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., High Downforce Setup" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description of this configuration" rows={3} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Parts</Label>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addPartField} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />Add Part
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <span><Button type="button" variant="outline" size="sm"><MoreVertical className="h-4 w-4" /></Button></span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleImportClick} className="gap-2">
                          <FileText className="h-4 w-4" />Import from CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-2">
                  {parts.map((part, index) => (
                    <div key={index} className="flex gap-2">
                      <Input placeholder="Part name (e.g., Front Wing)" value={part.key} onChange={(e) => updatePartField(index, 'key', e.target.value)} className="flex-1" />
                      <Input placeholder="Part value (e.g., High Downforce)" value={part.value} onChange={(e) => updatePartField(index, 'value', e.target.value)} className="flex-1" />
                      {parts.length > 1 && (
                        <Button type="button" variant="outline" size="icon" onClick={() => removePartField(index)}><X className="h-4 w-4" /></Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">Add parts like Front Wing, Rear Wing, Floor, Suspension, etc.</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Creating...' : 'Create Configuration'}</Button>
                <Link href={`/vehicle/${vehicleId}`}><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
