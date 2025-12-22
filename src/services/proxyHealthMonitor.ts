/**
 * Proxy Health Monitor
 * Real-time proxy health monitoring and automatic failover
 */

import { ProxyManager, type ProxyConfig } from './proxyManager.js';

export interface HealthCheckResult {
  proxy: ProxyConfig;
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface HealthMonitorOptions {
  checkInterval: number; // Milliseconds between checks
  timeout: number; // Health check timeout
  concurrentChecks: number; // Number of concurrent health checks
  unhealthyThreshold: number; // Number of failures before marking unhealthy
  autoRemove: boolean; // Automatically remove unhealthy proxies
}

export class ProxyHealthMonitor {
  private manager: ProxyManager;
  private options: HealthMonitorOptions;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckResults: Map<string, HealthCheckResult[]> = new Map();
  private checkQueue: ProxyConfig[] = [];

  constructor(manager: ProxyManager, options: Partial<HealthMonitorOptions> = {}) {
    this.manager = manager;
    this.options = {
      checkInterval: options.checkInterval || 60000, // 1 minute default
      timeout: options.timeout || 5000,
      concurrentChecks: options.concurrentChecks || 10,
      unhealthyThreshold: options.unhealthyThreshold || 3,
      autoRemove: options.autoRemove !== false,
    };
  }

  /**
   * Starts continuous health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.performHealthCheck(); // Initial check

    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.options.checkInterval);
  }

  /**
   * Stops health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Performs health check on all proxies
   */
  async performHealthCheck(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    const proxies = this.getAllProxies();
    
    // Check proxies in batches
    for (let i = 0; i < proxies.length; i += this.options.concurrentChecks) {
      const batch = proxies.slice(i, i + this.options.concurrentChecks);
      const batchResults = await Promise.all(
        batch.map(proxy => this.checkProxyHealth(proxy))
      );
      results.push(...batchResults);
    }

    // Update proxy manager with results
    for (const result of results) {
      this.updateProxyHealth(result);
    }

    return results;
  }

  /**
   * Checks health of a single proxy
   */
  async checkProxyHealth(proxy: ProxyConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const proxyKey = this.getProxyKey(proxy);

    try {
      const isHealthy = await this.manager.healthCheck(proxy, this.options.timeout);
      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        proxy,
        isHealthy,
        responseTime,
        timestamp: new Date(),
      };

      // Store result
      const history = this.healthCheckResults.get(proxyKey) || [];
      history.push(result);
      if (history.length > 100) {
        history.shift(); // Keep last 100 results
      }
      this.healthCheckResults.set(proxyKey, history);

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        proxy,
        isHealthy: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      };

      // Store result
      const history = this.healthCheckResults.get(proxyKey) || [];
      history.push(result);
      if (history.length > 100) {
        history.shift();
      }
      this.healthCheckResults.set(proxyKey, history);

      return result;
    }
  }

  /**
   * Updates proxy health based on check result
   */
  private updateProxyHealth(result: HealthCheckResult): void {
    const proxyKey = this.getProxyKey(result.proxy);
    const history = this.healthCheckResults.get(proxyKey) || [];

    // Count recent failures
    const recentChecks = history.slice(-this.options.unhealthyThreshold);
    const failureCount = recentChecks.filter(r => !r.isHealthy).length;

    if (result.isHealthy) {
      this.manager.markProxyWorking(result.proxy);
      this.manager.recordProxySuccess(result.proxy, result.responseTime);
    } else {
      if (failureCount >= this.options.unhealthyThreshold) {
        this.manager.markProxyFailed(result.proxy);
        this.manager.recordProxyFailure(result.proxy);

        if (this.options.autoRemove) {
          // Optionally remove from pool (commented out to keep in pool for retry)
          // this.removeProxy(result.proxy);
        }
      } else {
        this.manager.recordProxyFailure(result.proxy);
      }
    }
  }

  /**
   * Gets health statistics for a proxy
   */
  getProxyHealthStats(proxy: ProxyConfig): {
    isHealthy: boolean;
    averageResponseTime: number;
    successRate: number;
    totalChecks: number;
    recentFailures: number;
    lastChecked?: Date;
  } {
    const proxyKey = this.getProxyKey(proxy);
    const history = this.healthCheckResults.get(proxyKey) || [];

    if (history.length === 0) {
      return {
        isHealthy: true,
        averageResponseTime: 0,
        successRate: 1,
        totalChecks: 0,
        recentFailures: 0,
      };
    }

    const successful = history.filter(r => r.isHealthy);
    const recent = history.slice(-10);
    const recentFailures = recent.filter(r => !r.isHealthy).length;

    const averageResponseTime =
      history.reduce((sum, r) => sum + r.responseTime, 0) / history.length;

    const successRate = successful.length / history.length;

    return {
      isHealthy: proxy.isHealthy !== false && recentFailures < 3,
      averageResponseTime,
      successRate,
      totalChecks: history.length,
      recentFailures,
      lastChecked: history[history.length - 1]?.timestamp,
    };
  }

  /**
   * Gets health statistics for all proxies
   */
  getAllHealthStats(): Map<string, ReturnType<typeof this.getProxyHealthStats>> {
    const stats = new Map();
    const proxies = this.getAllProxies();

    for (const proxy of proxies) {
      const proxyKey = this.getProxyKey(proxy);
      stats.set(proxyKey, this.getProxyHealthStats(proxy));
    }

    return stats;
  }

  /**
   * Gets overall health summary
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    averageResponseTime: number;
    overallSuccessRate: number;
  } {
    const proxies = this.getAllProxies();
    const allStats = this.getAllHealthStats();

    let totalResponseTime = 0;
    let totalSuccessRate = 0;
    let healthyCount = 0;

    for (const [key, stats] of allStats.entries()) {
      totalResponseTime += stats.averageResponseTime;
      totalSuccessRate += stats.successRate;
      if (stats.isHealthy) {
        healthyCount++;
      }
    }

    const count = proxies.length || 1;

    return {
      total: proxies.length,
      healthy: healthyCount,
      unhealthy: proxies.length - healthyCount,
      averageResponseTime: totalResponseTime / count,
      overallSuccessRate: totalSuccessRate / count,
    };
  }

  /**
   * Gets all proxies from manager
   */
  private getAllProxies(): ProxyConfig[] {
    return this.manager.getAllProxies();
  }

  /**
   * Gets proxy key
   */
  private getProxyKey(proxy: ProxyConfig): string {
    return `${proxy.host}:${proxy.port}`;
  }
}

