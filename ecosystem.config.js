/**
 * PM2 Ecosystem Configuration
 * 
 * Manages Purple Sector services in production
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 stop all
 *   pm2 restart all
 *   pm2 logs
 *   pm2 monit
 */

module.exports = {
  apps: [
    // Kafka-WebSocket Bridge
    {
      name: 'kafka-bridge',
      script: 'services/kafka-websocket-bridge.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
        SERVICE_NAME: 'kafka-bridge',
      },
      error_file: 'logs/kafka-bridge-error.log',
      out_file: 'logs/kafka-bridge-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    
    // AC Telemetry Collector (Kafka)
    {
      name: 'ac-collector',
      script: 'collectors/ac-kafka/ac-collector-kafka.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
        SERVICE_NAME: 'ac-collector',
      },
      error_file: 'logs/ac-collector-error.log',
      out_file: 'logs/ac-collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    
    // ACC Telemetry Collector (Kafka)
    {
      name: 'acc-collector',
      script: 'collectors/acc-kafka/acc-collector-kafka.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
        SERVICE_NAME: 'acc-collector',
      },
      error_file: 'logs/acc-collector-error.log',
      out_file: 'logs/acc-collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Only start if ACC is running
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
    
    // Kafka Database Consumer
    {
      name: 'kafka-db-consumer',
      script: 'services/kafka-database-consumer.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'json',
        SERVICE_NAME: 'kafka-db-consumer',
      },
      error_file: 'logs/kafka-db-consumer-error.log',
      out_file: 'logs/kafka-db-consumer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    
    // Next.js Application
    {
      name: 'nextjs-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/nextjs-error.log',
      out_file: 'logs/nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
