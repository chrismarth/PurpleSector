/**
 * Kafka-WebSocket Bridge Server
 * 
 * Bridges Kafka telemetry stream to WebSocket clients:
 * - Consumes telemetry from Kafka
 * - Broadcasts to WebSocket clients
 * - Handles demo mode playback
 * - Manages client connections
 * - Protobuf serialization
 * 
 * Architecture:
 * Collectors → Kafka → This Bridge → WebSocket → Frontend Clients
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const KafkaConsumer = require('./lib/kafka-consumer');
const KafkaAdmin = require('./lib/kafka-admin');
const config = require('./config');
const logger = require('./lib/logger').child({ service: 'kafka-ws-bridge' });
const proto = require('../src/proto/telemetry-proto');

class KafkaWebSocketBridge {
  constructor() {
    // WebSocket server
    this.wss = new WebSocket.Server({
      port: config.websocket.port,
      host: config.websocket.host,
      maxPayload: config.websocket.maxPayload,
    });
    
    // Kafka consumers (one per user for isolation)
    this.userConsumers = new Map(); // userId -> KafkaConsumer
    
    // Kafka admin for topic management
    this.kafkaAdmin = new KafkaAdmin();
    
    // Connected clients
    this.clients = new Map(); // WebSocket -> { userId, sessionId, demoMode, interval }
    
    // Demo data
    this.demoData = null;
    
    // Protobuf ready flag
    this.protobufReady = false;
    
    // Statistics
    this.stats = {
      clientsConnected: 0,
      totalClients: 0,
      messagesRelayed: 0,
      bytesRelayed: 0,
      errors: 0,
    };
    
    // Shutdown flag
    this.shuttingDown = false;
  }
  
  /**
   * Initialize the bridge
   */
  async initialize() {
    try {
      logger.info('Initializing Kafka-WebSocket Bridge');
      
      // Initialize protobuf
      await this.initProtobuf();
      
      // Load demo data
      this.loadDemoData();
      
      // Initialize Kafka consumer
      await this.initKafka();
      
      // Setup WebSocket server
      this.setupWebSocketServer();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      logger.info('Bridge initialized successfully', {
        wsPort: config.websocket.port,
        kafkaBrokers: config.kafka.brokers,
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize bridge', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize protobuf
   */
  async initProtobuf() {
    try {
      if (config.protobuf.enabled) {
        await proto.init();
        this.protobufReady = true;
        logger.info('Protobuf initialized');
      }
    } catch (error) {
      logger.warn('Protobuf initialization failed, falling back to JSON', {
        error: error.message,
      });
    }
  }
  
  /**
   * Load demo telemetry data
   */
  loadDemoData() {
    try {
      const demoPath = path.join(__dirname, '../public/demo-telemetry.json');
      if (fs.existsSync(demoPath)) {
        const rawData = fs.readFileSync(demoPath, 'utf8');
        this.demoData = JSON.parse(rawData);
        
        const totalFrames = this.demoData.laps
          ? this.demoData.laps.reduce((sum, lap) => sum + lap.frames.length, 0)
          : this.demoData.frames?.length || 0;
        
        logger.info('Demo data loaded', { totalFrames });
      } else {
        logger.warn('Demo data file not found');
      }
    } catch (error) {
      logger.error('Failed to load demo data', { error: error.message });
    }
  }
  
  /**
   * Initialize Kafka consumer for a specific user
   */
  async initUserConsumer(userId) {
    // Check if consumer already exists
    if (this.userConsumers.has(userId)) {
      logger.debug('Consumer already exists for user', { userId });
      return this.userConsumers.get(userId);
    }
    
    try {
      logger.info('Creating Kafka consumer for user', { userId });
      
      // Ensure user topic exists
      await this.kafkaAdmin.connect();
      const userTopic = await this.kafkaAdmin.ensureUserTopic(userId);
      
      const consumer = new KafkaConsumer({
        groupId: `${config.kafka.consumer.groupId}-bridge-${userId}`,
        topics: [userTopic],
      });
      
      // Connect and subscribe (done in connect())
      await consumer.connect();
      logger.info('Connected to Kafka for user', { userId });
      
      // Start consuming
      await consumer.start(async (message) => {
        await this.handleKafkaMessage(message, userId);
      });
      
      logger.info('Kafka consumer started for user', { userId });
      
      this.userConsumers.set(userId, consumer);
      return consumer;
    } catch (error) {
      logger.error('Failed to initialize user consumer', { userId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize Kafka (legacy - for backward compatibility)
   */
  async initKafka() {
    // This method is now a no-op since we create consumers per-user
    logger.info('Kafka initialization deferred to per-user consumers');
  }
  
  /**
   * Handle message from Kafka
   */
  async handleKafkaMessage(message, userId) {
    try {
      const { frame, sessionId } = message;
      
      // Broadcast to all clients for this user
      await this.broadcastTelemetry(frame, sessionId, userId);
      
      this.stats.messagesRelayed++;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error handling Kafka message', { error: error.message });
    }
  }
  
  /**
   * Broadcast telemetry to WebSocket clients
   */
  async broadcastTelemetry(frame, sessionId, userId) {
    const message = {
      type: 'telemetry',
      data: frame,
    };
    
    let buffer;
    if (this.protobufReady) {
      buffer = proto.createTelemetryMessage(frame);
    } else {
      buffer = Buffer.from(JSON.stringify(message));
    }
    
    this.stats.bytesRelayed += buffer.length;
    
    // Send only to clients belonging to this user
    this.clients.forEach((clientState, client) => {
      if (client.readyState === WebSocket.OPEN && 
          !clientState.demoMode && 
          clientState.userId === userId) {
        try {
          client.send(buffer);
        } catch (error) {
          logger.error('Error sending to client', { error: error.message });
        }
      }
    });
  }
  
  /**
   * Setup WebSocket server
   */
  setupWebSocketServer() {
    this.wss.on('listening', () => {
      logger.info('WebSocket server listening', {
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
  
  /**
   * Handle new client connection
   */
  handleClientConnection(ws, req) {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    
    // Extract userId from query params or headers
    // In production, this should come from authentication
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId') || 'default-user';
    
    logger.info('Client connected', { clientId, userId });
    
    this.stats.clientsConnected++;
    this.stats.totalClients++;
    
    // Initialize client state
    this.clients.set(ws, {
      userId,
      sessionId: null,
      demoMode: false,
      interval: null,
      frameIndex: 0,
    });
    
    // Initialize Kafka consumer for this user (if not already exists)
    this.initUserConsumer(userId).catch(error => {
      logger.error('Failed to initialize consumer for user', { userId, error: error.message });
      ws.close(1011, 'Failed to initialize telemetry stream');
    });
    
    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      message: 'Connected to Purple Sector telemetry server (Kafka)',
      timestamp: Date.now(),
    });
    
    // Handle messages from client
    ws.on('message', (message) => {
      this.handleClientMessage(ws, message, clientId);
    });
    
    // Handle client disconnect
    ws.on('close', async () => {
      const clientState = this.clients.get(ws);
      const userId = clientState?.userId;
      
      logger.info('Client disconnected', { clientId, userId });
      this.stats.clientsConnected--;
      
      if (clientState?.interval) {
        clearInterval(clientState.interval);
      }
      
      this.clients.delete(ws);
      
      // Check if this was the last client for this user
      if (userId) {
        const hasOtherClients = Array.from(this.clients.values())
          .some(state => state.userId === userId);
        
        if (!hasOtherClients) {
          // No more clients for this user, cleanup consumer
          logger.info('Last client for user disconnected, cleaning up consumer', { userId });
          const consumer = this.userConsumers.get(userId);
          if (consumer) {
            try {
              await consumer.disconnect();
              this.userConsumers.delete(userId);
              logger.info('Consumer cleaned up for user', { userId });
            } catch (error) {
              logger.error('Error cleaning up consumer', { userId, error: error.message });
            }
          }
        }
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      logger.error('Client error', { clientId, error: error.message });
    });
  }
  
  /**
   * Handle message from client
   */
  handleClientMessage(ws, message, clientId) {
    try {
      let data;
      
      // Decode protobuf or JSON
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
            logger.warn('Unknown protobuf message type', { type: decoded.type });
            return;
        }
      } else {
        data = JSON.parse(message.toString());
      }
      
      // Handle message types
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
          logger.warn('Unknown message type', { type: data.type, clientId });
      }
    } catch (error) {
      logger.error('Error handling client message', {
        clientId,
        error: error.message,
      });
    }
  }
  
  /**
   * Send message to client
   */
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
    } catch (error) {
      logger.error('Error sending to client', { error: error.message });
    }
  }
  
  /**
   * Start demo mode for a client
   */
  startDemoMode(client) {
    if (!this.demoData) {
      logger.warn('Demo data not available');
      return;
    }
    
    const clientState = this.clients.get(client);
    if (!clientState) return;
    
    // Stop any existing demo
    this.stopDemoMode(client);
    
    logger.info('Starting demo mode for client');
    
    clientState.demoMode = true;
    clientState.frameIndex = 0;
    
    // Flatten all laps
    const laps = this.demoData.laps || [{ frames: this.demoData.frames }];
    const allFrames = laps.flatMap(lap => lap.frames);
    
    const frameRate = 30; // 30 Hz
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
  
  /**
   * Stop demo mode for a client
   */
  stopDemoMode(client) {
    const clientState = this.clients.get(client);
    if (!clientState) return;
    
    if (clientState.interval) {
      clearInterval(clientState.interval);
      clientState.interval = null;
    }
    
    clientState.demoMode = false;
    clientState.frameIndex = 0;
    
    logger.info('Demo mode stopped for client');
  }
  
  /**
   * Get bridge statistics
   */
  getStats() {
    return {
      ...this.stats,
      kafkaStats: this.consumer ? this.consumer.getStats() : null,
    };
  }
  
  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      if (this.shuttingDown) return;
      
      logger.info(`Received ${signal}, shutting down gracefully`);
      this.shuttingDown = true;
      
      try {
        // Stop demo for all clients
        this.clients.forEach((state, client) => {
          this.stopDemoMode(client);
          client.close();
        });
        
        // Close WebSocket server
        this.wss.close();
        
        // Disconnect all user consumers
        const disconnectPromises = [];
        for (const [userId, consumer] of this.userConsumers.entries()) {
          logger.info('Disconnecting consumer for user', { userId });
          disconnectPromises.push(consumer.disconnect());
        }
        
        await Promise.all(disconnectPromises);
        this.userConsumers.clear();
        
        logger.info('Bridge shutdown complete', { stats: this.getStats() });
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.shuttingDown) return;
    
    logger.info('Shutting down bridge');
    this.shuttingDown = true;
    
    try {
      // Close WebSocket server
      this.wss.close();
      
      // Disconnect all user consumers
      const disconnectPromises = [];
      for (const [userId, consumer] of this.userConsumers.entries()) {
        logger.info('Disconnecting consumer for user', { userId });
        disconnectPromises.push(consumer.disconnect());
      }
      
      await Promise.all(disconnectPromises);
      this.userConsumers.clear();
      
      logger.info('Bridge shutdown complete', { stats: this.stats });
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }
}

// Main execution
if (require.main === module) {
  const bridge = new KafkaWebSocketBridge();
  
  bridge.initialize().catch((error) => {
    logger.error('Fatal error', { error: error.message });
    process.exit(1);
  });
}

module.exports = KafkaWebSocketBridge;
