'use client';

import { useEffect, useState } from 'react';
import { Calendar, MapPin, Play, Archive, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp } from '@/lib/utils';
import { useAppShell } from '@/components/app-shell/AppShellContext';
import { useNav } from '@/components/app-shell/NavContext';

interface Session {
  id: string;
  name: string;
  source: string;
  status: string;
  tags: string | null;
  createdAt: string;
  _count: {
    laps: number;
  };
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  sessions: Session[];
}

interface EventDetailContentProps {
  entityId: string;
}

export default function EventDetailContent({ entityId }: EventDetailContentProps) {
  const { openTab, closeTab } = useAppShell();
  const { refresh: refreshNav } = useNav();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [entityId]);

  async function fetchEvent() {
    try {
      const response = await fetch(`/api/events/${entityId}`);
      const data = await response.json();
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      fetchEvent();
      refreshNav();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  async function handleDeleteEvent() {
    if (!confirm(`Are you sure you want to delete the event "${event?.name}"? This will also delete all sessions and laps within it.`)) return;
    try {
      const response = await fetch(`/api/events/${entityId}`, { method: 'DELETE' });
      if (response.ok) {
        closeTab(`event-detail:${entityId}`);
        refreshNav();
      } else {
        console.error('Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }

  function handleEditEvent() {
    openTab({
      id: `event-edit:${entityId}`,
      type: 'event-edit',
      label: `Edit ${event?.name || 'Event'}`,
      breadcrumbs: [event?.name || 'Event', 'Edit'],
      entityId,
      closable: true,
    });
  }

  function handleOpenSession(session: Session) {
    openTab({
      id: `session-detail:${session.id}`,
      type: 'session-detail',
      label: session.name,
      breadcrumbs: [event?.name || 'Event', session.name],
      entityId: session.id,
      closable: true,
    });
  }

  function handleEditSession(session: Session) {
    openTab({
      id: `session-edit:${session.id}`,
      type: 'session-edit',
      label: `Edit ${session.name}`,
      breadcrumbs: [event?.name || 'Event', session.name, 'Edit'],
      entityId: session.id,
      closable: true,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Event not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Event Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEditEvent} className="gap-1">
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeleteEvent} className="gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        {event.description && (
          <CardContent>
            <p className="text-muted-foreground">{event.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Sessions Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              {event.sessions.length === 0
                ? 'No sessions yet. Use the navigation pane to create a session.'
                : `${event.sessions.length} session${event.sessions.length === 1 ? '' : 's'} in this event`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {event.sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No sessions yet. Expand this event in the navigation pane to add a session or run plan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.sessions.map((session) => (
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
                        <span className="font-semibold">{session._count.laps}</span>
                      </div>

                      {session.tags && (() => {
                        const tags = JSON.parse(session.tags);
                        return tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        );
                      })()}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => handleOpenSession(session)}
                        >
                          {session.status === 'active' ? (
                            <>
                              <Play className="h-3 w-3" />
                              Continue
                            </>
                          ) : (
                            <>
                              <Archive className="h-3 w-3" />
                              View
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditSession(session)}
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
    </div>
  );
}
