"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageLayoutsDialog = ManageLayoutsDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const dialog_1 = require("@/components/ui/dialog");
const scroll_area_1 = require("@/components/ui/scroll-area");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
const tooltip_1 = require("@/components/ui/tooltip");
const date_fns_1 = require("date-fns");
function ManageLayoutsDialog({ open, onOpenChange, context = 'global', }) {
    const [layouts, setLayouts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [editingId, setEditingId] = (0, react_1.useState)(null);
    const [editData, setEditData] = (0, react_1.useState)(null);
    const [pendingChanges, setPendingChanges] = (0, react_1.useState)(new Map());
    const [pendingDefaultId, setPendingDefaultId] = (0, react_1.useState)(null);
    const [pendingDeletes, setPendingDeletes] = (0, react_1.useState)(new Set());
    const [saving, setSaving] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
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
                // Set initial pending default
                const defaultLayout = data.find((l) => l.isDefault);
                if (defaultLayout) {
                    setPendingDefaultId(defaultLayout.id);
                }
            }
        }
        catch (error) {
            console.error('Error fetching layouts:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const startEdit = (layout) => {
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
    const toggleDefault = (layoutId) => {
        setPendingDefaultId(layoutId);
    };
    const markForDelete = (layoutId) => {
        if (!confirm('Are you sure you want to delete this layout?')) {
            return;
        }
        const deletes = new Set(pendingDeletes);
        deletes.add(layoutId);
        setPendingDeletes(deletes);
        // If we're deleting the default, clear pending default
        if (pendingDefaultId === layoutId) {
            setPendingDefaultId(null);
        }
    };
    const undoDelete = (layoutId) => {
        const deletes = new Set(pendingDeletes);
        deletes.delete(layoutId);
        setPendingDeletes(deletes);
    };
    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // 1. Process deletions
            for (const layoutId of pendingDeletes) {
                await fetch(`/api/plot-layouts/${layoutId}`, {
                    method: 'DELETE',
                });
            }
            // 2. Process edits
            for (const [layoutId, changes] of pendingChanges) {
                if (!pendingDeletes.has(layoutId)) {
                    await fetch(`/api/plot-layouts/${layoutId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: changes.name,
                            description: changes.description || null,
                        }),
                    });
                }
            }
            // 3. Update default if changed
            const currentDefault = layouts.find(l => l.isDefault);
            if (pendingDefaultId && pendingDefaultId !== currentDefault?.id && !pendingDeletes.has(pendingDefaultId)) {
                await fetch('/api/plot-layouts/default', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        layoutId: pendingDefaultId,
                        context,
                    }),
                });
            }
            // Reset state and close
            setPendingChanges(new Map());
            setPendingDeletes(new Set());
            setEditingId(null);
            setEditData(null);
            onOpenChange(false);
        }
        catch (error) {
            console.error('Error saving changes:', error);
            alert('Failed to save some changes. Please try again.');
        }
        finally {
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
    const getDisplayData = (layout) => {
        const changes = pendingChanges.get(layout.id);
        return {
            name: changes?.name ?? layout.name,
            description: changes?.description ?? (layout.description || ''),
            isDefault: pendingDefaultId === layout.id,
            isDeleted: pendingDeletes.has(layout.id),
        };
    };
    const hasChanges = pendingChanges.size > 0 ||
        pendingDeletes.size > 0 ||
        (pendingDefaultId !== layouts.find(l => l.isDefault)?.id);
    return ((0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: open, onOpenChange: onOpenChange, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "sm:max-w-[700px]", children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Manage Plot Layouts" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: "Edit, delete, or set default layouts. Changes are saved when you click \"Save Changes\"." })] }), (0, jsx_runtime_1.jsx)(scroll_area_1.ScrollArea, { className: "h-[500px] pr-4", children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-32 text-muted-foreground", children: "Loading layouts..." })) : layouts.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-32 text-muted-foreground", children: "No saved layouts found." })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: layouts.map((layout) => {
                            const display = getDisplayData(layout);
                            const isEditing = editingId === layout.id;
                            return ((0, jsx_runtime_1.jsx)("div", { className: `p-4 border rounded-lg transition-all ${display.isDeleted
                                    ? 'opacity-50 bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
                                    : 'bg-card'}`, children: isEditing && editData ? (
                                // Edit mode
                                (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 space-y-2", children: [(0, jsx_runtime_1.jsx)(input_1.Input, { value: editData.name, onChange: (e) => setEditData({ ...editData, name: e.target.value }), placeholder: "Layout name", className: "font-semibold" }), (0, jsx_runtime_1.jsx)(textarea_1.Textarea, { value: editData.description, onChange: (e) => setEditData({ ...editData, description: e.target.value }), placeholder: "Description (optional)", rows: 2 })] }), (0, jsx_runtime_1.jsx)(tooltip_1.TooltipProvider, { delayDuration: 300, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-1 flex-shrink-0", children: [(0, jsx_runtime_1.jsxs)(tooltip_1.Tooltip, { children: [(0, jsx_runtime_1.jsx)(tooltip_1.TooltipTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: saveEdit, disabled: !editData.name.trim(), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4 text-green-600" }) }) }) }), (0, jsx_runtime_1.jsx)(tooltip_1.TooltipContent, { side: "bottom", children: "Save edit" })] }), (0, jsx_runtime_1.jsxs)(tooltip_1.Tooltip, { children: [(0, jsx_runtime_1.jsx)(tooltip_1.TooltipTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: cancelEdit, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) }) }) }), (0, jsx_runtime_1.jsx)(tooltip_1.TooltipContent, { side: "bottom", children: "Cancel edit" })] })] }) })] }) })) : (
                                // Display mode
                                (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1 flex-wrap", children: [(0, jsx_runtime_1.jsx)("h4", { className: `font-semibold truncate ${display.isDeleted ? 'line-through' : ''}`, children: display.name }), display.isDefault && !display.isDeleted && ((0, jsx_runtime_1.jsxs)(badge_1.Badge, { variant: "secondary", className: "text-xs", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Star, { className: "h-3 w-3 mr-1 fill-current" }), "Default"] })), display.isDeleted && ((0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "destructive", className: "text-xs", children: "Marked for deletion" })), pendingChanges.has(layout.id) && !display.isDeleted && ((0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "outline", className: "text-xs", children: "Modified" }))] }), display.description && ((0, jsx_runtime_1.jsx)("p", { className: `text-sm text-muted-foreground mb-2 ${display.isDeleted ? 'line-through' : ''}`, children: display.description })), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground", children: ["Created ", (0, date_fns_1.formatDistanceToNow)(new Date(layout.createdAt), { addSuffix: true })] })] }), !display.isDeleted && ((0, jsx_runtime_1.jsx)(tooltip_1.TooltipProvider, { delayDuration: 300, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-1 flex-shrink-0", children: [(0, jsx_runtime_1.jsxs)(tooltip_1.Tooltip, { children: [(0, jsx_runtime_1.jsx)(tooltip_1.TooltipTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: () => toggleDefault(layout.id), children: display.isDefault ? ((0, jsx_runtime_1.jsx)(lucide_react_1.Star, { className: "h-4 w-4 fill-current text-yellow-500" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.StarOff, { className: "h-4 w-4" })) }) }) }), (0, jsx_runtime_1.jsx)(tooltip_1.TooltipContent, { side: "bottom", children: display.isDefault ? 'Remove as default' : 'Set as default' })] }), (0, jsx_runtime_1.jsxs)(tooltip_1.Tooltip, { children: [(0, jsx_runtime_1.jsx)(tooltip_1.TooltipTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: () => startEdit(layout), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Pencil, { className: "h-4 w-4" }) }) }) }), (0, jsx_runtime_1.jsx)(tooltip_1.TooltipContent, { side: "bottom", children: "Edit layout" })] }), (0, jsx_runtime_1.jsxs)(tooltip_1.Tooltip, { children: [(0, jsx_runtime_1.jsx)(tooltip_1.TooltipTrigger, { asChild: true, children: (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", onClick: () => markForDelete(layout.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-4 w-4 text-red-600" }) }) }) }), (0, jsx_runtime_1.jsx)(tooltip_1.TooltipContent, { side: "bottom", children: "Delete layout" })] })] }) })), display.isDeleted && ((0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", size: "sm", onClick: () => undoDelete(layout.id), children: "Undo Delete" }))] })) }, layout.id));
                        }) })) }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: handleCancel, disabled: saving, children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: handleSaveAll, disabled: !hasChanges || saving, children: saving ? 'Saving...' : 'Save Changes' })] })] }) }));
}
