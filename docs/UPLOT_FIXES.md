# uPlot Issues Fixed

## Issues Addressed

### 1. ✅ Dark Mode Axis Colors
**Problem**: Axes remained dark in dark mode, making them invisible.

**Solution**:
- Added dark mode detection using `MutationObserver` to watch for class changes on `<html>` element
- Dynamically set axis colors based on theme:
  - Light mode: `#374151` (gray-700)
  - Dark mode: `#e5e7eb` (gray-200)
- Grid lines also adapt:
  - Light mode: `rgba(0, 0, 0, 0.1)`
  - Dark mode: `rgba(255, 255, 255, 0.1)`
- Chart automatically recreates when theme changes

**Files Modified**:
- `packages/web-charts/src/UPlotChart.tsx`

### 2. ✅ Legend Visibility
**Problem**: Legends only showed values when hovering, making it unclear which channels were plotted.

**Solution**:
- Changed legend to always show channel names with color indicators
- Values appear next to channel names only when hovering
- Legend now serves dual purpose:
  - Static: Shows all configured channels
  - Dynamic: Shows live values on hover

**Before**:
```
[Only shows when hovering]
Speed: 120 km/h
```

**After**:
```
[Always visible]
Speed [Shows value on hover: 120 km/h]
Throttle [Shows value on hover: 75%]
```

**Files Modified**:
- `packages/web-charts/src/ConfigurableTelemetryChart.tsx`

### 3. ✅ Zoom Functionality
**Problem**: Zoom via drag selection wasn't working properly.

**Solution**:
- Added minimum selection width check (5px) to prevent accidental zooms
- Implemented data filtering based on zoom domain
- Added `setTimeout` to properly clear selection after zoom
- Zoom domain now filters the data before passing to uPlot
- "Reset Zoom" button appears when zoomed

**How it works**:
1. User drags to select region on chart
2. `onZoom` callback receives min/max x-axis values
3. `zoomDomain` state is updated
4. Data is filtered to zoom range in `useMemo`
5. Filtered data is passed to uPlot
6. Click "Reset Zoom" button to restore full view

**Files Modified**:
- `packages/web-charts/src/UPlotChart.tsx`
- `packages/web-charts/src/ConfigurableTelemetryChart.tsx`

### 4. ✅ Timestamp Display
**Problem**: X-axis showed datetime timestamps instead of numeric values.

**Solution**:
- Added custom `values` formatter to X-axis configuration
- Formats values as fixed-point numbers: `v.toFixed(1)`
- Now displays clean numeric values (e.g., "10.5", "20.0") instead of dates

**Files Modified**:
- `src/components/UPlotChart.tsx`

## Additional Improvements

### Dark Mode Border
- Updated legend border color to adapt to theme:
  - Light: `border-gray-300`
  - Dark: `border-gray-600`

**Files Modified**:
- `src/components/ConfigurableTelemetryChart.tsx`

## Technical Details

### Dark Mode Detection
```typescript
const [darkMode, setDarkMode] = useState(false);

useEffect(() => {
  const checkDarkMode = () => {
    setDarkMode(document.documentElement.classList.contains('dark'));
  };
  
  checkDarkMode();
  
  const observer = new MutationObserver(checkDarkMode);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  
  return () => observer.disconnect();
}, []);
```

### Zoom Implementation
```typescript
// In UPlotChart - detect selection
setSelect: [
  (u) => {
    const select = u.select;
    if (select && select.width > 5 && onZoom) {
      const min = u.posToVal(select.left, 'x');
      const max = u.posToVal(select.left + select.width, 'x');
      onZoom(min, max);
      setTimeout(() => {
        u.setSelect({ left: 0, top: 0, width: 0, height: 0 });
      }, 0);
    }
  },
]

// In ConfigurableTelemetryChart - filter data
if (zoomDomain?.x) {
  const [minX, maxX] = zoomDomain.x;
  filteredData = data.filter((frame) => {
    const xVal = getChannelValue(frame, config.xAxis);
    return xVal >= minX && xVal <= maxX;
  });
}
```

### Axis Formatting
```typescript
{
  scale: 'x',
  space: 50,
  grid: { show: true, stroke: gridColor },
  stroke: textColor,
  ticks: { stroke: textColor },
  values: (u, vals) => vals.map(v => v.toFixed(1)), // ← Numeric format
}
```

## Testing Checklist

- [x] TypeScript compilation successful
- [ ] Dark mode toggle - axes change color
- [ ] Legend shows all channels without hover
- [ ] Legend shows values on hover
- [ ] Drag to zoom on chart works
- [ ] Reset zoom button appears and works
- [ ] X-axis shows numbers, not timestamps
- [ ] Multiple charts sync hover correctly
- [ ] Comparison data displays correctly

## Files Changed

1. `packages/web-charts/src/UPlotChart.tsx`
   - Added dark mode detection
   - Fixed axis colors for dark mode
   - Fixed timestamp display
   - Improved zoom selection handling

2. `packages/web-charts/src/ConfigurableTelemetryChart.tsx`
   - Updated legend to always show channels
   - Implemented zoom domain filtering
   - Fixed dark mode border colors
