/**
 * Request Optimizer
 * Optimizes requests through batching, deduplication, and connection pooling
 */

export interface Request {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  priority?: number;
  domain?: string;
}

export interface BatchedRequest {
  requests: Request[];
  execute: () => Promise<Array<{ request: Request; response: any; error?: Error }>>;
}

export interface RequestOptimizerOptions {
  batchSize: number;
  batchDelay: number; // ms to wait before batching
  deduplicate: boolean;
  connectionPooling: boolean;
}

/**
 * Request Optimizer
 * Optimizes requests through batching, deduplication, and connection pooling
 */
export class RequestOptimizer {
  private options: RequestOptimizerOptions;
  private pendingRequests: Map<string, Request> = new Map();
  private batchTimer?: NodeJS.Timeout;
  private connectionPool: Map<string, any> = new Map(); // Domain -> connection pool

  constructor(options: Partial<RequestOptimizerOptions> = {}) {
    this.options = {
      batchSize: options.batchSize || 10,
      batchDelay: options.batchDelay || 100,
      deduplicate: options.deduplicate !== false,
      connectionPooling: options.connectionPooling !== false,
    };
  }

  /**
   * Deduplicates requests (same URL = same request)
   */
  deduplicateRequests(requests: Request[]): Request[] {
    if (!this.options.deduplicate) {
      return requests;
    }

    const seen = new Map<string, Request>();

    for (const request of requests) {
      const key = `${request.method}:${request.url}`;
      if (!seen.has(key)) {
        seen.set(key, request);
      } else {
        // Keep the one with higher priority
        const existing = seen.get(key)!;
        if ((request.priority || 0) > (existing.priority || 0)) {
          seen.set(key, request);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Groups requests by domain for batching
   */
  groupByDomain(requests: Request[]): Map<string, Request[]> {
    const groups = new Map<string, Request[]>();

    for (const request of requests) {
      const domain = this.extractDomain(request.url);
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(request);
    }

    return groups;
  }

  /**
   * Extracts domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Creates batched requests
   */
  createBatches(requests: Request[]): BatchedRequest[] {
    // Deduplicate first
    const deduplicated = this.deduplicateRequests(requests);

    // Group by domain
    const domainGroups = this.groupByDomain(deduplicated);

    const batches: BatchedRequest[] = [];

    for (const [domain, domainRequests] of domainGroups.entries()) {
      // Split into batches of batchSize
      for (let i = 0; i < domainRequests.length; i += this.options.batchSize) {
        const batch = domainRequests.slice(i, i + this.options.batchSize);
        
        batches.push({
          requests: batch,
          execute: async () => {
            // Execute batch requests (can be parallel or sequential)
            return await Promise.all(
              batch.map(async (request) => {
                try {
                  const response = await this.executeRequest(request);
                  return { request, response, error: undefined };
                } catch (error) {
                  return {
                    request,
                    response: null,
                    error: error instanceof Error ? error : new Error(String(error)),
                  };
                }
              })
            );
          },
        });
      }
    }

    return batches;
  }

  /**
   * Executes a single request
   */
  private async executeRequest(request: Request): Promise<any> {
    // Use connection pooling if enabled
    if (this.options.connectionPooling) {
      return await this.executeWithConnectionPool(request);
    }

    // Standard fetch
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    return await response.json();
  }

  /**
   * Executes request with connection pooling
   */
  private async executeWithConnectionPool(request: Request): Promise<any> {
    const domain = this.extractDomain(request.url);
    
    // For now, use standard fetch
    // In production, this would use HTTP/2 connection pooling
    const response = await fetch(request.url, {
      method: request.method,
      headers: {
        ...request.headers,
        'Connection': 'keep-alive',
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    return await response.json();
  }

  /**
   * Optimizes request order (critical path optimization)
   */
  optimizeRequestOrder(requests: Request[]): Request[] {
    // Sort by priority (higher first)
    const sorted = [...requests].sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });

    // Group by domain and interleave to avoid domain blocking
    const domainGroups = this.groupByDomain(sorted);
    const optimized: Request[] = [];

    const maxLength = Math.max(...Array.from(domainGroups.values()).map(g => g.length));

    for (let i = 0; i < maxLength; i++) {
      for (const requests of domainGroups.values()) {
        if (i < requests.length) {
          optimized.push(requests[i]);
        }
      }
    }

    return optimized;
  }

  /**
   * Gets request statistics
   */
  getStats(): {
    pending: number;
    batched: number;
    connectionPools: number;
  } {
    return {
      pending: this.pendingRequests.size,
      batched: 0, // Would track batched requests
      connectionPools: this.connectionPool.size,
    };
  }

  /**
   * Clears pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }
}

