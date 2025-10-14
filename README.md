# Purple Sector - Racing Telemetry Analysis

An AI-powered telemetry analysis tool for Assetto Corsa that helps drivers improve their lap times through real-time data visualization and intelligent coaching suggestions.

<div align="center">
  <img width="75%" alt="PurpleSector_LapAnalysisView" src="https://github.com/user-attachments/assets/60735f3e-00f9-41e8-9cf0-57b0830e107e" />
</div>

## Features

- 🏎️ **Real-time Telemetry**: Live streaming of throttle, brake, and steering inputs
- 📊 **Lap Analysis**: Automatic lap detection and archival
- 🤖 **AI Coaching**: GPT-4 powered suggestions for improving lap times
- 💬 **Interactive Chat**: Ask specific questions about your driving technique
- 📁 **Session Management**: Organize and review multiple practice sessions
- 🎮 **Demo Mode**: Try the app with pre-recorded telemetry data

## Architecture

```
[Assetto Corsa UDP Telemetry]
          ↓
[Telemetry Collector Service]
          ↓
[WebSocket Server] ←→ [Next.js Backend]
          ↓                    ↓
[React Frontend] ←→ [SQLite Database]
          ↓
[OpenAI GPT-4 Analysis]
```

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Assetto Corsa installed (for live telemetry)
- OpenAI API key (for AI analysis)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```env
# OpenAI API Key for AI analysis
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL="file:./dev.db"

# WebSocket Server
WS_PORT=8080

# Telemetry Collector
TELEMETRY_UDP_PORT=9996
```

### 3. Initialize Database

```bash
npm run db:push
```

### 4. Configure Assetto Corsa

Enable UDP telemetry output:

1. Navigate to `Documents/Assetto Corsa/cfg/`
2. Edit or create `telemetry.ini`:

```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

3. Save and restart Assetto Corsa

### 5. Start the Application

You'll need 3 terminal windows:

**Terminal 1 - Next.js Frontend & API:**
```bash
npm run dev
```

**Terminal 2 - WebSocket Server:**
```bash
npm run ws-server
```

**Terminal 3 - Telemetry Collector (when racing):**
```bash
npm run telemetry
```

The app will be available at `http://localhost:3000`

## Usage

### Creating a Session

1. Click "New Session" on the home page
2. Enter a session name (e.g., "Monza Practice - June 15")
3. Select telemetry source:
   - **Live**: Connect to running Assetto Corsa instance
   - **Demo**: Use pre-recorded telemetry data

### During a Session

- **Live Telemetry**: View real-time throttle, brake, and steering traces
- **Pause/Resume**: Pause analysis during cool-down laps
- **Lap Completion**: Each lap is automatically saved when you cross start/finish

### Analyzing Laps

1. Click on a completed lap from the archive
2. Click "Analyze Lap" to get AI-powered suggestions
3. Review suggestions like:
   - "Brake later entering Turn 2"
   - "Apply throttle more progressively out of Turn 5"
4. Use the chat to ask specific questions:
   - "Would trail-braking help in Turn 3?"
   - "Am I losing time on corner entry or exit?"

## Project Structure

```
PurpleSector/
├── src/
│   ├── app/                    # Next.js pages & API routes
│   │   ├── page.tsx           # Session list
│   │   ├── session/[id]/      # Live session view
│   │   ├── lap/[id]/          # Lap analysis view
│   │   └── api/               # Backend endpoints
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── TelemetryChart.tsx
│   │   ├── SessionCard.tsx
│   │   └── ChatInterface.tsx
│   ├── lib/                   # Utilities
│   │   ├── db.ts             # Prisma client
│   │   ├── telemetry/        # Telemetry parsing
│   │   └── ai/               # AI analysis
│   └── types/                 # TypeScript definitions
├── services/
│   ├── telemetry-collector.js # UDP listener
│   └── websocket-server.js    # WebSocket relay
├── prisma/
│   └── schema.prisma          # Database schema
└── public/
    └── demo-telemetry.json    # Demo data
```

## Telemetry Data Format

The application processes the following telemetry channels:

```typescript
interface TelemetryFrame {
  timestamp: number;
  throttle: number;    // 0.0 - 1.0
  brake: number;       // 0.0 - 1.0
  steering: number;    // -1.0 to 1.0
  speed: number;       // km/h
  gear: number;
  rpm: number;
  lapTime: number;     // milliseconds
  lapNumber: number;
  normalizedPosition: number; // 0.0 - 1.0 (track position)
}
```

## AI Analysis

The AI analysis uses GPT-4 with a specialized racing coach prompt. It analyzes:

- **Braking points**: Early/late braking detection
- **Throttle application**: Smoothness and timing
- **Steering inputs**: Smoothness and corner entry/exit technique
- **Corner-specific advice**: Turn-by-turn suggestions

## Technologies Used

- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Charts**: Recharts
- **Backend**: Next.js API Routes, Node.js
- **Database**: SQLite with Prisma ORM
- **Real-time**: WebSockets (ws library)
- **AI**: OpenAI GPT-4
- **Icons**: Lucide React

## Development Roadmap

### Phase 1 (Current)
- ✅ Basic telemetry collection
- ✅ Session management
- ✅ Live visualization
- ✅ AI analysis
- [ ] Assetto Corsa integration

### Phase 2 (Future)
- [ ] Lap comparison (overlay multiple laps)
- [ ] Track map visualization
- [ ] Sector time analysis
- [ ] Export telemetry data

### Phase 3 (Advanced)
- [ ] Deep lap analysis and corner-specific suggestions

## Troubleshooting

### No telemetry data received

1. Verify Assetto Corsa is running
2. Check `telemetry.ini` configuration
3. Ensure UDP port 9996 is not blocked by firewall
4. Verify telemetry collector service is running

### WebSocket connection failed

1. Ensure WebSocket server is running (`npm run ws-server`)
2. Check port 8080 is available
3. Verify no CORS issues in browser console

### AI analysis not working

1. Verify `OPENAI_API_KEY` is set in `.env.local`
2. Check OpenAI API quota/billing
3. Review API route logs for errors

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT License - Feel free to use and modify for your own racing analysis needs.

---

**Happy Racing! 🏁**
