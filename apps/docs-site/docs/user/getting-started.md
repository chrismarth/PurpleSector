# Getting Started

This guide walks you through installing Purple Sector and running it locally in development/demo mode.

## Prerequisites

- **Node.js** 18+
- **Docker** (for Kafka — optional if you only need the frontend with existing data)
- (Optional) **Assetto Corsa** or **Assetto Corsa Competizione** for live telemetry.
- (Optional) **OpenAI API key** for AI analysis and the AI agent.

## 1. Clone and Install

```bash
git clone https://github.com/chrismarth/PurpleSector.git
cd PurpleSector
npm install
```

## 2. Configure Environment

Create `.env.local` in the repo root:

```env
# OpenAI API Key for AI analysis and agent (optional but recommended)
OPENAI_API_KEY=your_openai_api_key_here

# Database — SQLite for local dev (default)
DATABASE_URL="file:./dev.db"
```

Then initialize the database schema:

```bash
npm run db:push
```

## 3. One-Command Dev Environment

Purple Sector provides a full Kafka-based dev environment that runs the entire telemetry pipeline with demo data.

Start everything with one command:

```bash
npm run dev:start
```

This will:

1. Start the Kafka cluster (Docker).
2. Create Kafka topics.
3. Start the Kafka–WebSocket bridge.
4. Start the database consumer.
5. Start the demo collector (publishes demo telemetry).
6. Start the Next.js frontend.

After ~30 seconds, open:

```text
http://localhost:3000
```

## 4. Log In

You will be presented with a login screen. In development mode, two stub accounts are available:

| Username | Role | Description |
|----------|------|-------------|
| `admin` | Org Admin | Full access to all features |
| `user` | User | Standard user access |

Enter either username and click **Log In** (no password required in dev mode).

<!-- Screenshot placeholder: ![Login screen](./img/login-screen.png)
**Capture this:** The login page showing the username field and Log In button. -->

## 5. First Look

After logging in you will see the **app shell**:

- **Toolbar** (left edge) — icon buttons for settings, agent, and other global actions.
- **Navigation Pane** — a collapsible tree of your events, sessions, and laps.
- **Content Pane** — tabbed workspace where session details, lap analysis, and vehicle views open.

<!-- Screenshot placeholder: ![App shell after login](./img/app-shell-first-look.png)
**Capture this:** The app shell immediately after first login — empty events tree with the "No events yet" state or a freshly created event. -->

If the demo collector is running, you should see events and sessions appearing in the navigation tree as telemetry streams in.

For a deeper walkthrough of the UI, see **Navigating the App**.

## Stopping the Environment

```bash
# Stop services, keep Kafka running
npm run dev:stop

# Stop services AND Kafka
npm run dev:stop-all
```

For a deeper walkthrough of the dev environment, see **Developer Guide → Development Environment**.
