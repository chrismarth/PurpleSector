# Purple Sector - Architecture Documentation

## System Overview

Purple Sector is a full-stack motorsport telemetry analysis platform. It combines a React/Vite frontend served by a Django backend (Inertia.js) with a real-time stream processing pipeline and an AI-powered coaching agent.

## Technology Stack

### Frontend
- **React 18** + **Vite** — SPA served via Inertia.js (no SSR)
- **TypeScript** — type safety throughout
- **TailwindCSS** + **shadcn/ui** — styling and components
- **Custom web-charts** — telemetry plot panels (canvas-based)
- **Lucide React** — icons

### Backend
- **Django 5** + **Inertia-Django** — serves React SPA and REST API
- **uvicorn** — ASGI server
- **Django ORM** + **psycopg2** — database access (Postgres)
- **LangChain + LangGraph** — AI agent runtime (optional `[ai]` extras)
- **OpenAI GPT-4** — language model for agent + lap analysis

### Telemetry Pipeline
- **Rust (ps-grpc-gateway)** — gRPC ingress, forwards to Redpanda
- **Redpanda** — Kafka-compatible message buffer
- **RisingWave** — stream processing, materialized views, Redis sinks
- **Redis** — live telemetry state (pub/sub)
- **WebSocket server (Node.js)** — Redis → WebSocket → browser
- **MinIO** — S3-compatible storage for Iceberg tables
- **Trino** — semantic query layer over Iceberg + Redis
- **LakeKeeper** — REST catalog for Iceberg

