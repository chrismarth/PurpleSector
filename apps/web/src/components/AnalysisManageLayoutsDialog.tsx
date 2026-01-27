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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star, StarOff, Pencil, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SavedLayout {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LayoutEdit {
  id: string;
  name: string;
  description: string;
}

interface AnalysisManageLayoutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
}

export function AnalysisManageLayoutsDialog({
  open,
  onOpenChange,
  context = 'global',
}: AnalysisManageLayoutsDialogProps) {
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<LayoutEdit | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, LayoutEdit>>(
    new Map(),
  );
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLayouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context]);

  const fetchLayouts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/analysis-layouts?context=${encodeURIComponent(context)}`,
      );
      if (response.ok) {
        const data = await response.json();
        setLayouts(data);

        const defaultLayout = data.find((l: SavedLayout) => l.isDefault);
        if (defaultLayout) {
          setPendingDefaultId(defaultLayout.id);
        }
      }
    } catch (error) {
      console.error('Error fetching analysis layouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (layout: SavedLayout) => {
    setEditingId(layout.id);
    setEditData({
      id: layout.id,
      name: layout.name,
      description: layout.description || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = () => {
    if (editData && editingId) {
      const changes = new Map(pendingChanges);
      changes.set(editingId, editData);
      setPendingChanges(changes);
      setEditingId(null);
      setEditData(null);
    }
  };

  const toggleDefault = (layoutId: string) => {
    setPendingDefaultId(layoutId);
  };

  const markForDelete = (layoutId: string) => {
    if (!confirm('Are you sure you want to delete this layout?')) {
      return;
    }

    const deletes = new Set(pendingDeletes);
    deletes.add(layoutId);
    setPendingDeletes(deletes);

    if (pendingDefaultId === layoutId) {
      setPendingDefaultId(null);
    }
  };

  const undoDelete = (layoutId: string) => {
    const deletes = new Set(pendingDeletes);
    deletes.delete(layoutId);
    setPendingDeletes(deletes);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // deletions
      for (const layoutId of pendingDeletes) {
        await fetch(`/api/analysis-layouts/${layoutId}`, {
          method: 'DELETE',
        });
      }

      // edits
      for (const [layoutId, changes] of pendingChanges) {
        if (!pendingDeletes.has(layoutId)) {
          await fetch(`/api/analysis-layouts/${layoutId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: changes.name,
              description: changes.description || null,
            }),
          });
        }
      }

      // defaults (ensure only one default per context)
      for (const layout of layouts) {
        const shouldBeDefault = pendingDefaultId === layout.id;
        if (layout.isDefault !== shouldBeDefault && !pendingDeletes.has(layout.id)) {
          await fetch(`/api/analysis-layouts/${layout.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDefault: shouldBeDefault }),
          });
        }
      }

      setPendingChanges(new Map());
      setPendingDeletes(new Set());
      setEditingId(null);
      setEditData(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving layout changes:', error);
      alert('Failed to save some changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPendingChanges(new Map());
    setPendingDeletes(new Set());
    setEditingId(null);
    setEditData(null);
    onOpenChange(false);
  };

  const getDisplayData = (layout: SavedLayout) => {
    const changes = pendingChanges.get(layout.id);
    return {
      name: changes?.name ?? layout.name,
      description: changes?.description ?? (layout.description || ''),
      isDefault: pendingDefaultId === layout.id,
      isDeleted: pendingDeletes.has(layout.id),
    };
  };

  const hasChanges =
    pendingChanges.size > 0 ||
    pendingDeletes.size > 0 ||
    pendingDefaultId !== layouts.find((l) => l.isDefault)?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Manage Analysis Layouts</DialogTitle>
          <DialogDescription>
            Edit, delete, or set default analysis layouts for this context.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading layouts...
            </div>
          ) : layouts.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No saved layouts found.
            </div>
          ) : (
            <div className="space-y-3">
              {layouts.map((layout) => {
                const display = getDisplayData(layout);
                const isEditing = editingId === layout.id;

                return (
                  <div
                    key={layout.id}
                    className={`p-4 border rounded-lg transition-all ${
                      display.isDeleted
                        ? 'opacity-50 bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                        : 'bg-card'
                    }`}
                  >
                    {isEditing && editData ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={editData.name}
                              onChange={(e) =>
                                setEditData({ ...editData, name: e.target.value })
                              }
                              placeholder="Layout name"
                              className="font-semibold"
                            />
                            <Textarea
                              value={editData.description}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Description (optional)"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={saveEdit}
                              disabled={!editData.name.trim()}
                              title="Save edit"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEdit}
                              title="Cancel edit"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4
                              className={`font-semibold truncate ${
                                display.isDeleted ? 'line-through' : ''
                              }`}
                            >
                              {display.name}
                            </h4>
                            {display.isDefault && !display.isDeleted && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                            {display.isDeleted && (
                              <Badge variant="destructive" className="text-xs">
                                Marked for deletion
                              </Badge>
                            )}
                            {pendingChanges.has(layout.id) && !display.isDeleted && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                          {display.description && (
                            <p
                              className={`text-sm text-muted-foreground mb-2 ${
                                display.isDeleted ? 'line-through' : ''
                              }`}
                            >
                              {display.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Created{' '}
                            {formatDistanceToNow(new Date(layout.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>

                        {!display.isDeleted && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleDefault(layout.id)}
                              title={
                                display.isDefault
                                  ? 'Remove as default'
                                  : 'Set as default'
                              }
                            >
                              {display.isDefault ? (
                                <Star className="h-4 w-4 fill-current text-yellow-500" />
                              ) : (
                                <StarOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(layout)}
                              title="Edit layout"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markForDelete(layout.id)}
                              title="Delete layout"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}

                        {display.isDeleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => undoDelete(layout.id)}
                          >
                            Undo Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveAll} disabled={!hasChanges || saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
