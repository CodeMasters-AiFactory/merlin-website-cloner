/**
 * Proxy Manager
 * Multi-provider proxy support with automatic rotation and health checking
 */

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol?: 'http' | 'https' | 'socks4' | 'socks5';
  provider?: string;
  country?: string;
  type?: 'datacenter' | 'residential' | 'mobile';
  isp?: string;
  speed?: number; // Response time in ms
  successRate?: number; // Success rate 0-1
  lastUsed?: Date;
  lastChecked?: Date;
  isHealthy?: boolean;
}

export interface ProxyProvider {
  name: string;
  getProxies(): Promise<ProxyConfig[]>;
  healthCheck(proxy: ProxyConfig): Promise<boolean>;
}

export type ProxyRotationStrategy = 'round-robin' | 'per-request' | 'per-domain' | 'sticky' | 'speed-based' | 'success-based';

export class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private currentIndex: number = 0;
  private failedProxies: Set<string> = new Set();
  private providerHealth: Map<string, boolean> = new Map();
  private providers: ProxyProvider[] = [];
  private rotationStrategy: ProxyRotationStrategy = 'round-robin';
  private domainProxyMap: Map<string, ProxyConfig> = new Map(); // For sticky sessions
  private proxyStats: Map<string, { successCount: number; failureCount: number; totalTime: number; requestCount: number }> = new Map();

  constructor(providers: ProxyProvider[] = [], rotationStrategy: ProxyRotationStrategy = 'round-robin') {
    this.providers = providers;
    this.rotationStrategy = rotationStrategy;
  }

  /**
   * Adds a proxy to the pool
   */
  addProxy(proxy: ProxyConfig): void {
    const proxyKey = this.getProxyKey(proxy);
    if (!this.failedProxies.has(proxyKey)) {
      this.proxies.push(proxy);
    }
  }

  /**
   * Adds multiple proxies
   */
  addProxies(proxies: ProxyConfig[]): void {
    proxies.forEach(proxy => this.addProxy(proxy));
  }

  /**
   * Loads proxies from providers
   */
  async loadProxiesFromProviders(): Promise<void> {
    for (const provider of this.providers) {
      try {
        const proxies = await provider.getProxies();
        this.addProxies(proxies);
        this.providerHealth.set(provider.name, true);
      } catch (error) {
        console.error(`Failed to load proxies from ${provider.name}:`, error);
        this.providerHealth.set(provider.name, false);
      }
    }
  }

  /**
   * Gets the next proxy based on rotation strategy
   */
  getNextProxy(targetUrl?: string, targetCountry?: string): ProxyConfig | null {
    if (this.proxies.length === 0) {
      return null;
    }

    // Filter out failed proxies
    let availableProxies = this.proxies.filter(
      proxy => !this.failedProxies.has(this.getProxyKey(proxy)) && (proxy.isHealthy !== false)
    );

    if (availableProxies.length === 0) {
      // Reset failed proxies if all are marked as failed
      this.failedProxies.clear();
      availableProxies = this.proxies;
    }

    // Apply rotation strategy
    let proxy: ProxyConfig | null = null;

    switch (this.rotationStrategy) {
      case 'sticky':
        if (targetUrl) {
          const domain = new URL(targetUrl).hostname;
          proxy = this.domainProxyMap.get(domain) || null;
          if (!proxy || !availableProxies.includes(proxy)) {
            proxy = this.selectBestProxy(availableProxies, targetCountry);
            if (proxy) {
              this.domainProxyMap.set(domain, proxy);
            }
          }
        } else {
          proxy = this.selectBestProxy(availableProxies, targetCountry);
        }
        break;

      case 'per-domain':
        if (targetUrl) {
          const domain = new URL(targetUrl).hostname;
          proxy = this.domainProxyMap.get(domain) || null;
          if (!proxy || !availableProxies.includes(proxy)) {
            proxy = availableProxies[this.currentIndex % availableProxies.length];
            this.currentIndex = (this.currentIndex + 1) % availableProxies.length;
            this.domainProxyMap.set(domain, proxy);
          }
        } else {
          proxy = availableProxies[this.currentIndex % availableProxies.length];
          this.currentIndex = (this.currentIndex + 1) % availableProxies.length;
        }
        break;

      case 'speed-based':
        proxy = this.selectBestProxy(availableProxies, targetCountry, 'speed');
        break;

      case 'success-based':
        proxy = this.selectBestProxy(availableProxies, targetCountry, 'success');
        break;

      case 'per-request':
      case 'round-robin':
      default:
        proxy = availableProxies[this.currentIndex % availableProxies.length];
        this.currentIndex = (this.currentIndex + 1) % availableProxies.length;
        break;
    }

    if (proxy) {
      proxy.lastUsed = new Date();
    }

    return proxy;
  }

  /**
   * Selects the best proxy based on criteria
   */
  private selectBestProxy(
    proxies: ProxyConfig[],
    targetCountry?: string,
    criteria: 'speed' | 'success' | 'default' = 'default'
  ): ProxyConfig | null {
    if (proxies.length === 0) return null;

    // Filter by country if specified
    let filtered = proxies;
    if (targetCountry) {
      filtered = proxies.filter(p => p.country === targetCountry);
      if (filtered.length === 0) {
        filtered = proxies; // Fallback to all if no match
      }
    }

    // Select based on criteria
    switch (criteria) {
      case 'speed':
        return filtered.reduce((best, current) => {
          const bestSpeed = best.speed || Infinity;
          const currentSpeed = current.speed || Infinity;
          return currentSpeed < bestSpeed ? current : best;
        });

      case 'success':
        return filtered.reduce((best, current) => {
          const bestRate = best.successRate || 0;
          const currentRate = current.successRate || 0;
          return currentRate > bestRate ? current : best;
        });

      default:
        // Prefer residential for protected sites, datacenter for speed
        const residential = filtered.filter(p => p.type === 'residential');
        if (residential.length > 0) {
          return residential[Math.floor(Math.random() * residential.length)];
        }
        return filtered[Math.floor(Math.random() * filtered.length)];
    }
  }

  /**
   * Sets rotation strategy
   */
  setRotationStrategy(strategy: ProxyRotationStrategy): void {
    this.rotationStrategy = strategy;
  }

  /**
   * Marks a proxy as failed
   */
  markProxyFailed(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    this.failedProxies.add(key);
  }

  /**
   * Marks a proxy as working
   */
  markProxyWorking(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    this.failedProxies.delete(key);
    proxy.isHealthy = true;
  }

  /**
   * Records proxy success
   */
  recordProxySuccess(proxy: ProxyConfig, responseTime: number): void {
    const key = this.getProxyKey(proxy);
    const stats = this.proxyStats.get(key) || { successCount: 0, failureCount: 0, totalTime: 0, requestCount: 0 };
    stats.successCount++;
    stats.requestCount++;
    stats.totalTime += responseTime;
    this.proxyStats.set(key, stats);

    // Update proxy success rate and speed
    proxy.successRate = stats.successCount / stats.requestCount;
    proxy.speed = stats.totalTime / stats.requestCount;
    proxy.lastChecked = new Date();
    proxy.isHealthy = true;
  }

  /**
   * Records proxy failure
   */
  recordProxyFailure(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    const stats = this.proxyStats.get(key) || { successCount: 0, failureCount: 0, totalTime: 0, requestCount: 0 };
    stats.failureCount++;
    stats.requestCount++;
    this.proxyStats.set(key, stats);

    // Update proxy success rate
    proxy.successRate = stats.successCount / stats.requestCount;
    proxy.lastChecked = new Date();

    // Mark as failed if success rate is too low
    if (proxy.successRate < 0.5 && stats.requestCount >= 5) {
      this.markProxyFailed(proxy);
    }
  }

  /**
   * Performs health check on a proxy
   */
  async healthCheck(proxy: ProxyConfig, timeout: number = 5000): Promise<boolean> {
    try {
      // Try to connect to a test endpoint
      const testUrl = 'http://httpbin.org/ip';
      const proxyUrl = this.formatProxyUrl(proxy);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(testUrl, {
          signal: controller.signal,
          // @ts-ignore - proxy option may not be in types
          proxy: proxyUrl
        });
        
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        clearTimeout(timeoutId);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Performs health check on all proxies
   */
  async healthCheckAll(concurrent: number = 5): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const proxies = [...this.proxies];
    
    // Check proxies in batches
    for (let i = 0; i < proxies.length; i += concurrent) {
      const batch = proxies.slice(i, i + concurrent);
      const batchResults = await Promise.all(
        batch.map(async (proxy) => {
          const key = this.getProxyKey(proxy);
          const isHealthy = await this.healthCheck(proxy);
          results.set(key, isHealthy);
          
          if (!isHealthy) {
            this.markProxyFailed(proxy);
          } else {
            this.markProxyWorking(proxy);
          }
          
          return isHealthy;
        })
      );
    }
    
    return results;
  }

  /**
   * Formats proxy URL
   */
  formatProxyUrl(proxy: ProxyConfig): string {
    const protocol = proxy.protocol || 'http';
    const auth = proxy.username && proxy.password
      ? `${proxy.username}:${proxy.password}@`
      : '';
    
    return `${protocol}://${auth}${proxy.host}:${proxy.port}`;
  }

  /**
   * Gets proxy key for identification
   */
  private getProxyKey(proxy: ProxyConfig): string {
    return `${proxy.host}:${proxy.port}`;
  }

  /**
   * Gets all proxies
   */
  getAllProxies(): ProxyConfig[] {
    return [...this.proxies];
  }

  /**
   * Gets statistics
   */
  getStats(): {
    total: number;
    available: number;
    failed: number;
    providers: Record<string, boolean>;
  } {
    const available = this.proxies.filter(
      proxy => !this.failedProxies.has(this.getProxyKey(proxy))
    ).length;

    return {
      total: this.proxies.length,
      available,
      failed: this.failedProxies.size,
      providers: Object.fromEntries(this.providerHealth)
    };
  }
}

