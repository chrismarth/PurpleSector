// Kafka admin implementation moved from services/lib/kafka-admin.js
// Uses shared @purplesector/config and the existing logger under services/lib.

const { Kafka } = require('kafkajs');
const config = require('@purplesector/config');
const logger = require('@purplesector/logger').child({ component: 'kafka-admin' });

class KafkaAdmin {
  constructor() {
    this.kafka = new Kafka({
      clientId: `${config.kafka.clientId}-admin`,
      brokers: config.kafka.brokers,
      logLevel: this.mapLogLevel(config.logging.level),
      retry: config.kafka.admin.retry,
    });

    this.admin = this.kafka.admin();
    this.connected = false;
  }

  mapLogLevel(level) {
    const mapping = { error: 1, warn: 2, info: 4, debug: 5 };
    return mapping[level] || 4;
  }

  async connect() {
    try {
      await this.admin.connect();
      this.connected = true;
      logger.info('Admin client connected to Kafka');
      return true;
    } catch (error) {
      logger.error('Failed to connect admin client', { error: error.message });
      throw error;
    }
  }

  async ensureTopics() {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const existingTopics = await this.admin.listTopics();
      logger.info('Existing topics', { topics: existingTopics });

      const topicsToCreate = [];

      if (!existingTopics.includes(config.kafka.topics.telemetry)) {
        topicsToCreate.push({
          topic: config.kafka.topics.telemetry,
          numPartitions: 10,
          replicationFactor: 1,
          configEntries: [
            { name: 'compression.type', value: 'producer' },
            { name: 'retention.ms', value: '3600000' },
            { name: 'segment.ms', value: '600000' },
            { name: 'min.insync.replicas', value: '1' },
          ],
        });
      }

      if (!existingTopics.includes(config.kafka.topics.commands)) {
        topicsToCreate.push({
          topic: config.kafka.topics.commands,
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: 'compression.type', value: 'producer' },
            { name: 'retention.ms', value: '86400000' },
          ],
        });
      }

      if (topicsToCreate.length > 0) {
        logger.info('Creating topics', {
          topics: topicsToCreate.map((t) => t.topic),
        });

        await this.admin.createTopics({
          topics: topicsToCreate,
          waitForLeaders: true,
        });

        logger.info('Topics created successfully');
      } else {
        logger.info('All required topics already exist');
      }

      return true;
    } catch (error) {
      logger.error('Failed to ensure topics', { error: error.message });
      throw error;
    }
  }

  async ensureUserTopic(userId) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const userTopic = `${config.kafka.topics.telemetry}-user-${userId}`;
      const existingTopics = await this.admin.listTopics();

      if (!existingTopics.includes(userTopic)) {
        logger.info('Creating user topic', { userId, topic: userTopic });

        await this.admin.createTopics({
          topics: [
            {
              topic: userTopic,
              numPartitions: 10,
              replicationFactor: 1,
              configEntries: [
                { name: 'compression.type', value: 'producer' },
                { name: 'retention.ms', value: '3600000' },
                { name: 'segment.ms', value: '600000' },
                { name: 'min.insync.replicas', value: '1' },
              ],
            },
          ],
        });

        logger.info('User topic created', { userId, topic: userTopic });
      } else {
        logger.debug('User topic already exists', { userId, topic: userTopic });
      }

      return userTopic;
    } catch (error) {
      logger.error('Failed to ensure user topic', { userId, error: error.message });
      throw error;
    }
  }

  async getTopicMetadata(topic) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const metadata = await this.admin.fetchTopicMetadata({ topics: [topic] });
      return metadata.topics[0];
    } catch (error) {
      logger.error('Failed to fetch topic metadata', {
        topic,
        error: error.message,
      });
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.connected) {
        await this.connect();
      }

      const cluster = await this.admin.describeCluster();

      return {
        healthy: true,
        brokers: cluster.brokers.length,
        controller: cluster.controller,
      };
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  async disconnect() {
    try {
      await this.admin.disconnect();
      this.connected = false;
      logger.info('Admin client disconnected');
    } catch (error) {
      logger.error('Error disconnecting admin client', { error: error.message });
      throw error;
    }
  }
}

module.exports = KafkaAdmin;
