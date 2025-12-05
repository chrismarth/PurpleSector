/**
 * Assetto Corsa Competizione Telemetry Collector (Kafka)
 * 
 * Collects telemetry from ACC via Shared Memory and publishes to Kafka
 * 
 * Features:
 * - Hybrid data collection (Broadcasting + Shared Memory)
 * - Kafka producer with guaranteed delivery
 * - Protobuf serialization
 * - Automatic reconnection
 * - Graceful shutdown
 * 
 * ### Configure ACC
 * 
 * Edit `Documents/Assetto Corsa Competizione/Config/broadcasting.json`:
 * 
 * ```json
 * {
 *   "updListenerPort": 9000,
 *   "connectionPassword": "",
 *   "commandPassword": ""
 * }
 * ```
 */

const dgram = require('dgram');
const ACCNodeWrapper = require('acc-node-wrapper');
const { KafkaProducer, KafkaAdmin } = require('@purplesector/kafka');
const config = require('@purplesector/config');
const logger = require('@purplesector/logger').child({ service: 'acc-collector' });

// ACC Broadcasting Protocol Constants
const OutboundMessageTypes = {
  REGISTER_COMMAND_APPLICATION: 1,
  UNREGISTER_COMMAND_APPLICATION: 9,
};

const InboundMessageTypes = {
  REGISTRATION_RESULT: 1,
  REALTIME_UPDATE: 2,
  REALTIME_CAR_UPDATE: 3,
  ENTRY_LIST: 4,
  TRACK_DATA: 5,
  ENTRY_LIST_CAR: 6,
  BROADCASTING_EVENT: 7,
};

class ACCCollector {
  constructor() {
    // UDP socket for Broadcasting
    this.udpServer = dgram.createSocket('udp4');
    
    // ACC Node Wrapper for Shared Memory
    this.accWrapper = new ACCNodeWrapper();
    
    // Kafka producer and admin
    this.producer = null;
    this.kafkaAdmin = new KafkaAdmin();
    
    // Connection state
    this.isRegistered = false;
    this.connectionId = -1;
    this.focusedCarIndex = -1;
    this.latestRealtimeUpdate = null;
    
    // Shared Memory state
    this.sharedMemoryInitialized = false;
    this.latestPhysicsData = null;
    this.latestGraphicsData = null;
    
    // Session tracking
    this.currentSessionId = null;
    this.currentUserId = null;
    
    // Statistics
    this.stats = {
      framesCollected: 0,
      framesPublished: 0,
      errors: 0,
      startTime: Date.now(),
    };
    
    // Shutdown flag
    this.shuttingDown = false;
  }
  
