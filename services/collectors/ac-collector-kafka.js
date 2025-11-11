/**
 * Assetto Corsa Telemetry Collector (Kafka)
 * 
 * Collects telemetry from Assetto Corsa via UDP and publishes to Kafka
 * 
 * Features:
 * - UDP telemetry parsing
 * - Kafka producer with guaranteed delivery
 * - Protobuf serialization
 * - Automatic reconnection
 * - Graceful shutdown
 * 
 * ### Configure AC
 * 
 * Edit `Documents/Assetto Corsa/cfg/telemetry.ini`:
 * 
 * ```ini
 * [TELEMETRY]
 * ENABLED=1
 * UDP_PORT=9996
 * UDP_ADDRESS=127.0.0.1
 * ```
 */

const dgram = require('dgram');
const KafkaProducer = require('../lib/kafka-producer');
const KafkaAdmin = require('../lib/kafka-admin');
const config = require('../config');
const logger = require('../lib/logger').child({ service: 'ac-collector' });

// AC UDP packet structure offsets
const PACKET_OFFSETS = {
  IDENTIFIER: 0,
  SIZE: 4,
  SPEED: 8,
  LAP_TIME: 40,
  LAP_COUNT: 52,
  THROTTLE: 56,
  BRAKE: 60,
  RPM: 68,
  STEERING: 72,
  GEAR: 76,
  NORMALIZED_POSITION: 308,
};

