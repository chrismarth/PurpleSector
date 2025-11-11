/**
 * Centralized Configuration for Purple Sector Services
 * 
 * All service configuration in one place with environment variable support
 */

module.exports = {
  // Kafka Configuration
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'purple-sector',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    
    // Topic configuration
    topics: {
      telemetry: process.env.KAFKA_TOPIC_TELEMETRY || 'telemetry',
      commands: process.env.KAFKA_TOPIC_COMMANDS || 'commands',
    },
    
    // Producer configuration
    producer: {
      idempotent: true,
      maxInFlightRequests: 5,
      compression: 0, // No compression (use CompressionTypes.None)
      retry: {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
      acks: -1, // Wait for all replicas
    },
    
    // Consumer configuration
    consumer: {
      groupId: process.env.KAFKA_CONSUMER_GROUP || 'telemetry-processors',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 100,
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    },
    
    // Admin configuration
    admin: {
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    },
  },
  
  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT || '8080'),
    host: process.env.WS_HOST || '0.0.0.0',
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000'),
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD || '10485760'), // 10MB
  },
  
  // ACC Collector Configuration
  acc: {
    udpPort: parseInt(process.env.ACC_UDP_PORT || '9000'),
    udpHost: process.env.ACC_UDP_HOST || '0.0.0.0',
    broadcastHost: process.env.ACC_HOST || '127.0.0.1',
    broadcastPort: parseInt(process.env.ACC_BROADCAST_PORT || '9000'),
    displayName: process.env.ACC_DISPLAY_NAME || 'PurpleSector',
    password: process.env.ACC_PASSWORD || '',
    updateInterval: parseInt(process.env.ACC_UPDATE_INTERVAL || '100'),
  },
  
  // AC Collector Configuration
  ac: {
    sharedMemoryInterval: parseInt(process.env.AC_SM_INTERVAL || '16'),
  },
  
  // Telemetry Configuration (shared by collectors)
  telemetry: {
    udpPort: parseInt(process.env.TELEMETRY_UDP_PORT || '9996'),
    udpHost: process.env.TELEMETRY_UDP_HOST || '0.0.0.0',
  },
  
  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json', // 'json' or 'simple'
    file: process.env.LOG_FILE || null,
  },
  
  // Service Configuration
  service: {
    name: process.env.SERVICE_NAME || 'purple-sector-service',
    environment: process.env.NODE_ENV || 'development',
    shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT || '10000'),
  },
  
  // Protobuf Configuration
  protobuf: {
    enabled: process.env.PROTOBUF_ENABLED !== 'false',
  },
};
