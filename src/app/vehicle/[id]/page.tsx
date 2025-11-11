'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, Wrench, Edit, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatTimestamp } from '@/lib/utils';

interface VehicleConfiguration {
  id: string;
  name: string;
  description: string | null;
  parts: string;
  createdAt: string;
  _count: {
    setups: number;
    sessions: number;
  };
}

interface VehicleSetup {
  id: string;
  name: string;
  description: string | null;
  parameters: string;
  vehicleConfiguration: VehicleConfiguration | null;
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
  configurations: VehicleConfiguration[];
  setups: VehicleSetup[];
  _count: {
    sessions: number;
  };
}

export default function VehiclePage() {
  const params = useParams();
  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicle();
  }, [vehicleId]);

  async function fetchVehicle() {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`);
      const data = await response.json();
      setVehicle(data);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteConfiguration(configId: string) {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await fetch(`/api/vehicles/${vehicleId}/configurations/${configId}`, { method: 'DELETE' });
      fetchVehicle();
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  }

  async function deleteSetup(setupId: string) {
    if (!confirm('Are you sure you want to delete this setup?')) return;

    try {
      await fetch(`/api/vehicles/${vehicleId}/setups/${setupId}`, { method: 'DELETE' });
      fetchVehicle();
    } catch (error) {
      console.error('Error deleting setup:', error);
    }
  }

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

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Vehicle not found</p>
          <Link href="/">
            <Button className="mt-4">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        {/* Vehicle Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <CardTitle className="text-2xl">{vehicle.name}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatTimestamp(new Date(vehicle.createdAt))}
                  </div>
                  {vehicle._count.sessions > 0 && (
                    <span>{vehicle._count.sessions} session{vehicle._count.sessions === 1 ? '' : 's'}</span>
                  )}
                </CardDescription>
              </div>
              <Link href={`/vehicle/${vehicleId}/edit`}>
                <Button variant="outline" className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </div>
          </CardHeader>
          {(vehicle.description || (vehicle.tags && JSON.parse(vehicle.tags).length > 0)) && (
            <CardContent className="space-y-3">
              {vehicle.description && (
                <p className="text-muted-foreground">{vehicle.description}</p>
              )}
              {vehicle.tags && (() => {
                const tags = JSON.parse(vehicle.tags);
                return tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          )}
        </Card>

        <Tabs defaultValue="configurations" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="configurations" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurations
            </TabsTrigger>
            <TabsTrigger value="setups" className="gap-2">
              <Wrench className="h-4 w-4" />
              Setups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configurations" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Configurations</CardTitle>
                    <CardDescription>
                      {vehicle.configurations.length === 0
                        ? 'No configurations yet. Create your first configuration.'
                        : `${vehicle.configurations.length} configuration${vehicle.configurations.length === 1 ? '' : 's'}`}
                    </CardDescription>
                  </div>
                  <Link href={`/vehicle/${vehicleId}/configuration/new`}>
                    <Button className="gap-2">
                      <Plus className="h-5 w-5" />
                      New Configuration
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {vehicle.configurations.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No configurations yet</p>
                    <Link href={`/vehicle/${vehicleId}/configuration/new`}>
                      <Button className="gap-2">
                        <Plus className="h-5 w-5" />
                        Create First Configuration
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.configurations.map((config) => (
                      <Card key={config.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{config.name}</CardTitle>
                          {config.description && (
                            <CardDescription>{config.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Setups:</span>
                                <span className="ml-2 font-semibold">{config._count.setups}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Sessions:</span>
                                <span className="ml-2 font-semibold">{config._count.sessions}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/vehicle/${vehicleId}/configuration/${config.id}`} className="flex-1">
                                <Button variant="default" size="sm" className="w-full">
                                  View Details
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteConfiguration(config.id)}
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
          </TabsContent>

          <TabsContent value="setups" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Setups</CardTitle>
                    <CardDescription>
                      {vehicle.setups.length === 0
                        ? 'No setups yet. Create your first setup.'
                        : `${vehicle.setups.length} setup${vehicle.setups.length === 1 ? '' : 's'}`}
                    </CardDescription>
                  </div>
                  <Link href={`/vehicle/${vehicleId}/setup/new`}>
                    <Button className="gap-2">
                      <Plus className="h-5 w-5" />
                      New Setup
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {vehicle.setups.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No setups yet</p>
                    <Link href={`/vehicle/${vehicleId}/setup/new`}>
                      <Button className="gap-2">
                        <Plus className="h-5 w-5" />
                        Create First Setup
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle.setups.map((setup) => (
                      <Card key={setup.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg">{setup.name}</CardTitle>
                          {setup.description && (
                            <CardDescription>{setup.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {setup.vehicleConfiguration && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Configuration:</span>
                                <Badge variant="outline" className="ml-2">
                                  {setup.vehicleConfiguration.name}
                                </Badge>
                              </div>
                            )}
                            <div className="text-sm">
                              <span className="text-muted-foreground">Sessions:</span>
                              <span className="ml-2 font-semibold">{setup._count.sessions}</span>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/vehicle/${vehicleId}/setup/${setup.id}`} className="flex-1">
                                <Button variant="default" size="sm" className="w-full">
                                  View Details
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSetup(setup.id)}
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
