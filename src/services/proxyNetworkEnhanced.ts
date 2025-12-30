/**
 * Enhanced Proxy Network
 * Enterprise-grade P2P proxy network with:
 * - Database persistence
 * - ASN tracking and classification
 * - Latency percentiles
 * - Continent/region geo-routing
 * - TLS fingerprint support
 * - Advanced proxy selection
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { db, ProxyNodeDB, CONTINENT_MAP, type ProxyNetworkStats } from '../server/database.js';
import { lookupIP, type IPGeoData, classifyASN, DATACENTER_ASNS } from './ipGeolocation.js';

// Credit rates
const CREDIT_RATES = {
  PER_REQUEST: 0.001,
  PER_MB: 0.01,
  UPTIME_BONUS: 0.1,
  QUALITY_MULTIPLIER: 1.5,
  MOBILE_BONUS: 1.2,
  RESIDENTIAL_BONUS: 1.3,
};

export interface NodeRegistration {
  host: string;
  port: number;
  userId: string;
  bandwidth: number;
  type?: 'residential' | 'mobile' | 'datacenter';
  version: string;
  tlsFingerprint?: string;
  tlsFingerprintType?: string;
}

export interface RequestResult {
  success: boolean;
  bytesTransferred: number;
  responseTime: number;
  errorMessage?: string;
}

export class EnhancedProxyNetwork extends EventEmitter {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the enhanced network
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Start heartbeat monitoring (check every 30 seconds)
    this.startHeartbeatMonitor();

    // Start stats aggregation (update every 5 minutes)
    this.startStatsAggregation();

    // Initial stats update
    db.updateProxyNetworkStats();

    this.initialized = true;
    console.log('[EnhancedProxyNetwork] Initialized with database persistence');

    const stats = db.getProxyNetworkStats();
    if (stats) {
      console.log(`[EnhancedProxyNetwork] Loaded ${stats.totalNodes} nodes, ${stats.onlineNodes} online`);
    }
  }

  /**
   * Register a new proxy node with automatic geo-enrichment
   */
  async registerNode(registration: NodeRegistration): Promise<{
    nodeId: string;
    publicKey: string;
    authToken: string;
    geoData: IPGeoData | null;
  }> {
    // Generate unique node ID
    const nodeId = this.generateNodeId(registration.host, registration.port, registration.userId);

    // Generate keys
    const { publicKey, privateKey } = this.generateKeyPair();
    const authToken = this.generateAuthToken(nodeId);

    // Fetch IP geolocation data
    let geoData: IPGeoData | null = null;
    try {
      geoData = await lookupIP(registration.host);
    } catch (error) {
      console.warn(`[EnhancedProxyNetwork] Failed to lookup IP ${registration.host}:`, error);
    }

    // Determine connection type (map 'isp' to 'residential' for our schema)
    let connectionType: 'residential' | 'mobile' | 'datacenter' = registration.type || 'residential';
    if (geoData) {
      if (geoData.connectionType) {
        // Map 'isp' to 'residential' since our schema only has 3 types
        connectionType = geoData.connectionType === 'isp' ? 'residential' : geoData.connectionType;
      }
      if (geoData.asn && DATACENTER_ASNS.has(geoData.asn)) {
        connectionType = 'datacenter';
      }
    }

    // Create node record
    const node: ProxyNodeDB = {
      id: nodeId,
      publicKey,
      host: registration.host,
      port: registration.port,
      userId: registration.userId,

      // Geographic data
      country: geoData?.country || 'Unknown',
      countryCode: geoData?.countryCode || 'XX',
      continent: geoData?.continent || CONTINENT_MAP[geoData?.countryCode || 'US'] || 'NA',
      region: geoData?.region,
      city: geoData?.city,
      latitude: geoData?.latitude,
      longitude: geoData?.longitude,
      timezone: geoData?.timezone,

      // Network data
      isp: geoData?.isp,
      asn: geoData?.asn,
      asnOrg: geoData?.asnOrg,
      connectionType,

      // Performance metrics (initialized)
      bandwidth: registration.bandwidth,
      uptime: 100,
      latencyAvg: 0,
      latencyP50: 0,
      latencyP90: 0,
      latencyP99: 0,
      latencyMin: 0,
      latencyMax: 0,
      latencySamples: [],

      // Success tracking
      successRate: 1,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,

      // Data tracking
      bytesServed: 0,
      bytesReceived: 0,

      // Credit system
      creditsEarned: 0,
      creditsPerHour: 0,

      // Status
      isOnline: true,
      lastSeen: new Date().toISOString(),
      lastHealthCheck: new Date().toISOString(),
      healthCheckFailures: 0,
      consecutiveFailures: 0,

      // Metadata
      registeredAt: new Date().toISOString(),
      version: registration.version,
      type: connectionType as 'residential' | 'mobile' | 'datacenter',

      // TLS fingerprint
      tlsFingerprint: registration.tlsFingerprint,
      tlsFingerprintType: registration.tlsFingerprintType,

      // Score
      score: 50, // Initial score
    };

    // Calculate initial score
    node.score = db.calculateProxyScore(node);

    // Save to database
    db.upsertProxyNode(node);

    this.emit('node:registered', node);
    console.log(`[EnhancedProxyNetwork] Node registered: ${nodeId} (${node.country}, ASN: ${node.asn || 'unknown'})`);

    return { nodeId, publicKey, authToken, geoData };
  }

  /**
   * Unregister a node
   */
  async unregisterNode(nodeId: string): Promise<boolean> {
    const node = db.getProxyNodeById(nodeId);
    if (!node) return false;

    const success = db.deleteProxyNode(nodeId);
    if (success) {
      this.emit('node:unregistered', nodeId);
      console.log(`[EnhancedProxyNetwork] Node unregistered: ${nodeId}`);
    }

    return success;
  }

  /**
   * Handle node heartbeat
   */
  async heartbeat(nodeId: string, status: {
    isOnline: boolean;
    latency?: number;
    bandwidth?: number;
    currentLoad?: number;
  }): Promise<void> {
    const node = db.getProxyNodeById(nodeId);
    if (!node) return;

    node.isOnline = status.isOnline;
    node.lastSeen = new Date().toISOString();

    if (status.bandwidth !== undefined) {
      node.bandwidth = status.bandwidth;
    }

    // Update uptime
    const registeredAt = new Date(node.registeredAt).getTime();
    const now = Date.now();
    const totalTime = now - registeredAt;
    const onlineTime = node.isOnline ? totalTime : totalTime * (node.uptime / 100);
    node.uptime = Math.min(100, (onlineTime / totalTime) * 100);

    // Recalculate score
    node.score = db.calculateProxyScore(node);

    db.upsertProxyNode(node);
  }

  /**
   * Get best proxy for a request with advanced filtering
   */
  async getProxy(options: {
    targetUrl?: string;
    country?: string;
    continent?: string;
    asn?: number;
    type?: 'residential' | 'mobile' | 'datacenter';
    minSuccessRate?: number;
    maxLatency?: number;
    excludeASNs?: number[];
    preferResidential?: boolean;
    preferMobile?: boolean;
  } = {}): Promise<ProxyNodeDB | null> {
    // Set defaults for anti-bot optimized selection
    const searchOptions = {
      count: 1,
      country: options.country,
      continent: options.continent,
      asn: options.asn,
      type: options.type || (options.preferResidential ? 'residential' : undefined),
      minSuccessRate: options.minSuccessRate || 0.8,
      maxLatency: options.maxLatency,
      excludeASNs: options.excludeASNs,
      diverseASNs: false,
      diverseCountries: false,
    };

    // Prefer mobile for extra stealth if requested
    if (options.preferMobile) {
      searchOptions.type = 'mobile';
    }

    const proxies = db.getBestProxies(searchOptions);
    return proxies[0] || null;
  }

  /**
   * Get multiple proxies with diversity options
   */
  async getProxies(count: number, options: {
    targetUrl?: string;
    countries?: string[];
    continent?: string;
    types?: ('residential' | 'mobile' | 'datacenter')[];
    minSuccessRate?: number;
    maxLatency?: number;
    excludeASNs?: number[];
    diverseASNs?: boolean;
    diverseCountries?: boolean;
  } = {}): Promise<ProxyNodeDB[]> {
    // If specific countries requested, filter first
    if (options.countries && options.countries.length > 0) {
      const results: ProxyNodeDB[] = [];
      const perCountry = Math.ceil(count / options.countries.length);

      for (const country of options.countries) {
        const proxies = db.getBestProxies({
          count: perCountry,
          country,
          minSuccessRate: options.minSuccessRate || 0.8,
          maxLatency: options.maxLatency,
          excludeASNs: options.excludeASNs,
        });
        results.push(...proxies);
      }

      return results.slice(0, count);
    }

    // Standard selection
    return db.getBestProxies({
      count,
      continent: options.continent,
      minSuccessRate: options.minSuccessRate || 0.8,
      maxLatency: options.maxLatency,
      excludeASNs: options.excludeASNs,
      diverseASNs: options.diverseASNs ?? true,
      diverseCountries: options.diverseCountries ?? true,
    });
  }

  /**
   * Record request result
   */
  async recordRequest(nodeId: string, result: RequestResult): Promise<void> {
    db.recordProxyRequest(nodeId, {
      success: result.success,
      latencyMs: result.responseTime,
      bytesTransferred: result.bytesTransferred,
    });

    this.emit('request:completed', { nodeId, result });
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): ProxyNetworkStats {
    let stats = db.getProxyNetworkStats();
    if (!stats) {
      stats = db.updateProxyNetworkStats();
    }
    return stats;
  }

  /**
   * Get user's earned credits and nodes
   */
  getUserCredits(userId: string): {
    totalCredits: number;
    nodes: ProxyNodeDB[];
    totalBytesServed: number;
    totalRequests: number;
  } {
    const nodes = db.getProxyNodesByUser(userId);
    const totalCredits = nodes.reduce((sum, n) => sum + n.creditsEarned, 0);
    const totalBytesServed = nodes.reduce((sum, n) => sum + n.bytesServed, 0);
    const totalRequests = nodes.reduce((sum, n) => sum + n.totalRequests, 0);

    return { totalCredits, nodes, totalBytesServed, totalRequests };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 20) {
    return db.getProxyLeaderboard(limit);
  }

  /**
   * Get proxies by ASN (useful for targeting specific networks)
   */
  getProxiesByASN(asn: number): ProxyNodeDB[] {
    return db.getProxyNodesByASN(asn);
  }

  /**
   * Get proxies by continent (useful for geo-targeting)
   */
  getProxiesByContinent(continent: string): ProxyNodeDB[] {
    return db.getProxyNodesByContinent(continent);
  }

  /**
   * Get all unique ASNs in the network
   */
  getAvailableASNs(): Array<{ asn: number; org: string; nodeCount: number }> {
    const stats = this.getNetworkStats();
    return stats.topASNs.map(a => ({ asn: a.asn, org: a.org, nodeCount: a.nodes }));
  }

  /**
   * Get all available countries
   */
  getAvailableCountries(): Array<{ country: string; nodeCount: number }> {
    const stats = this.getNetworkStats();
    return stats.topCountries.map(c => ({ country: c.country, nodeCount: c.nodes }));
  }

  // Private methods

  private generateNodeId(host: string, port: number, userId: string): string {
    const data = `${host}:${port}:${userId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private generateKeyPair(): { publicKey: string; privateKey: string } {
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    return { publicKey, privateKey };
  }

  private generateAuthToken(nodeId: string): string {
    const timestamp = Date.now();
    const secret = process.env.PROXY_AUTH_SECRET || 'merlin-proxy-secret';
    const data = `${nodeId}:${timestamp}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  private startHeartbeatMonitor(): void {
    // Check every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 90000; // 90 second timeout (3 missed heartbeats)

      const allNodes = db.getAllProxyNodes();
      let offlineCount = 0;

      for (const node of allNodes) {
        const lastSeenMs = new Date(node.lastSeen).getTime();

        if (now - lastSeenMs > timeout && node.isOnline) {
          db.updateProxyNodeStatus(node.id, false);
          offlineCount++;
          this.emit('node:offline', node.id);
        }
      }

      if (offlineCount > 0) {
        console.log(`[EnhancedProxyNetwork] Marked ${offlineCount} nodes as offline`);
      }
    }, 30000);
  }

  private startStatsAggregation(): void {
    // Update stats every 5 minutes
    this.statsInterval = setInterval(() => {
      db.updateProxyNetworkStats();
    }, 5 * 60 * 1000);
  }

  /**
   * Shutdown the network
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    // Final stats update
    db.updateProxyNetworkStats();

    this.initialized = false;
    console.log('[EnhancedProxyNetwork] Shutdown complete');
  }
}

// Singleton instance
export const enhancedProxyNetwork = new EnhancedProxyNetwork();

// Auto-initialize
enhancedProxyNetwork.initialize().catch(console.error);
