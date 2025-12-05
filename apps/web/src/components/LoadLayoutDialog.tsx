'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SavedLayout {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LoadLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad: (layoutId: string) => Promise<void>;
  context?: string;
}

export function LoadLayoutDialog({
  open,
  onOpenChange,
  onLoad,
  context = 'global',
}: LoadLayoutDialogProps) {
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchLayouts();
    }
  }, [open, context]);

  const fetchLayouts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/plot-layouts?context=${context}`);
      if (response.ok) {
        const data = await response.json();
        setLayouts(data);
      }
    } catch (error) {
      console.error('Error fetching layouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedId) return;

    try {
      await onLoad(selectedId);
      onOpenChange(false);
    } catch (error) {
      console.error('Error loading layout:', error);
    }
  };

  const handleDelete = async (layoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this layout?')) {
      return;
    }

    setDeleting(layoutId);
    try {
      const response = await fetch(`/api/plot-layouts/${layoutId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setLayouts(layouts.filter(l => l.id !== layoutId));
        if (selectedId === layoutId) {
          setSelectedId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Load Saved Layout</DialogTitle>
          <DialogDescription>
            Select a saved plot layout to apply to the current view.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading layouts...
            </div>
          ) : layouts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No saved layouts found. Create one using "Save Layout As..."
            </div>
          ) : (
            <div className="space-y-2">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    selectedId === layout.id ? 'border-primary bg-accent' : ''
                  }`}
                  onClick={() => setSelectedId(layout.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{layout.name}</h4>
                        {layout.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {selectedId === layout.id && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      {layout.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {layout.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(layout.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={(e) => handleDelete(layout.id, e)}
                      disabled={deleting === layout.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedId(null);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleLoad} disabled={!selectedId}>
            Load Layout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
