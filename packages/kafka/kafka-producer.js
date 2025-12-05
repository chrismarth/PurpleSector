// Kafka producer implementation moved from services/lib/kafka-producer.js
// Uses shared @purplesector/config and the existing logger under services/lib.

const { Kafka, Partitioners } = require('kafkajs');
const config = require('@purplesector/config');
const logger = require('@purplesector/logger').child({ component: 'kafka-producer' });
const proto = require('@purplesector/proto');

class KafkaProducer {
  constructor(options = {}) {
    this.sessionId = options.sessionId || null;
    this.userId = options.userId || null;
    this.clientId = options.clientId || config.kafka.clientId;

    this.kafka = new Kafka({
      clientId: this.clientId,
      brokers: config.kafka.brokers,
      logLevel: this.mapLogLevel(config.logging.level),
      retry: config.kafka.producer.retry,
    });

    this.producer = this.kafka.producer({
      ...config.kafka.producer,
      createPartitioner: Partitioners.DefaultPartitioner,
      transactionalId: this.sessionId ? `tx-${this.sessionId}` : undefined,
    });

    this.connected = false;
    this.protobufReady = false;
    this.messageBuffer = [];
    this.flushInterval = null;

    this.stats = {
      messagesSent: 0,
      bytesSent: 0,
      errors: 0,
      lastSentAt: null,
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

      await this.producer.connect();
      this.connected = true;
      logger.info('Connected to Kafka', {
        brokers: config.kafka.brokers,
        clientId: this.clientId,
      });

      this.flushInterval = setInterval(() => this.flush(), 100);
      return true;
    } catch (error) {
      logger.error('Failed to connect to Kafka', { error: error.message });
      throw error;
    }
  }

  async publishFrame(frame, options = {}) {
    if (!this.connected) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    try {
      let value;
      if (this.protobufReady) {
        value = proto.createTelemetryMessage(frame);
      } else {
        value = Buffer.from(JSON.stringify(frame));
      }

      const message = {
        key: this.sessionId || options.key || null,
        value,
        timestamp: frame.timestamp ? frame.timestamp.toString() : Date.now().toString(),
        headers: {
          sessionId: this.sessionId || '',
          userId: this.userId || '',
          encoding: this.protobufReady ? 'protobuf' : 'json',
        },
      };

      this.messageBuffer.push(message);

      if (this.messageBuffer.length >= 100) {
        await this.flush();
      }

      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to publish frame', {
        error: error.message,
        sessionId: this.sessionId,
      });
      throw error;
    }
  }

  async flush() {
    if (this.messageBuffer.length === 0) return;

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    try {
      const topic = this.userId
        ? `${config.kafka.topics.telemetry}-user-${this.userId}`
        : config.kafka.topics.telemetry;

      await this.producer.send({
        topic,
        messages,
        acks: config.kafka.producer.acks,
        compression: config.kafka.producer.compression,
      });

      this.stats.messagesSent += messages.length;
      this.stats.bytesSent += messages.reduce((sum, m) => sum + m.value.length, 0);
      this.stats.lastSentAt = Date.now();

      logger.debug('Flushed messages to Kafka', {
        count: messages.length,
        topic,
      });
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to flush messages', {
        error: error.message,
        count: messages.length,
      });

      this.messageBuffer.unshift(...messages);
      throw error;
    }
  }

  async publishBatch(frames) {
    if (!this.connected) {
      throw new Error('Producer not connected. Call connect() first.');
    }

    if (!this.producer.transaction) {
      for (const frame of frames) {
        await this.publishFrame(frame);
      }
      await this.flush();
      return;
    }

    try {
      const transaction = await this.producer.transaction();

      const messages = frames.map((frame) => {
        let value;
        if (this.protobufReady) {
          value = proto.createTelemetryMessage(frame);
        } else {
          value = Buffer.from(JSON.stringify(frame));
        }

        return {
          key: this.sessionId,
          value,
          timestamp: frame.timestamp ? frame.timestamp.toString() : Date.now().toString(),
          headers: {
            sessionId: this.sessionId || '',
            userId: this.userId || '',
            encoding: this.protobufReady ? 'protobuf' : 'json',
          },
        };
      });

      await transaction.send({
        topic: config.kafka.topics.telemetry,
        messages,
      });

      await transaction.commit();

      this.stats.messagesSent += messages.length;
      this.stats.bytesSent += messages.reduce((sum, m) => sum + m.value.length, 0);
      this.stats.lastSentAt = Date.now();

      logger.info('Published batch to Kafka', {
        count: messages.length,
        sessionId: this.sessionId,
      });
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to publish batch', {
        error: error.message,
        count: frames.length,
      });
      throw error;
    }
  }

  getStats() {
    return { ...this.stats };
  }

  async disconnect() {
    try {
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = null;
      }

      if (this.messageBuffer.length > 0) {
        logger.info('Flushing remaining messages before disconnect', {
          count: this.messageBuffer.length,
        });
        await this.flush();
      }

      await this.producer.disconnect();
      this.connected = false;

      logger.info('Disconnected from Kafka', {
        stats: this.stats,
      });
    } catch (error) {
      logger.error('Error disconnecting from Kafka', { error: error.message });
      throw error;
    }
  }
}

module.exports = KafkaProducer;
