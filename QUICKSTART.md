# Quick Start Guide

Get Purple Sector up and running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))

## Installation

### 1. One-Command Setup

```bash
npm run setup
```

This will:
- Install all dependencies
- Create the database
- Generate demo telemetry data

### 2. Configure OpenAI API Key

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

## Running the App

Open **3 terminal windows** and run:

### Terminal 1: Frontend & API
```bash
npm run dev
```

### Terminal 2: WebSocket Server
```bash
npm run ws-server
```

### Terminal 3: Telemetry Collector (optional - only for live AC telemetry)
```bash
npm run telemetry
```

## First Session

1. Open http://localhost:3000
2. Click **"New Session"**
3. Name it "Test Session"
4. Select **"Demo Mode"**
5. Click **"Create Session"**

You should now see live telemetry streaming! 🎉

## Try the Features

### View Live Telemetry
- Watch the throttle, brake, and steering charts update in real-time
- See the lap timer counting up

### Complete a Lap
- Demo mode will automatically complete laps
- Each lap appears in the "Completed Laps" sidebar

### Analyze a Lap
1. Click on a completed lap
2. Click **"Analyze Lap"** button
3. Get AI-powered suggestions for improvement

### Chat with AI Coach
1. In the lap view, use the chat interface
2. Ask questions like:
   - "Should I brake later into Turn 1?"
   - "How can I improve my corner exit speed?"
   - "What's causing me to lose time?"

## Using with Assetto Corsa

### Configure AC

Edit `Documents/Assetto Corsa/cfg/telemetry.ini`:

```ini
[TELEMETRY]
ENABLED=1
UDP_PORT=9996
UDP_ADDRESS=127.0.0.1
```

### Start a Session

1. Make sure all 3 terminals are running
2. Start Assetto Corsa and begin driving
3. Create a new session with **"Live Connection"**
4. Drive laps and watch telemetry stream in real-time!

## Troubleshooting

### No telemetry in demo mode?
- Ensure WebSocket server is running (Terminal 2)
- Check browser console for errors (F12)

### Can't analyze laps?
- Verify your OpenAI API key is correct
- Check you have API credits available

### No live telemetry from AC?
- Verify `telemetry.ini` is configured correctly
- Make sure you're driving (not in menu)
- Check Terminal 3 for "Receiving telemetry data" message

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed configuration
- Check [IMPLEMENTATION_NOTES.md](IMPLEMENTATION_NOTES.md) for technical details
- Review [README.md](README.md) for full feature list

## Need Help?

Check the logs in each terminal window for error messages. Most issues are related to:
1. WebSocket server not running
2. Missing OpenAI API key
3. Assetto Corsa telemetry not configured

Happy racing! 🏁
