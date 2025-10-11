'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wifi, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');
  
  const [name, setName] = useState('');
  const [source, setSource] = useState<'live' | 'demo' | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Redirect to home if no eventId provided
    if (!eventId) {
      router.push('/');
    }
  }, [eventId, router]);

  async function createSession() {
    if (!name || !source || !eventId) return;

    setCreating(true);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name, source }),
      });

      const session = await response.json();
      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      setCreating(false);
    }
  }

  if (!eventId) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Create New Session</h1>
              <p className="text-sm text-muted-foreground">
                Set up a new telemetry analysis session
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Session Name */}
          <Card>
            <CardHeader>
              <CardTitle>Session Name</CardTitle>
              <CardDescription>
                Give your session a descriptive name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., Monza Practice - June 15"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
            </CardContent>
          </Card>

          {/* Telemetry Source */}
          <Card>
            <CardHeader>
              <CardTitle>Telemetry Source</CardTitle>
              <CardDescription>
                Choose where to get telemetry data from
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Live Source */}
              <button
                onClick={() => setSource('live')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  source === 'live'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                    <Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Live Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect to a running Assetto Corsa instance for real-time telemetry
                    </p>
                  </div>
                </div>
              </button>

              {/* Demo Source */}
              <button
                onClick={() => setSource('demo')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  source === 'demo'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Play className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Demo Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Use pre-recorded telemetry data to explore the app
                    </p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>

          {/* Create Button */}
          <div className="flex justify-end gap-4">
            <Link href="/">
              <Button variant="outline" size="lg">
                Cancel
              </Button>
            </Link>
            <Button
              size="lg"
              onClick={createSession}
              disabled={!name || !source || creating}
            >
              {creating ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
