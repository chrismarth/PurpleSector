/**
 * Kafka Setup Script
 * 
 * Ensures Kafka topics are created with proper configuration
 * Run this before starting collectors/bridge
 */

const { KafkaAdmin } = require('@purplesector/kafka');
const logger = require('@purplesector/logger').child({ service: 'kafka-setup' });

async function setup() {
  const admin = new KafkaAdmin();
  
  try {
    logger.info('Starting Kafka setup');
    
    // Connect to Kafka
    await admin.connect();
    
    // Health check
    const health = await admin.healthCheck();
    if (!health.healthy) {
      throw new Error(`Kafka cluster unhealthy: ${health.error}`);
    }
    
    logger.info('Kafka cluster healthy', {
      brokers: health.brokers,
      controller: health.controller,
    });
    
    // Ensure topics exist
    await admin.ensureTopics();
    
    // Get topic metadata
    const telemetryMeta = await admin.getTopicMetadata('telemetry');
    logger.info('Telemetry topic metadata', {
      partitions: telemetryMeta.partitions.length,
    });
    
    logger.info('Kafka setup complete');
    
    await admin.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Kafka setup failed', { error: error.message });
    await admin.disconnect();
    process.exit(1);
  }
}

setup();
