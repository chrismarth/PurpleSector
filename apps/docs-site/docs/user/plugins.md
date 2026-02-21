---
id: plugins
title: Using Plugins
sidebar_label: Plugins
---

Purple Sector uses a **plugin architecture** to deliver most of its features. This page explains what plugins are, which ones ship with the app, and how they extend the interface.

## What Is a Plugin?

A plugin is a self-contained module that extends Purple Sector without modifying the core application. Plugins can provide:

- **Analysis panel types** — Telemetry chart panels for the lap analysis grid.
- **Navigation tabs** — Additional trees in the nav pane (e.g., Vehicles).
- **Content tab types** — New views that open in the content pane (e.g., Vehicle Detail, Configuration Detail).
- **Toolbar items** — Icon buttons in the toolbar pane.
- **Global panels** — Slide-over or drawer panels (e.g., the AI Agent chat).
- **Settings tabs** — Additional tabs in the settings dialog.
- **Agent tools** — Capabilities the AI agent can use (e.g., create events, analyze laps).
- **API routes** — Server-side endpoints for plugin-specific data.

## Built-In Plugins

Purple Sector ships with three built-in plugins:

### Core Lap Telemetry (`plugin-core-lap-telemetry`)

The default telemetry visualization plugin. It provides:

- The **plot** analysis panel type used in the lap analysis grid.
- Configurable telemetry charts with channel selection, axis options, and compare-lap overlay.
- Math channel support.

### Vehicles (`plugin-vehicles`)

Provides the vehicle management feature:

- **Vehicles** nav tab and tree in the nav pane.
- Content tab types for Vehicle Detail, Configuration Detail, and Setup Detail views.
- Create/edit/delete dialogs for vehicles, configurations, and setups.

### AI Agent (`plugin-agent`)

Provides the AI coaching agent (premium tier):

- **Agent** toolbar button and slide-over chat panel.
- **Agent Settings** tab in the settings dialog.
- ~28 agent tools across events, sessions, laps, vehicles, analysis layouts, and more.
- Server-side API routes for chat, conversations, and run plan management.
- Database models for conversations, messages, and run plans.

## How Plugins Are Loaded

Plugins are registered at app startup. The current setup:

1. All plugin modules are listed in `apps/web/src/plugins/index.ts`.
2. The **plugin registry** (`@purplesector/plugin-registry`) loads each plugin's client-side registrations.
3. Enabled plugins are controlled by `plugins.config.ts` in the registry package — this lists plugin manifest IDs.
4. Server-side registrations (API routes, agent tool handlers) are loaded separately via `apps/web/src/lib/plugin-server.ts`.

There is **no install/enable UI yet**. Plugins are enabled by being listed in the configuration file and imported into the web app.

## Plugin Tiers

Plugins can declare a **tier** (`free` or `premium`). The AI Agent plugin is marked as `premium`. To build a free-tier version of the app, remove the agent plugin's manifest ID from `plugins.config.ts`.

## For Developers

If you want to create a custom plugin, see **Developer Guide → Plugin Architecture** for the full API reference and step-by-step guide.
