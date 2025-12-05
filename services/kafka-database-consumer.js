/**
 * Kafka Database Consumer
 * 
 * Consumes telemetry from Kafka and persists to TimescaleDB
 * 
 * Features:
 * - Consumes from all user topics
 * - Batch inserts for performance
 * - Automatic schema creation
 * - Session management
 * - Lap detection and persistence
 * - Error handling and retry
 * 
 * Architecture:
 * Collectors → Kafka → This Consumer → TimescaleDB
 */

const { PrismaClient } = require('@prisma/client');
const config = require('@purplesector/config');
const { KafkaConsumer } = require('@purplesector/kafka');
const logger = require('@purplesector/logger').child({ service: 'kafka-db-consumer' });

class KafkaDatabaseConsumer {
  constructor() {
    // Prisma client for database operations
    this.prisma = new PrismaClient();
    
    // Kafka consumer
    this.consumer = null;
    
    // Batch buffer for telemetry frames
    this.batchBuffer = [];
    this.batchSize = 100;
    this.flushInterval = null;
    
    // Session tracking
    this.activeSessions = new Map(); // sessionId -> { userId, startTime, lastFrame, lapNumber }
    
    // Lap tracking
    this.lapBuffers = new Map(); // sessionId -> { lapNumber, frames[] }
    
    // Statistics
    this.stats = {
      framesReceived: 0,
      framesInserted: 0,
      sessionsCreated: 0,
      lapsCreated: 0,
      batchesProcessed: 0,
      errors: 0,
      startTime: Date.now(),
    };
    
    // Shutdown flag
    this.shuttingDown = false;
  }
  
