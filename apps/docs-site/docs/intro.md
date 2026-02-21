# Purple Sector Documentation

Purple Sector is an AI-powered telemetry analysis platform for Assetto Corsa and Assetto Corsa Competizione. It helps sim-racing drivers improve lap times through real-time data visualization, configurable analysis panels, vehicle management, and intelligent AI coaching.

> For a quick local dev spin-up, see **User Guide → Getting Started**.

## Features

- **Real-time Telemetry** — Live streaming of throttle, brake, steering, speed, RPM, and more from AC / ACC.
- **Event & Session Management** — Organize practice sessions under events; browse them in a collapsible tree.
- **Lap Analysis Panels** — Configurable grid of telemetry plots with fullscreen, compare-lap overlay, and math channels.
- **Plot Layouts** — Save, load, and manage named plot layouts with a 12-column grid system.
- **Vehicle Management** — Track vehicles, configurations (parts lists), and setups (key/value parameters with CSV import/export).
- **AI Agent** — GPT-4-powered coaching chat that can query your data, analyze laps, create events/sessions, and propose run plans for approval.
- **Plugin Architecture** — Extensible system where features (telemetry views, vehicles, agent, nav tabs, toolbar items) are delivered as plugins.
- **Demo Mode** — Try the full pipeline with pre-recorded telemetry data (no game required).
- **Authentication** — Cookie-based auth gate with login page; stub users for development.

## High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Next.js App)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Toolbar   │  │  Nav Pane   │  │ Content  │  │  Agent    │ │
│  │ Pane      │  │ (Events /   │  │ Pane     │  │  Panel    │ │
│  │           │  │  Vehicles)  │  │ (Tabs)   │  │  (Chat)   │ │
│  └──────────┘  └────────────┘  └──────────┘  └───────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │  REST API + WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  Next.js Backend (API Routes)                │
│         Auth · Events · Sessions · Laps · Vehicles           │
│         Analysis Layouts · Plot Layouts · Agent Chat          │
│         Plugin API Route Dispatcher                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌─────────┐ ┌──────────────┐
   │  SQLite /   │ │  Kafka  │ │  OpenAI API  │
   │  PostgreSQL │ │ Cluster │ │  (GPT-4)     │
   └────────────┘ └────┬────┘ └──────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
  ┌───────────┐ ┌────────────┐ ┌────────────┐
  │ WS Bridge │ │ DB Consumer│ │ Collectors  │
  │ (Kafka →  │ │ (Kafka →   │ │ (AC / ACC / │
  │  Browser) │ │  Database) │ │  Demo)      │
  └───────────┘ └────────────┘ └────────────┘
```

<!-- Screenshot placeholder: ![Purple Sector app shell overview](./img/app-shell-overview.png)
**Capture this:** Full browser window showing the app shell after login — toolbar on the left, nav pane with the events tree, and the content pane with a session or lap analysis tab open. -->

## Where to Go Next

- **User Guide**
  - Installation, login, and first run.
  - Navigating the app shell (toolbar, nav pane, content tabs).
  - Events, sessions, and lap analysis.
  - Vehicle management and AI agent coaching.
- **Operations**
  - Kafka stack, services, and deployment patterns.
  - Monitoring and troubleshooting the pipeline.
- **Developer Guide**
  - Monorepo structure and shared packages.
  - App shell architecture and plugin system.
  - Analysis panel grid, telemetry data model, and database schema.
  - Collector integration and LangGraph analyzer.
- **Design Notes**
  - Migrations, fix notes, and historical decisions.
