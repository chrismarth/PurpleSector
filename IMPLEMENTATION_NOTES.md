# Implementation Notes

## Overview

This document provides technical details about the Purple Sector implementation, including architecture decisions, data flow, and areas for future enhancement.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Assetto Corsa Game                       │
│                    (UDP Telemetry Output)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ UDP Port 9996
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Telemetry Collector Service                     │
│              (services/telemetry-collector.js)               │
│  • Receives UDP packets from Assetto Corsa                  │
│  • Parses binary telemetry data                             │
│  • Forwards JSON to WebSocket server                        │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                WebSocket Relay Server                        │
│              (services/websocket-server.js)                  │
│  • Central hub for telemetry distribution                   │
│  • Broadcasts to all connected clients                      │
│  • Handles demo mode playback                               │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Frontend (React)│  │  Backend (API)   │                │
│  │  • Session views  │  │  • REST endpoints│                │
│  │  • Live charts    │  │  • AI integration│                │
│  │  • Chat UI        │  │  • Database ops  │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                            │
│  • Sessions, Laps, Chat Messages                            │
│  • Telemetry data stored as JSON                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    OpenAI GPT-4 API                          │
│  • Lap analysis and suggestions                             │
│  • Conversational coaching                                  │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Live Telemetry Flow

1. **Assetto Corsa** sends UDP packets at ~60Hz to port 9996
2. **Telemetry Collector** parses binary data and converts to JSON
3. **WebSocket Server** receives JSON and broadcasts to all clients
4. **Frontend** receives frames via WebSocket and updates charts in real-time
5. **Lap Detection** monitors lap number changes to trigger lap save
6. **Backend API** saves completed lap telemetry to database

### Demo Mode Flow

1. **Frontend** requests demo mode when creating session
2. **WebSocket Server** loads `demo-telemetry.json`
3. **Playback Loop** sends frames at 60Hz to simulate live data
4. Rest of flow is identical to live telemetry

### AI Analysis Flow

1. **User** clicks "Analyze Lap" button
2. **Frontend** calls `/api/laps/[id]/analyze`
3. **Backend** retrieves lap telemetry from database
4. **Analysis Function** calculates metrics (braking zones, smoothness, etc.)
5. **OpenAI API** receives structured prompt with telemetry summary
6. **GPT-4** returns JSON array of suggestions
7. **Backend** saves suggestions to database
8. **Frontend** displays suggestions with severity indicators

## Key Implementation Details

### Assetto Corsa UDP Format

The telemetry collector uses a **simplified** UDP packet parser. The actual Assetto Corsa UDP format is more complex and includes:

- Multiple packet types (car state, lap info, etc.)
- 100+ telemetry channels
- Different packet structures for different game modes

**Current Implementation:**
- Parses basic channels: throttle, brake, steering, speed, gear, RPM
- Assumes fixed packet structure (may need adjustment for your AC version)
- Works for single-player sessions

**For Production:**
Consider using an existing AC telemetry library or implementing the full UDP protocol specification.

### Lap Detection

Current implementation detects lap completion by monitoring `lapNumber` changes:

```javascript
if (frame.lapNumber !== lastLapNumber && lastLapNumber > 0) {
  // Lap completed - save telemetry
}
```

**Limitations:**
- Doesn't detect invalid laps (off-track, collisions)
- No sector time tracking
- Assumes lap numbers increment correctly

**Improvements:**
- Add `normalizedPosition` wrap-around detection (1.0 → 0.0)
- Track lap validity flags from AC
- Implement sector time analysis

### Telemetry Storage

Telemetry frames are stored as **JSON strings** in the database:

**Pros:**
- Simple implementation
- Flexible schema
- Easy to query and parse

**Cons:**
- Not optimized for large datasets
- Can't query individual frames efficiently
- Large database size for many laps

**For Production:**
- Consider time-series database (InfluxDB, TimescaleDB)
- Implement data compression
- Add data retention policies

### AI Analysis

The AI analysis uses a two-stage approach:

1. **Statistical Analysis** - Calculate metrics from telemetry
2. **LLM Interpretation** - GPT-4 provides human-readable suggestions

**Current Metrics:**
- Braking event detection (intensity, duration, position)
- Throttle application smoothness
- Steering smoothness
- Speed analysis

**Potential Enhancements:**
- Corner-by-corner analysis with track map
- Comparison with optimal racing line
- Setup correlation (tire pressure, aero, etc.)
- Driver style classification

### WebSocket Architecture

The WebSocket server acts as a **relay** between the telemetry collector and frontend clients.

**Why not direct connection?**
- Allows multiple frontend clients
- Enables demo mode without collector
- Provides connection management
- Future: Could add recording/replay features

**Scalability Considerations:**
- Current implementation is single-server
- For multiple users, consider Redis pub/sub
- Could add authentication/authorization

## Technology Choices

### Why Next.js?

- **Full-stack framework** - Frontend + API in one project
- **React Server Components** - Better performance
- **API Routes** - Easy backend endpoints
- **Built-in optimization** - Image optimization, code splitting
- **Deployment** - Easy to deploy to Vercel

### Why SQLite?

- **Zero configuration** - No separate database server
- **Portable** - Single file database
- **Fast** - Great for local development
- **Prisma support** - Excellent ORM integration

**For Production:** Migrate to PostgreSQL for better concurrency and features.

### Why Recharts?

- **React-native** - Built for React
- **Responsive** - Works on all screen sizes
- **Customizable** - Easy to style
- **Performance** - Handles real-time updates well

**Alternatives:** Chart.js, D3.js, Plotly

### Why OpenAI GPT-4?

