/**
 * PM2 Ecosystem Configuration - Development/Demo Mode
 * 
 * This configuration starts all services needed for local development
 * and testing with the demo collector (no game required).
 * 
 * Usage:
 *   pm2 start ecosystem.dev.config.js
 *   pm2 logs
 *   pm2 stop all
 *   pm2 delete all
 * 
 * Services Started:
 * 1. Kafka-WebSocket Bridge - Real-time streaming to frontend
 * 2. Database Consumer - Persists telemetry to database
 * 3. Demo Collector - Publishes demo data to Kafka
 * 4. Next.js App - Frontend application
 * 
 * Prerequisites:
 * - Kafka running: docker-compose -f docker-compose.kafka.yml up -d
 * - Topics created: npm run kafka:setup
 * - Database ready: npm run db:push
 */

module.exports = {
  apps: [
    // Kafka-WebSocket Bridge
    {
      name: 'kafka-bridge-dev',
      script: 'services/kafka-websocket-bridge.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty',
        SERVICE_NAME: 'kafka-bridge-dev',
        WS_PORT: '8080',
        WS_HOST: '0.0.0.0',
      },
      error_file: 'logs/dev-kafka-bridge-error.log',
      out_file: 'logs/dev-kafka-bridge-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    
    // Kafka Database Consumer
    {
      name: 'kafka-db-consumer-dev',
      script: 'services/kafka-database-consumer.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty',
        SERVICE_NAME: 'kafka-db-consumer-dev',
      },
      error_file: 'logs/dev-kafka-db-consumer-error.log',
      out_file: 'logs/dev-kafka-db-consumer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    
    // Demo Collector
    {
      name: 'demo-collector-dev',
      script: 'collectors/demo-kafka/demo-collector-kafka.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      args: '--loop',
      env: {
        NODE_ENV: 'development',
        PS_USER_ID: 'user',
        PS_DEMO_SOURCE: 'file',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'pretty',
        SERVICE_NAME: 'demo-collector-dev',
      },
      error_file: 'logs/dev-demo-collector-error.log',
      out_file: 'logs/dev-demo-collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    
    // Next.js Application (Development Mode)
    {
      name: 'nextjs-dev',
      script: 'npm',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: '3000',
      },
      error_file: 'logs/dev-nextjs-error.log',
      out_file: 'logs/dev-nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
