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
    // Django API (uvicorn with hot reload)
    {
      name: 'django-api',
      script: path.join(__dirname, 'apps/web/.venv/bin/uvicorn'),
      args: 'purplesector.asgi:application --host 0.0.0.0 --port 8000 --reload',
      cwd: path.join(__dirname, 'apps/web'),
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      interpreter: path.join(__dirname, 'apps/web/.venv/bin/python'),
      env: {
        DJANGO_DEBUG: 'true',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_DB: 'purplesector',
        POSTGRES_USER: 'purplesector',
        POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'devpassword',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        TRINO_HOST: 'localhost',
        TRINO_PORT: '8083',
        RISINGWAVE_HOST: 'localhost',
        RISINGWAVE_PORT: '4566',
      },
      error_file: path.join(__dirname, 'logs/dev-django-error.log'),
      out_file: path.join(__dirname, 'logs/dev-django-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },

    // Vite dev server for web-core (React/Inertia frontend)
    {
      name: 'vite-dev',
      script: 'npm',
      args: 'run dev:vite',
      cwd: path.join(__dirname),
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
      },
      error_file: 'logs/dev-vite-error.log',
      out_file: 'logs/dev-vite-out.log',
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
