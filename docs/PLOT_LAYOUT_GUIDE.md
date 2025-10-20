# Plot Layout System - User Guide

## Overview

The Purple Sector telemetry analysis now includes a flexible drag-and-drop plot layout system that allows you to customize how your telemetry plots are arranged and sized.

## Features

### 1. **Resizable Plots**
- Hover over the border between plots in the same row
- Click and drag the resize handle (vertical grip icon) to adjust width
- Plots use a 12-column grid system for precise sizing

### 2. **Split Plots**
When hovering over any plot, you'll see two split buttons in the top-right corner:

- **Split Horizontally** (⬌): Splits the plot side-by-side, creating two plots in the same row
- **Split Vertically** (⬍): Adds a new plot below the current one in a new row

### 3. **Layout Persistence**
- All layout changes are automatically saved to the database
- Your custom layout persists across sessions
- Each lap can have its own unique layout
- Layouts can be inherited from session defaults

## How to Use

### Creating a Custom Layout

1. **Start with Default Layout**
   - New laps start with a default vertical stack of plots
   - Each plot takes full width (12 columns)

2. **Split a Plot Horizontally**
   - Hover over a plot
   - Click the horizontal split button (⬌)
   - The plot splits into two side-by-side plots
   - Each new plot gets half the width

3. **Split a Plot Vertically**
   - Hover over a plot
   - Click the vertical split button (⬍)
   - A new plot appears below in a new row
   - The new plot takes full width

4. **Resize Plots**
   - Hover between two plots in the same row
   - A resize handle appears (vertical grip icon)
   - Click and drag left/right to adjust widths
   - Widths snap to the 12-column grid

5. **Delete Plots**
   - Use the delete button on each plot's header
   - The layout automatically adjusts

### Example Layouts

#### Side-by-Side Comparison
```
┌─────────────────────┬─────────────────────┐
│   Throttle/Brake    │      Steering       │
│     (6 columns)     │     (6 columns)     │
└─────────────────────┴─────────────────────┘
┌───────────────────────────────────────────┐
│                  Speed                    │
│               (12 columns)                │
└───────────────────────────────────────────┘
```

#### Triple Column Layout
```
┌──────────┬──────────────┬──────────────────┐
│ Throttle │    Brake     │      Speed       │
│(3 cols)  │  (4 cols)    │    (5 cols)      │
└──────────┴──────────────┴──────────────────┘
```

#### Dashboard Style
```
┌─────────────────────┬─────────────────────┐
│   Throttle/Brake    │      Steering       │
└─────────────────────┴─────────────────────┘
┌─────────────────────┬─────────────────────┐
│       Speed         │      RPM/Gear       │
└─────────────────────┴─────────────────────┘
```

## Technical Details

### Layout Storage Format

Layouts are stored in the database as JSON with two parts:

```json
{
  "configs": [
    {
      "id": "plot_123",
      "title": "Throttle & Brake",
      "xAxis": "time",
      "channels": [...]
    }
  ],
  "layout": {
    "cols": 12,
    "items": [
      {
        "plotId": "plot_123",
        "x": 0,
        "y": 0,
        "w": 6,
        "h": 300
      }
    ]
  }
}
```

### Grid System

- **12 columns**: All plots are sized in units of 1-12 columns
- **Rows**: Determined by the `y` coordinate (0-indexed)
- **Position**: `x` coordinate determines horizontal position within row
- **Height**: Each plot can have custom height in pixels

### Backward Compatibility

The system automatically handles old format plot configs:
- Old format: Just an array of plot configs
- New format: Object with `configs` and `layout`
- Old configs are automatically converted to default layout

## Tips

1. **Start Simple**: Begin with the default layout and gradually customize
2. **Use Split Buttons**: Easier than manually creating and positioning plots
3. **Resize for Focus**: Make important plots larger by resizing
4. **Vertical Splits**: Great for comparing different metrics
5. **Horizontal Splits**: Perfect for side-by-side lap comparisons

## Synchronized Hover

All plots in your layout share synchronized hover:
- Hover over any plot
- All plots show data at the same time/position
- Vertical reference line appears across all plots
- Legend values update in real-time

This makes it easy to correlate data across multiple plots!
