import { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, MapPin, Play, Archive, Trash2, Edit, ListChecks } from 'lucide-react';
import { CreateSessionDialog } from '@/components/app-shell/CreateSessionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import { fetchJson, mutationJson } from '@/lib/client-fetch';
import type { Event } from '@/types/core';

export default function EventDetail() {
  const { id: eventId } = usePage().props as unknown as { id: string };
  const queryClient = useQueryClient();
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: queryKeys.eventDetail(eventId),
    queryFn: () =>
      fetchJson<Event>(`/api/events/${eventId}?include=sessions`, {
        unauthorized: { kind: 'redirect_to_login' },
      }),
    enabled: !!eventId,
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      mutationJson(`/api/sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventDetail(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventsList });
      queryClient.invalidateQueries({ queryKey: queryKeys.navEvents });
    },
  });

  async function deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session?')) return;
    deleteSessionMutation.mutate(sessionId);
  }

  const sessions = event?.sessions ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl">{event.name}</CardTitle>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatTimestamp(new Date(event.createdAt))}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.visit(`/event/${eventId}/edit`)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {event.description && (
            <CardContent>
              <p className="text-muted-foreground">{event.description}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sessions</CardTitle>
                <CardDescription>
                  {sessions.length === 0
                    ? 'No sessions yet. Create your first session to get started.'
                    : `${sessions.length} session${sessions.length === 1 ? '' : 's'} in this event`}
                </CardDescription>
              </div>
              {sessions.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => router.visit(`/event/${eventId}/run-plan`)}>
                    <ListChecks className="h-5 w-5" />
                    Create Run Plan
                  </Button>
                  <Button className="gap-2" onClick={() => router.visit(`/session/new?eventId=${eventId}`)}>
                    <Plus className="h-5 w-5" />
                    New Session
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No sessions yet</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" className="gap-2" onClick={() => router.visit(`/event/${eventId}/run-plan`)}>
                    <ListChecks className="h-5 w-5" />
                    Create Run Plan
                  </Button>
                  <Button className="gap-2" onClick={() => setSessionDialogOpen(true)}>
                    <Plus className="h-5 w-5" />
                    Create First Session
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{session.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatTimestamp(new Date(session.createdAt))}
                          </CardDescription>
                        </div>
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Source:</span>
                          <Badge variant="outline">{session.source}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Laps:</span>
                          <span className="font-semibold">{session.lapCount ?? 0}</span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => router.visit(`/session/${session.id}`)}
                          >
                            {session.status === 'active' ? (
                              <><Play className="h-3 w-3" />Continue</>
                            ) : (
                              <><Archive className="h-3 w-3" />View</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.visit(`/session/${session.id}/edit`)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSession(session.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <CreateSessionDialog
        open={sessionDialogOpen}
        eventId={eventId}
        onOpenChange={setSessionDialogOpen}
        onCreated={(session) => {
          queryClient.invalidateQueries({ queryKey: queryKeys.eventDetail(eventId) });
          router.visit(`/session/${session.id}`);
        }}
      />
    </div>
  );
}
