'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Calendar, MapPin, Edit, Car, Settings, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTimestamp } from '@/lib/utils';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: {
    sessions: number;
  };
}

interface Vehicle {
  id: string;
  name: string;
  description: string | null;
  inServiceDate: string | null;
  outOfServiceDate: string | null;
  tags: string | null;
  createdAt: string;
  _count: {
    configurations: number;
    setups: number;
    sessions: number;
  };
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [eventsResponse, vehiclesResponse] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/vehicles'),
      ]);
      const eventsData = await eventsResponse.json();
      const vehiclesData = await vehiclesResponse.json();
      setEvents(eventsData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Are you sure you want to delete this event? All sessions and laps will be deleted.')) return;

    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      setEvents(events.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  }

  async function deleteVehicle(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle? All configurations and setups will be deleted.')) return;

    try {
      await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      setVehicles(vehicles.filter(v => v.id !== id));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2">
              <Car className="h-4 w-4" />
              Vehicles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Racing Events
                    </CardTitle>
                    <CardDescription>
                      Manage your racing events and track sessions
                    </CardDescription>
                  </div>
                  {!loading && events.length > 0 && (
                    <Link href="/event/new">
                      <Button className="gap-2">
                        <Plus className="h-5 w-5" />
                        New Event
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading events...</p>
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first event to start organizing your racing sessions
                </p>
                <Link href="/event/new">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create First Event
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{event.name}</CardTitle>
                      <div className="space-y-1 mt-2">
                        {event.location && (
                          <CardDescription className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </CardDescription>
                        )}
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatTimestamp(new Date(event.createdAt))}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sessions:</span>
                      <span className="font-semibold">{event._count.sessions}</span>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Link href={`/event/${event.id}`} className="flex-1">
                        <Button variant="default" className="w-full">
                          View Event
                        </Button>
                      </Link>
                      <Link href={`/event/${event.id}/edit`}>
                        <Button
                          variant="outline"
                          size="icon"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="vehicles">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      Vehicles
                    </CardTitle>
                    <CardDescription>
                      Manage your vehicles, configurations, and setups
                    </CardDescription>
                  </div>
                  {!loading && vehicles.length > 0 && (
                    <Link href="/vehicle/new">
                      <Button className="gap-2">
                        <Plus className="h-5 w-5" />
                        New Vehicle
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading vehicles...</p>
                    </div>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Vehicles Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Create your first vehicle to start managing configurations and setups
                    </p>
                    <Link href="/vehicle/new">
                      <Button size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Create First Vehicle
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((vehicle) => (
                      <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{vehicle.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-2">
                                <Calendar className="h-4 w-4" />
                                {formatTimestamp(new Date(vehicle.createdAt))}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {vehicle.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {vehicle.description}
                              </p>
                            )}
                            
                            {vehicle.tags && (() => {
                              const tags = JSON.parse(vehicle.tags);
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

                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                  <Settings className="h-3 w-3" />
                                </div>
                                <span className="font-semibold">{vehicle._count.configurations}</span>
                                <p className="text-xs text-muted-foreground">Configs</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                  <Wrench className="h-3 w-3" />
                                </div>
                                <span className="font-semibold">{vehicle._count.setups}</span>
                                <p className="text-xs text-muted-foreground">Setups</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                  <Calendar className="h-3 w-3" />
                                </div>
                                <span className="font-semibold">{vehicle._count.sessions}</span>
                                <p className="text-xs text-muted-foreground">Sessions</p>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Link href={`/vehicle/${vehicle.id}`} className="flex-1">
                                <Button variant="default" className="w-full">
                                  View Vehicle
                                </Button>
                              </Link>
                              <Link href={`/vehicle/${vehicle.id}/edit`}>
                                <Button
                                  variant="outline"
                                  size="icon"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => deleteVehicle(vehicle.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
