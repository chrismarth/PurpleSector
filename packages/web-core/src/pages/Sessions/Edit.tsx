

import { useEffect, useState, useOptimistic } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

interface Session {
  id: string;
  name: string;
  eventId: string;
}

export default function SessionEditPage() {
  const { id: sessionId } = usePage().props as unknown as { id: string };
  const queryClient = useQueryClient();

  const [session, setSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  // Optimistic update for session name changes
  const [optimisticSession, updateOptimisticSession] = useOptimistic(
    session,
    (state, updatedData: Partial<Session>) => 
      state ? { ...state, ...updatedData } : null
  );

  const sessionQuery = useQuery({
    queryKey: queryKeys.sessionDetail(sessionId),
    queryFn: async (): Promise<Session> => {
      return fetchJson<Session>(`/api/sessions/${sessionId}`, {
        unauthorized: { kind: 'redirect_to_login' },
      });
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (!sessionQuery.data) return;
    const data = sessionQuery.data;
    setSession(data);
    setFormData({ name: data.name || '' });
  }, [sessionQuery.data]);

  const updateSessionMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      // Apply optimistic update immediately
      updateOptimisticSession({ name: payload.name });
      
      return mutationJson<Session, typeof formData>(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        body: payload,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.sessionDetail(sessionId), updated);
      queryClient.invalidateQueries({ queryKey: queryKeys.eventDetail(updated.eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
    },
    onError: () => {
      // Optimistic update will be automatically reverted on error
      console.error('Failed to update session');
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const updatedSession = await updateSessionMutation.mutateAsync(formData);
      router.visit(`/event/${updatedSession.eventId}`);
    } catch (error) {
      alert('Failed to update session');
    }
  }

  const loading = sessionQuery.isLoading;
  const saving = updateSessionMutation.isPending;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Session not found</p>
          <Link href="/">
            <Button className="mt-4">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Use optimistic session for display
  const displaySession = optimisticSession || session;

  return (
    <>
      <title>Edit {displaySession.name} - Purple Sector</title>
      <meta name="description" content={`Edit session "${displaySession.name}" in Purple Sector telemetry application`} />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href={`/session/${sessionId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <CardTitle>Edit Session</CardTitle>
                <CardDescription>Update session details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Session Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Practice 1, Qualifying, Race"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href={displaySession ? `/event/${displaySession.eventId}` : '/'}>
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
        </main>
      </div>
    </>
  );
}
