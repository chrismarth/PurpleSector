# Purple Sector - Architecture Documentation

## System Overview

Purple Sector is a full-stack telemetry analysis application built with Next.js, featuring real-time data streaming, AI-powered analysis, and an interactive coaching interface.

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **shadcn/ui** - UI component library
- **Recharts** - Data visualization
- **Lucide React** - Icons

### Backend
- **Next.js API Routes** - REST API endpoints
- **Prisma** - ORM for database access
- **SQLite** - Local database (development)
- **WebSocket (ws)** - Real-time communication

### Services
- **Node.js** - Telemetry collector & WebSocket server
- **UDP Socket** - Assetto Corsa telemetry receiver

### AI/ML
- **OpenAI GPT-4** - Lap analysis and coaching
- **Vercel AI SDK** - AI integration utilities

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js Frontend (React)                     │   │
│  │  • Session Management UI                                  │   │
│  │  • Real-time Telemetry Charts (Recharts)                 │   │
│  │  • Lap Analysis Dashboard                                │   │
│  │  • AI Chat Interface                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST + WebSocket
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js Backend (API Routes)                 │   │
│  │  • /api/sessions - Session CRUD                          │   │
│  │  • /api/laps - Lap management                            │   │
│  │  • /api/laps/[id]/analyze - AI analysis                  │   │
│  │  • /api/chat - AI coaching chat                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Prisma ORM
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SQLite Database                         │   │
│  │  • sessions - Practice sessions                          │   │
│  │  • laps - Completed laps with telemetry                  │   │
│  │  • chatMessages - AI coaching conversations              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    TELEMETRY PIPELINE                            │
│                                                                  │
│  ┌──────────────┐   UDP    ┌──────────────┐   WS   ┌────────┐  │
│  │  Assetto     │ ───────> │  Telemetry   │ ─────> │  WS    │  │
│  │  Corsa       │  :9996   │  Collector   │        │ Server │  │
│  │  (Game)      │          │  (Node.js)   │        │        │  │
│  └──────────────┘          └──────────────┘        └────┬───┘  │
│                                                          │       │
│                                                          │       │
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
- SQLite database (single-writer)
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
