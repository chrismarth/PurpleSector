/**
 * Redis-backed WebSocket Server (Cloud Pipeline)
 *
 * WebSocket server for the cloud pipeline.
 * Reads telemetry from Redis Pub/Sub (written by RisingWave) and pushes
 * to connected frontend WebSocket clients.
 *
 * Architecture:
 * RisingWave → Redis Pub/Sub → This Server → WebSocket → Frontend Clients
 *
 * Redis Pub/Sub channel format: telemetry:live:{user_id}:{session_id}
 *
 * Behavior:
 * 1. Client connects with userId + sessionId query params.
 * 2. Server subscribes to Redis Pub/Sub for real-time streaming.
 * 3. Pushes updates to client via WebSocket (JSON or Protobuf).
 *
 * Environment variables:
 *   REDIS_URL        — Redis connection URL (default: redis://localhost:6379)
 *   WS_PORT          — WebSocket server port (default: 8080)
 *   WS_HOST          — WebSocket server host (default: 0.0.0.0)
 *   BACKFILL_COUNT   — Number of entries to backfill on connect (default: 1000)
 *   POLL_INTERVAL_MS — Redis polling interval in ms (default: 50)
 */

const WebSocket = require('ws');
const { createClient } = require('redis');

// Configuration from environment
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const WS_PORT = parseInt(process.env.WS_PORT || '8080', 10);
const WS_HOST = process.env.WS_HOST || '0.0.0.0';
const BACKFILL_COUNT = parseInt(process.env.BACKFILL_COUNT || '50', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '50', 10);
const MAX_LATENCY_MS = parseInt(process.env.MAX_LATENCY_MS || '10000', 10); // Drop frames older than 10s behind wall clock

// Optional protobuf support
let proto = null;
let protobufReady = false;
try {
  proto = require('@purplesector/proto');
} catch {
  // Proto package not available — JSON only mode
}

