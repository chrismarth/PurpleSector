

import { useEffect, useState } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

export default function VehicleEditPage() {
  const { id: vehicleId } = usePage().props as unknown as { id: string };
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ name: '', description: '', inServiceDate: '', outOfServiceDate: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const vehicleQuery = useQuery({
    queryKey: queryKeys.vehicleDetail(vehicleId),
    queryFn: async () => fetchJson<any>(`/api/vehicles/${vehicleId}`, { unauthorized: { kind: 'redirect_to_login' } }),
    enabled: !!vehicleId,
  });

  useEffect(() => {
    if (!vehicleQuery.data) return;
    const data = vehicleQuery.data;
    setFormData({
      name: data.name,
      description: data.description || '',
      inServiceDate: data.inServiceDate ? String(data.inServiceDate).split('T')[0] : '',
      outOfServiceDate: data.outOfServiceDate ? String(data.outOfServiceDate).split('T')[0] : '',
    });
    if (data.tags) setTags(JSON.parse(data.tags));
  }, [vehicleQuery.data]);

  const updateVehicleMutation = useMutation({
    mutationFn: async () => mutationJson<any>(`/api/vehicles/${vehicleId}`, { method: 'PATCH', body: { ...formData, tags } }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.vehicleDetail(vehicleId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.vehiclesList });
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateVehicleMutation.mutateAsync();
      router.visit(`/vehicle/${vehicleId}`);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle');
    }
  }

  function addTag() {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) { setTags([...tags, tagInput.trim()]); setTagInput(''); }
  }
  function removeTag(tag: string) { setTags(tags.filter(t => t !== tag)); }

  const loading = vehicleQuery.isLoading;
  const saving = updateVehicleMutation.isPending;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading vehicle...</p>
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
              <Link href={`/vehicle/${vehicleId}`}>
                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
              </Link>
              <div>
                <CardTitle>Edit Vehicle</CardTitle>
                <CardDescription>Update vehicle information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Car #42" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description of the vehicle" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inServiceDate">In Service Date</Label>
                  <Input id="inServiceDate" type="date" value={formData.inServiceDate} onChange={(e) => setFormData({ ...formData, inServiceDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outOfServiceDate">Out of Service Date</Label>
                  <Input id="outOfServiceDate" type="date" value={formData.outOfServiceDate} onChange={(e) => setFormData({ ...formData, outOfServiceDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input id="tags" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add a tag and press Enter" />
                  <Button type="button" onClick={addTag} variant="outline"><Plus className="h-4 w-4" /></Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save Changes'}</Button>
                <Link href={`/vehicle/${vehicleId}`}><Button type="button" variant="outline">Cancel</Button></Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