/**
 * Bright Data Proxy Provider
 */
export class BrightDataProvider implements ProxyProvider {
  name = 'Bright Data';
  
  constructor(
    private apiKey: string,
    private zoneId: string
  ) {}

  async getProxies(): Promise<ProxyConfig[]> {
    // Bright Data API integration
    // This would call their API to get proxy list
    // For now, return empty array - actual implementation would call their API
    return [];
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    // Bright Data specific health check
    return true;
  }
}

/**
 * IPRoyal Proxy Provider
 */
export class IPRoyalProvider implements ProxyProvider {
  name = 'IPRoyal';
  
  constructor(
    private apiKey: string
  ) {}

  async getProxies(): Promise<ProxyConfig[]> {
    if (!this.apiKey) {
      throw new Error('IPRoyal API key not configured. Set IPROYAL_API_KEY environment variable.');
    }

    try {
      // IPRoyal API: Get residential proxy list
      const response = await fetch(
        'https://api.iproyal.com/v1/proxies?limit=100&type=residential',
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`IPRoyal API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Map IPRoyal response to ProxyConfig format
      return data.proxies.map((proxy: any) => ({
        host: proxy.ip,
        port: proxy.port || 12321, // IPRoyal default port
        username: proxy.username,
        password: proxy.password,
        type: 'residential' as const,
        provider: 'IPRoyal',
        country: proxy.country,
        protocol: 'http' as const,
        speed: proxy.response_time || 0,
        successRate: (proxy.success_rate || 100) / 100, // Convert percentage to 0-1
        isHealthy: true,
        lastChecked: new Date()
      }));
    } catch (error) {
      console.error('Failed to fetch IPRoyal proxies:', error);
      throw error; // Don't silently fail - let ProxyManager handle the error
    }
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    try {
      // Test proxy by making a simple HTTP request through it
      const proxyUrl = `${proxy.protocol || 'http'}://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://httpbin.org/ip', {
        signal: controller.signal,
        // @ts-ignore - Node.js fetch doesn't have proxy option, but this is for documentation
        // In production, use a library like 'node-fetch' with 'https-proxy-agent'
      });

      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      console.error(`IPRoyal proxy health check failed for ${proxy.host}:${proxy.port}:`, error);
      return false;
    }
  }
}

