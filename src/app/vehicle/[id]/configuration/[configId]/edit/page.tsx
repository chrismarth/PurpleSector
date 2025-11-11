'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X, MoreVertical, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface PartField {
  key: string;
  value: string;
}

export default function EditConfigurationPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const configId = params.configId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [parts, setParts] = useState<PartField[]>([
    { key: '', value: '' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfiguration();
  }, [configId]);

  async function fetchConfiguration() {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations/${configId}`);
      const data = await response.json();
      
      setFormData({
        name: data.name,
        description: data.description || '',
      });

      // Parse parts from JSON
      const partsData = JSON.parse(data.parts);
      if (Object.keys(partsData).length > 0) {
        setParts(
          Object.entries(partsData).map(([key, value]) => ({ key, value: value as string }))
        );
      }
    } catch (error) {
      console.error('Error fetching configuration:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Convert parts array to object
    const partsObject: Record<string, string> = {};
    parts.forEach(part => {
      if (part.key.trim() && part.value.trim()) {
        partsObject[part.key.trim()] = part.value.trim();
      }
    });

    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations/${configId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parts: partsObject,
        }),
      });

      if (response.ok) {
        router.push(`/vehicle/${vehicleId}/configuration/${configId}`);
      } else {
        alert('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      alert('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  }

  function addPartField() {
    setParts([...parts, { key: '', value: '' }]);
  }

  function removePartField(index: number) {
    setParts(parts.filter((_, i) => i !== index));
  }

  function updatePartField(index: number, field: 'key' | 'value', value: string) {
    const newParts = [...parts];
    newParts[index][field] = value;
    setParts(newParts);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
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
    const newParts: PartField[] = [];

    lines.forEach((line, index) => {
      // Skip header row if it exists
      if (index === 0 && (line.toLowerCase().includes('part') || line.toLowerCase().includes('name'))) {
        return;
      }

      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        newParts.push({
          key: parts[0],
          value: parts[1]
        });
      }
    });

    if (newParts.length > 0) {
      setParts(newParts);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading configuration...</p>
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
              <Link href={`/vehicle/${vehicleId}/configuration/${configId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <CardTitle>Edit Configuration</CardTitle>
                <CardDescription>
                  Update the parts installed on this vehicle
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
                  placeholder="e.g., High Downforce Setup"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description of this configuration"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Parts</Label>
                  <div className="flex gap-2">
                    <Button type="button" onClick={addPartField} variant="outline" size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Part
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleImportClick} className="gap-2">
                          <FileText className="h-4 w-4" />
                          Import from CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-2">
                  {parts.map((part, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Part name (e.g., Front Wing)"
                        value={part.key}
                        onChange={(e) => updatePartField(index, 'key', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Part value (e.g., High Downforce)"
                        value={part.value}
                        onChange={(e) => updatePartField(index, 'value', e.target.value)}
                        className="flex-1"
                      />
                      {parts.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePartField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Add parts like Front Wing, Rear Wing, Floor, Suspension, etc.
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
                <Link href={`/vehicle/${vehicleId}/configuration/${configId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
