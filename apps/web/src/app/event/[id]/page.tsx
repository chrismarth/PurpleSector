'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, MapPin, Play, Archive, Trash2, Edit, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp } from '@/lib/utils';

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

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  async function fetchEvent() {
    try {
      const response = await fetch(`/api/events/${eventId}`);
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
      fetchEvent(); // Refresh
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Event not found</p>
          <Link href="/">
            <Button className="mt-4">Back to Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        {/* Event Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
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
                  {event.sessions.length === 0
                    ? 'No sessions yet. Create your first session to get started.'
                    : `${event.sessions.length} session${event.sessions.length === 1 ? '' : 's'} in this event`}
                </CardDescription>
              </div>
              {event.sessions.length > 0 && (
                <div className="flex gap-2">
                  <Link href={`/event/${eventId}/run-plan`}>
                    <Button variant="outline" className="gap-2">
                      <ListChecks className="h-5 w-5" />
                      Create Run Plan
                    </Button>
                  </Link>
                  <Link href={`/session/new?eventId=${eventId}`}>
                    <Button className="gap-2">
                      <Plus className="h-5 w-5" />
                      New Session
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {event.sessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No sessions yet</p>
                <div className="flex gap-3 justify-center">
                  <Link href={`/event/${eventId}/run-plan`}>
                    <Button variant="outline" className="gap-2">
                      <ListChecks className="h-5 w-5" />
                      Create Run Plan
                    </Button>
                  </Link>
                  <Link href={`/session/new?eventId=${eventId}`}>
                    <Button className="gap-2">
                      <Plus className="h-5 w-5" />
                      Create First Session
                    </Button>
                  </Link>
                </div>
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
                          <Link href={`/session/${session.id}`} className="flex-1">
                            <Button variant="default" size="sm" className="w-full gap-2">
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
                          </Link>
                          <Link href={`/session/${session.id}/edit`}>
                            <Button
                              variant="outline"
                              size="sm"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </Link>
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
    </div>
  );
}