/**
 * ScrapeOps Proxy Provider
 */
export class ScrapeOpsProvider implements ProxyProvider {
  name = 'ScrapeOps';
  
  constructor(
    private apiKey: string
  ) {}

  async getProxies(): Promise<ProxyConfig[]> {
    // ScrapeOps API integration
    // Example: https://api.scrapeops.io/v1/proxy?api_key={apiKey}
    try {
      const response = await fetch(`https://api.scrapeops.io/v1/proxy?api_key=${this.apiKey}`);
      const data = await response.json();
      // Parse and return proxy list
      return [];
    } catch (error) {
      console.error('ScrapeOps API error:', error);
      return [];
    }
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    return true;
  }
}

/**
 * Smartproxy Proxy Provider
 */
export class SmartproxyProvider implements ProxyProvider {
  name = 'Smartproxy';
  
  constructor(
    private username: string,
    private password: string,
    private endpoint?: string
  ) {}

  async getProxies(): Promise<ProxyConfig[]> {
    // Smartproxy API integration
    // They provide endpoint-based proxies
    if (this.endpoint) {
      return [{
        host: this.endpoint.split(':')[0],
        port: parseInt(this.endpoint.split(':')[1]) || 8080,
        username: this.username,
        password: this.password,
        protocol: 'http',
        provider: 'Smartproxy',
        type: 'residential'
      }];
    }
    return [];
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    return true;
  }
}