- **Best-in-class** - Most capable LLM
- **JSON mode** - Structured output
- **Context window** - Can handle full lap data
- **API quality** - Reliable and fast

**Alternatives:**
- Claude (Anthropic) - Good alternative
- Local models (Llama, Mistral) - Privacy, cost savings
- Fine-tuned models - Better domain knowledge

## Performance Considerations

### Real-time Chart Updates

Current implementation updates charts on **every frame** (60Hz). This can be CPU-intensive.

**Optimizations:**
- Throttle updates to 30Hz or 15Hz
- Use `useMemo` to prevent unnecessary re-renders
- Implement virtual scrolling for long laps
- Consider WebGL-based charting for better performance

### Database Queries

**Current approach:** Load entire lap telemetry into memory

**For large datasets:**
- Implement pagination
- Add telemetry data compression
- Cache frequently accessed laps
- Use database indexes effectively

### WebSocket Message Size

Each telemetry frame is ~200 bytes. At 60Hz, that's ~12KB/s per client.

**Optimizations:**
- Binary WebSocket messages instead of JSON
- Delta compression (send only changes)
- Reduce frame rate for non-critical data

## Security Considerations

### Current Implementation

⚠️ **No authentication or authorization** - This is a local development app

### For Production

Must add:
- **User authentication** - JWT, OAuth, or session-based
- **API rate limiting** - Prevent abuse
- **Input validation** - Sanitize all user inputs
- **CORS configuration** - Restrict origins
- **Environment variables** - Never expose API keys
- **Database security** - Parameterized queries (Prisma handles this)

## Testing Strategy

### Recommended Tests

**Unit Tests:**
- Telemetry parsing functions
- AI analysis metrics calculation
- Utility functions (formatLapTime, etc.)

**Integration Tests:**
- API endpoints (sessions, laps, chat)
- Database operations
- WebSocket message handling

**E2E Tests:**
- Session creation flow
- Live telemetry streaming
- Lap analysis workflow
- Chat interaction

**Tools:**
- Jest for unit tests
- Playwright for E2E tests
- Supertest for API tests

## Future Enhancements

### Phase 2 Features

1. **Lap Comparison**
   - Overlay multiple laps on same chart
   - Delta time visualization
   - Identify where time is gained/lost

2. **Track Map Visualization**
   - 2D track map with car position
   - Color-coded speed/throttle overlay
   - Corner numbering and naming

3. **Sector Analysis**
   - Split lap into sectors
   - Sector time comparison
   - Identify weak sectors

4. **Data Export**
   - Export telemetry to CSV
   - Share laps with others
   - Import external telemetry

### Phase 3 Features

1. **Optimal Line Calculation**
   - Calculate theoretical optimal lap
   - Compare driver line to optimal
   - Suggest line adjustments

2. **Setup Correlation**
   - Track setup changes
   - Correlate setup with lap times
   - Suggest setup improvements

3. **Multi-car Support**
   - Compare different cars
   - Car-specific analysis
   - Setup database per car

4. **Video Sync**
   - Upload replay video
   - Sync telemetry with video
   - Picture-in-picture analysis

### Advanced Features

1. **Machine Learning**
   - Train model on driver data
   - Predict lap time from partial lap
   - Anomaly detection (mistakes)

2. **Multiplayer Analysis**
   - Compare with other drivers
   - Leaderboards
   - Community best practices

3. **Real-time Coaching**
   - Live suggestions during driving
   - Voice feedback (text-to-speech)
   - Predictive warnings

## Known Issues

1. **Assetto Corsa UDP Format**
   - Simplified parser may not work with all AC versions
   - Need to verify packet structure for your installation

2. **Lap Detection Edge Cases**
   - May miss laps if telemetry drops
   - No handling of invalid laps
   - Pit lane laps are counted

3. **WebSocket Reconnection**
   - Frontend doesn't auto-reconnect on disconnect
   - Need to implement reconnection logic

4. **AI Rate Limits**
   - OpenAI API has rate limits
   - No queuing system for analysis requests
   - Could hit limits with many users

5. **Browser Compatibility**
   - Tested primarily on Chrome
   - May have issues with Safari WebSocket
   - Mobile experience not optimized

## Development Workflow

### Adding a New Feature

1. **Database Changes**
   - Update `prisma/schema.prisma`
   - Run `npm run db:push`

2. **Backend API**
   - Add route in `src/app/api/`
   - Implement business logic
   - Test with Postman/curl

3. **Frontend**
   - Create/update components
   - Add TypeScript types
   - Implement UI

4. **Testing**
   - Manual testing in browser
   - Add automated tests
   - Test edge cases

### Debugging Tips

- **WebSocket issues**: Check browser Network tab (WS filter)
- **Database issues**: Use `npm run db:studio`
- **API issues**: Check Next.js terminal output
- **Telemetry issues**: Check collector terminal output
- **AI issues**: Check OpenAI API dashboard

## Contributing Guidelines

If you want to extend this project:

1. Follow existing code style
2. Add TypeScript types for new features
3. Update documentation
4. Test thoroughly
5. Consider backward compatibility

## Resources

### Assetto Corsa
- [AC Modding Documentation](https://www.assettocorsa.net/forum/)
- [AC UDP Protocol](https://docs.google.com/document/d/1KfkZiIluXZ6mMhLWfDX1qAGbvhGRC3ZUzjVIt5FQpp4/pub)

### Racing Theory
- [Driver61 YouTube](https://www.youtube.com/c/Driver61) - Racing technique
- [Track Titan](https://www.youtube.com/c/TrackTitan) - Data analysis

### Development
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Recharts Docs](https://recharts.org/)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

**Last Updated:** October 2025
**Version:** 0.1.0
