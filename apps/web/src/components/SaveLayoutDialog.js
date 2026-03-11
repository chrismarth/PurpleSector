"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveLayoutDialog = SaveLayoutDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const button_1 = require("@/components/ui/button");
const dialog_1 = require("@/components/ui/dialog");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
function SaveLayoutDialog({ open, onOpenChange, onSave, }) {
    const [name, setName] = (0, react_1.useState)('');
    const [description, setDescription] = (0, react_1.useState)('');
    const [saving, setSaving] = (0, react_1.useState)(false);
    const handleSave = async () => {
        if (!name.trim())
            return;
        setSaving(true);
        try {
            await onSave(name.trim(), description.trim() || undefined);
            setName('');
            setDescription('');
            onOpenChange(false);
        }
        catch (error) {
            console.error('Error saving layout:', error);
        }
        finally {
            setSaving(false);
        }
    };
    return ((0, jsx_runtime_1.jsx)(dialog_1.Dialog, { open: open, onOpenChange: onOpenChange, children: (0, jsx_runtime_1.jsxs)(dialog_1.DialogContent, { className: "sm:max-w-[500px]", children: [(0, jsx_runtime_1.jsxs)(dialog_1.DialogHeader, { children: [(0, jsx_runtime_1.jsx)(dialog_1.DialogTitle, { children: "Save Plot Layout" }), (0, jsx_runtime_1.jsx)(dialog_1.DialogDescription, { children: "Save the current plot configuration and layout for future use." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-4 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "grid gap-2", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "name", children: "Layout Name *" }), (0, jsx_runtime_1.jsx)(input_1.Input, { id: "name", placeholder: "e.g., Race Analysis, Qualifying Setup", value: name, onChange: (e) => setName(e.target.value), onKeyDown: (e) => {
                                        if (e.key === 'Enter' && name.trim()) {
                                            handleSave();
                                        }
                                    } })] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid gap-2", children: [(0, jsx_runtime_1.jsx)(label_1.Label, { htmlFor: "description", children: "Description (optional)" }), (0, jsx_runtime_1.jsx)(textarea_1.Textarea, { id: "description", placeholder: "Add notes about this layout...", value: description, onChange: (e) => setDescription(e.target.value), rows: 3 })] })] }), (0, jsx_runtime_1.jsxs)(dialog_1.DialogFooter, { children: [(0, jsx_runtime_1.jsx)(button_1.Button, { variant: "outline", onClick: () => {
                                setName('');
                                setDescription('');
                                onOpenChange(false);
                            }, disabled: saving, children: "Cancel" }), (0, jsx_runtime_1.jsx)(button_1.Button, { onClick: handleSave, disabled: !name.trim() || saving, children: saving ? 'Saving...' : 'Save Layout' })] })] }) }));
}
