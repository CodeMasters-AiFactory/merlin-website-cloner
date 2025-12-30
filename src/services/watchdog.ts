/**
 * Watchdog Service - Independent Health Monitor
 *
 * This service runs as a SEPARATE process from the main application.
 * It monitors the health of all Merlin services and restarts them if needed.
 *
 * Key responsibilities:
 * - Monitor PM2 processes
 * - Check API health endpoints
 * - Monitor memory and disk usage
 * - Restart failed services
 * - Send alerts on critical issues
 *
 * Created: 2025-12-29
 */

import { exec, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { EmailNotifier, getEmailNotifier } from './emailNotifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'errored' | 'unknown';
  pid?: number;
  memory?: number;
  cpu?: number;
  uptime?: number;
  restarts?: number;
}

interface HealthCheckResult {
  service: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

interface SystemHealth {
  memoryUsage: number;
  memoryFree: number;
  diskFree: number;
  cpuLoad: number;
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

interface WatchdogConfig {
  monitorIntervalMs: number;
  healthCheckTimeoutMs: number;
  maxRestartAttempts: number;
  alertCooldownMs: number;
  endpoints: {
    backend: string;
    frontend: string;
  };
}

const DEFAULT_CONFIG: WatchdogConfig = {
  monitorIntervalMs: 5 * 60 * 1000, // 5 minutes
  healthCheckTimeoutMs: 10 * 1000, // 10 seconds
  maxRestartAttempts: 3,
  alertCooldownMs: 30 * 60 * 1000, // 30 minutes between same alerts
  endpoints: {
    backend: 'http://localhost:3000/api/health',
    frontend: 'http://localhost:5000',
  },
};

export class Watchdog {
  private config: WatchdogConfig;
  private projectRoot: string;
  private logFile: string;
  private alertsFile: string;
  private isRunning: boolean = false;
  private alerts: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private restartAttempts: Map<string, number> = new Map();
  private emailNotifier: EmailNotifier;

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectRoot = path.resolve(__dirname, '../..');
    this.logFile = path.join(this.projectRoot, 'data', 'watchdog.log');
    this.alertsFile = path.join(this.projectRoot, 'data', 'watchdog-alerts.json');

    this.ensureDataDirectory();
    this.loadAlerts();

    // Initialize email notifier
    this.emailNotifier = getEmailNotifier();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.join(this.projectRoot, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Start the watchdog monitoring loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('Already running');
      return;
    }

    this.isRunning = true;
    this.log('='.repeat(50));
    this.log('MERLIN WATCHDOG SERVICE STARTED');
    this.log('='.repeat(50));
    this.log(`Monitor Interval: ${this.config.monitorIntervalMs / 1000}s`);
    this.log(`Backend: ${this.config.endpoints.backend}`);
    this.log(`Frontend: ${this.config.endpoints.frontend}`);

    // Run initial check
    await this.runHealthCheck();

    // Start monitoring loop
    this.monitorLoop();
  }

  /**
   * Stop the watchdog
   */
  stop(): void {
    this.isRunning = false;
    this.log('Watchdog stopped');
  }

  /**
   * Main monitoring loop
   */
  private async monitorLoop(): Promise<void> {
    while (this.isRunning) {
      await this.sleep(this.config.monitorIntervalMs);

      if (!this.isRunning) break;

      try {
        await this.runHealthCheck();
      } catch (error) {
        this.log(`Monitor error: ${error}`, 'error');
      }
    }
  }

  /**
   * Run a complete health check
   */
  async runHealthCheck(): Promise<void> {
    this.log('Running health check...');

    // 1. Check system resources
    const systemHealth = await this.checkSystemHealth();
    this.handleSystemHealth(systemHealth);

    // 2. Check PM2 status
    const pm2Status = await this.checkPM2Status();
    this.handlePM2Status(pm2Status);

    // 3. Check API endpoints
    const backendHealth = await this.checkEndpoint('backend', this.config.endpoints.backend);
    const frontendHealth = await this.checkEndpoint('frontend', this.config.endpoints.frontend);

    this.handleEndpointHealth(backendHealth);
    this.handleEndpointHealth(frontendHealth);

    this.log('Health check complete');
  }

  /**
   * Check system resources
   */
  private async checkSystemHealth(): Promise<SystemHealth> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = Math.round((usedMem / totalMem) * 100);
    const memoryFree = Math.round(freeMem / (1024 * 1024 * 1024) * 10) / 10; // GB

    // Get CPU load average
    const cpuLoad = os.loadavg()[0]; // 1-minute average

    // Get disk space (Windows)
    const diskFree = await this.getDiskSpace();

    return {
      memoryUsage,
      memoryFree,
      diskFree,
      cpuLoad,
    };
  }

