'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { fetchJson, mutationJson } from '@/lib/client-fetch';

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
  const queryClient = useQueryClient();
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<LayoutEdit | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Map<string, LayoutEdit>>(
    new Map(),
  );
  const [pendingDefaultId, setPendingDefaultId] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const layoutsQuery = useQuery({
    queryKey: ['analysis-layouts', 'list', context] as const,
    queryFn: async (): Promise<SavedLayout[]> => {
      const data = await fetchJson<unknown>(`/api/analysis-layouts?context=${encodeURIComponent(context)}`, {
        unauthorized: { kind: 'return_fallback' },
        fallback: [],
      });
      return Array.isArray(data) ? (data as SavedLayout[]) : [];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const data = layoutsQuery.data ?? [];
    setLayouts(data);
    const defaultLayout = data.find((l: SavedLayout) => l.isDefault);
    if (defaultLayout) {
      setPendingDefaultId(defaultLayout.id);
    }
  }, [layoutsQuery.data, open]);

  const applyLayoutChangesMutation = useMutation({
    mutationFn: async (payload: {
      pendingDeletes: Set<string>;
      pendingChanges: Map<string, LayoutEdit>;
      pendingDefaultId: string | null;
      layouts: SavedLayout[];
    }) => {
      // deletions
      for (const layoutId of payload.pendingDeletes) {
        await mutationJson(`/api/analysis-layouts/${layoutId}`, { method: 'DELETE' });
      }

      // edits
      for (const [layoutId, changes] of payload.pendingChanges) {
        if (!payload.pendingDeletes.has(layoutId)) {
          await mutationJson(`/api/analysis-layouts/${layoutId}`, {
            method: 'PATCH',
            body: {
              name: changes.name,
              description: changes.description || null,
            },
          });
        }
      }

      // defaults
      for (const layout of payload.layouts) {
        const shouldBeDefault = payload.pendingDefaultId === layout.id;
        if (layout.isDefault !== shouldBeDefault && !payload.pendingDeletes.has(layout.id)) {
          await mutationJson(`/api/analysis-layouts/${layout.id}`, {
            method: 'PATCH',
            body: { isDefault: shouldBeDefault },
          });
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-layouts', 'list', context] });
    },
  });

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
      await applyLayoutChangesMutation.mutateAsync({
        pendingDeletes,
        pendingChanges,
        pendingDefaultId,
        layouts,
      });

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

  const loading = layoutsQuery.isLoading;

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
                          <TooltipProvider delayDuration={300}>
                          <div className="flex gap-1 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={saveEdit}
                                    disabled={!editData.name.trim()}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">Save edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">Cancel edit</TooltipContent>
                            </Tooltip>
                          </div>
                          </TooltipProvider>
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
                          <TooltipProvider delayDuration={300}>
                          <div className="flex gap-1 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleDefault(layout.id)}
                                  >
                                    {display.isDefault ? (
                                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                                    ) : (
                                      <StarOff className="h-4 w-4" />
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">{display.isDefault ? 'Remove as default' : 'Set as default'}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEdit(layout)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">Edit layout</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => markForDelete(layout.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">Delete layout</TooltipContent>
                            </Tooltip>
                          </div>
                          </TooltipProvider>
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
