/**
 * PM2 Ecosystem Configuration for Merlin Website Cloner
 *
 * This configuration manages all Merlin services for 24/7 operation:
 * - Backend API server (port 3000)
 * - Frontend dev server (port 5000)
 * - AutoImprover (autonomous improvement service)
 * - Watchdog (independent health monitor)
 *
 * Installation:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup (to enable boot persistence)
 *
 * Commands:
 *   pm2 status           - View all processes
 *   pm2 logs             - View all logs
 *   pm2 logs merlin-backend  - View specific logs
 *   pm2 restart all      - Restart all processes
 *   pm2 stop all         - Stop all processes
 *   pm2 delete all       - Remove all processes
 *   pm2 monit            - Real-time monitoring dashboard
 *
 * Created: 2025-12-29
 */

const path = require('path');

// Project root directory
const PROJECT_ROOT = 'c:/Cursor Projects/Mirror Site';

module.exports = {
  apps: [
    // ==========================================
    // BACKEND API SERVER
    // ==========================================
    {
      name: 'merlin-backend',
      script: 'npm.cmd',
      args: 'run server',
      cwd: PROJECT_ROOT,
      interpreter: 'none',

      // Resource limits
      max_memory_restart: '2G',
      node_args: '--max-old-space-size=2048',

      // Restart behavior
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Logging
      log_file: path.join(PROJECT_ROOT, 'data', 'logs', 'backend-combined.log'),
      out_file: path.join(PROJECT_ROOT, 'data', 'logs', 'backend-out.log'),
      error_file: path.join(PROJECT_ROOT, 'data', 'logs', 'backend-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },

    // ==========================================
    // FRONTEND DEV SERVER
    // ==========================================
    {
      name: 'merlin-frontend',
      script: 'npm.cmd',
      args: 'run frontend',
      cwd: PROJECT_ROOT,
      interpreter: 'none',

      // Resource limits
      max_memory_restart: '1G',

      // Restart behavior
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,

      // Logging
      log_file: path.join(PROJECT_ROOT, 'data', 'logs', 'frontend-combined.log'),
      out_file: path.join(PROJECT_ROOT, 'data', 'logs', 'frontend-out.log'),
      error_file: path.join(PROJECT_ROOT, 'data', 'logs', 'frontend-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },

    // ==========================================
    // AUTO-IMPROVER (Autonomous Improvement Agent)
    // ==========================================
    {
      name: 'merlin-autoimprover',
      script: 'npx.cmd',
      args: 'ts-node src/services/autoImprover.ts',
      cwd: PROJECT_ROOT,
      interpreter: 'none',

      // Resource limits
      max_memory_restart: '4G',
      node_args: '--max-old-space-size=4096',

      // Restart behavior
      autorestart: true,
      watch: false,
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 10000,

      // Cron restart (every 6 hours to refresh state)
      cron_restart: '0 */6 * * *',

      // Logging
      log_file: path.join(PROJECT_ROOT, 'data', 'logs', 'autoimprover-combined.log'),
      out_file: path.join(PROJECT_ROOT, 'data', 'logs', 'autoimprover-out.log'),
      error_file: path.join(PROJECT_ROOT, 'data', 'logs', 'autoimprover-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
        AUTO_IMPROVE: 'true',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      },

      // Wait for backend to be ready
      wait_ready: true,
      listen_timeout: 30000,
    },

    // ==========================================
    // WATCHDOG (Independent Health Monitor)
    // ==========================================
    {
      name: 'merlin-watchdog',
      script: 'npx.cmd',
      args: 'ts-node src/services/watchdog.ts',
      cwd: PROJECT_ROOT,
      interpreter: 'none',

      // Resource limits (keep it lightweight)
      max_memory_restart: '512M',

      // Restart behavior
      autorestart: true,
      watch: false,
      max_restarts: 20,  // Higher because it's the monitor itself
      min_uptime: '5s',
      restart_delay: 5000,

      // Logging
      log_file: path.join(PROJECT_ROOT, 'data', 'logs', 'watchdog-combined.log'),
      out_file: path.join(PROJECT_ROOT, 'data', 'logs', 'watchdog-out.log'),
      error_file: path.join(PROJECT_ROOT, 'data', 'logs', 'watchdog-error.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
      },
    },
  ],

  // ==========================================
  // DEPLOYMENT CONFIGURATION
  // ==========================================
  deploy: {
    production: {
      user: 'merlin',
      host: 'localhost',
      ref: 'origin/main',
      repo: PROJECT_ROOT,
      path: PROJECT_ROOT,
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production',
    },
  },
};
