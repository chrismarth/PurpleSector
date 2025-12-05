const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const config = require('@purplesector/config');
const logger = require('@purplesector/logger').child({ service: 'embedded-telemetry' });
const proto = require('@purplesector/proto');

class EmbeddedTelemetryServer {
  constructor() {
    this.wss = new WebSocket.Server({
      port: config.websocket.port,
      host: config.websocket.host,
      maxPayload: config.websocket.maxPayload,
    });

    this.clients = new Map(); // ws -> { userId, demoMode, interval, frameIndex }
    this.demoData = null;
    this.protobufReady = false;
    this.stats = {
      clientsConnected: 0,
      totalClients: 0,
      messagesSent: 0,
      bytesSent: 0,
      errors: 0,
    };

    this.shuttingDown = false;
  }

  async initialize() {
    try {
      logger.info('Initializing embedded telemetry server');

      await this.initProtobuf();
      this.loadDemoData();
      this.setupWebSocketServer();
      this.setupShutdownHandlers();

      logger.info('Embedded telemetry server ready', {
        wsPort: config.websocket.port,
        wsHost: config.websocket.host,
      });
    } catch (error) {
      logger.error('Failed to initialize embedded telemetry server', { error: error.message });
      throw error;
    }
  }

  async initProtobuf() {
    try {
      if (config.protobuf.enabled) {
        await proto.init();
        this.protobufReady = true;
        logger.info('Protobuf initialized');
      }
    } catch (error) {
      logger.warn('Protobuf initialization failed, falling back to JSON', { error: error.message });
    }
  }

  loadDemoData() {
    try {
      // Use the shared demo telemetry JSON under collectors/demo-data
      // __dirname = services, so ../collectors/demo-data/demo-telemetry.json
      const demoPath = path.join(__dirname, '../collectors/demo-data/demo-telemetry.json');

      if (fs.existsSync(demoPath)) {
        const rawData = fs.readFileSync(demoPath, 'utf8');
        const data = JSON.parse(rawData);

        if (data.laps && Array.isArray(data.laps)) {
          this.demoData = data;
          const totalFrames = data.laps.reduce((sum, lap) => sum + lap.frames.length, 0);
          logger.info('Loaded demo data for embedded telemetry', {
            laps: data.laps.length,
            totalFrames,
          });
        } else if (data.frames) {
          this.demoData = { laps: [{ lapNumber: 1, frames: data.frames }] };
          logger.info('Loaded demo data (legacy format) for embedded telemetry', {
            frames: data.frames.length,
          });
        } else {
          logger.warn('Invalid demo data format for embedded telemetry');
        }
      } else {
        logger.warn('Demo telemetry file not found for embedded telemetry', { demoPath });
      }
    } catch (error) {
      logger.error('Error loading demo data for embedded telemetry', { error: error.message });
    }
  }

