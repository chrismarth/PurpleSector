/**
 * Kafka Consumer Service
 * 
 * Handles consuming telemetry data from Kafka with:
 * - Automatic reconnection
 * - Consumer group management
 * - Protobuf deserialization
 * - Error handling and retries
 * - Graceful shutdown
 * - Message ordering per session
 */

const { Kafka } = require('kafkajs');
const config = require('../config');
const logger = require('./logger').child({ component: 'kafka-consumer' });
const proto = require('../../src/proto/telemetry-proto');

class KafkaConsumer {
  constructor(options = {}) {
    this.clientId = options.clientId || config.kafka.clientId;
    this.groupId = options.groupId || config.kafka.consumer.groupId;
    this.topics = options.topics || [config.kafka.topics.telemetry];
    this.messageHandler = options.messageHandler || null;
    
    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: config.kafka.brokers,
      logLevel: this.mapLogLevel(config.logging.level),
      retry: config.kafka.consumer.retry,
    });
    
    // Create consumer
    this.consumer = this.kafka.consumer({
      ...config.kafka.consumer,
      groupId: this.groupId,
    });
    
    this.connected = false;
    this.protobufReady = false;
    this.running = false;
    
    // Statistics
    this.stats = {
      messagesReceived: 0,
      bytesReceived: 0,
      errors: 0,
      lastReceivedAt: null,
      sessionStats: new Map(), // sessionId -> { count, lastSeen }
    };
  }
  
  /**
   * Map winston log level to kafkajs log level
   */
  mapLogLevel(level) {
    const mapping = {
      error: 1,
      warn: 2,
      info: 4,
      debug: 5,
    };
    return mapping[level] || 4;
  }
  
  /**
   * Initialize protobuf and connect to Kafka
   */
  async connect() {
    try {
      // Initialize protobuf
      if (config.protobuf.enabled) {
        await proto.init();
        this.protobufReady = true;
        logger.info('Protobuf initialized');
      }
      
      // Connect to Kafka
      await this.consumer.connect();
      this.connected = true;
      logger.info('Connected to Kafka', {
        brokers: config.kafka.brokers,
        groupId: this.groupId,
      });
      
      // Subscribe to topics
      for (const topic of this.topics) {
        await this.consumer.subscribe({
          topic,
          fromBeginning: false,
        });
        logger.info('Subscribed to topic', { topic });
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Start consuming messages
   * @param {Function} handler - Message handler function (message) => Promise<void>
   */
  async start(handler) {
    if (!this.connected) {
      throw new Error('Consumer not connected. Call connect() first.');
    }
    
    if (this.running) {
      logger.warn('Consumer already running');
      return;
    }
    
    this.messageHandler = handler || this.messageHandler;
    
    if (!this.messageHandler) {
      throw new Error('No message handler provided');
    }
    
    this.running = true;
    
    try {
      await this.consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async ({
          batch,
          resolveOffset,
          heartbeat,
          isRunning,
          isStale,
        }) => {
          logger.debug('Processing batch', {
            topic: batch.topic,
            partition: batch.partition,
            messageCount: batch.messages.length,
          });
          
          for (const message of batch.messages) {
            if (!isRunning() || isStale()) {
              logger.warn('Consumer stale or not running, stopping batch processing');
              break;
            }
            
            try {
              // Deserialize message
              const frame = await this.deserializeMessage(message);
              
              // Extract session info
              const sessionId = message.headers?.sessionId?.toString() || 'unknown';
              
              // Update statistics
              this.stats.messagesReceived++;
              this.stats.bytesReceived += message.value.length;
              this.stats.lastReceivedAt = Date.now();
              
              if (!this.stats.sessionStats.has(sessionId)) {
                this.stats.sessionStats.set(sessionId, { count: 0, lastSeen: null });
              }
              const sessionStats = this.stats.sessionStats.get(sessionId);
              sessionStats.count++;
              sessionStats.lastSeen = Date.now();
              
              // Call message handler
              await this.messageHandler({
                frame,
                sessionId,
                userId: message.headers?.userId?.toString(),
                partition: batch.partition,
                offset: message.offset,
                timestamp: message.timestamp,
              });
              
              // Resolve offset
              resolveOffset(message.offset);
              
              // Send heartbeat periodically
              await heartbeat();
            } catch (error) {
              this.stats.errors++;
              logger.error('Error processing message', {
                error: error.message,
                offset: message.offset,
                partition: batch.partition,
              });
              
              // Decide whether to continue or stop
              // For now, log and continue
            }
          }
        },
      });
    } catch (error) {
      this.running = false;
      logger.error('Consumer run error', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Deserialize a Kafka message
   * @param {Object} message - Kafka message
   * @returns {Object} Deserialized telemetry frame
   */
  async deserializeMessage(message) {
    try {
      const encoding = message.headers?.encoding?.toString() || 'json';
      
      if (encoding === 'protobuf' && this.protobufReady) {
        // Decode protobuf
        const decoded = proto.decodeMessage(message.value);
        if (decoded.type === proto.MessageType.TELEMETRY) {
          return decoded.telemetry;
        } else {
          throw new Error(`Unexpected message type: ${decoded.type}`);
        }
      } else {
        // Parse JSON
        return JSON.parse(message.value.toString());
      }
    } catch (error) {
      logger.error('Failed to deserialize message', {
        error: error.message,
        offset: message.offset,
      });
      throw error;
    }
  }
  
  /**
   * Get consumer statistics
   */
  getStats() {
    return {
      ...this.stats,
      sessionStats: Object.fromEntries(this.stats.sessionStats),
    };
  }
  
  /**
   * Pause consumption
   */
  async pause() {
    if (!this.connected) return;
    
    try {
      await this.consumer.pause(
        this.topics.map(topic => ({ topic }))
      );
      logger.info('Consumer paused');
    } catch (error) {
      logger.error('Error pausing consumer', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Resume consumption
   */
  async resume() {
    if (!this.connected) return;
    
    try {
      await this.consumer.resume(
        this.topics.map(topic => ({ topic }))
      );
      logger.info('Consumer resumed');
    } catch (error) {
      logger.error('Error resuming consumer', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Disconnect from Kafka
   */
  async disconnect() {
    try {
      this.running = false;
      
      await this.consumer.disconnect();
      this.connected = false;
      
      logger.info('Disconnected from Kafka', {
        stats: this.getStats(),
      });
    } catch (error) {
      logger.error('Error disconnecting from Kafka', { error: error.message });
      throw error;
    }
  }
}

module.exports = KafkaConsumer;
