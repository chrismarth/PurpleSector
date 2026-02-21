# App Shell Architecture

The Purple Sector app shell is a tab-based IDE-style layout built with React. This page covers the component hierarchy, state management, and how plugins extend the shell.

## Component Hierarchy

```text
RootLayout (server component)
  └─ AuthProvider (client context — auth state + loading gate)
       └─ AppShellRoot (client — auth gate, redirect logic)
            └─ AppShell (main layout)
                 ├─ TitleBar
                 ├─ ToolbarPane (left icon strip)
                 ├─ NavPane (collapsible tree sidebar)
                 │    ├─ NavTabBar (Events / Vehicles tabs)
                 │    └─ [plugin-provided tree] (EventsTree, VehiclesTree, etc.)
                 ├─ ContentPane (tabbed workspace)
                 │    ├─ Tab bar
                 │    └─ TabContentRouter → [plugin-provided content view]
                 ├─ AgentSlidePanel (slide-over drawer, when open)
                 └─ StatusBar
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/layout.tsx` | Root layout — wraps everything in `AuthProvider` + `AppShellRoot` |
| `components/AuthProvider.tsx` | Auth context — fetches `/api/auth/me`, provides `user`, `loading`, `refresh`, `logout` |
| `components/app-shell/AppShellRoot.tsx` | Auth gate — shows spinner while loading, redirects to `/login` if unauthenticated |
| `components/app-shell/AppShell.tsx` | Main layout — assembles toolbar, nav, content, and status bar |
| `components/app-shell/AppShellContext.tsx` | Shared state — open tabs, active tab, `openTab()`, `closeTab()` |
| `components/app-shell/ToolbarPane.tsx` | Left icon strip — renders plugin toolbar items |
| `components/app-shell/NavPane.tsx` | Navigation sidebar — renders plugin nav tabs and their trees |
| `components/app-shell/NavTabBar.tsx` | Tab bar at top of nav pane (Events / Vehicles) |
| `components/app-shell/NavContext.tsx` | Events tree data provider — fetches `/api/events` |
| `components/app-shell/EventsTree.tsx` | Collapsible event → session → lap tree |
| `components/app-shell/ContentPane.tsx` | Tabbed workspace — tab bar + active content |
| `components/app-shell/TabContentRouter.tsx` | Routes active tab to the correct plugin content renderer |
| `components/app-shell/StatusBar.tsx` | Bottom status strip |
| `components/app-shell/TitleBar.tsx` | Top title bar |
| `components/app-shell/AgentSlidePanel.tsx` | Agent chat slide-over drawer |

## State Management

### AppShellContext

The central state for the app shell is managed by `AppShellContext`:

```ts
interface AppShellState {
  tabs: TabDescriptor[];       // All open tabs
  activeTabId: string | null;  // Currently focused tab
}
```

Key actions:

- **`openTab(tab)`** — Opens a new tab or focuses an existing one with the same `id`.
- **`closeTab(tabId)`** — Closes a tab and focuses the nearest remaining tab.

### TabDescriptor

Every tab is described by a `TabDescriptor` (defined in `@purplesector/plugin-api`):

```ts
interface TabDescriptor {
  id: string;                          // Unique tab identifier
  type: string;                        // Content type (e.g., 'event', 'session', 'lap', 'vehicle')
  label: string;                       // Display label
  breadcrumbs: string[];               // Breadcrumb trail
  entityId?: string;                   // Primary entity ID
  parentIds?: Record<string, string>;  // Parent entity IDs (e.g., { vehicleId: '...' })
  closable?: boolean;                  // Whether the tab can be closed
}
```

### NavContext

The events tree data is managed by `NavContext` (separate from `AppShellContext`):

- Fetches `/api/events?include=sessions.laps` on mount.
- Provides `events`, `loading`, `expandedNodes`, `selectedNodeId`, `refresh()`.
- Listens for `agent:data-mutated` events to auto-refresh when the AI agent modifies data.

## How Plugins Extend the Shell

Plugins register UI extensions during `loadClientPlugins()`:

### Navigation Tabs

```ts
ctx.registerNavTab({
  id: 'vehicles',
  label: 'Vehicles',
  icon: CarIcon,
  order: 20,
  renderTree: (navCtx) => <VehiclesTree openTab={navCtx.openTab} />,
});
```

The `NavPane` calls `getNavTabs()` from the registry and renders a tab bar. Each tab's `renderTree()` receives a `NavTreeContext` with `openTab()` and `refreshNav()`.

### Content Tabs

```ts
ctx.registerContentTab({
  type: 'vehicle-detail',
  render: ({ entityId }) => <VehicleDetailView entityId={entityId} />,
});
```

The `TabContentRouter` calls `getContentTabByType(tab.type)` and renders the matching plugin's component, passing `entityId` and `parentIds`.

### Toolbar Items

```ts
ctx.registerToolbarItem({
  id: 'agent',
  icon: BotIcon,
  label: 'AI Agent',
  position: 'bottom',
  order: 10,
  onClick: (ctx) => { /* toggle agent panel */ },
});
```

The `ToolbarPane` calls `getToolbarItems()` and renders icon buttons.

### Global Panels

```ts
ctx.registerGlobalPanel({
  id: 'agent-panel',
  position: 'sidebar-right',
  icon: BotIcon,
  label: 'AI Agent',
  render: () => <AgentPanel />,
});
```

Global panels render as slide-over drawers or sidebars.

## Authentication Flow

1. `AuthProvider` mounts and fetches `/api/auth/me` with a 5-second timeout and up to 3 retries.
2. While loading, `AppShellRoot` shows a centered spinner.
3. On success, `user` is set and the app shell renders.
4. On failure (or no cookie), `user` is `null` and `AppShellRoot` redirects to `/login`.
5. The middleware (`apps/web/middleware.ts`) also checks the `ps_user` cookie on every non-public request as a server-side guard.

## Adding a New Content Tab Type

To add a new type of content view:

1. Create your React component (e.g., `MyFeatureView`).
2. In your plugin's `register()` function, call `ctx.registerContentTab({ type: 'my-feature', render: ... })`.
3. When opening the tab from a nav tree, call `openTab({ id: 'my-feature-123', type: 'my-feature', label: '...', ... })`.
4. The `TabContentRouter` will automatically route to your component.