class RedisWebSocketServer {
  constructor() {
    this.wss = null;
    this.redis = null;
    this.redisPubSub = null; // Separate connection for pub/sub

    // userId:sessionId → Set<ws>
    this.subscriptions = new Map();
    // ws → { userId, sessionId }
    this.clients = new Map();

    // Per-subscription polling state: streamKey → { lastId, pollingActive }
    this.streamState = new Map();
    
    // Active pub/sub subscriptions: channel → true
    this.pubsubChannels = new Set();

    this.stats = {
      clientsConnected: 0,
      totalClients: 0,
      messagesRelayed: 0,
      bytesRelayed: 0,
      errors: 0,
    };

    this.shuttingDown = false;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Redis WebSocket Server (Pub/Sub Streaming Mode)');
    console.log('═══════════════════════════════════════════════════');
    
    // Create HTTP server for health checks
    const http = require('http');
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        const health = {
          status: 'healthy',
          clients: this.stats.clientsConnected,
          totalClients: this.stats.totalClients,
          messagesRelayed: this.stats.messagesRelayed,
          errors: this.stats.errors,
          uptime: process.uptime(),
          redisConnected: this.redis?.isOpen || false,
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Connect to Redis for regular operations
    this.redis = createClient({ url: REDIS_URL });
    this.redis.on('error', (err) => console.error('Redis error:', err));
    await this.redis.connect();
    console.log(`✓ Connected to Redis at ${REDIS_URL}`);
    
    // Create separate connection for Pub/Sub (Redis requirement)
    this.redisPubSub = createClient({ url: REDIS_URL });
    this.redisPubSub.on('error', (err) => console.error('Redis Pub/Sub error:', err));
    await this.redisPubSub.connect();
    console.log(`✓ Connected to Redis Pub/Sub at ${REDIS_URL}`);

    // Initialize protobuf if available
    if (proto) {
      try {
        await proto.init();
        protobufReady = true;
        console.log('✓ Protobuf initialized');
      } catch (err) {
        console.warn('Protobuf initialization failed, using JSON mode:', err.message);
      }
    }

    // Start WebSocket server on the HTTP server
    this.wss = new WebSocket.Server({ server: this.httpServer });
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.wss.on('error', (err) => console.error('WebSocket server error:', err));

    // Start HTTP server (handles both WebSocket upgrades and health checks)
    this.httpServer.listen(WS_PORT, WS_HOST, () => {
      console.log(`✓ WebSocket server listening on ${WS_HOST}:${WS_PORT}`);
      console.log(`✓ Health endpoint available at http://${WS_HOST}:${WS_PORT}/health`);
      console.log('═══════════════════════════════════════════════════');
    });

    this.setupShutdownHandlers();
  }

  /**
   * Handle new WebSocket client connection
   */
  handleConnection(ws, req) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId') || 'default-user';
    const sessionId = url.searchParams.get('sessionId') || 'default-session';
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;

    console.log(`Client connected: ${clientId} (user=${userId}, session=${sessionId})`);

    this.stats.clientsConnected++;
    this.stats.totalClients++;

    const clientState = {
      userId,
      sessionId,
    };
    this.clients.set(ws, clientState);

    // Add to subscription map
    const subKey = `${userId}:${sessionId}`;
    if (!this.subscriptions.has(subKey)) {
      this.subscriptions.set(subKey, new Set());
    }
    this.subscriptions.get(subKey).add(ws);

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      message: 'Connected to Purple Sector telemetry server (Redis)',
      timestamp: Date.now(),
    });

    // Backfill from Redis Stream and start polling
    this.backfillAndPoll(ws, userId, sessionId).catch((err) => {
      console.error(`Backfill/poll error for ${subKey}:`, err.message);
    });

    // Handle client messages
    ws.on('message', (message) => this.handleClientMessage(ws, message, clientId));

    // Handle disconnect
    ws.on('close', () => {
      console.log(`Client disconnected: ${clientId}`);
      this.stats.clientsConnected--;

      // Remove from subscription map
      const subs = this.subscriptions.get(subKey);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) {
          this.subscriptions.delete(subKey);
          // Stop polling if no more subscribers for this stream
          const streamKey = `telemetry:${subKey}`;
          const state = this.streamState.get(streamKey);
          if (state) {
            state.pollingActive = false;
            this.streamState.delete(streamKey);
          }
        }
      }

      this.clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error(`Client error (${clientId}):`, err.message);
    });
  }

  /**
   * Backfill from Redis Stream, then subscribe to Pub/Sub for real-time streaming
   */
  async backfillAndPoll(ws, userId, sessionId) {
    // All sessions (demo and live) use the real userId and sessionId.
    // RisingWave publishes to telemetry:live:{user_id}:{session_id} using the
    // session owner's user_id from the active_sessions table.
    const streamKey = `telemetry:live:${userId}:${sessionId}`;

    // Backfill disabled temporarily to test Pub/Sub with temporal filtering
    // try {
    //   const entries = await this.redis.xRevRange(streamKey, '+', '-', { COUNT: BACKFILL_COUNT });
    //   if (entries && entries.length > 0) {
    //     for (let i = entries.length - 1; i >= 0; i--) {
    //       const frame = this.parseStreamEntry(entries[i]);
    //       if (frame) {
    //         this.sendToClient(ws, { type: 'telemetry', data: frame });
    //       }
    //     }
    //     console.log(`Backfilled ${entries.length} entries for ${userId}:${sessionId}`);
    //   }
    // } catch (err) {
    //   console.error(`Backfill error:`, err.message);
    // }
    console.log(`Backfill disabled - using Pub/Sub only for ${userId}:${sessionId}`);

    // Subscribe to Pub/Sub channel for real-time streaming
    const pubsubChannel = `telemetry:live:${userId}:${sessionId}`;
    if (!this.pubsubChannels.has(pubsubChannel)) {
      this.pubsubChannels.add(pubsubChannel);
      
      await this.redisPubSub.subscribe(pubsubChannel, (message) => {
        try {
          const frameData = JSON.parse(message);
          const frame = {
            timestamp: new Date(frameData.timestamp).getTime(),
            speed: parseFloat(frameData.speed || '0'),
            throttle: parseFloat(frameData.throttle || '0'),
            brake: parseFloat(frameData.brake || '0'),
            steering: parseFloat(frameData.steering || '0'),
            gear: parseInt(frameData.gear || '0', 10),
            rpm: parseInt(frameData.rpm || '0', 10),
            normalizedPosition: parseFloat(frameData.normalized_position || frameData.normalizedPosition || '0'),
            lapNumber: parseInt(frameData.lap_number || frameData.lapNumber || '0', 10),
            lapTime: parseInt(frameData.lap_time || frameData.lapTime || '0', 10),
            sessionTime: frameData.session_time ? parseFloat(frameData.session_time) : undefined,
            sessionType: frameData.session_type ? parseInt(frameData.session_type, 10) : undefined,
            trackPosition: frameData.track_position ? parseInt(frameData.track_position, 10) : undefined,
            delta: frameData.delta ? parseInt(frameData.delta, 10) : undefined,
          };
          
          // Latency gate: drop frames too far behind wall clock time
          // Handles burst from session creation and intermittent connectivity
          const latency = Date.now() - frame.timestamp;
          if (latency > MAX_LATENCY_MS) {
            return; // silently drop stale frame
          }

          // Broadcast to all subscribers of this session
          const subKey = `${userId}:${sessionId}`;
          const subscribers = this.subscriptions.get(subKey);
          if (subscribers) {
            for (const client of subscribers) {
              if (client.readyState === WebSocket.OPEN) {
                this.sendToClient(client, { type: 'telemetry', data: frame });
              }
            }
          }
        } catch (err) {
          console.error(`Error processing pub/sub message:`, err.message);
        }
      });
      
      console.log(`✓ Subscribed to Pub/Sub channel: ${pubsubChannel}`);
    }
  }

  /**
   * Backfill a single client from Redis Stream (when poll is already running)
   */
  async backfillClient(ws, streamKey) {
    try {
      const entries = await this.redis.xRevRange(streamKey, '+', '-', { COUNT: BACKFILL_COUNT });
      if (entries && entries.length > 0) {
        for (let i = entries.length - 1; i >= 0; i--) {
          const frame = this.parseStreamEntry(entries[i]);
          if (frame) {
            this.sendToClient(ws, { type: 'telemetry', data: frame });
          }
        }
      }
    } catch (err) {
      console.error(`Backfill error:`, err.message);
    }
  }

  /**
   * Continuously poll a Redis Stream for new entries and broadcast
   */
  async pollStream(streamKey) {
    const state = this.streamState.get(streamKey);
    if (!state) return;

    console.log(`Poll loop started for ${streamKey}, lastId=${state.lastId}`);
    
    while (state.pollingActive && !this.shuttingDown) {
      try {
        const results = await this.redis.xRead(
          { key: streamKey, id: state.lastId },
          { COUNT: 100, BLOCK: POLL_INTERVAL_MS }
        );

        if (results && results.length > 0) {
          const stream = results[0];
          console.log(`Polled ${stream.messages.length} new entries from ${streamKey}`);
          for (const entry of stream.messages) {
            state.lastId = entry.id;
            const frame = this.parseStreamEntry(entry);
            if (frame) {
              this.broadcastToStream(streamKey, frame);
            } else {
              console.log(`Failed to parse entry ${entry.id}`);
            }
          }
        }
      } catch (err) {
        if (!this.shuttingDown) {
          console.error(`Poll error for ${streamKey}:`, err.message);
          this.stats.errors++;
          // Brief pause before retrying
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
    console.log(`Poll loop ended for ${streamKey}`);
  }

  /**
   * Parse a Redis Stream entry into a telemetry frame object
   * Returns null if the frame is too old (latency gate)
   */
  parseStreamEntry(entry) {
    try {
      const msg = entry.message || entry;
      
      // Parse timestamp - handle both ISO string and integer formats
      let timestamp = 0;
      const tsValue = msg.ts || msg.timestamp;
      if (tsValue) {
        if (typeof tsValue === 'string' && tsValue.includes('-')) {
          // ISO 8601 format: convert to milliseconds
          timestamp = new Date(tsValue).getTime();
        } else {
          // Integer format
          timestamp = parseInt(tsValue, 10);
        }
      }
      
      // Latency gate: Drop telemetry older than MAX_LATENCY_MS
      // This prevents WAL burst data from appearing in live dashboards
      const now = Date.now();
      const latency = now - timestamp;
      if (latency > MAX_LATENCY_MS) {
        // Silently drop old data
        return null;
      }
      
      return {
        timestamp,
        speed: parseFloat(msg.speed || '0'),
        throttle: parseFloat(msg.throttle || '0'),
        brake: parseFloat(msg.brake || '0'),
        steering: parseFloat(msg.steering || '0'),
        gear: parseInt(msg.gear || '0', 10),
        rpm: parseInt(msg.rpm || '0', 10),
        normalizedPosition: parseFloat(msg.normalized_position || msg.normalizedPosition || '0'),
        lapNumber: parseInt(msg.lap_number || msg.lapNumber || '0', 10),
        lapTime: parseInt(msg.lap_time || msg.lapTime || '0', 10),
        sessionTime: msg.session_time ? parseFloat(msg.session_time) : undefined,
        sessionType: msg.session_type ? parseInt(msg.session_type, 10) : undefined,
        trackPosition: msg.track_position ? parseInt(msg.track_position, 10) : undefined,
        delta: msg.delta ? parseInt(msg.delta, 10) : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Broadcast a telemetry frame to all clients subscribed to a stream
   */
  broadcastToStream(streamKey, frame) {
    // streamKey = "telemetry:userId:sessionId"
    const subKey = streamKey.replace('telemetry:', '');
    const subs = this.subscriptions.get(subKey);
    if (!subs) return;

    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        const clientState = this.clients.get(ws);
        if (clientState && !clientState.demoMode) {
          this.sendToClient(ws, { type: 'telemetry', data: frame });
          this.stats.messagesRelayed++;
        }
      }
    }
  }

  /**
   * Handle message from client
   */
  handleClientMessage(ws, message, clientId) {
    try {
      let data;

      if (Buffer.isBuffer(message) && protobufReady) {
        const decoded = proto.decodeMessage(message);
        switch (decoded.type) {
          case proto.MessageType.PING:
            data = { type: 'ping' };
            break;
          default:
            return;
        }
      } else {
        data = JSON.parse(message.toString());
      }

      switch (data.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          console.warn(`Unknown message type: ${data.type} from ${clientId}`);
      }
    } catch (error) {
      console.error(`Error handling message from ${clientId}:`, error.message);
    }
  }

  /**
   * Send a message to a single client
   */
  sendToClient(client, message) {
    if (client.readyState !== WebSocket.OPEN) return;

    try {
      let buffer;

      if (protobufReady) {
        if (message.type === 'telemetry') {
          buffer = proto.createTelemetryMessage(message.data);
        } else if (message.type === 'connected') {
          buffer = proto.createConnectedMessage(message.message);
        } else if (message.type === 'pong') {
          buffer = proto.createPongMessage();
        } else {
          buffer = Buffer.from(JSON.stringify(message));
        }
      } else {
        buffer = Buffer.from(JSON.stringify(message));
      }

      client.send(buffer);
      this.stats.bytesRelayed += buffer.length;
    } catch (error) {
      console.error('Error sending to client:', error.message);
      this.stats.errors++;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      if (this.shuttingDown) return;
      console.log(`\n${signal} received, shutting down...`);
      this.shuttingDown = true;

      // Close all client connections
      this.clients.forEach((state, client) => {
        client.close();
      });

      // Stop all stream polling
      for (const [, state] of this.streamState) {
        state.pollingActive = false;
      }

      // Close WS server
      if (this.wss) this.wss.close();

      // Disconnect Redis
      if (this.redis) {
        await this.redis.quit().catch(() => {});
      }

      console.log('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

// Main execution
if (require.main === module) {
  const server = new RedisWebSocketServer();
  server.initialize().catch((error) => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = RedisWebSocketServer;
