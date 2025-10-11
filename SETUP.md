# Purple Sector - Setup Guide

Complete setup instructions for the Purple Sector racing telemetry analysis application.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Assetto Corsa** (for live telemetry) - [Steam](https://store.steampowered.com/app/244210/Assetto_Corsa/)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js, React, TypeScript
- Prisma (database)
- WebSocket libraries
- Recharts (visualization)
- OpenAI SDK
- UI components (shadcn/ui)

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-api-key-here
DATABASE_URL="file:./dev.db"
WS_PORT=8080
TELEMETRY_UDP_PORT=9996
TELEMETRY_UDP_HOST=0.0.0.0
```

### 3. Initialize Database

```bash
npm run db:push
```

This creates the SQLite database and tables.

### 4. Generate Demo Data

```bash
node scripts/generate-demo-data.js
```

This creates realistic demo telemetry data for testing the app without Assetto Corsa.

### 5. Configure Assetto Corsa (Optional - for live telemetry)

If you want to use live telemetry from Assetto Corsa:

1. Navigate to your Assetto Corsa config folder:
   - Windows: `Documents\Assetto Corsa\cfg\`
   - Linux: `~/.steam/steam/steamapps/compatdata/244210/pfx/drive_c/users/steamuser/Documents/Assetto Corsa/cfg/`

2. Create or edit `telemetry.ini`:

```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

3. Save and restart Assetto Corsa

## Running the Application

You need to run **3 separate services** in different terminal windows:

### Terminal 1: Next.js Application

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- API routes: http://localhost:3000/api/*

### Terminal 2: WebSocket Server

```bash
npm run ws-server
```

This starts the WebSocket relay server on `ws://localhost:8080`

### Terminal 3: Telemetry Collector (only for live telemetry)

```bash
npm run telemetry
```

This starts the UDP listener for Assetto Corsa telemetry.

**Note:** You only need Terminal 3 if you're using live telemetry. Demo mode works with just Terminals 1 and 2.

## Verification

### Check WebSocket Server

You should see:
```
═══════════════════════════════════════════════════
  WebSocket Relay Server
═══════════════════════════════════════════════════
✓ Server listening on ws://localhost:8080

Ready to relay telemetry data
═══════════════════════════════════════════════════
```

### Check Next.js

You should see:
```
  ▲ Next.js 14.2.5
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

### Check Telemetry Collector (if using live mode)

You should see:
```
═══════════════════════════════════════════════════
  Assetto Corsa Telemetry Collector
═══════════════════════════════════════════════════
✓ UDP server listening on 0.0.0.0:9996

Waiting for telemetry data from Assetto Corsa...
```

## First Run

1. Open http://localhost:3000 in your browser
2. Click "New Session"
3. Enter a session name (e.g., "Test Session 1")
4. Select "Demo Mode" for your first test
5. Click "Create Session"

You should now see live telemetry streaming!

## Troubleshooting

### No telemetry data in demo mode

**Problem:** Charts are empty, "Waiting for telemetry data..."

**Solutions:**
1. Ensure WebSocket server is running (`npm run ws-server`)
2. Check browser console for WebSocket connection errors
3. Verify demo data was generated: `ls -lh public/demo-telemetry.json`

### WebSocket connection failed

**Problem:** "Disconnected" badge in session view

**Solutions:**
1. Restart WebSocket server
2. Check if port 8080 is available: `lsof -i :8080`
3. Check browser console for CORS errors

### No live telemetry from Assetto Corsa

**Problem:** Telemetry collector shows "Waiting for telemetry data..."

**Solutions:**
1. Verify Assetto Corsa is running and you're in a session (not menu)
2. Check `telemetry.ini` configuration
3. Ensure UDP port 9996 is not blocked by firewall
4. Try restarting Assetto Corsa

### AI analysis not working

**Problem:** "Analyze Lap" button does nothing or shows error

**Solutions:**
1. Verify `OPENAI_API_KEY` is set in `.env.local`
2. Check OpenAI API key is valid and has credits
3. Check browser console and terminal for error messages
4. Verify you're using GPT-4 (not GPT-3.5) - update `src/lib/ai/analysis.ts` if needed

### Database errors

**Problem:** "PrismaClient" errors or database connection issues

**Solutions:**
1. Run `npm run db:push` to recreate database
2. Delete `dev.db` and run `npm run db:push` again
3. Check file permissions on the database file

## Development Tips

### View Database

```bash
npm run db:studio
```

Opens Prisma Studio at http://localhost:5555 to view/edit database records.

### Reset Database

```bash
rm dev.db
npm run db:push
```

### Regenerate Demo Data

```bash
node scripts/generate-demo-data.js
```

### Check Logs

- **Next.js logs**: Terminal 1
- **WebSocket logs**: Terminal 2
- **Telemetry logs**: Terminal 3
- **Browser logs**: Browser DevTools Console (F12)

## Port Usage

- **3000**: Next.js application
- **8080**: WebSocket server
- **9996**: UDP telemetry receiver (Assetto Corsa)

Make sure these ports are available before starting the services.

## Next Steps

Once everything is running:

1. **Try Demo Mode** - Create a demo session to see how the app works
2. **Test Live Telemetry** - Connect to Assetto Corsa and do a few laps
3. **Analyze Laps** - Click "Analyze Lap" to get AI suggestions
4. **Chat with AI** - Ask questions about your driving technique
5. **Compare Laps** - Review multiple laps to track improvement

## Production Deployment

For production deployment, consider:

1. **Database**: Migrate from SQLite to PostgreSQL
2. **WebSocket**: Use a managed WebSocket service or deploy to a VPS
3. **Environment**: Set production environment variables
4. **Security**: Add authentication and rate limiting
5. **Hosting**: Deploy Next.js to Vercel, WebSocket server to Fly.io/Render

See `README.md` for more details on architecture and features.

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review terminal logs for error messages
3. Check browser console (F12) for client-side errors
4. Verify all services are running
5. Try restarting all services

Happy racing! 🏁
