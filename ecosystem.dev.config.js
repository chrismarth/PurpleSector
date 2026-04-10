/**
 * PM2 Ecosystem Configuration - Development/Demo Mode
 * 
 * Starts the Next.js frontend on the host (for hot reload during dev).
 * All infrastructure services (Redpanda, RisingWave, Redis, WebSocket
 * server, etc.) are managed by docker-compose.dev.yml.
 * 
 * Usage:
 *   pm2 start ecosystem.dev.config.js
 *   pm2 logs
 *   pm2 stop all
 *   pm2 delete all
 * 
 * Prerequisites:
 * - Docker infrastructure: docker compose -f docker-compose.dev.yml up -d
 * - Database ready: npm run db:push
 * - Or just run: ./scripts/start-dev.sh
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
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
        DATABASE_URL: process.env.DATABASE_URL,
      },
      error_file: 'logs/dev-nextjs-error.log',
      out_file: 'logs/dev-nextjs-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
    
    // Demo Replay (Shared Demo Telemetry)
    {
      name: 'demo-replay',
      script: './rust/target/release/ps-demo-replay',
      cwd: '/home/racerx/Projects/PurpleSector',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        DEMO_USER_ID: '__demo__',
        DEMO_SOURCE: 'demo',
        RUST_LOG: 'info',
      },
      error_file: 'logs/demo-replay-error.log',
      out_file: 'logs/demo-replay-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
};
