# Lap Analysis

When you open a lap from the nav tree or a session's lap list, the **Lap Analysis** view opens in the content pane. This is where you visualize telemetry data, compare laps, and fine-tune your driving.

## Analysis Panel Grid

The lap analysis view uses a **configurable grid of panels**. Each panel is an independent telemetry chart that you can add, remove, resize, and rearrange.

<!-- Screenshot placeholder: ![Lap analysis panel grid](./img/lap-analysis-grid.png)
**Capture this:** A lap analysis tab showing 3-4 telemetry plot panels arranged in a grid — e.g., Throttle & Brake, Speed, Steering, RPM. -->

### Panel Toolbar

Each panel has a toolbar at the top with:

- **Title** — Shows the panel name (e.g., "Throttle & Brake") or a dynamic title set by the plugin.
- **Edit button** (pencil icon) — Opens the panel configuration to change channels, axes, and display options.
- **Fullscreen button** — Expands the panel to fill the entire analysis area. Click again to collapse back to the grid.
- **Layout actions** — Split horizontally, split vertically, or remove the panel.

<!-- Screenshot placeholder: ![Panel toolbar close-up](./img/panel-toolbar.png)
**Capture this:** Close-up of a single panel's toolbar showing the title on the left and the edit, fullscreen, and layout action buttons on the right. -->

### Adding and Removing Panels

- **Split Horizontal** — Splits the current panel into two side-by-side panels.
- **Split Vertical** — Splits the current panel into two stacked panels.
- **Remove** — Removes the panel from the grid.

New panels start with a default plot configuration that you can customize via the edit button.

### Resizing Panels

Panels use a 12-column grid system. Drag the edges between panels to resize them.

### Fullscreen Mode

Click the **fullscreen** button on any panel to expand it to fill the entire analysis area. The chart automatically resizes to use the available space. Click the button again (or press Escape) to return to the grid view.

<!-- Screenshot placeholder: ![Fullscreen panel](./img/panel-fullscreen.png)
**Capture this:** A single telemetry plot panel in fullscreen mode, filling the entire content area with a large, detailed chart. -->

## Configuring Plots

Click the **edit** (pencil) button on a panel to configure it:

- **Channels** — Select which telemetry channels to plot (throttle, brake, steering, speed, RPM, gear, etc.).
- **Axes** — Configure X-axis (time or normalized track position) and Y-axis scaling.
- **Colors** — Each channel gets a distinct color for easy identification.
- **Title** — Set a custom title for the panel.

<!-- Screenshot placeholder: ![Plot configuration editor](./img/plot-config-editor.png)
**Capture this:** The plot configuration panel/dialog showing channel selection checkboxes, axis options, and color pickers. -->

## Compare Laps

You can overlay a second lap's telemetry on top of the current lap for direct comparison:

1. In the lap analysis view, select a **comparison lap** from the dropdown or lap list.
2. The comparison lap's data appears as dashed or semi-transparent lines overlaid on the primary lap's plots.
3. This works across all panels in the grid simultaneously.

<!-- Screenshot placeholder: ![Lap comparison overlay](./img/lap-comparison.png)
**Capture this:** A telemetry plot showing two laps overlaid — the primary lap in solid lines and the comparison lap in dashed/lighter lines, with a legend identifying each. -->

## Math Channels

Math channels let you create derived telemetry channels from formulas applied to existing data. For example, you could create a "Brake Pressure Ratio" channel from existing brake and speed data.

Math channels are available in the channel selector when configuring a plot panel.

## Plot Layouts

You can save and load named **plot layouts** to quickly switch between different panel arrangements.

### Saving a Layout

1. Configure your panels the way you want them.
2. Click **Save Layout** in the analysis toolbar.
3. Enter a name and optional description.

### Loading a Layout

1. Click **Load Layout** in the analysis toolbar.
2. Select a saved layout from the list.
3. The grid reconfigures to match the saved layout.

### Managing Layouts

The **Manage Layouts** dialog lets you:

- Rename or edit descriptions of saved layouts.
- Set a layout as the **default** (star icon) for new lap analysis views.
- Delete layouts you no longer need.
- Batch-save all changes at once.

### Layout Status

The analysis toolbar shows the current layout status:

- **Layout: \<Name\>** — A saved layout is active.
- **Layout: \<Name\> (Modified)** — You've made changes since loading the layout.
- **No saved layout active** — Using the system default.

Use **Update Current Layout** to save changes back to the active layout.

<!-- Screenshot placeholder: ![Layout management dialog](./img/manage-layouts-dialog.png)
**Capture this:** The Manage Layouts dialog showing a list of saved layouts with star (default) toggles, inline name editing, and delete buttons. -->

## Synced Hover

When you hover over a point on one panel, all other panels in the grid highlight the same time/position. This makes it easy to correlate events across channels — for example, seeing exactly what the steering angle was at the moment of peak braking.

## AI Analysis

For AI-powered coaching suggestions on a lap, see **AI Agent**. The agent can analyze any lap and provide specific corner-by-corner feedback.
