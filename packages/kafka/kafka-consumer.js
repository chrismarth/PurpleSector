// Kafka consumer implementation moved from services/lib/kafka-consumer.js
// Uses shared @purplesector/config and the existing logger under services/lib.

const { Kafka } = require('kafkajs');
const config = require('@purplesector/config');
const logger = require('@purplesector/logger').child({ component: 'kafka-consumer' });
const proto = require('@purplesector/proto');

class KafkaConsumer {
  constructor(options = {}) {
    this.clientId = options.clientId || config.kafka.clientId;
    this.groupId = options.groupId || config.kafka.consumer.groupId;
    this.topics = options.topics || [config.kafka.topics.telemetry];
    this.messageHandler = options.messageHandler || null;

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: config.kafka.brokers,
      logLevel: this.mapLogLevel(config.logging.level),
      retry: config.kafka.consumer.retry,
    });

    this.consumer = this.kafka.consumer({
      ...config.kafka.consumer,
      groupId: this.groupId,
    });

    this.connected = false;
    this.protobufReady = false;
    this.running = false;

    this.stats = {
      messagesReceived: 0,
      bytesReceived: 0,
      errors: 0,
      lastReceivedAt: null,
      sessionStats: new Map(),
    };
  }

  mapLogLevel(level) {
    const mapping = { error: 1, warn: 2, info: 4, debug: 5 };
    return mapping[level] || 4;
  }

  async connect() {
    try {
      if (config.protobuf.enabled) {
        await proto.init();
        this.protobufReady = true;
        logger.info('Protobuf initialized');
      }

      await this.consumer.connect();
      this.connected = true;
      logger.info('Connected to Kafka', {
        brokers: config.kafka.brokers,
        groupId: this.groupId,
      });

      for (const topic of this.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
        logger.info('Subscribed to topic', { topic });
      }

      return true;
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error: error.message });
      throw error;
    }
  }

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
        eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
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
              const frame = await this.deserializeMessage(message);
              const sessionId = message.headers?.sessionId?.toString() || 'unknown';

              this.stats.messagesReceived++;
              this.stats.bytesReceived += message.value.length;
              this.stats.lastReceivedAt = Date.now();

              if (!this.stats.sessionStats.has(sessionId)) {
                this.stats.sessionStats.set(sessionId, { count: 0, lastSeen: null });
              }
              const sessionStats = this.stats.sessionStats.get(sessionId);
              sessionStats.count++;
              sessionStats.lastSeen = Date.now();

              await this.messageHandler({
                frame,
                sessionId,
                userId: message.headers?.userId?.toString(),
                partition: batch.partition,
                offset: message.offset,
                timestamp: message.timestamp,
              });

              resolveOffset(message.offset);
              await heartbeat();
            } catch (error) {
              this.stats.errors++;
              logger.error('Error processing message', {
                error: error.message,
                offset: message.offset,
                partition: batch.partition,
              });
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

  async deserializeMessage(message) {
    try {
      const encoding = message.headers?.encoding?.toString() || 'json';

      if (encoding === 'protobuf' && this.protobufReady) {
        const decoded = proto.decodeMessage(message.value);
        if (decoded.type === proto.MessageType.TELEMETRY) {
          return decoded.telemetry;
        }
        throw new Error(`Unexpected message type: ${decoded.type}`);
      }

      return JSON.parse(message.value.toString());
    } catch (error) {
      logger.error('Failed to deserialize message', {
        error: error.message,
        offset: message.offset,
      });
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      sessionStats: Object.fromEntries(this.stats.sessionStats),
    };
  }

  async pause() {
    if (!this.connected) return;
    try {
      await this.consumer.pause(this.topics.map((topic) => ({ topic })));
      logger.info('Consumer paused');
    } catch (error) {
      logger.error('Error pausing consumer', { error: error.message });
      throw error;
    }
  }

  async resume() {
    if (!this.connected) return;
    try {
      await this.consumer.resume(this.topics.map((topic) => ({ topic })));
      logger.info('Consumer resumed');
    } catch (error) {
      logger.error('Error resuming consumer', { error: error.message });
      throw error;
    }
  }

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