  /**
   * Initialize the collector
   */
  async initialize() {
    try {
      logger.info('Initializing ACC Collector');
      
      // Initialize Shared Memory
      await this.initSharedMemory();
      
      // Initialize Kafka producer
      await this.initKafka();
      
      // Setup UDP server
      this.setupUDPServer();
      
      // Register with ACC
      this.registerWithACC();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      logger.info('ACC Collector initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize collector', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize Shared Memory access
   */
  async initSharedMemory() {
    try {
      logger.info('Initializing ACC Shared Memory');
      
      this.accWrapper.initSharedMemory(
        1000, // Physics update interval
        1000, // Graphics update interval
        1000  // Static update interval
      );
      
      // Set up event listeners
      this.accWrapper.on('PHYSICS_UPDATE', (data) => {
        this.latestPhysicsData = data;
      });
      
      this.accWrapper.on('GRAPHICS_UPDATE', (data) => {
        this.latestGraphicsData = data;
      });
      
      this.sharedMemoryInitialized = true;
      logger.info('Shared Memory initialized');
    } catch (error) {
      logger.error('Failed to initialize Shared Memory', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize Kafka producer
   */
  async initKafka() {
    try {
      // Generate session ID (in production, this would come from user/session management)
      this.currentSessionId = `acc-session-${Date.now()}`;
      this.currentUserId = 'user-1'; // TODO: Get from authentication
      
      // Ensure user topic exists
      logger.info('Ensuring user topic exists', { userId: this.currentUserId });
      await this.kafkaAdmin.connect();
      await this.kafkaAdmin.ensureUserTopic(this.currentUserId);
      
      this.producer = new KafkaProducer({
        sessionId: this.currentSessionId,
        userId: this.currentUserId,
        clientId: `${config.kafka.clientId}-acc-collector`,
      });
      
      await this.producer.connect();
      
      logger.info('Kafka producer initialized', {
        sessionId: this.currentSessionId,
        userId: this.currentUserId,
      });
    } catch (error) {
      logger.error('Failed to initialize Kafka', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Setup UDP server for Broadcasting Protocol
   */
  setupUDPServer() {
    this.udpServer.on('message', (msg, rinfo) => {
      this.handleBroadcastingMessage(msg);
    });
    
    this.udpServer.on('error', (err) => {
      logger.error('UDP server error', { error: err.message });
    });
    
    this.udpServer.bind(config.acc.udpPort, config.acc.udpHost, () => {
      logger.info('UDP server listening', {
        port: config.acc.udpPort,
        host: config.acc.udpHost,
      });
    });
  }
  
  /**
   * Register with ACC Broadcasting
   */
  registerWithACC() {
    const buffer = Buffer.alloc(1 + 4 + 4 + config.acc.displayName.length + config.acc.password.length);
    let offset = 0;
    
    // Message type
    buffer.writeUInt8(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION, offset);
    offset += 1;
    
    // Connection ID (placeholder)
    buffer.writeInt32LE(0, offset);
    offset += 4;
    
    // Display name length
    buffer.writeInt32LE(config.acc.displayName.length, offset);
    offset += 4;
    
    // Display name
    buffer.write(config.acc.displayName, offset, 'utf8');
    offset += config.acc.displayName.length;
    
    // Password length
    buffer.writeInt32LE(config.acc.password.length, offset);
    offset += 4;
    
    // Password
    if (config.acc.password.length > 0) {
      buffer.write(config.acc.password, offset, 'utf8');
    }
    
    this.udpServer.send(buffer, config.acc.broadcastPort, config.acc.broadcastHost, (err) => {
      if (err) {
        logger.error('Failed to register with ACC', { error: err.message });
      } else {
        logger.info('Registration request sent to ACC');
      }
    });
  }
  
  /**
   * Handle Broadcasting Protocol message
   */
  handleBroadcastingMessage(msg) {
    if (msg.length < 1) return;
    
    const messageType = msg.readUInt8(0);
    
    switch (messageType) {
      case InboundMessageTypes.REGISTRATION_RESULT:
        this.handleRegistrationResult(msg);
        break;
      case InboundMessageTypes.REALTIME_UPDATE:
        this.handleRealtimeUpdate(msg);
        break;
      case InboundMessageTypes.REALTIME_CAR_UPDATE:
        this.handleRealtimeCarUpdate(msg);
        break;
      default:
        logger.debug('Unhandled message type', { messageType });
    }
  }
  
  /**
   * Handle registration result
   */
  handleRegistrationResult(msg) {
    if (msg.length < 5) return;
    
    this.connectionId = msg.readInt32LE(1);
    const success = msg.readUInt8(5) === 1;
    
    if (success) {
      this.isRegistered = true;
      logger.info('Successfully registered with ACC', {
        connectionId: this.connectionId,
      });
      
      // Request updates
      this.requestUpdate();
    } else {
      logger.error('Registration failed');
    }
  }
  
  /**
   * Request update from ACC
   */
  requestUpdate() {
    if (!this.isRegistered) return;
    
    const buffer = Buffer.alloc(5);
    buffer.writeUInt8(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION, 0);
    buffer.writeInt32LE(this.connectionId, 1);
    
    this.udpServer.send(buffer, config.acc.broadcastPort, config.acc.broadcastHost);
    
    // Schedule next update
    setTimeout(() => {
      if (!this.shuttingDown) {
        this.requestUpdate();
      }
    }, config.acc.updateInterval);
  }
  
  /**
   * Handle realtime update
   */
  handleRealtimeUpdate(msg) {
    // Parse realtime update (simplified)
    this.latestRealtimeUpdate = {
      timestamp: Date.now(),
      // Parse fields from msg...
    };
  }
  
  /**
   * Handle realtime car update (triggers telemetry collection)
   */
  async handleRealtimeCarUpdate(msg) {
    try {
      // This is triggered by Broadcasting updates
      // Now read detailed data from Shared Memory
      await this.collectAndPublishTelemetry();
    } catch (error) {
      this.stats.errors++;
      logger.error('Error handling car update', { error: error.message });
    }
  }
  
  /**
   * Collect telemetry from Shared Memory and publish to Kafka
   */
  async collectAndPublishTelemetry() {
    if (!this.sharedMemoryInitialized || !this.latestPhysicsData || !this.latestGraphicsData) {
      return;
    }
    
    try {
      const physics = this.latestPhysicsData;
      const graphics = this.latestGraphicsData;
      
      // Build telemetry frame
      const frame = {
        timestamp: Date.now(),
        lapTime: graphics.iCurrentTime || 0,
        throttle: physics.gas || 0,
        brake: physics.brake || 0,
        steering: physics.steerAngle || 0,
        speed: physics.speedKmh || 0,
        gear: physics.gear || 0,
        rpm: physics.rpms || 0,
        normalizedPosition: graphics.normalizedCarPosition || 0,
        lapNumber: graphics.completedLaps + 1 || 1,
      };
      
      this.stats.framesCollected++;
      
      // Publish to Kafka
      await this.producer.publishFrame(frame);
      
      this.stats.framesPublished++;
      
      if (this.stats.framesPublished % 100 === 0) {
        logger.debug('Telemetry stats', {
          collected: this.stats.framesCollected,
          published: this.stats.framesPublished,
          errors: this.stats.errors,
          producerStats: this.producer.getStats(),
        });
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to collect/publish telemetry', { error: error.message });
    }
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
        // Unregister from ACC
        if (this.isRegistered) {
          const buffer = Buffer.alloc(5);
          buffer.writeUInt8(OutboundMessageTypes.UNREGISTER_COMMAND_APPLICATION, 0);
          buffer.writeInt32LE(this.connectionId, 1);
          this.udpServer.send(buffer, config.acc.broadcastPort, config.acc.broadcastHost);
        }
        
        // Close UDP server
        this.udpServer.close();
        
        // Disconnect Kafka producer
        if (this.producer) {
          await this.producer.disconnect();
        }
        
        // Cleanup Shared Memory
        if (this.sharedMemoryInitialized) {
          this.accWrapper.disconnect();
        }
        
        logger.info('Shutdown complete', { stats: this.stats });
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }
}

// Main execution
if (require.main === module) {
  const collector = new ACCCollector();
  
  collector.initialize().catch((error) => {
    logger.error('Fatal error', { error: error.message });
    process.exit(1);
  });
}

module.exports = ACCCollector;
