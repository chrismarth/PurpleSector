---
id: plugins
title: Using Plugins
sidebar_label: Plugins
---

Purple Sector is being refactored to support a **plugin-based architecture**. This page explains what that means for you as a user and how plugins are discovered and enabled today.

> **Note**
> The first pluginized feature is the **Lap Analysis Telemetry Plots**. More plugin types (vehicles, live views, reports) will come later.

---

## What is a plugin?

A plugin is a piece of code that extends Purple Sector without modifying the core application.

Examples of what plugins can provide:

- **Lap analysis views** – alternate telemetry visualizations.
- **Vehicle definitions** – custom vehicle configuration UI and telemetry mapping.
- **Live session views** – additional widgets on the live dashboard (video, chat, overlays, etc.).
- **Analyzers & reports** – extra summaries or coaching insights.

Right now, only **lap analysis views** are wired through the plugin system.

---

## How lap-analysis plugins behave today

When you open a **Lap Analysis** page:

1. The app loads registered plugins.
2. Each plugin can register one or more **lap analysis views**.
3. The app picks the first view for the `singleLap` context and asks it to render the telemetry plots.

From a user perspective:

- The plots still live in the left-hand column of the Lap page.
- Layout saving, comparison lap overlays, and other controls work as before.
- The difference is **how** they are provided (via a plugin), not **what** you see.

---

## Where plugins live right now

In the current monorepo setup, plugins are:

- Implemented as **workspace packages** under `packages/`.
- For example, the built-in lap telemetry views live in `packages/plugin-core-lap-telemetry` and are published (locally) as `@purplesector/plugin-core-lap-telemetry`.
- Registered via a small internal registry in `apps/web/src/plugins/index.ts`, which imports the core plugin from `@purplesector/plugin-core-lap-telemetry`.

There is **no separate install/enable UI yet**. Plugins are effectively enabled by:

- Adding them to the codebase as workspace packages, and
- Importing them into the web app's plugin registry.

This is intentional for early development: it keeps the system simple while the plugin contracts stabilize.

---

## How plugins will be registered in the future

The long-term goal is to make plugins more self-contained and discoverable. The plan includes:

- **Workspace plugins** – packages under `packages/` (e.g. `@purplesector/core-lap-views`) that export a plugin module.
- **Automatic discovery** – scanning workspace packages or a configuration file for modules that declare themselves as Purple Sector plugins.
- **Optional user-level configuration** – a UI or config file where you can:
  - Enable/disable specific plugins.
  - Choose which lap analysis view is the default.
  - Configure plugin-specific settings (e.g. preferred units or visual style).

Those features are not wired yet, but the current design of the plugin API and registry is built with this in mind.

---

## What you can do today

As of now, if you want to:

- **Use plugins that ship with Purple Sector**: nothing special to do — they are included and enabled by default when you run the app.
- **Experiment with custom plugins** (for development):
  - You or your team can implement new views inside the monorepo.
  - A developer can wire them into `apps/web/src/plugins/index.ts`.
  - Once registered, they will run as part of the normal Lap Analysis UI.

When a more user-facing plugin management story (install/enable/disable) is added, this page will be updated with concrete steps and screenshots.
