# Purple Sector Documentation

Purple Sector is an AI-powered telemetry analysis tool for Assetto Corsa and Assetto Corsa Competizione that helps drivers improve their lap times through real-time data visualization and intelligent coaching suggestions.

> For a quick local dev spin-up, see **User Guide → Getting Started**.

## Features

- 🏎️ **Real-time Telemetry**: Live streaming of throttle, brake, and steering inputs.
- 📊 **Lap Analysis**: Automatic lap detection and archival.
- 🤖 **AI Coaching**: GPT-4 powered suggestions for improving lap times.
- 💬 **Interactive Chat**: Ask specific questions about your driving technique.
- 📁 **Session Management**: Organize and review multiple practice sessions.
- 🎮 **Demo Mode**: Try the app with pre-recorded telemetry data (no game required).

## High-Level Architecture

```
[Assetto Corsa / ACC UDP Telemetry]
          ↓
[Telemetry Collector Service]
          ↓
[WebSocket Server] ←→ [Next.js Backend]
          ↓                    ↓
[React Frontend] ←→ [SQLite / DB]
          ↓
[OpenAI GPT-4 Analysis]
```

## Where to Go Next

- **User Guide**
  - Installation and setup.
  - Running the app in dev and demo modes.
  - Using sessions, lap analysis, and AI coaching.
- **Operations**
  - Kafka stack, services, and deployment patterns.
  - Monitoring and troubleshooting the pipeline.
- **Developer Guide**
  - Nx monorepo structure and shared packages.
  - Telemetry data model and database schema.
  - Development environment details.
- **Design Notes**
  - Migrations (e.g., Protobuf, uPlot).
  - Fix notes and historical decisions.
