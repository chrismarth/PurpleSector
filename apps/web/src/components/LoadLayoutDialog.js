"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadLayoutDialog = LoadLayoutDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const dialog_1 = require("@/components/ui/dialog");
const scroll_area_1 = require("@/components/ui/scroll-area");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
function LoadLayoutDialog({ open, onOpenChange, onLoad, context = 'global', }) {
    const [layouts, setLayouts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [selectedId, setSelectedId] = (0, react_1.useState)(null);
    const [deleting, setDeleting] = (0, react_1.useState)(null);
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
            }
        }
        catch (error) {
            console.error('Error fetching layouts:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleLoad = async () => {
        if (!selectedId)
            return;
        try {
            await onLoad(selectedId);
            onOpenChange(false);
        }
        catch (error) {
            console.error('Error loading layout:', error);
        }
    };
    const handleDelete = async (layoutId, e) => {
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
        }
        catch (error) {
            console.error('Error deleting layout:', error);
        }
        finally {
            setDeleting(null);
        }
    };
    return ((0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: open, onOpenChange: onOpenChange, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "sm:max-w-[600px]", children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Load Saved Layout" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: "Select a saved plot layout to apply to the current view." })] }), (0, jsx_runtime_1.jsx)(scroll_area_1.ScrollArea, { className: "h-[400px] pr-4", children: loading ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-32 text-muted-foreground", children: "Loading layouts..." })) : layouts.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-32 text-muted-foreground", children: "No saved layouts found. Create one using \"Save Layout As...\"" })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-2", children: layouts.map((layout) => ((0, jsx_runtime_1.jsx)("div", { className: `p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${selectedId === layout.id ? 'border-primary bg-accent' : ''}`, onClick: () => setSelectedId(layout.id), children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex-1 min-w-0", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 mb-1", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-semibold truncate", children: layout.name }), layout.isDefault && ((0, jsx_runtime_1.jsx)(badge_1.Badge, { variant: "secondary", className: "text-xs", children: "Default" })), selectedId === layout.id && ((0, jsx_runtime_1.jsx)(lucide_react_1.Check, { className: "h-4 w-4 text-primary flex-shrink-0" }))] }), layout.description && ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-muted-foreground line-clamp-2 mb-2", children: layout.description })), (0, jsx_runtime_1.jsxs)("p", { className: "text-xs text-muted-foreground", children: ["Created ", (0, date_fns_1.formatDistanceToNow)(new Date(layout.createdAt), { addSuffix: true })] })] }), (0, jsx_runtime_1.jsx)(button_1.Button, { variant: "ghost", size: "icon", className: "flex-shrink-0", onClick: (e) => handleDelete(layout.id, e), disabled: deleting === layout.id, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Trash2, { className: "h-4 w-4" }) })] }) }, layout.id))) })) }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: () => {
                                setSelectedId(null);
                                onOpenChange(false);
                            }, children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: handleLoad, disabled: !selectedId, children: "Load Layout" })] })] }) }));
}