  /**
   * Initialize the consumer
   */
  async initialize() {
    try {
      logger.info('Initializing Kafka Database Consumer');
      
      // Connect to database
      await this.connectDatabase();
      
      // Initialize Kafka consumer
      await this.initKafka();
      
      // Setup batch flushing
      this.setupBatchFlushing();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      logger.info('Database consumer initialized successfully');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize consumer', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Connect to database
   */
  async connectDatabase() {
    try {
      await this.prisma.$connect();
      logger.info('Connected to database');
    } catch (error) {
      logger.error('Failed to connect to database', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize Kafka consumer
   * Subscribes to all telemetry topics (pattern matching)
   */
  async initKafka() {
    try {
      logger.info('Connecting to Kafka', { brokers: config.kafka.brokers });
      
      // Use pattern to match all user topics
      this.consumer = new KafkaConsumer({
        groupId: `${config.kafka.consumer.groupId}-database`,
        topics: [`${config.kafka.topics.telemetry}-user-.*`], // Pattern matching
      });
      
      // Override subscribe to use regex pattern
      await this.consumer.connect();
      
      // Subscribe with regex pattern
      await this.consumer.consumer.subscribe({
        topics: [new RegExp(`^${config.kafka.topics.telemetry}-user-.*$`)],
        fromBeginning: false,
      });
      
      logger.info('Subscribed to user topics pattern');
      
      // Start consuming
      await this.consumer.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this.handleKafkaMessage(topic, message);
        },
      });
      
      logger.info('Kafka consumer started');
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Handle message from Kafka
   */
  async handleKafkaMessage(topic, message) {
    try {
      this.stats.framesReceived++;
      
      // Extract userId from topic name
      const userId = topic.replace(`${config.kafka.topics.telemetry}-user-`, '');
      
      // Decode message
      const headers = {};
      if (message.headers) {
        Object.keys(message.headers).forEach(key => {
          headers[key] = message.headers[key].toString();
        });
      }
      
      const sessionId = headers.sessionId || 'unknown';
      const encoding = headers.encoding || 'json';
      
      let frame;
      if (encoding === 'protobuf') {
        const proto = require('@purplesector/proto');
        frame = proto.decodeTelemetryFrame(message.value);
      } else {
        frame = JSON.parse(message.value.toString());
      }
      
      // Add metadata
      frame.userId = userId;
      frame.sessionId = sessionId;
      
      // Process frame
      await this.processFrame(frame);
      
    } catch (error) {
      this.stats.errors++;
      logger.error('Error handling Kafka message', { error: error.message });
    }
  }
  
  /**
   * Process telemetry frame
   */
  async processFrame(frame) {
    const { userId, sessionId } = frame;
    
    // Ensure session exists
    await this.ensureSession(userId, sessionId, frame);
    
    // Track lap changes
    await this.trackLap(sessionId, frame);
    
    // Add to batch buffer
    this.batchBuffer.push(frame);
    
    // Flush if batch is full
    if (this.batchBuffer.length >= this.batchSize) {
      await this.flushBatch();
    }
  }
  
  /**
   * Ensure session exists in database
   */
  async ensureSession(userId, sessionId, frame) {
    // Check if we're already tracking this session
    if (this.activeSessions.has(sessionId)) {
      const session = this.activeSessions.get(sessionId);
      session.lastFrame = frame;
      return;
    }
    
    try {
      // Check if session exists in database
      let session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });
      
      if (!session) {
        // Create new session
        session = await this.prisma.session.create({
          data: {
            id: sessionId,
            userId: userId || 'unknown',
            startTime: new Date(frame.timestamp || Date.now()),
            status: 'active',
            // Additional fields from frame if available
            track: frame.track || 'Unknown',
            car: frame.car || 'Unknown',
          },
        });
        
        this.stats.sessionsCreated++;
        logger.info('Created new session', { sessionId, userId });
      }
      
      // Track in memory
      this.activeSessions.set(sessionId, {
        userId,
        startTime: session.startTime,
        lastFrame: frame,
        lapNumber: frame.lapNumber || 0,
      });
      
    } catch (error) {
      logger.error('Failed to ensure session', { sessionId, error: error.message });
    }
  }
  
  /**
   * Track lap changes and create lap records
   */
  async trackLap(sessionId, frame) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    
    const currentLap = frame.lapNumber || 0;
    const previousLap = session.lapNumber;
    
    // Lap changed
    if (currentLap > previousLap && previousLap > 0) {
      logger.info('Lap completed', { sessionId, lapNumber: previousLap });
      
      // Get lap frames from buffer
      const lapBuffer = this.lapBuffers.get(sessionId);
      if (lapBuffer && lapBuffer.lapNumber === previousLap) {
        await this.saveLap(sessionId, previousLap, lapBuffer.frames);
        this.lapBuffers.delete(sessionId);
      }
    }
    
    // Update session lap number
    session.lapNumber = currentLap;
    
    // Buffer frames for current lap
    if (!this.lapBuffers.has(sessionId) || this.lapBuffers.get(sessionId).lapNumber !== currentLap) {
      this.lapBuffers.set(sessionId, {
        lapNumber: currentLap,
        frames: [],
      });
    }
    
    this.lapBuffers.get(sessionId).frames.push(frame);
  }
  
  /**
   * Save lap to database
   */
  async saveLap(sessionId, lapNumber, frames) {
    try {
      // Calculate lap time
      const firstFrame = frames[0];
      const lastFrame = frames[frames.length - 1];
      const lapTime = lastFrame.lapTime || (lastFrame.timestamp - firstFrame.timestamp);
      
      // Create lap record
      const lap = await this.prisma.lap.create({
        data: {
          sessionId,
          lapNumber,
          lapTime,
          startTime: new Date(firstFrame.timestamp),
          endTime: new Date(lastFrame.timestamp),
          isValid: true, // TODO: Determine validity
        },
      });
      
      this.stats.lapsCreated++;
      logger.info('Lap saved', { sessionId, lapNumber, lapTime });
      
      return lap;
    } catch (error) {
      logger.error('Failed to save lap', { sessionId, lapNumber, error: error.message });
    }
  }
  
  /**
   * Flush batch buffer to database
   */
  async flushBatch() {
    if (this.batchBuffer.length === 0) return;
    
    const frames = [...this.batchBuffer];
    this.batchBuffer = [];
    
    try {
      // Batch insert telemetry frames
      await this.prisma.telemetryFrame.createMany({
        data: frames.map(frame => ({
          sessionId: frame.sessionId,
          timestamp: new Date(frame.timestamp || Date.now()),
          lapNumber: frame.lapNumber || 0,
          lapTime: frame.lapTime || 0,
          normalizedPosition: frame.normalizedPosition || 0,
          speed: frame.speed || 0,
          throttle: frame.throttle || 0,
          brake: frame.brake || 0,
          steering: frame.steering || 0,
          gear: frame.gear || 0,
          rpm: frame.rpm || 0,
          // Add more fields as needed
        })),
        skipDuplicates: true,
      });
      
      this.stats.framesInserted += frames.length;
      this.stats.batchesProcessed++;
      
      logger.debug('Batch flushed', {
        count: frames.length,
        totalInserted: this.stats.framesInserted,
      });
      
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to flush batch', { error: error.message, count: frames.length });
      
      // Re-add frames to buffer for retry
      this.batchBuffer.unshift(...frames);
    }
  }
  
  /**
   * Setup automatic batch flushing
   */
  setupBatchFlushing() {
    // Flush every 5 seconds
    this.flushInterval = setInterval(async () => {
      if (this.batchBuffer.length > 0) {
        await this.flushBatch();
      }
    }, 5000);
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const framesPerSecond = this.stats.framesReceived / (uptime / 1000);
    
    return {
      ...this.stats,
      uptime,
      framesPerSecond: framesPerSecond.toFixed(2),
      activeSessions: this.activeSessions.size,
      bufferedFrames: this.batchBuffer.length,
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
        // Stop batch flushing
        if (this.flushInterval) {
          clearInterval(this.flushInterval);
        }
        
        // Flush remaining frames
        await this.flushBatch();
        
        // Disconnect Kafka consumer
        if (this.consumer) {
          await this.consumer.disconnect();
        }
        
        // Disconnect database
        await this.prisma.$disconnect();
        
        logger.info('Shutdown complete', { stats: this.getStats() });
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Log statistics every 30 seconds
    setInterval(() => {
      logger.info('Consumer statistics', this.getStats());
    }, 30000);
  }
}

// Main execution
if (require.main === module) {
  const consumer = new KafkaDatabaseConsumer();
  
  consumer.initialize().catch((error) => {
    logger.error('Fatal error', { error: error.message });
    process.exit(1);
  });
}

module.exports = KafkaDatabaseConsumer;
