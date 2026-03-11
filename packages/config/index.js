/**
 * Centralized Configuration for Purple Sector Services
 *
 * All service configuration in one place with environment variable support.
 * This implementation was originally in services/config and is now the
 * source of truth for @purplesector/config consumers.
 */

module.exports = {
  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT || '8080'),
    host: process.env.WS_HOST || '0.0.0.0',
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000'),
    maxPayload: parseInt(process.env.WS_MAX_PAYLOAD || '10485760'),
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
    format: process.env.LOG_FORMAT || 'json',
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
