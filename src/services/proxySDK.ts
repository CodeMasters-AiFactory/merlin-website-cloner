/**
 * Merlin Proxy SDK
 * Install this on user devices to contribute bandwidth and earn credits
 *
 * How it works:
 * 1. User installs the SDK on their device
 * 2. SDK registers as a proxy node with Merlin network
 * 3. When other users need proxies, traffic routes through contributing nodes
 * 4. Contributors earn credits based on bandwidth/requests served
 * 5. Credits can be used for free website cloning
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as net from 'net';
import * as url from 'url';
import * as os from 'os';
import * as crypto from 'crypto';
import type { Duplex } from 'stream';

export interface SDKConfig {
  userId: string;
  authToken: string;
  serverUrl: string;
  maxBandwidth?: number; // Mbps limit
  allowedHours?: { start: number; end: number }; // Active hours
  excludedDomains?: string[]; // Domains to never proxy
  port?: number;
}

export interface SDKStats {
  requestsServed: number;
  bytesTransferred: number;
  creditsEarned: number;
  uptime: number;
  currentConnections: number;
  isActive: boolean;
}

export class MerlinProxySDK extends EventEmitter {
  private config: SDKConfig;
  private server: http.Server | null = null;
  private nodeId: string | null = null;
  private stats: SDKStats = {
    requestsServed: 0,
    bytesTransferred: 0,
    creditsEarned: 0,
    uptime: 0,
    currentConnections: 0,
    isActive: false,
  };
  private startTime: Date | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activeConnections: Set<Duplex> = new Set();

  constructor(config: SDKConfig) {
    super();
    this.config = {
      port: 8899,
      maxBandwidth: 10, // 10 Mbps default
      allowedHours: { start: 0, end: 24 }, // 24/7 default
      excludedDomains: ['localhost', '127.0.0.1', '*.local'],
      ...config,
    };
  }

  /**
   * Start the proxy SDK
   */
  async start(): Promise<{ nodeId: string; port: number }> {
    if (this.server) {
      throw new Error('SDK already running');
    }

    // Register with Merlin network
    const registration = await this.registerWithNetwork();
    this.nodeId = registration.nodeId;

    // Create proxy server
    this.server = http.createServer((req, res) => this.handleRequest(req, res));

    // Handle CONNECT method for HTTPS
    this.server.on('connect', (req, socket, head) => this.handleConnect(req, socket, head));

    // Start listening
    return new Promise((resolve, reject) => {
      this.server!.listen(this.config.port, () => {
        this.startTime = new Date();
        this.stats.isActive = true;

        // Start heartbeat
        this.startHeartbeat();

        console.log(`[MerlinSDK] Proxy node started on port ${this.config.port}`);
        console.log(`[MerlinSDK] Node ID: ${this.nodeId}`);
        console.log(`[MerlinSDK] Earning credits for Merlin Clone service!`);

        this.emit('started', { nodeId: this.nodeId, port: this.config.port });
        resolve({ nodeId: this.nodeId!, port: this.config.port! });
      });

      this.server!.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });
    });
  }

  /**
   * Stop the proxy SDK
   */
  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all active connections
    for (const socket of this.activeConnections) {
      socket.destroy();
    }
    this.activeConnections.clear();

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.stats.isActive = false;
          this.server = null;
          console.log('[MerlinSDK] Proxy node stopped');
          this.emit('stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Get current stats
   */
  getStats(): SDKStats {
    if (this.startTime) {
      this.stats.uptime = (Date.now() - this.startTime.getTime()) / 1000;
    }
    return { ...this.stats };
  }

  /**
   * Register with Merlin network
   */
  private async registerWithNetwork(): Promise<{ nodeId: string }> {
    const networkInfo = this.getNetworkInfo();

    const payload = {
      userId: this.config.userId,
      authToken: this.config.authToken,
      host: networkInfo.publicIp || networkInfo.localIp,
      port: this.config.port,
      country: networkInfo.country,
      city: networkInfo.city,
      isp: networkInfo.isp,
      bandwidth: this.config.maxBandwidth,
      type: 'residential' as const, // Users contribute residential IPs
      version: '1.0.0',
    };

    try {
      const response = await fetch(`${this.config.serverUrl}/api/proxy-network/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const data = await response.json();
      return { nodeId: data.nodeId };
    } catch (error) {
      // Fallback: generate local node ID if network unavailable
      console.warn('[MerlinSDK] Network registration failed, using local mode');
      const nodeId = crypto.randomBytes(8).toString('hex');
      return { nodeId };
    }
  }

  /**
   * Get network information
   */
  private getNetworkInfo(): {
    localIp: string;
    publicIp?: string;
    country?: string;
    city?: string;
    isp?: string;
  } {
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';

    for (const iface of Object.values(interfaces)) {
      if (!iface) continue;
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          localIp = alias.address;
          break;
        }
      }
    }

    return {
      localIp,
      // In production, fetch public IP and geo info from an API
      country: 'US',
      city: 'Unknown',
      isp: 'Unknown',
    };
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Check if within allowed hours
    if (!this.isWithinAllowedHours()) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Proxy not available during this time');
      return;
    }

    // Check excluded domains
    const targetUrl = req.url;
    if (!targetUrl) {
      res.writeHead(400);
      res.end('Invalid request');
      return;
    }

    const parsedUrl = url.parse(targetUrl);
    if (this.isExcludedDomain(parsedUrl.hostname || '')) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Domain not allowed');
      return;
    }

    // Forward the request
    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.path,
      method: req.method,
      headers: { ...req.headers },
    };

    // Remove proxy-specific headers
    const headers = options.headers as Record<string, string | string[] | undefined>;
    delete headers['proxy-connection'];
    delete headers['proxy-authorization'];

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

      let bytesReceived = 0;
      proxyRes.on('data', (chunk) => {
        bytesReceived += chunk.length;
        res.write(chunk);
      });

      proxyRes.on('end', () => {
        res.end();
        this.recordRequest(true, bytesReceived);
      });
    });

    proxyReq.on('error', (error) => {
      console.error('[MerlinSDK] Proxy request error:', error.message);
      res.writeHead(502);
      res.end('Proxy error');
      this.recordRequest(false, 0);
    });

    req.pipe(proxyReq);
  }

  /**
   * Handle HTTPS CONNECT requests
   */
  private handleConnect(req: http.IncomingMessage, clientSocket: Duplex, head: Buffer): void {
    // Check if within allowed hours
    if (!this.isWithinAllowedHours()) {
      clientSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      clientSocket.destroy();
      return;
    }

    const [hostname, port] = (req.url || '').split(':');

    // Check excluded domains
    if (this.isExcludedDomain(hostname)) {
      clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      clientSocket.destroy();
      return;
    }

    // Track connection
    this.activeConnections.add(clientSocket);
    this.stats.currentConnections = this.activeConnections.size;

    // Connect to target
    const serverSocket = net.connect(parseInt(port) || 443, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

      let bytesTransferred = 0;

      serverSocket.on('data', (chunk) => {
        bytesTransferred += chunk.length;
      });

      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);

      serverSocket.on('end', () => {
        this.recordRequest(true, bytesTransferred);
      });
    });

    serverSocket.on('error', (error) => {
      console.error('[MerlinSDK] CONNECT error:', error.message);
      clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      clientSocket.destroy();
      this.recordRequest(false, 0);
    });

    clientSocket.on('error', () => {
      serverSocket.destroy();
    });

    clientSocket.on('close', () => {
      this.activeConnections.delete(clientSocket);
      this.stats.currentConnections = this.activeConnections.size;
      serverSocket.destroy();
    });
  }

  /**
   * Check if current time is within allowed hours
   */
  private isWithinAllowedHours(): boolean {
    if (!this.config.allowedHours) return true;

    const now = new Date();
    const hour = now.getHours();
    const { start, end } = this.config.allowedHours;

    if (start <= end) {
      return hour >= start && hour < end;
    } else {
      // Wraps around midnight
      return hour >= start || hour < end;
    }
  }

  /**
   * Check if domain is excluded
   */
  private isExcludedDomain(hostname: string): boolean {
    if (!this.config.excludedDomains) return false;

    return this.config.excludedDomains.some(pattern => {
      if (pattern.startsWith('*.')) {
        const suffix = pattern.slice(2);
        return hostname.endsWith(suffix) || hostname === suffix;
      }
      return hostname === pattern;
    });
  }

  /**
   * Record a completed request
   */
  private recordRequest(success: boolean, bytes: number): void {
    this.stats.requestsServed++;
    this.stats.bytesTransferred += bytes;

    // Calculate credits
    let credits = 0.001; // Base credit per request
    credits += (bytes / 1024 / 1024) * 0.01; // Credits per MB

    if (success) {
      credits *= 1.5; // Bonus for successful requests
    }

    this.stats.creditsEarned += credits;

    this.emit('request:completed', {
      success,
      bytes,
      credits,
    });

    // Report to network
    this.reportRequest(success, bytes);
  }

  /**
   * Report request to Merlin network
   */
  private async reportRequest(success: boolean, bytes: number): Promise<void> {
    if (!this.nodeId) return;

    try {
      await fetch(`${this.config.serverUrl}/api/proxy-network/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
        },
        body: JSON.stringify({
          nodeId: this.nodeId,
          success,
          bytesTransferred: bytes,
          responseTime: 100, // Would measure actual time
        }),
      });
    } catch {
      // Silently fail - stats will sync on next heartbeat
    }
  }

  /**
   * Start heartbeat reporting
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.nodeId) return;

      try {
        await fetch(`${this.config.serverUrl}/api/proxy-network/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.authToken}`,
          },
          body: JSON.stringify({
            nodeId: this.nodeId,
            isOnline: true,
            latency: 50, // Would measure actual latency
            bandwidth: this.config.maxBandwidth,
            currentLoad: this.stats.currentConnections,
          }),
        });
      } catch {
        // Network issues - continue operating
      }
    }, 30000); // Every 30 seconds
  }
}

/**
 * CLI for running the SDK as a standalone service
 */
