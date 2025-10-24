'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SaveLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description?: string) => Promise<void>;
}

export function SaveLayoutDialog({
  open,
  onOpenChange,
  onSave,
}: SaveLayoutDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving layout:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Plot Layout</DialogTitle>
          <DialogDescription>
            Save the current plot configuration and layout for future use.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Layout Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Race Analysis, Qualifying Setup"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSave();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this layout..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setName('');
              setDescription('');
              onOpenChange(false);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? 'Saving...' : 'Save Layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