### Database
- **PostgreSQL 16** — single database for all app data
- **Prisma** — ORM for Next.js-era migrations (transitional)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React 18 + Vite SPA                          │   │
│  │  • Session / Event / Vehicle Management UI                │   │
│  │  • Real-time Telemetry Charts (canvas)                    │   │
│  │  • Lap Analysis Dashboard                                 │   │
│  │  • AI Agent Chat Panel (LangGraph)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │  Inertia.js + REST (HTTP)
                         │  WebSocket (ws://localhost:8080)
┌────────────────────────┴────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        Django 5 + uvicorn  (:8000)                        │   │
│  │  • /api/events, /api/sessions, /api/laps                  │   │
│  │  • /api/vehicles                                          │   │
│  │  • /api/analysis-layouts                                  │   │
│  │  • /api/agent/chat  (LangGraph AI agent)                  │   │
│  │  • /api/agent/conversations                               │   │
│  │  • Inertia page routes (SPA shell)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │  Django ORM (psycopg2)
┌────────────────────────┴────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  PostgreSQL 16  (:5432)                   │   │
│  │  • events, sessions, laps, vehicles                       │   │
│  │  • agent_conversations, agent_messages                    │   │
│  │  • saved_analysis_layouts, run_plans                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TELEMETRY PIPELINE                            │
│                                                                  │
│  ┌──────────────┐  gRPC  ┌──────────────┐  Kafka  ┌─────────┐  │
│  │  AC / ACC    │ ─────> │  ps-grpc-    │ ──────> │Redpanda │  │
│  │  (Game)      │ :50051 │  gateway     │  :9092  │         │  │
│  └──────────────┘        └──────────────┘         └────┬────┘  │
│                                                         │        │
│                                                    ┌────┴─────┐  │
│                                                    │RisingWave│  │
│                                                    │:4566     │  │
│                                                    └────┬─────┘  │
│                                              Redis sink │        │
│                                                    ┌────┴─────┐  │
│                                                    │  Redis   │  │
│                                                    │  :6379   │  │
│                                                    └────┬─────┘  │
│                                               Pub/Sub  │        │
│                                                    ┌────┴─────┐  │
│                                                    │  WS Srv  │  │
│                                                    │  :8080   │  │
│                                                    └────┬─────┘  │
│                                                         │ WS     │
└─────────────────────────────────────────────────────────────────┘
│                                                          v       │
│                                                    ┌──────────┐  │
│                                                    │ Frontend │  │
│                                                    │ Clients  │  │
│                                                    └──────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    OpenAI API                             │   │
│  │  • GPT-4 Turbo - Lap analysis                            │   │
│  │  • Structured outputs - JSON suggestions                 │   │
│  │  • Chat completions - Conversational coaching            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### Session
```typescript
{
  id: string              // Unique identifier
  name: string            // User-defined name
  source: string          // "live" | "demo"
  status: string          // "active" | "paused" | "archived"
  createdAt: DateTime
  updatedAt: DateTime
  laps: Lap[]            // Related laps
}
```

### Lap
```typescript
{
  id: string              // Unique identifier
  sessionId: string       // Foreign key to Session
  lapNumber: number       // Lap number in session
  lapTime: number         // Lap time in seconds
  telemetryData: string   // JSON array of TelemetryFrame
  analyzed: boolean       // Has AI analysis been run?
  suggestions: string     // JSON array of LapSuggestion
  createdAt: DateTime
  chatMessages: ChatMessage[]
}
```

### TelemetryFrame
```typescript
{
  timestamp: number       // Unix timestamp
  throttle: number        // 0.0 - 1.0
  brake: number          // 0.0 - 1.0
  steering: number       // -1.0 to 1.0
  speed: number          // km/h
  gear: number
  rpm: number
  lapTime: number        // Milliseconds since lap start
  lapNumber: number
  normalizedPosition: number  // 0.0 - 1.0 (track position)
}
```

### ChatMessage
```typescript
{
  id: string
  lapId: string          // Foreign key to Lap
  role: string           // "user" | "assistant"
  content: string
  createdAt: DateTime
}
```

## API Endpoints

### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create new session |
| GET | `/api/sessions/[id]` | Get session details |
| PATCH | `/api/sessions/[id]` | Update session |
| DELETE | `/api/sessions/[id]` | Delete session |

### Laps

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/laps` | Create new lap |
| GET | `/api/laps/[id]` | Get lap details |
| DELETE | `/api/laps/[id]` | Delete lap |
| POST | `/api/laps/[id]/analyze` | Analyze lap with AI |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send chat message and get AI response |

## WebSocket Protocol

### Client → Server Messages

```typescript
// Request demo mode playback
{
  type: "start_demo"
}

// Stop demo mode
{
  type: "stop_demo"
}

// Ping for connection check
{
  type: "ping"
}
```

### Server → Client Messages

```typescript
// Connection established
{
  type: "connected",
  message: string,
  timestamp: number
}

// Telemetry frame
{
  type: "telemetry",
  data: TelemetryFrame
}

// Pong response
{
  type: "pong",
  timestamp: number
}
```

## Component Hierarchy

```
App (layout.tsx)
├── HomePage (page.tsx)
│   └── SessionCard (for each session)
│
├── NewSessionPage (session/new/page.tsx)
│   └── Session creation form
│
├── SessionPage (session/[id]/page.tsx)
│   ├── TelemetryChart (live data)
│   └── Lap list sidebar
│
└── LapPage (lap/[id]/page.tsx)
    ├── TelemetryChart (historical data)
    ├── AI Suggestions panel
    └── ChatInterface
```

## State Management

### Client State
- **React useState** - Local component state
- **WebSocket connection** - useRef for persistent connection
- **Real-time telemetry buffer** - useState array of frames

### Server State
- **Database** - Prisma queries for persistent data
- **WebSocket connections** - Set of active client connections
- **Demo playback** - Interval-based frame emission

## Security Considerations

### Current Implementation (Development)
- ⚠️ No authentication
- ⚠️ No rate limiting
- ⚠️ No input sanitization (beyond Prisma)
- ⚠️ CORS open to all origins

### Production Requirements
- ✅ Add user authentication (JWT/OAuth)
- ✅ Implement API rate limiting
- ✅ Add CSRF protection
- ✅ Configure CORS properly
- ✅ Sanitize all user inputs
- ✅ Secure WebSocket connections (WSS)
- ✅ Environment variable validation

## Performance Optimization

### Current Optimizations
- React component memoization
- Prisma query optimization
- WebSocket binary message support (ready)
- Chart data throttling (60Hz → display)

### Future Optimizations
- Implement Redis caching
- Add CDN for static assets
- Use database connection pooling
- Implement telemetry data compression
- Add service worker for offline support

## Deployment Architecture

### Development
```
localhost:3000 - Next.js (dev server)
localhost:8080 - WebSocket server
localhost:9996 - UDP telemetry receiver
```

### Production (Recommended)

```
┌─────────────────────────────────────┐
│         Vercel (Next.js)            │
│  • Frontend + API Routes            │
│  • Edge Functions                   │
│  • Automatic scaling                │
└────────────┬────────────────────────┘
             │
             │ HTTPS
             │
┌────────────┴────────────────────────┐
│    Fly.io / Render (WebSocket)      │
│  • WebSocket server                 │
│  • Telemetry collector              │
│  • Persistent connections           │
└────────────┬────────────────────────┘
             │
             │
┌────────────┴────────────────────────┐
│      Supabase / Neon (Postgres)     │
│  • Production database              │
│  • Automatic backups                │
│  • Connection pooling               │
└─────────────────────────────────────┘
```

## Monitoring & Observability

### Recommended Tools
- **Vercel Analytics** - Frontend performance
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Prometheus + Grafana** - Metrics
- **OpenTelemetry** - Distributed tracing

### Key Metrics to Track
- WebSocket connection count
- Telemetry frame rate
- API response times
- AI analysis duration
- Database query performance
- Error rates

## Testing Strategy

### Unit Tests
- Telemetry parsing functions
- AI analysis calculations
- Utility functions

### Integration Tests
- API endpoint functionality
- Database operations
- WebSocket message handling

### E2E Tests
- Session creation flow
- Lap analysis workflow
- Chat interaction
- Real-time telemetry streaming

## Scalability Considerations

### Current Limitations
- Single WebSocket server
- Single Django API instance (no clustering yet)
- No horizontal scaling
- In-memory telemetry buffering

### Scaling Strategy
1. **Database**: Migrate to PostgreSQL
2. **WebSocket**: Use Redis pub/sub for multi-server
3. **Caching**: Add Redis for session data
4. **CDN**: Serve static assets from CDN
5. **Load Balancing**: Add nginx/HAProxy
6. **Microservices**: Split telemetry pipeline

## Development Workflow

### Local Development
1. Run all services locally
2. Use demo mode for testing
3. Hot reload for rapid iteration

### CI/CD Pipeline
1. **Lint** - ESLint + TypeScript checks
2. **Test** - Jest unit tests
3. **Build** - Next.js production build
4. **Deploy** - Automatic deployment to staging
5. **E2E Tests** - Playwright tests on staging
6. **Production** - Manual promotion

## Future Architecture Enhancements

### Phase 2
- Add Redis for caching and pub/sub
- Implement background job queue (Bull)
- Add file storage (S3) for video sync
- Implement real-time collaboration

### Phase 3
- Microservices architecture
- Kubernetes deployment
- GraphQL API layer
- Real-time multiplayer features

---

**Last Updated:** October 2025  
**Version:** 0.1.0
