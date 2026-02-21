'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppShell } from '@/components/app-shell/AppShellContext';
import { useNav } from '@/components/app-shell/NavContext';

interface SessionEditContentProps {
  entityId: string;
}

export default function SessionEditContent({ entityId }: SessionEditContentProps) {
  const { openTab, closeTab, updateTab } = useAppShell();
  const { refresh: refreshNav } = useNav();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchSession();
  }, [entityId]);

  async function fetchSession() {
    try {
      const response = await fetch(`/api/sessions/${entityId}`);
      const data = await response.json();
      setEventId(data.eventId);
      setFormData({ name: data.name || '' });
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/sessions/${entityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        refreshNav();
        updateTab(`session-detail:${entityId}`, {
          label: formData.name,
        });
        closeTab(`session-edit:${entityId}`);
        openTab({
          id: `session-detail:${entityId}`,
          type: 'session-detail',
          label: formData.name,
          breadcrumbs: [formData.name],
          entityId,
          closable: true,
        });
      } else {
        alert('Failed to update session');
      }
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Failed to update session');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Session</CardTitle>
          <CardDescription>Update session details</CardDescription>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => closeTab(`session-edit:${entityId}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
