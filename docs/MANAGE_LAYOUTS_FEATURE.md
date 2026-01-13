# Manage Layouts Feature

## Overview

The "Manage Layouts" feature provides a comprehensive dialog for managing all saved plot layouts in one place. This enhancement complements the existing save/load functionality with batch editing capabilities.

## Key Features

### 1. **Inline Editing**
- Edit layout names and descriptions directly in the dialog
- Changes are staged until you click "Save Changes"
- Visual feedback shows which layouts have pending edits

### 2. **Default Management**
- Toggle default status with a single click
- Visual indicator (filled star) shows the current default
- Only one layout can be default per context

### 3. **Batch Operations**
- All changes are batched and applied together
- Edit multiple layouts before saving
- Cancel discards all pending changes

### 4. **Safe Deletion**
- Mark layouts for deletion with visual confirmation
- Undo deletion before saving
- Prevents accidental data loss

### 5. **Visual Indicators**
- **Default Badge** - Yellow star badge shows the default layout
- **Modified Badge** - Outline badge shows layouts with pending edits
- **Deletion State** - Red background with strikethrough for marked deletions
- **Timestamps** - Shows when each layout was created

## User Interface

### Dialog Layout
```
┌─────────────────────────────────────────────────┐
│ Manage Plot Layouts                        [X]  │
│ Edit, delete, or set default layouts...         │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ [Scrollable List of Layouts]                │ │
│ │                                             │ │
│ │ ┌─────────────────────────────────────────┐ │ │
│ │ │ Layout Name          [Default] [Edit]   │ │ │
│ │ │ Description text...                     │ │ │
│ │ │ Created 2 days ago                      │ │ │
│ │ │                    [★] [✏] [🗑]         │ │ │
│ │ └─────────────────────────────────────────┘ │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                          [Cancel] [Save Changes]│
└─────────────────────────────────────────────────┘
```

### Action Buttons

Each layout card has three action buttons:

1. **Star Icon (★/☆)** - Toggle default status
   - Filled star = This is the default
   - Empty star = Click to make default

2. **Pencil Icon (✏)** - Edit layout
   - Opens inline edit mode
   - Shows input fields for name and description
   - Checkmark to confirm, X to cancel

3. **Trash Icon (🗑)** - Delete layout
   - Marks for deletion with confirmation
   - Shows "Undo Delete" button
   - Actually deleted when "Save Changes" is clicked

## Workflow Examples

### Example 1: Renaming a Layout
1. Open "Manage Layouts" dialog
2. Click the pencil icon on the layout you want to rename
3. Edit the name and/or description
4. Click the checkmark to confirm
5. Layout shows "Modified" badge
6. Click "Save Changes" to apply
7. Dialog closes and changes are persisted

### Example 2: Changing the Default
1. Open "Manage Layouts" dialog
2. Find the layout you want as default
3. Click the star icon
4. Star fills in and "Default" badge appears
5. Previous default loses its badge
6. Click "Save Changes" to apply
7. New default is now used for future views

### Example 3: Batch Editing Multiple Layouts
1. Open "Manage Layouts" dialog
2. Edit Layout A's name
3. Edit Layout B's description
4. Mark Layout C for deletion
5. Set Layout D as default
6. All changes show visual indicators
7. Click "Save Changes" to apply all at once
8. Or click "Cancel" to discard everything

### Example 4: Undoing a Deletion
1. Mark a layout for deletion (trash icon)
2. Layout shows red background with strikethrough
3. Realize you made a mistake
4. Click "Undo Delete" button
5. Layout returns to normal state
6. Click "Save Changes" (deletion won't happen)

## Technical Implementation

### Component: ManageLayoutsDialog

**Location:** `src/components/ManageLayoutsDialog.tsx`

**State Management:**
- `layouts` - Current layouts from database
- `editingId` - ID of layout currently being edited
- `editData` - Temporary data for inline editing
- `pendingChanges` - Map of layout IDs to pending edits
- `pendingDefaultId` - ID of layout that will be default
- `pendingDeletes` - Set of layout IDs marked for deletion

**Key Functions:**
- `startEdit()` - Enter edit mode for a layout
- `saveEdit()` - Stage edits to pending changes
- `toggleDefault()` - Change which layout is default
- `markForDelete()` - Add layout to deletion queue
- `undoDelete()` - Remove layout from deletion queue
- `handleSaveAll()` - Apply all pending changes to database

### API Integration

The dialog uses these API endpoints:
- `PATCH /api/plot-layouts/[id]` - Update layout name/description
- `DELETE /api/plot-layouts/[id]` - Delete a layout
- `POST /api/plot-layouts/default` - Set default layout

### Change Batching

All changes are batched and applied in this order:
1. **Deletions** - Remove marked layouts
2. **Edits** - Update names and descriptions
3. **Default** - Set new default layout

This ensures consistency and prevents race conditions.

## Benefits

### For Users
- **Efficiency** - Manage multiple layouts without multiple dialogs
- **Safety** - Preview changes before committing
- **Clarity** - Visual indicators show exactly what will change
- **Flexibility** - Undo mistakes before saving

### For Developers
- **Maintainability** - Single component for all management operations
- **Consistency** - Unified UX for layout management
- **Extensibility** - Easy to add new management features

## Integration

The Manage Layouts option is available in the Telemetry Data panel's "more" menu (⋮):

```
More Menu (⋮)
├── Apply Saved Layout
├── Set Current as Default
├── Save Layout As...
├── ─────────────────────── (separator)
└── Manage Layouts          ← New option
```

## Future Enhancements

Potential additions to the Manage Layouts dialog:

1. **Duplicate Layout** - Clone an existing layout
2. **Export/Import** - Share layouts between users
3. **Preview** - Show thumbnail of layout configuration
4. **Search/Filter** - Find layouts by name or description
5. **Bulk Actions** - Select multiple layouts for batch operations
6. **Layout History** - View and restore previous versions
7. **Tags** - Categorize layouts for better organization

## Testing Checklist

- [ ] Open Manage Layouts dialog
- [ ] Edit a layout name and save
- [ ] Edit a layout description and save
- [ ] Change default layout
- [ ] Mark layout for deletion and save
- [ ] Mark layout for deletion and undo
- [ ] Edit multiple layouts and save all
- [ ] Cancel with pending changes (should discard)
- [ ] Verify visual indicators (badges, colors)
- [ ] Test with no layouts (empty state)
- [ ] Test with many layouts (scrolling)
- [ ] Verify timestamps display correctly
- [ ] Test in different contexts (global, session, lap)

## Conclusion

The Manage Layouts feature provides a powerful, user-friendly interface for layout management. Its batch operation model and visual feedback system make it easy to organize and maintain plot layouts efficiently.
