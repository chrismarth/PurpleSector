import { useEffect, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';
import type { Event } from '@/types/core';

export default function EventEdit() {
  const { id: eventId } = usePage().props as unknown as { id: string };
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '', description: '', location: '', startDate: '', endDate: '',
  });

  const { data: event, isLoading } = useQuery({
    queryKey: queryKeys.eventDetail(eventId),
    queryFn: () => fetchJson<Event>(`/api/events/${eventId}`, { unauthorized: { kind: 'redirect_to_login' } }),
    enabled: !!eventId,
  });

  useEffect(() => {
    if (!event) return;
    setFormData({
      name: event.name ?? '',
      description: event.description ?? '',
      location: event.location ?? '',
      startDate: event.startDate ?? '',
      endDate: event.endDate ?? '',
    });
  }, [event]);

  const updateMutation = useMutation({
    mutationFn: (payload: typeof formData) =>
      mutationJson<Event, typeof formData>(`/api/events/${eventId}`, { method: 'PATCH', body: payload }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.eventDetail(eventId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
      router.visit(`/event/${eventId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.visit(`/event/${eventId}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle>Edit Event</CardTitle>
                <CardDescription>Update event details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Spa-Francorchamps Weekend"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Spa-Francorchamps, Belgium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add notes about this event..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit(`/event/${eventId}`)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

