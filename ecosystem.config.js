/**
 * PM2 Ecosystem Configuration
 * 
 * Manages the Next.js frontend in production.
 * All infrastructure services (Redpanda, RisingWave, Redis, WebSocket
 * server, etc.) run as Docker containers via docker-compose.
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