class ACCollector {
  constructor() {
    // UDP socket
    this.udpServer = dgram.createSocket('udp4');
    
    // Kafka producer and admin
    this.producer = null;
    this.kafkaAdmin = new KafkaAdmin();
    
    // Handshake state
    this.handshakeCompleted = false;
    
    // Session tracking
    this.currentSessionId = null;
    this.currentUserId = null;
    
    // Statistics
    this.stats = {
      packetsReceived: 0,
      framesPublished: 0,
      parseErrors: 0,
      publishErrors: 0,
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
      logger.info('Initializing AC Collector');
      
      // Initialize Kafka producer
      await this.initKafka();
      
      // Setup UDP server
      this.setupUDPServer();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      logger.info('AC Collector initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize collector', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize Kafka producer
   */
  async initKafka() {
    try {
      // Generate session ID (in production, this would come from user/session management)
      this.currentSessionId = `ac-session-${Date.now()}`;
      this.currentUserId = 'user-1'; // TODO: Get from authentication
      
      // Ensure user topic exists
      logger.info('Ensuring user topic exists', { userId: this.currentUserId });
      await this.kafkaAdmin.connect();
      await this.kafkaAdmin.ensureUserTopic(this.currentUserId);
      
      this.producer = new KafkaProducer({
        sessionId: this.currentSessionId,
        userId: this.currentUserId,
        clientId: `${config.kafka.clientId}-ac-collector`,
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
   * Setup UDP server
   */
  setupUDPServer() {
    this.udpServer.on('message', async (msg, rinfo) => {
      await this.handleUDPMessage(msg, rinfo);
    });
    
    this.udpServer.on('error', (err) => {
      logger.error('UDP server error', { error: err.message });
    });
    
    this.udpServer.on('listening', () => {
      const address = this.udpServer.address();
      logger.info('UDP server listening', {
        port: address.port,
        address: address.address,
      });
    });
    
    this.udpServer.bind(
      config.telemetry?.udpPort || process.env.TELEMETRY_UDP_PORT || 9996,
      config.telemetry?.udpHost || process.env.TELEMETRY_UDP_HOST || '0.0.0.0'
    );
  }
  
  /**
   * Handle UDP message from AC
   */
  async handleUDPMessage(buffer, rinfo) {
    try {
      this.stats.packetsReceived++;
      
      // Check for handshake packet
      if (!this.handshakeCompleted && buffer.length < 100) {
        await this.handleHandshake(buffer, rinfo);
        return;
      }
      
      // Parse telemetry packet
      const frame = this.parseTelemetryPacket(buffer);
      if (!frame) {
        this.stats.parseErrors++;
        return;
      }
      
      // Publish to Kafka
      await this.publishTelemetry(frame);
      
    } catch (error) {
      logger.error('Error handling UDP message', { error: error.message });
    }
  }
  
  /**
   * Handle handshake with AC
   */
  async handleHandshake(buffer, rinfo) {
    try {
      logger.info('Received handshake from AC', {
        address: rinfo.address,
        port: rinfo.port,
      });
      
      // Send handshake response
      const response = Buffer.alloc(4);
      response.writeInt32LE(1, 0); // Acknowledge
      
      this.udpServer.send(response, rinfo.port, rinfo.address, (err) => {
        if (err) {
          logger.error('Failed to send handshake response', { error: err.message });
        } else {
          this.handshakeCompleted = true;
          logger.info('Handshake completed with AC');
        }
      });
    } catch (error) {
      logger.error('Error handling handshake', { error: error.message });
    }
  }
  
  /**
   * Parse Assetto Corsa UDP telemetry packet
   * 
   * Packet structure:
   * Offset | Type    | Description
   * -------|---------|-------------
   * 0      | int32   | Identifier
   * 4      | int32   | Size
   * 8      | float32 | Speed (km/h)
   * 40     | int32   | Lap time (ms)
   * 52     | int32   | Lap count
   * 56     | float32 | Gas (0-1)
   * 60     | float32 | Brake (0-1)
   * 68     | int32   | RPM
   * 72     | float32 | Steering (-1 to 1)
   * 76     | int32   | Gear
   * 308    | float32 | Normalized position (0-1)
   */
  parseTelemetryPacket(buffer) {
    try {
      // Check minimum packet size
      if (buffer.length < 312) {
        logger.debug('Packet too small', { size: buffer.length });
        return null;
      }
      
      const frame = {
        timestamp: Date.now(),
        speed: buffer.readFloatLE(PACKET_OFFSETS.SPEED),
        throttle: Math.max(0, Math.min(1, buffer.readFloatLE(PACKET_OFFSETS.THROTTLE))),
        brake: Math.max(0, Math.min(1, buffer.readFloatLE(PACKET_OFFSETS.BRAKE))),
        steering: Math.max(-1, Math.min(1, buffer.readFloatLE(PACKET_OFFSETS.STEERING))),
        gear: buffer.readInt32LE(PACKET_OFFSETS.GEAR),
        rpm: buffer.readInt32LE(PACKET_OFFSETS.RPM),
        normalizedPosition: Math.max(0, Math.min(1, buffer.readFloatLE(PACKET_OFFSETS.NORMALIZED_POSITION))),
        lapNumber: buffer.readInt32LE(PACKET_OFFSETS.LAP_COUNT) + 1,
        lapTime: buffer.readInt32LE(PACKET_OFFSETS.LAP_TIME),
      };
      
      return frame;
    } catch (error) {
      logger.error('Error parsing telemetry packet', { error: error.message });
      return null;
    }
  }
  
  /**
   * Publish telemetry to Kafka
   */
  async publishTelemetry(frame) {
    try {
      await this.producer.publishFrame(frame);
      
      this.stats.framesPublished++;
      
      // Log statistics every 100 frames
      if (this.stats.framesPublished % 100 === 0) {
        logger.debug('Telemetry stats', {
          packetsReceived: this.stats.packetsReceived,
          framesPublished: this.stats.framesPublished,
          parseErrors: this.stats.parseErrors,
          publishErrors: this.stats.publishErrors,
          producerStats: this.producer.getStats(),
        });
      }
    } catch (error) {
      this.stats.publishErrors++;
      logger.error('Failed to publish telemetry', { error: error.message });
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
        // Close UDP server
        this.udpServer.close();
        
        // Disconnect Kafka producer
        if (this.producer) {
          await this.producer.disconnect();
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
  const collector = new ACCollector();
  
  collector.initialize().catch((error) => {
    logger.error('Fatal error', { error: error.message });
    process.exit(1);
  });
}

module.exports = ACCollector;
