/**
 * Merlin Proxy Network
 * Our own P2P residential proxy network - NO third-party providers
 * Users contribute bandwidth and earn credits for cloning
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface ProxyNode {
  id: string;
  publicKey: string;
  host: string;
  port: number;
  userId: string;
  country: string;
  city?: string;
  isp?: string;
  bandwidth: number; // Mbps
  uptime: number; // Percentage
  latency: number; // ms
  successRate: number; // 0-1
  totalRequests: number;
  successfulRequests: number;
  bytesServed: number;
  creditsEarned: number;
  isOnline: boolean;
  lastSeen: Date;
  registeredAt: Date;
  version: string;
  type: 'residential' | 'mobile' | 'datacenter';
}

export interface ProxySession {
  id: string;
  nodeId: string;
  userId: string;
  targetUrl: string;
  startedAt: Date;
  endedAt?: Date;
  bytesTransferred: number;
  success: boolean;
  errorMessage?: string;
}

export interface NetworkStats {
  totalNodes: number;
  onlineNodes: number;
  totalBandwidth: number; // Mbps
  totalRequestsServed: number;
  averageLatency: number;
  averageSuccessRate: number;
  countryCoverage: string[];
  bytesTransferredTotal: number;
}

export interface NodeReward {
  nodeId: string;
  userId: string;
  creditsEarned: number;
  bytesServed: number;
  requestsServed: number;
  period: 'hourly' | 'daily' | 'monthly';
  calculatedAt: Date;
}

// Credit rates per action
const CREDIT_RATES = {
  PER_REQUEST: 0.001, // Credits per request served
  PER_MB: 0.01, // Credits per MB transferred
  UPTIME_BONUS: 0.1, // Credits per hour of 99%+ uptime
  QUALITY_MULTIPLIER: 1.5, // Multiplier for high success rate (>95%)
};

export class MerlinProxyNetwork extends EventEmitter {
  private nodes: Map<string, ProxyNode> = new Map();
  private sessions: Map<string, ProxySession> = new Map();
  private nodesByCountry: Map<string, Set<string>> = new Map();
  private nodesByIsp: Map<string, Set<string>> = new Map();
  private rewards: NodeReward[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Initialize the network
   */
  async initialize(): Promise<void> {
    // Start heartbeat monitoring
    this.startHeartbeatMonitor();

    console.log('[MerlinProxyNetwork] Initialized - Our own proxy network is ready');
  }

  /**
   * Register a new proxy node
   */
  async registerNode(nodeData: {
    host: string;
    port: number;
    userId: string;
    country: string;
    city?: string;
    isp?: string;
    bandwidth: number;
    type: 'residential' | 'mobile' | 'datacenter';
    version: string;
  }): Promise<{ nodeId: string; publicKey: string; authToken: string }> {
    // Generate unique node ID
    const nodeId = this.generateNodeId(nodeData.host, nodeData.port, nodeData.userId);

    // Generate key pair for secure communication
    const { publicKey, privateKey } = this.generateKeyPair();

    // Create auth token
    const authToken = this.generateAuthToken(nodeId);

    const node: ProxyNode = {
      id: nodeId,
      publicKey,
      host: nodeData.host,
      port: nodeData.port,
      userId: nodeData.userId,
      country: nodeData.country,
      city: nodeData.city,
      isp: nodeData.isp,
      bandwidth: nodeData.bandwidth,
      uptime: 100,
      latency: 0,
      successRate: 1,
      totalRequests: 0,
      successfulRequests: 0,
      bytesServed: 0,
      creditsEarned: 0,
      isOnline: true,
      lastSeen: new Date(),
      registeredAt: new Date(),
      version: nodeData.version,
      type: nodeData.type,
    };

    this.nodes.set(nodeId, node);

    // Index by country
    if (!this.nodesByCountry.has(nodeData.country)) {
      this.nodesByCountry.set(nodeData.country, new Set());
    }
    this.nodesByCountry.get(nodeData.country)!.add(nodeId);

    // Index by ISP
    if (nodeData.isp) {
      if (!this.nodesByIsp.has(nodeData.isp)) {
        this.nodesByIsp.set(nodeData.isp, new Set());
      }
      this.nodesByIsp.get(nodeData.isp)!.add(nodeId);
    }

    this.emit('node:registered', node);
    console.log(`[MerlinProxyNetwork] Node registered: ${nodeId} (${nodeData.country})`);

    return { nodeId, publicKey, authToken };
  }

  /**
   * Remove a node from the network
   */
  async unregisterNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove from indices
    this.nodesByCountry.get(node.country)?.delete(nodeId);
    if (node.isp) {
      this.nodesByIsp.get(node.isp)?.delete(nodeId);
    }

    this.nodes.delete(nodeId);
    this.emit('node:unregistered', nodeId);
    console.log(`[MerlinProxyNetwork] Node unregistered: ${nodeId}`);
  }

  /**
   * Handle node heartbeat
   */
  async heartbeat(nodeId: string, status: {
    isOnline: boolean;
    latency: number;
    bandwidth: number;
    currentLoad: number;
  }): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.isOnline = status.isOnline;
    node.latency = status.latency;
    node.bandwidth = status.bandwidth;
    node.lastSeen = new Date();

    // Update uptime
    const now = Date.now();
    const registeredAt = node.registeredAt.getTime();
    const totalTime = now - registeredAt;
    const onlineTime = node.isOnline ? totalTime : totalTime * (node.uptime / 100);
    node.uptime = (onlineTime / totalTime) * 100;

    this.nodes.set(nodeId, node);
  }

  /**
   * Get best available proxy for a request
   */
  async getProxy(options: {
    targetUrl?: string;
    country?: string;
    minBandwidth?: number;
    requireResidential?: boolean;
  } = {}): Promise<ProxyNode | null> {
    let candidates: ProxyNode[] = [];

    // Filter online nodes
    for (const node of this.nodes.values()) {
      if (!node.isOnline) continue;

      // Filter by country if specified
      if (options.country && node.country !== options.country) continue;

      // Filter by bandwidth
      if (options.minBandwidth && node.bandwidth < options.minBandwidth) continue;

      // Filter by type
      if (options.requireResidential && node.type !== 'residential') continue;

      candidates.push(node);
    }

    if (candidates.length === 0) return null;

    // Score and rank candidates
    const scored = candidates.map(node => ({
      node,
      score: this.calculateNodeScore(node),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return best node
    return scored[0].node;
  }

  /**
   * Get multiple proxies for distributed scraping
   */
  async getProxies(count: number, options: {
    targetUrl?: string;
    countries?: string[];
    diverseLocations?: boolean;
  } = {}): Promise<ProxyNode[]> {
    const result: ProxyNode[] = [];
    const usedCountries = new Set<string>();
    const usedIsps = new Set<string>();

    // Get all online nodes
    let candidates: ProxyNode[] = [];
    for (const node of this.nodes.values()) {
      if (!node.isOnline) continue;

      // Filter by countries if specified
      if (options.countries && options.countries.length > 0) {
        if (!options.countries.includes(node.country)) continue;
      }

      candidates.push(node);
    }

    // Score candidates
    const scored = candidates.map(node => ({
      node,
      score: this.calculateNodeScore(node),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Select diverse proxies
    for (const { node } of scored) {
      if (result.length >= count) break;

      // Ensure diversity if requested
      if (options.diverseLocations) {
        if (usedCountries.has(node.country) && usedCountries.size < 5) {
          // Skip if we already have a node from this country (unless we need more)
          if (result.length < count / 2) continue;
        }
        if (node.isp && usedIsps.has(node.isp)) {
          // Skip if we already have a node from this ISP
          continue;
        }
      }

      result.push(node);
      usedCountries.add(node.country);
      if (node.isp) usedIsps.add(node.isp);
    }

    return result;
  }

  /**
   * Record a proxy request result
   */
  async recordRequest(nodeId: string, result: {
    success: boolean;
    bytesTransferred: number;
    responseTime: number;
    errorMessage?: string;
  }): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.totalRequests++;
    if (result.success) {
      node.successfulRequests++;
    }
    node.bytesServed += result.bytesTransferred;
    node.successRate = node.successfulRequests / node.totalRequests;

    // Update latency (rolling average)
    node.latency = (node.latency + result.responseTime) / 2;

    // Calculate credits earned
    let credits = CREDIT_RATES.PER_REQUEST;
    credits += (result.bytesTransferred / 1024 / 1024) * CREDIT_RATES.PER_MB;

    // Apply quality bonus
    if (node.successRate > 0.95) {
      credits *= CREDIT_RATES.QUALITY_MULTIPLIER;
    }

    node.creditsEarned += credits;

    this.nodes.set(nodeId, node);
    this.emit('request:completed', { nodeId, result, credits });
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): NetworkStats {
    let totalBandwidth = 0;
    let totalLatency = 0;
    let totalSuccessRate = 0;
    let totalRequests = 0;
    let totalBytes = 0;
    let onlineCount = 0;
    const countries = new Set<string>();

    for (const node of this.nodes.values()) {
      if (node.isOnline) {
        onlineCount++;
        totalBandwidth += node.bandwidth;
        totalLatency += node.latency;
        totalSuccessRate += node.successRate;
      }
      totalRequests += node.totalRequests;
      totalBytes += node.bytesServed;
      countries.add(node.country);
    }

    return {
      totalNodes: this.nodes.size,
      onlineNodes: onlineCount,
      totalBandwidth,
      totalRequestsServed: totalRequests,
      averageLatency: onlineCount > 0 ? totalLatency / onlineCount : 0,
      averageSuccessRate: onlineCount > 0 ? totalSuccessRate / onlineCount : 0,
      countryCoverage: Array.from(countries),
      bytesTransferredTotal: totalBytes,
    };
  }

  /**
   * Get user's earned credits
   */
  getUserCredits(userId: string): { totalCredits: number; nodes: ProxyNode[] } {
    let totalCredits = 0;
    const userNodes: ProxyNode[] = [];

    for (const node of this.nodes.values()) {
      if (node.userId === userId) {
        totalCredits += node.creditsEarned;
        userNodes.push(node);
      }
    }

    return { totalCredits, nodes: userNodes };
  }

  /**
   * Get leaderboard of top contributors
   */
  getLeaderboard(limit: number = 10): Array<{
    userId: string;
    totalCredits: number;
    totalNodes: number;
    totalBytesServed: number;
  }> {
    const userStats = new Map<string, {
      userId: string;
      totalCredits: number;
      totalNodes: number;
      totalBytesServed: number;
    }>();

    for (const node of this.nodes.values()) {
      const existing = userStats.get(node.userId) || {
        userId: node.userId,
        totalCredits: 0,
        totalNodes: 0,
        totalBytesServed: 0,
      };

      existing.totalCredits += node.creditsEarned;
      existing.totalNodes++;
      existing.totalBytesServed += node.bytesServed;

      userStats.set(node.userId, existing);
    }

    return Array.from(userStats.values())
      .sort((a, b) => b.totalCredits - a.totalCredits)
      .slice(0, limit);
  }

  /**
   * Calculate node quality score
   */
  private calculateNodeScore(node: ProxyNode): number {
    let score = 0;

    // Success rate (0-40 points)
    score += node.successRate * 40;

    // Latency (0-30 points, lower is better)
    if (node.latency < 100) score += 30;
    else if (node.latency < 200) score += 25;
    else if (node.latency < 500) score += 15;
    else if (node.latency < 1000) score += 5;

    // Bandwidth (0-20 points)
    if (node.bandwidth >= 100) score += 20;
    else if (node.bandwidth >= 50) score += 15;
    else if (node.bandwidth >= 10) score += 10;
    else score += 5;

    // Uptime (0-10 points)
    score += (node.uptime / 100) * 10;

    // Type bonus
    if (node.type === 'residential') score += 5;
    else if (node.type === 'mobile') score += 3;

    return score;
  }

  /**
   * Generate unique node ID
   */
  private generateNodeId(host: string, port: number, userId: string): string {
    const data = `${host}:${port}:${userId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Generate key pair for node authentication
   */
  private generateKeyPair(): { publicKey: string; privateKey: string } {
    // In production, use proper asymmetric encryption
    const privateKey = crypto.randomBytes(32).toString('hex');
    const publicKey = crypto.createHash('sha256').update(privateKey).digest('hex');
    return { publicKey, privateKey };
  }

  /**
   * Generate auth token for node
   */
  private generateAuthToken(nodeId: string): string {
    const timestamp = Date.now();
    const data = `${nodeId}:${timestamp}`;
    return crypto.createHmac('sha256', 'merlin-proxy-secret').update(data).digest('hex');
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitor(): void {
    // Check node health every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute timeout

      for (const [nodeId, node] of this.nodes.entries()) {
        const lastSeenMs = node.lastSeen.getTime();
        if (now - lastSeenMs > timeout && node.isOnline) {
          node.isOnline = false;
          this.nodes.set(nodeId, node);
          this.emit('node:offline', nodeId);
          console.log(`[MerlinProxyNetwork] Node went offline: ${nodeId}`);
        }
      }
    }, 30000);
  }

  /**
   * Shutdown the network
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.nodes.clear();
    this.sessions.clear();
    console.log('[MerlinProxyNetwork] Shutdown complete');
  }
}

// Singleton instance
export const merlinProxyNetwork = new MerlinProxyNetwork();