  setupWebSocketServer() {
    this.wss.on('listening', () => {
      logger.info('Embedded WebSocket server listening', {
        port: config.websocket.port,
        host: config.websocket.host,
      });
    });

    this.wss.on('connection', (ws, req) => {
      this.handleClientConnection(ws, req);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error: error.message });
    });
  }

  handleClientConnection(ws, req) {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId') || 'default-user';

    logger.info('Client connected to embedded telemetry', { clientId, userId });

    this.stats.clientsConnected++;
    this.stats.totalClients++;

    this.clients.set(ws, {
      userId,
      demoMode: false,
      interval: null,
      frameIndex: 0,
    });

    this.sendToClient(ws, {
      type: 'connected',
      message: 'Connected to embedded Purple Sector telemetry server',
      timestamp: Date.now(),
    });

    ws.on('message', (message) => {
      this.handleClientMessage(ws, message, clientId);
    });

    ws.on('close', () => {
      const clientState = this.clients.get(ws);
      const userId = clientState?.userId;

      logger.info('Client disconnected from embedded telemetry', { clientId, userId });
      this.stats.clientsConnected--;

      if (clientState?.interval) {
        clearInterval(clientState.interval);
      }

      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      logger.error('Embedded telemetry client error', { clientId, error: error.message });
    });
  }

  handleClientMessage(ws, message, clientId) {
    try {
      let data;

      if (Buffer.isBuffer(message) && this.protobufReady) {
        const decoded = proto.decodeMessage(message);
        switch (decoded.type) {
          case proto.MessageType.START_DEMO:
            data = { type: 'start_demo' };
            break;
          case proto.MessageType.STOP_DEMO:
            data = { type: 'stop_demo' };
            break;
          case proto.MessageType.PING:
            data = { type: 'ping' };
            break;
          default:
            logger.warn('Unknown protobuf message type in embedded telemetry', { type: decoded.type });
            return;
        }
      } else {
        data = JSON.parse(message.toString());
      }

      switch (data.type) {
        case 'start_demo':
          this.startDemoMode(ws);
          break;
        case 'stop_demo':
          this.stopDemoMode(ws);
          break;
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          logger.warn('Unknown message type in embedded telemetry', { type: data.type, clientId });
      }
    } catch (error) {
      logger.error('Error handling client message in embedded telemetry', {
        clientId,
        error: error.message,
      });
    }
  }

  sendToClient(client, message) {
    if (client.readyState !== WebSocket.OPEN) return;

    try {
      let buffer;
      if (this.protobufReady) {
        if (message.type === 'telemetry') {
          buffer = proto.createTelemetryMessage(message.data);
        } else if (message.type === 'connected') {
          buffer = proto.createConnectedMessage(message.message);
        } else if (message.type === 'demo_complete') {
          buffer = proto.createDemoCompleteMessage(message.message);
        } else if (message.type === 'pong') {
          buffer = proto.createPongMessage();
        } else {
          buffer = Buffer.from(JSON.stringify(message));
        }
      } else {
        buffer = Buffer.from(JSON.stringify(message));
      }

      client.send(buffer);
      this.stats.messagesSent++;
      this.stats.bytesSent += buffer.length;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error sending to embedded telemetry client', { error: error.message });
    }
  }

  startDemoMode(client) {
    if (!this.demoData) {
      logger.warn('Demo data not available for embedded telemetry');
      return;
    }

    const clientState = this.clients.get(client);
    if (!clientState) return;

    this.stopDemoMode(client);

    logger.info('Starting embedded demo mode for client');

    clientState.demoMode = true;
    clientState.frameIndex = 0;

    const laps = this.demoData.laps || [{ frames: this.demoData.frames }];
    const allFrames = laps.flatMap(lap => lap.frames);

    const frameRate = 30;
    const intervalMs = 1000 / frameRate;

    clientState.interval = setInterval(() => {
      if (client.readyState !== WebSocket.OPEN) {
        this.stopDemoMode(client);
        return;
      }

      const state = this.clients.get(client);
      if (!state) return;

      if (state.frameIndex >= allFrames.length) {
        this.sendToClient(client, {
          type: 'demo_complete',
          message: 'Demo playback complete',
        });
        this.stopDemoMode(client);
        return;
      }

      const frame = allFrames[state.frameIndex];
      this.sendToClient(client, {
        type: 'telemetry',
        data: frame,
      });

      state.frameIndex++;
    }, intervalMs);
  }

  stopDemoMode(client) {
    const clientState = this.clients.get(client);
    if (!clientState) return;

    if (clientState.interval) {
      clearInterval(clientState.interval);
      clientState.interval = null;
    }

    clientState.demoMode = false;
    clientState.frameIndex = 0;

    logger.info('Embedded demo mode stopped for client');
  }

  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      if (this.shuttingDown) return;

      logger.info(`Received ${signal}, shutting down embedded telemetry`);
      this.shuttingDown = true;

      try {
        this.clients.forEach((state, client) => {
          this.stopDemoMode(client);
          client.close();
        });

        this.wss.close();

        logger.info('Embedded telemetry shutdown complete', { stats: this.stats });
        process.exit(0);
      } catch (error) {
        logger.error('Error during embedded telemetry shutdown', { error: error.message });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

if (require.main === module) {
  const server = new EmbeddedTelemetryServer();
  server.initialize().catch((error) => {
    logger.error('Fatal error in embedded telemetry server', { error: error.message });
    process.exit(1);
  });
}

module.exports = EmbeddedTelemetryServer;
