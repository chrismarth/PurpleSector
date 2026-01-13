# Layout Status Tracking Feature

## Overview

This enhancement adds visual feedback for the current plot layout state, showing users which layout is active and whether they've made modifications. It also provides a quick way to update the loaded layout with changes.

## Key Features

### 1. **Active Layout Display**
The panel subtitle now shows the current layout status:

```
Telemetry Data
Layout: Race Analysis Setup
```

or when no layout is loaded:

```
Telemetry Data
No saved layout active
```

### 2. **Modification Indicator**
When you modify a loaded layout, an orange "(Modified)" indicator appears:

```
Telemetry Data
Layout: Race Analysis Setup (Modified)
```

This lets you know at a glance that your current configuration differs from the saved version.

### 3. **Update Current Layout**
A new menu option allows you to save changes back to the loaded layout:

- **Menu Item**: "Update Current Layout"
- **Icon**: RefreshCw (circular arrows)
- **State**: Disabled (grayed out) when no layout is active
- **Action**: Updates the saved layout with your current changes

## User Workflow

### Typical Usage Pattern

1. **Load a Layout**
   ```
   Click More (⋮) → Apply Saved Layout → Select "Race Analysis"
   Status: "Layout: Race Analysis"
   ```

2. **Make Changes**
   ```
   Add a plot, change channels, resize, etc.
   Status: "Layout: Race Analysis (Modified)"
   Menu: "Update Current Layout" is now enabled
   ```

3. **Update the Layout**
   ```
   Click More (⋮) → Update Current Layout
   Status: "Layout: Race Analysis" (Modified indicator removed)
   ```

### Alternative: Save As New

If you want to keep the original and create a new variant:

1. Make changes (shows "Modified")
2. Click More (⋮) → Save Layout As...
3. Give it a new name (e.g., "Race Analysis - Variant")
4. Status changes to: "Layout: Race Analysis - Variant"

## Technical Implementation

### State Management

**New State Variables:**
```typescript
const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null);
const [isLayoutModified, setIsLayoutModified] = useState(false);
```

**Tracking Refs:**
```typescript
const loadedLayoutConfigs = useRef<string | null>(null);
const loadedLayoutLayout = useRef<string | null>(null);
```

### Modification Detection

The component compares current state against loaded state:

```typescript
useEffect(() => {
  if (!currentLayoutId || !loadedLayoutConfigs.current || !loadedLayoutLayout.current) {
    setIsLayoutModified(false);
    return;
  }

  const currentConfigsStr = JSON.stringify(plotConfigs);
  const currentLayoutStr = JSON.stringify(layout);
  
  const hasChanged = 
    currentConfigsStr !== loadedLayoutConfigs.current ||
    currentLayoutStr !== loadedLayoutLayout.current;
  
  setIsLayoutModified(hasChanged);
}, [plotConfigs, layout, currentLayoutId]);
```

### Update Handler

```typescript
const handleUpdateCurrentLayout = useCallback(async () => {
  if (!currentLayoutId) return;

  try {
    const response = await fetch(`/api/plot-layouts/${currentLayoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plotConfigs,
        layout,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update layout');
    }

    // Update tracked state to reflect the save
    loadedLayoutConfigs.current = JSON.stringify(plotConfigs);
    loadedLayoutLayout.current = JSON.stringify(layout);
    setIsLayoutModified(false);
  } catch (error) {
    console.error('Error updating layout:', error);
    throw error;
  }
}, [currentLayoutId, plotConfigs, layout]);
```

## Visual Design

### Status Indicator Colors

- **Layout Name**: Default text color
- **Modified Indicator**: `text-orange-600 dark:text-orange-400`
- **No Layout Active**: `text-muted-foreground` (gray)

### Menu Item States

```
Update Current Layout
├── Enabled: Black text, clickable
└── Disabled: Gray text, not clickable
```

## Benefits

### For Users

1. **Awareness** - Always know which layout you're using
2. **Confidence** - See when you've made changes
3. **Efficiency** - Quick update without re-saving
4. **Clarity** - No confusion about layout state

### For Workflow

1. **Iterative Refinement** - Load, tweak, update, repeat
2. **Version Control** - Choose to update or save as new
3. **Experimentation** - Try changes knowing you can revert
4. **Organization** - Keep layouts up-to-date easily

## Edge Cases Handled

### 1. No Layout Loaded
- Shows "No saved layout active"
- "Update Current Layout" is disabled
- Modification detection is inactive

### 2. Layout Loaded, No Changes
- Shows layout name without "(Modified)"
- "Update Current Layout" is enabled but does nothing
- Clean state

### 3. Layout Loaded, Changes Made
- Shows layout name with "(Modified)"
- "Update Current Layout" is enabled and functional
- Clear call to action

### 4. After Updating
- "(Modified)" indicator disappears
- Tracked state updates to match current state
- Ready for next round of changes

## Integration with Existing Features

### Works With

- **Apply Saved Layout** - Sets active layout and tracking
- **Save Layout As...** - Creates new layout, updates tracking
- **Manage Layouts** - Can edit name while layout is active
- **Set Current as Default** - Works independently

### Comparison Lap Indicator

The layout status and comparison lap indicator coexist:

```
Layout: Race Analysis (Modified) • Comparison lap shown in dashed lines
```

## Future Enhancements

Potential additions:

1. **Auto-save** - Automatically update on changes (with toggle)
2. **Undo/Redo** - Revert to last saved state
3. **Change Summary** - Show what changed (e.g., "2 plots added")
4. **Conflict Detection** - Warn if layout was modified elsewhere
5. **Version History** - Keep previous versions of layouts

## Testing Checklist

- [ ] Load a layout - verify name appears
- [ ] Make changes - verify "(Modified)" appears
- [ ] Update layout - verify "(Modified)" disappears
- [ ] Menu disabled when no layout active
- [ ] Menu enabled when layout active
- [ ] Update actually saves changes
- [ ] Modification detection works for plot configs
- [ ] Modification detection works for layout structure
- [ ] Works with comparison lap indicator
- [ ] Works in fullscreen mode
- [ ] Works in different contexts (global, session, lap)

## Conclusion

The layout status tracking feature provides essential feedback about the current state of plot configurations. Combined with the "Update Current Layout" option, it creates a smooth workflow for iterative layout refinement while maintaining clarity about what's saved and what's changed.
