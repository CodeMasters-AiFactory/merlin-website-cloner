/**
 * Monitoring Service
 * Prometheus metrics collection for performance and health monitoring
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export interface MetricLabels {
  [key: string]: string | number;
}

/**
 * Monitoring Service
 * Collects Prometheus metrics for application monitoring
 */
export class MonitoringService {
  private registry: Registry;
  private metrics: {
    requestsTotal: Counter<string>;
    requestDuration: Histogram<string>;
    pagesCloned: Counter<string>;
    assetsCaptured: Counter<string>;
    errorsTotal: Counter<string>;
    cacheHits: Counter<string>;
    cacheMisses: Counter<string>;
    activeJobs: Gauge<string>;
    queueSize: Gauge<string>;
  };

  constructor() {
    this.registry = new Registry();

    // Request metrics
    this.metrics = {
      requestsTotal: new Counter({
        name: 'merlin_requests_total',
        help: 'Total number of requests',
        labelNames: ['method', 'status', 'endpoint'],
        registers: [this.registry],
      }),

      requestDuration: new Histogram({
        name: 'merlin_request_duration_seconds',
        help: 'Request duration in seconds',
        labelNames: ['method', 'endpoint'],
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
        registers: [this.registry],
      }),

      pagesCloned: new Counter({
        name: 'merlin_pages_cloned_total',
        help: 'Total number of pages cloned',
        labelNames: ['status'],
        registers: [this.registry],
      }),

      assetsCaptured: new Counter({
        name: 'merlin_assets_captured_total',
        help: 'Total number of assets captured',
        labelNames: ['type', 'status'],
        registers: [this.registry],
      }),

      errorsTotal: new Counter({
        name: 'merlin_errors_total',
        help: 'Total number of errors',
        labelNames: ['type', 'severity'],
        registers: [this.registry],
      }),

      cacheHits: new Counter({
        name: 'merlin_cache_hits_total',
        help: 'Total number of cache hits',
        labelNames: ['type'],
        registers: [this.registry],
      }),

      cacheMisses: new Counter({
        name: 'merlin_cache_misses_total',
        help: 'Total number of cache misses',
        labelNames: ['type'],
        registers: [this.registry],
      }),

      activeJobs: new Gauge({
        name: 'merlin_active_jobs',
        help: 'Number of active jobs',
        labelNames: ['type'],
        registers: [this.registry],
      }),

      queueSize: new Gauge({
        name: 'merlin_queue_size',
        help: 'Size of job queue',
        labelNames: ['type'],
        registers: [this.registry],
      }),
    };
  }

  /**
   * Records a request
   */
  recordRequest(method: string, endpoint: string, status: number, duration: number): void {
    this.metrics.requestsTotal.inc({ method, endpoint, status: String(status) });
    this.metrics.requestDuration.observe({ method, endpoint }, duration / 1000);
  }

  /**
   * Records a cloned page
   */
  recordPageCloned(status: 'success' | 'failed'): void {
    this.metrics.pagesCloned.inc({ status });
  }

  /**
   * Records a captured asset
   */
  recordAssetCaptured(type: string, status: 'success' | 'failed'): void {
    this.metrics.assetsCaptured.inc({ type, status });
  }

  /**
   * Records an error
   */
  recordError(type: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    this.metrics.errorsTotal.inc({ type, severity });
  }

  /**
   * Records a cache hit
   */
  recordCacheHit(type: 'page' | 'asset'): void {
    this.metrics.cacheHits.inc({ type });
  }

  /**
   * Records a cache miss
   */
  recordCacheMiss(type: 'page' | 'asset'): void {
    this.metrics.cacheMisses.inc({ type });
  }

  /**
   * Sets active jobs count
   */
  setActiveJobs(type: string, count: number): void {
    this.metrics.activeJobs.set({ type }, count);
  }

  /**
   * Sets queue size
   */
  setQueueSize(type: string, size: number): void {
    this.metrics.queueSize.set({ type }, size);
  }

  /**
   * Gets metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Gets metrics registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Resets all metrics
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}