  /**
   * Get disk space on Windows
   */
  private async getDiskSpace(): Promise<number> {
    return new Promise((resolve) => {
      exec('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace,Size /format:value', (error, stdout) => {
        if (error) {
          resolve(50); // Default
          return;
        }

        const freeMatch = stdout.match(/FreeSpace=(\d+)/);
        const sizeMatch = stdout.match(/Size=(\d+)/);

        if (freeMatch && sizeMatch) {
          const free = parseInt(freeMatch[1]);
          const size = parseInt(sizeMatch[1]);
          resolve(Math.round((free / size) * 100));
        } else {
          resolve(50);
        }
      });
    });
  }

  /**
   * Handle system health results
   */
  private handleSystemHealth(health: SystemHealth): void {
    this.log(`System: Memory ${health.memoryUsage}%, Disk ${health.diskFree}% free, CPU ${health.cpuLoad.toFixed(2)}`);

    // Memory alerts
    if (health.memoryUsage > 90) {
      this.alert('critical', `CRITICAL: Memory usage at ${health.memoryUsage}%`);
    } else if (health.memoryUsage > 80) {
      this.alert('warning', `High memory usage: ${health.memoryUsage}%`);
    }

    // Disk alerts
    if (health.diskFree < 5) {
      this.alert('critical', `CRITICAL: Disk space at ${health.diskFree}% free`);
    } else if (health.diskFree < 15) {
      this.alert('warning', `Low disk space: ${health.diskFree}% free`);
    }

    // CPU alerts
    if (health.cpuLoad > os.cpus().length * 0.9) {
      this.alert('warning', `High CPU load: ${health.cpuLoad.toFixed(2)}`);
    }
  }

  /**
   * Check PM2 status
   */
  private async checkPM2Status(): Promise<ServiceStatus[]> {
    return new Promise((resolve) => {
      exec('pm2 jlist', (error, stdout) => {
        if (error) {
          this.log('PM2 not running or not installed', 'warning');
          resolve([]);
          return;
        }

        try {
          const processes = JSON.parse(stdout);
          const statuses: ServiceStatus[] = processes.map((proc: any) => ({
            name: proc.name,
            status: proc.pm2_env.status === 'online' ? 'online'
              : proc.pm2_env.status === 'errored' ? 'errored'
              : 'offline',
            pid: proc.pid,
            memory: Math.round(proc.monit?.memory / (1024 * 1024)), // MB
            cpu: proc.monit?.cpu,
            uptime: proc.pm2_env.pm_uptime,
            restarts: proc.pm2_env.restart_time,
          }));
          resolve(statuses);
        } catch {
          resolve([]);
        }
      });
    });
  }

  /**
   * Handle PM2 status results
   */
  private handlePM2Status(statuses: ServiceStatus[]): void {
    if (statuses.length === 0) {
      this.log('No PM2 processes found');
      return;
    }

    for (const status of statuses) {
      this.log(`PM2 ${status.name}: ${status.status} (PID: ${status.pid}, Mem: ${status.memory}MB)`);

      if (status.status === 'errored' || status.status === 'offline') {
        this.alert('warning', `PM2 process ${status.name} is ${status.status}`);
        this.tryRestartPM2Process(status.name);
      }

      // High restart count warning
      if (status.restarts && status.restarts > 10) {
        this.alert('warning', `PM2 process ${status.name} has restarted ${status.restarts} times`);
      }

      // High memory usage
      if (status.memory && status.memory > 2048) { // 2GB
        this.alert('warning', `PM2 process ${status.name} using ${status.memory}MB memory`);
      }
    }
  }

  /**
   * Try to restart a PM2 process
   */
  private async tryRestartPM2Process(name: string): Promise<void> {
    const attempts = this.restartAttempts.get(name) || 0;

    if (attempts >= this.config.maxRestartAttempts) {
      this.alert('critical', `CRITICAL: PM2 process ${name} failed to restart after ${attempts} attempts`);
      return;
    }

    this.restartAttempts.set(name, attempts + 1);
    this.log(`Attempting to restart PM2 process: ${name} (attempt ${attempts + 1})`);

    return new Promise((resolve) => {
      exec(`pm2 restart ${name}`, (error) => {
        if (error) {
          this.log(`Failed to restart ${name}: ${error}`, 'error');
        } else {
          this.log(`Successfully restarted ${name}`);
          this.alert('info', `Restarted PM2 process: ${name}`);
        }
        resolve();
      });
    });
  }