export async function runSDKCli(): Promise<void> {
  const userId = process.env.MERLIN_USER_ID;
  const authToken = process.env.MERLIN_AUTH_TOKEN;
  const serverUrl = process.env.MERLIN_SERVER_URL || 'https://api.merlinclone.com';

  if (!userId || !authToken) {
    console.error('Error: MERLIN_USER_ID and MERLIN_AUTH_TOKEN environment variables required');
    console.log('\nUsage:');
    console.log('  MERLIN_USER_ID=your-id MERLIN_AUTH_TOKEN=your-token npx merlin-proxy-sdk');
    console.log('\nGet your credentials from: https://merlinclone.com/dashboard/proxy-network');
    process.exit(1);
  }

  const sdk = new MerlinProxySDK({
    userId,
    authToken,
    serverUrl,
    port: parseInt(process.env.MERLIN_PROXY_PORT || '8899'),
    maxBandwidth: parseInt(process.env.MERLIN_MAX_BANDWIDTH || '10'),
  });

  sdk.on('started', ({ nodeId, port }) => {
    console.log('\n===========================================');
    console.log('  Merlin Proxy SDK - Contributing Node');
    console.log('===========================================');
    console.log(`  Node ID:  ${nodeId}`);
    console.log(`  Port:     ${port}`);
    console.log(`  Status:   ACTIVE`);
    console.log('-------------------------------------------');
    console.log('  You are earning credits for website cloning!');
    console.log('  Check your balance at merlinclone.com/dashboard');
    console.log('===========================================\n');
  });

  sdk.on('request:completed', ({ success, bytes, credits }) => {
    const status = success ? '✓' : '✗';
    const kb = (bytes / 1024).toFixed(1);
    console.log(`[${new Date().toLocaleTimeString()}] ${status} Request served: ${kb}KB | +${credits.toFixed(4)} credits`);
  });

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await sdk.stop();
    const stats = sdk.getStats();
    console.log('\n=== Session Summary ===');
    console.log(`Requests served: ${stats.requestsServed}`);
    console.log(`Data transferred: ${(stats.bytesTransferred / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Credits earned: ${stats.creditsEarned.toFixed(4)}`);
    console.log(`Uptime: ${(stats.uptime / 60).toFixed(1)} minutes`);
    process.exit(0);
  });

  await sdk.start();
}