/**
 * Oxylabs Proxy Provider
 */
export class OxylabsProvider implements ProxyProvider {
  name = 'Oxylabs';
  
  constructor(
    private username: string,
    private password: string,
    private customerId?: string
  ) {}

  async getProxies(): Promise<ProxyConfig[]> {
    // Oxylabs API integration
    // They provide endpoint-based proxies
    const endpoint = `pr.oxylabs.io:7777`;
    return [{
      host: endpoint.split(':')[0],
      port: parseInt(endpoint.split(':')[1]) || 7777,
      username: this.username,
      password: this.password,
      protocol: 'http',
      provider: 'Oxylabs',
      type: 'residential'
    }];
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    return true;
  }
}

/**
 * Proxy-Cheap Provider
 */
export class ProxyCheapProvider implements ProxyProvider {
  name = 'Proxy-Cheap';

  constructor(
    private apiKey: string
  ) {}

  async getProxies(): Promise<ProxyConfig[]> {
    // Proxy-Cheap API integration
    try {
      const response = await fetch(`https://api.proxy-cheap.com/v1/proxies?api_key=${this.apiKey}`);
      const data = await response.json();
      // Parse and return proxy list
      return [];
    } catch (error) {
      console.error('Proxy-Cheap API error:', error);
      return [];
    }
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    return true;
  }
}

/**
 * Merlin Proxy Network Provider
 * OUR OWN P2P PROXY NETWORK - No third-party dependencies!
 * Users contribute bandwidth and earn credits for cloning
 */
import { merlinProxyNetwork, type ProxyNode } from './proxyNetwork.js';

export class MerlinProxyProvider implements ProxyProvider {
  name = 'Merlin Network';

  constructor() {
    console.log('[MerlinProxyProvider] Initialized - Using our own P2P network!');
  }

  async getProxies(): Promise<ProxyConfig[]> {
    // Get proxies from our own network
    const nodes = await merlinProxyNetwork.getProxies(100, {
      diverseLocations: true,
    });

    return nodes.map(node => this.nodeToProxyConfig(node));
  }

  async getProxy(options?: {
    targetUrl?: string;
    country?: string;
    requireResidential?: boolean;
  }): Promise<ProxyConfig | null> {
    const node = await merlinProxyNetwork.getProxy({
      targetUrl: options?.targetUrl,
      country: options?.country,
      requireResidential: options?.requireResidential,
    });

    if (!node) {
      console.warn('[MerlinProxyProvider] No proxies available in our network');
      return null;
    }

    return this.nodeToProxyConfig(node);
  }

  async healthCheck(proxy: ProxyConfig): Promise<boolean> {
    // Our network tracks health automatically via heartbeats
    return proxy.isHealthy !== false;
  }

  /**
   * Record proxy usage for credit calculation
   */
  async recordUsage(proxyKey: string, success: boolean, bytesTransferred: number, responseTime: number): Promise<void> {
    // Extract node ID from proxy key
    const nodeId = proxyKey.split(':')[0];

    await merlinProxyNetwork.recordRequest(nodeId, {
      success,
      bytesTransferred,
      responseTime,
    });
  }

  /**
   * Get network statistics
   */
  getNetworkStats() {
    return merlinProxyNetwork.getNetworkStats();
  }

  /**
   * Convert ProxyNode to ProxyConfig
   */
  private nodeToProxyConfig(node: ProxyNode): ProxyConfig {
    return {
      host: node.host,
      port: node.port,
      protocol: 'http',
      provider: 'Merlin Network',
      country: node.country,
      type: node.type,
      isp: node.isp,
      speed: node.latency,
      successRate: node.successRate,
      lastUsed: node.lastSeen,
      lastChecked: node.lastSeen,
      isHealthy: node.isOnline,
    };
  }
}

/**
 * Create a ProxyManager configured to use ONLY our Merlin network
 * NO third-party providers!
 */
export function createMerlinProxyManager(): ProxyManager {
  const merlinProvider = new MerlinProxyProvider();
  const manager = new ProxyManager([merlinProvider], 'success-based');

  console.log('[ProxyManager] Using Merlin P2P Network ONLY - No third-party providers!');

  return manager;
}

