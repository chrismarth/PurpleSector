# Getting Started with Purple Sector

## 📋 Pre-Flight Checklist

Before you begin, make sure you have:

- [ ] Node.js 20 or higher installed
- [ ] Python 3.12 or higher installed
- [ ] [uv](https://docs.astral.sh/uv/) installed (`pip install uv`)
- [ ] Docker + Docker Compose installed and running
- [ ] OpenAI API key ready ([get one here](https://platform.openai.com/api-keys))
- [ ] (Optional) Assetto Corsa installed for live telemetry

## 🚀 Quick Start

### Step 1: Install Node.js dependencies
```bash
npm install
```

### Step 2: Set up the Python API
```bash
npm run api:setup
```
This creates a virtualenv at `apps/web/.venv` and installs Django + AI dependencies.

### Step 3: Configure environment
```bash
cp .env.example .env
```
Edit `.env` and set your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 4: Start the full stack
```bash
./scripts/start-dev.sh
```
This starts Docker infrastructure (Postgres, Redis, Redpanda, etc.), runs Django migrations, and launches PM2 processes (Django API + demo replay).

### Step 5: Start the frontend (separate terminal)
```bash
npm run dev:vite
```
Wait for: `VITE ready`

### Step 6: Open the App
- **App**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin
- **Vite dev server**: http://localhost:5173 (for hot reload)

### Step 7: Create Your First Session
1. Click **"New Session"**
2. Name it: `Test Session 1`
3. Select: **"Demo Mode"**
4. Click **"Create Session"**

🎉 You should now see live telemetry streaming!

## ✅ Verification Checklist

### Frontend Running?
- [ ] Browser shows Purple Sector homepage
- [ ] No errors in browser console (F12)
- [ ] Can click "New Session" button

### WebSocket Connected?
- [ ] Terminal 2 shows "Server listening"
- [ ] Session view shows "Connected" badge (green)
- [ ] No WebSocket errors in browser console

### Telemetry Streaming?
- [ ] Charts are updating in real-time
- [ ] Lap timer is counting up
- [ ] Throttle/brake/steering lines are moving

### AI Working?
- [ ] Can click "Analyze Lap" on completed lap
- [ ] Gets suggestions within 5 seconds
- [ ] Can send chat messages and get responses

## 🎮 Using with Assetto Corsa

### Configure AC Telemetry

1. Navigate to your AC config folder:
   - **Windows**: `Documents\Assetto Corsa\cfg\`
   - **Linux**: `~/.steam/steam/steamapps/compatdata/244210/pfx/drive_c/users/steamuser/Documents/Assetto Corsa/cfg/`

2. Create or edit `telemetry.ini`:
```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

3. Save and restart Assetto Corsa

### Test Live Telemetry

1. Make sure all 3 terminals are running
2. Start Assetto Corsa
3. Begin a practice session (any track/car)
4. In Purple Sector, create a new session with **"Live Connection"**
5. Start driving - you should see telemetry appear!

## 🔧 Troubleshooting

### Problem: No telemetry in demo mode

**Check:**
- [ ] WebSocket server is running (Terminal 2)
- [ ] Browser console shows WebSocket connection
- [ ] Demo data file exists: `ls public/demo-telemetry.json`

**Fix:**
```bash
# Regenerate demo data
npm run generate-demo

# Restart WebSocket server container
docker compose -f docker-compose.dev.yml restart ws-server
```

### Problem: "Analyze Lap" doesn't work

**Check:**
- [ ] `.env` file exists with `OPENAI_API_KEY` set
- [ ] API key has credits available
- [ ] Django API is running (`npx pm2 logs django-api`)

**Fix:**
```bash
# Verify environment variable
grep OPENAI_API_KEY .env

# Check Django API logs
npx pm2 logs django-api --lines 50
```

### Problem: No live telemetry from Assetto Corsa

**Check:**
- [ ] Assetto Corsa is running and you're in a session (not menu)
- [ ] `telemetry.ini` is configured correctly
- [ ] Telemetry collector is running (Terminal 3)
- [ ] Terminal 3 shows "Receiving telemetry data"

**Fix:**
```bash
# Restart telemetry capture
# Ctrl+C in Terminal 3, then:
cd rust && cargo run -p ps-tray-app

# Verify AC is sending data via the tray app stats panel
```

### Problem: Port already in use

**Error:** `EADDRINUSE: address already in use`

**Fix:**
```bash
# Find what's using the port (example for port 3000)
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different ports in .env:
WS_PORT=8081
TELEMETRY_UDP_PORT=9997
```

## 📚 Next Steps

### Learn the Features
1. ✅ Create sessions (demo and live)
2. ✅ Watch live telemetry streaming
3. ✅ Complete laps and view archive
4. ✅ Analyze laps with AI
5. ✅ Chat with AI coach

### Explore the Code
- `apps/web/src/` - React frontend (components, pages, stores)
- `apps/web/apps/` - Django apps (events, sessions, vehicles, agent, etc.)
- `services/` - WebSocket server (Node.js)
- `rust/` - gRPC gateway and demo replay binary
- `infra/` - RisingWave, Trino, Postgres SQL migrations

### Read the Documentation
- **QUICKSTART.md** - This guide
- **SETUP.md** - Detailed setup instructions
- **ARCHITECTURE.md** - Technical architecture
- **IMPLEMENTATION_NOTES.md** - Development insights
- **README.md** - Full feature overview

### Customize & Extend
- Modify AI agent in `apps/web/apps/agent/runtime.py`
- Add new telemetry channels
- Customize UI colors in `tailwind.config.ts`
- Add new analysis metrics

## 🎯 Common Tasks

### View Database (Prisma Studio)
```bash
npm run db:studio
```
Opens Prisma Studio at http://localhost:5555

### View Database (Django Admin)
Open http://localhost:8000/admin in your browser.

### Reset Database
```bash
npm run db:reset
```

### Run Django Migrations
```bash
npm run api:migrate
```

### Regenerate Demo Data
```bash
npm run generate-demo
```

### Check Logs
- **Django API logs**: `npx pm2 logs django-api`
- **Demo replay logs**: `npx pm2 logs demo-replay`
- **Docker logs**: `docker compose -f docker-compose.dev.yml logs -f`
- **Browser logs**: F12 → Console tab

### Stop All Services
Press `Ctrl+C` in each terminal window

## 💡 Tips & Best Practices

### For Best Performance
- Use Chrome or Edge browser (best WebSocket support)
- Close other tabs to reduce CPU usage
- Keep terminals visible to monitor for errors

### For Development
- Use VS Code with TypeScript extension
- Enable auto-save for hot reload
- Keep browser DevTools open (F12)
- Monitor all 3 terminal windows

### For Testing
- Start with demo mode before trying live AC
- Complete a few laps before analyzing
- Try different questions in the chat
- Experiment with the AI suggestions

## 🆘 Getting Help

### Check These First
1. **Terminal outputs** - Look for error messages
2. **Browser console** (F12) - Check for JavaScript errors
3. **Documentation** - SETUP.md has detailed troubleshooting
4. **Environment variables** - Verify `.env` is correct

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| WebSocket won't connect | Restart Terminal 2 |
| No telemetry data | Check Terminal 2 is running |
| AI not responding | Verify OpenAI API key |
| Database errors | Run `npm run db:push` |
| Port conflicts | Change ports in `.env` |

## 🎊 Success!

If you can:
- ✅ See the homepage
- ✅ Create a session
- ✅ View live telemetry charts
- ✅ Complete and analyze a lap
- ✅ Chat with the AI coach

**Congratulations! Purple Sector is working perfectly!** 🏁

Now go set some fast lap times and let the AI help you improve! 🚀

---

**Need more help?** Check the other documentation files or review the terminal logs for specific error messages.