  /**
   * Check an HTTP endpoint
   */
  private async checkEndpoint(name: string, url: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          service: name,
          healthy: false,
          error: 'Timeout',
          lastCheck: new Date(),
        });
      }, this.config.healthCheckTimeoutMs);

      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 80,
        path: urlObj.pathname,
        method: 'GET',
        timeout: this.config.healthCheckTimeoutMs,
      };

      const req = http.request(options, (res) => {
        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;

        resolve({
          service: name,
          healthy: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500,
          responseTime,
          lastCheck: new Date(),
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          service: name,
          healthy: false,
          error: error.message,
          lastCheck: new Date(),
        });
      });

      req.end();
    });
  }

  /**
   * Handle endpoint health check results
   */
  private handleEndpointHealth(result: HealthCheckResult): void {
    if (result.healthy) {
      this.log(`Endpoint ${result.service}: healthy (${result.responseTime}ms)`);

      // Clear restart attempts on success
      this.restartAttempts.delete(result.service);

      // Slow response warning
      if (result.responseTime && result.responseTime > 5000) {
        this.alert('warning', `Endpoint ${result.service} slow response: ${result.responseTime}ms`);
      }
    } else {
      this.log(`Endpoint ${result.service}: unhealthy - ${result.error}`, 'error');
      this.alert('warning', `Endpoint ${result.service} is unhealthy: ${result.error}`);

      // Try to restart via PM2
      const pm2Name = result.service === 'backend' ? 'merlin-backend' : 'merlin-frontend';
      this.tryRestartPM2Process(pm2Name);
    }
  }

  /**
   * Create an alert
   */
  private alert(level: Alert['level'], message: string): void {
    // Check cooldown
    const alertKey = `${level}-${message}`;
    const lastAlert = this.lastAlertTime.get(alertKey);
    const now = Date.now();

    if (lastAlert && now - lastAlert < this.config.alertCooldownMs) {
      return; // Skip duplicate alert within cooldown
    }

    this.lastAlertTime.set(alertKey, now);

    const alert: Alert = {
      id: `alert-${now}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.saveAlerts();

    // Log with appropriate level
    const logLevel = level === 'critical' ? 'error' : level === 'warning' ? 'warning' : 'info';
    this.log(`[ALERT:${level.toUpperCase()}] ${message}`, logLevel);

    // Send email notifications based on level
    if (level === 'critical') {
      this.sendCriticalAlert(alert);
    } else if (level === 'warning') {
      this.sendWarningAlert(alert);
    }
  }

  /**
   * Send critical alert via email and file
   */
  private async sendCriticalAlert(alert: Alert): Promise<void> {
    this.log(`CRITICAL ALERT: ${alert.message}`, 'error');

    // Write to critical alerts file for external monitoring
    const criticalFile = path.join(this.projectRoot, 'data', 'critical-alerts.json');
    let criticalAlerts: Alert[] = [];

    try {
      if (fs.existsSync(criticalFile)) {
        criticalAlerts = JSON.parse(fs.readFileSync(criticalFile, 'utf-8'));
      }
    } catch {}

    criticalAlerts.push(alert);
    fs.writeFileSync(criticalFile, JSON.stringify(criticalAlerts, null, 2));

    // Send email notification
    try {
      await this.emailNotifier.sendCriticalAlert('Watchdog Critical Alert', alert.message);
    } catch (error) {
      this.log(`Failed to send email notification: ${error}`, 'error');
    }
  }

  /**
   * Send warning alert via email
   */
  private async sendWarningAlert(alert: Alert): Promise<void> {
    try {
      await this.emailNotifier.sendWarningAlert('Watchdog Warning', alert.message);
    } catch (error) {
      this.log(`Failed to send email notification: ${error}`, 'error');
    }
  }

  /**
   * Load alerts from disk
   */
  private loadAlerts(): void {
    try {
      if (fs.existsSync(this.alertsFile)) {
        this.alerts = JSON.parse(fs.readFileSync(this.alertsFile, 'utf-8'));
      }
    } catch {}
  }

  /**
   * Save alerts to disk
   */
  private saveAlerts(): void {
    try {
      fs.writeFileSync(this.alertsFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }

  /**
   * Log a message
   */
  private log(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '✗' : level === 'warning' ? '⚠' : '✓';
    const logLine = `[${timestamp}] ${prefix} ${message}`;

    // Console output
    if (level === 'error') {
      console.error(logLine);
    } else if (level === 'warning') {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }

    // File output
    try {
      fs.appendFileSync(this.logFile, logLine + '\n');
    } catch {}
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus(): object {
    return {
      isRunning: this.isRunning,
      alertCount: this.alerts.filter(a => !a.acknowledged).length,
      recentAlerts: this.alerts.slice(-5),
    };
  }

  /**
   * Get all unacknowledged alerts
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.saveAlerts();
      return true;
    }
    return false;
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    this.saveAlerts();
    this.log('All alerts cleared');
  }
}

// Main entry point for standalone execution
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule || process.argv[1]?.includes('watchdog')) {
  const watchdog = new Watchdog();

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n[Watchdog] Shutting down...');
    watchdog.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Watchdog] Received SIGTERM...');
    watchdog.stop();
    process.exit(0);
  });

  // Start
  watchdog.start().catch(console.error);
}

export default Watchdog;
