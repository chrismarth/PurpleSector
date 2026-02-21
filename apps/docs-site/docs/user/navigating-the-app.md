# Navigating the App

Purple Sector uses a tab-based **app shell** layout inspired by desktop IDEs. This page explains each region of the interface and how to navigate between views.

## App Shell Layout

The app shell is divided into four main regions:

```text
┌────┬──────────────┬──────────────────────────────────┐
│    │              │                                  │
│ T  │   Nav Pane   │         Content Pane             │
│ o  │              │         (tabbed workspace)       │
│ o  │  Events /    │                                  │
│ l  │  Vehicles    │  ┌─────┬─────┬─────┐            │
│ b  │  tree        │  │Tab 1│Tab 2│Tab 3│            │
│ a  │              │  └─────┴─────┴─────┘            │
│ r  │              │  [active tab content]            │
│    │              │                                  │
├────┴──────────────┴──────────────────────────────────┤
│                    Status Bar                        │
└──────────────────────────────────────────────────────┘
```

<!-- Screenshot placeholder: ![App shell layout regions](./img/app-shell-regions.png)
**Capture this:** The full app shell with annotations or colored overlays highlighting the four regions: toolbar, nav pane, content pane, and status bar. -->

## Toolbar Pane

The **toolbar** is the narrow icon strip along the left edge of the window. It provides quick access to global features:

- **Settings** — Opens the settings panel (theme, user profile, plugin settings).
- **AI Agent** — Opens the AI coaching chat panel as a slide-over drawer.
- Other plugin-provided toolbar items appear here as well.

<!-- Screenshot placeholder: ![Toolbar pane](./img/toolbar-pane.png)
**Capture this:** Close-up of the toolbar pane showing the icon buttons (settings gear, agent icon, etc.). -->

## Navigation Pane

The **nav pane** sits to the right of the toolbar and displays a tree of your data. It has tabs along the top to switch between different trees:

- **Events** — Collapsible tree of Events → Sessions → Laps. Click any item to open it in the content pane.
- **Vehicles** — Tree of Vehicles with their configurations and setups.

You can:

- **Expand / collapse** nodes by clicking the chevron.
- **Open an item** by clicking its name — this opens a new tab in the content pane (or focuses an existing tab for that item).
- **Resize** the nav pane by dragging its right edge.
- **Create new items** using the "+" buttons at the top of each tree (New Event, New Vehicle, etc.).

<!-- Screenshot placeholder: ![Navigation pane with events tree](./img/nav-pane-events.png)
**Capture this:** The nav pane showing the Events tab selected, with a few events expanded to show sessions and laps underneath. -->

<!-- Screenshot placeholder: ![Navigation pane with vehicles tree](./img/nav-pane-vehicles.png)
**Capture this:** The nav pane showing the Vehicles tab selected, with a vehicle expanded to show configurations and setups. -->

## Content Pane

The **content pane** is the main workspace. It uses a tabbed interface — each item you open from the nav tree gets its own tab. Tabs are:

- **Closable** — Click the × on a tab to close it.
- **Reorderable** — Tabs can be rearranged.
- **Persistent** — Opening the same item again focuses its existing tab rather than creating a duplicate.

### Content Tab Types

Depending on what you click in the nav tree, different views open:

| Nav Item | Content View |
|----------|-------------|
| Event | Event detail — name, description, dates, session list |
| Session | Session detail — metadata, live telemetry (if active), lap list |
| Lap | Lap analysis — configurable grid of telemetry plots |
| Vehicle | Vehicle detail — name, description, configurations and setups |
| Configuration | Configuration detail — parts list (key/value) |
| Setup | Setup detail — parameters (key/value/units) with CSV import/export |

<!-- Screenshot placeholder: ![Content pane with multiple tabs](./img/content-pane-tabs.png)
**Capture this:** The content pane showing 3-4 open tabs (e.g., an event tab, a session tab, and a lap analysis tab), with one active. -->

## Status Bar

The **status bar** runs along the bottom of the window and shows contextual information such as connection status and the currently logged-in user.

## Keyboard & Mouse Tips

- **Middle-click** a nav tree item to open it in a new background tab.
- **Scroll** the tab bar when many tabs are open.
- Use the nav pane's **tab bar** (Events / Vehicles) to switch between data trees quickly.
