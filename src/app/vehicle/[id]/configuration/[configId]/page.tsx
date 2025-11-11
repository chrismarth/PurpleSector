'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface VehicleConfiguration {
  id: string;
  name: string;
  description: string | null;
  parts: string;
  createdAt: string;
  vehicle: {
    id: string;
    name: string;
  };
  _count: {
    sessions: number;
  };
}

export default function ConfigurationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  const configId = params.configId as string;

  const [configuration, setConfiguration] = useState<VehicleConfiguration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfiguration();
  }, [configId]);

  async function fetchConfiguration() {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/configurations/${configId}`);
      const data = await response.json();
      setConfiguration(data);
    } catch (error) {
      console.error('Error fetching configuration:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await fetch(`/api/vehicles/${vehicleId}/configurations/${configId}`, { method: 'DELETE' });
      router.push(`/vehicle/${vehicleId}`);
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('Failed to delete configuration');
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

  if (!configuration) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Configuration not found</p>
          <Link href={`/vehicle/${vehicleId}`}>
            <Button className="mt-4">Back to Vehicle</Button>
          </Link>
        </div>
      </div>
    );
  }

  const parts = JSON.parse(configuration.parts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Link href={`/vehicle/${vehicleId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex-1">
                <CardTitle className="text-2xl">{configuration.name}</CardTitle>
                <CardDescription>
                  Configuration for {configuration.vehicle.name}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link href={`/vehicle/${vehicleId}/configuration/${configId}/edit`}>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {configuration.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{configuration.description}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Parts</h3>
              {Object.keys(parts).length === 0 ? (
                <p className="text-muted-foreground">No parts defined</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(parts).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{key}</span>
                      <Badge variant="secondary">{value as string}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Sessions using this config:</span>
                  <span className="ml-2 font-semibold">{configuration._count.sessions}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
