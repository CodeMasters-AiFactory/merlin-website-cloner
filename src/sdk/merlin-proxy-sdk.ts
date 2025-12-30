/**
 * Merlin P2P Proxy SDK
 *
 * Client library for contributing bandwidth to the Merlin proxy network.
 * Users earn credits for sharing their internet connection.
 *
 * Usage:
 * ```typescript
 * import { MerlinProxySDK } from './merlin-proxy-sdk';
 *
 * const sdk = new MerlinProxySDK({
 *   serverUrl: 'https://api.merlin.io',
 *   authToken: 'your-auth-token',
 * });
 *
 * await sdk.start();
 * console.log('Proxy node running! Earning credits...');
 * ```
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import * as url from 'url';

export interface SDKConfig {
  serverUrl: string;
  authToken: string;
  port?: number; // Local proxy port (default: random)
  maxBandwidth?: number; // Max bandwidth to share in Mbps (default: 10)
  allowedDomains?: string[]; // Only proxy these domains (empty = all)
  blockedDomains?: string[]; // Never proxy these domains
  heartbeatInterval?: number; // Heartbeat interval in ms (default: 30000)
  maxConcurrentConnections?: number; // Max concurrent connections (default: 50)
}

export interface NodeInfo {
  nodeId: string;
  publicKey: string;
  authToken: string;
  geoData?: {
    country: string;
    countryCode: string;
    continent: string;
    asn?: number;
    asnOrg?: string;
    isp?: string;
  };
}

export interface SDKStats {
  requestsServed: number;
  bytesTransferred: number;
  successfulRequests: number;
  failedRequests: number;
  creditsEarned: number;
  uptime: number;
  currentConnections: number;
}

export class MerlinProxySDK extends EventEmitter {
  private config: Required<SDKConfig>;
  private server: http.Server | null = null;
  private nodeInfo: NodeInfo | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private stats: SDKStats = {
    requestsServed: 0,
    bytesTransferred: 0,
    successfulRequests: 0,
    failedRequests: 0,
    creditsEarned: 0,
    uptime: 0,
    currentConnections: 0,
  };
  private activeConnections: Set<net.Socket> = new Set();

  constructor(config: SDKConfig) {
    super();
    this.config = {
      serverUrl: config.serverUrl,
      authToken: config.authToken,
      port: config.port || 0, // 0 = random port
      maxBandwidth: config.maxBandwidth || 10,
      allowedDomains: config.allowedDomains || [],
      blockedDomains: config.blockedDomains || [],
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxConcurrentConnections: config.maxConcurrentConnections || 50,
    };
  }

  /**
   * Start the proxy node
   */
  async start(): Promise<NodeInfo> {
    // Get public IP
    const publicIP = await this.getPublicIP();

    // Register with server
    this.nodeInfo = await this.registerNode(publicIP);

    // Start local proxy server
    await this.startProxyServer();

    // Start heartbeat
    this.startHeartbeat();

    this.startTime = Date.now();
    this.emit('started', this.nodeInfo);

    return this.nodeInfo;
  }

  /**
   * Stop the proxy node
   */
  async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    // Close all active connections
    for (const socket of this.activeConnections) {
      socket.destroy();
    }
    this.activeConnections.clear();

    // Notify server
    if (this.nodeInfo) {
      await this.sendHeartbeat(false);
    }

    this.emit('stopped');
  }

  /**
   * Get current statistics
   */
  getStats(): SDKStats {
    return {
      ...this.stats,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      currentConnections: this.activeConnections.size,
    };
  }

  /**
   * Get node info
   */
  getNodeInfo(): NodeInfo | null {
    return this.nodeInfo;
  }

  // Private methods

  private async getPublicIP(): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get('https://api.ipify.org?format=json', (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.ip);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  private async registerNode(publicIP: string): Promise<NodeInfo> {
    return new Promise((resolve, reject) => {
      const serverUrl = new URL(this.config.serverUrl);
      const options: https.RequestOptions = {
        hostname: serverUrl.hostname,
        port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
        path: '/api/proxy-network/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`,
        },
      };

      const protocol = serverUrl.protocol === 'https:' ? https : http;
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`Registration failed: ${data}`));
              return;
            }
            const json = JSON.parse(data);
            resolve({
              nodeId: json.nodeId,
              publicKey: json.publicKey,
              authToken: json.authToken,
              geoData: json.geoData,
            });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify({
        host: publicIP,
        port: this.config.port,
        country: 'auto', // Will be detected by server
        bandwidth: this.config.maxBandwidth,
        type: 'residential',
        version: '1.0.0',
      }));
      req.end();
    });
  }

  private async startProxyServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('connect', (req, clientSocket, head) => {
        this.handleConnect(req, clientSocket, head);
      });

      this.server.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.server.listen(this.config.port, () => {
        const address = this.server!.address() as net.AddressInfo;
        this.config.port = address.port;
        this.emit('listening', address.port);
        resolve();
      });
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const startTime = Date.now();
    let bytesTransferred = 0;

    // Check domain restrictions
    const targetUrl = req.url || '';
    if (!this.isDomainAllowed(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Domain not allowed');
      return;
    }

    // Check connection limit
    if (this.activeConnections.size >= this.config.maxConcurrentConnections) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Too many connections');
      return;
    }

    try {
      const parsedUrl = url.parse(targetUrl);
      const options: http.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.path,
        method: req.method,
        headers: req.headers,
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.on('data', (chunk: Buffer) => {
          bytesTransferred += chunk.length;
        });
        proxyRes.pipe(res);
      });

      proxyReq.on('error', (err) => {
        this.stats.failedRequests++;
        this.reportRequest(false, bytesTransferred, Date.now() - startTime, err.message);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy error: ' + err.message);
      });

      req.pipe(proxyReq);

      res.on('finish', () => {
        this.stats.requestsServed++;
        this.stats.successfulRequests++;
        this.stats.bytesTransferred += bytesTransferred;
        this.reportRequest(true, bytesTransferred, Date.now() - startTime);
      });
    } catch (err) {
      this.stats.failedRequests++;
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal error');
    }
  }

  private handleConnect(
    req: http.IncomingMessage,
    clientSocket: net.Socket,
    head: Buffer
  ): void {
    const startTime = Date.now();
    let bytesTransferred = 0;

    // Check domain restrictions
    const targetHost = req.url || '';
    if (!this.isDomainAllowed(targetHost)) {
      clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      clientSocket.destroy();
      return;
    }

    // Check connection limit
    if (this.activeConnections.size >= this.config.maxConcurrentConnections) {
      clientSocket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      clientSocket.destroy();
      return;
    }

    const [hostname, port] = targetHost.split(':');
    const serverSocket = net.connect(parseInt(port) || 443, hostname, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

      this.activeConnections.add(clientSocket);
      this.activeConnections.add(serverSocket);

      serverSocket.write(head);
      serverSocket.pipe(clientSocket);
      clientSocket.pipe(serverSocket);

      // Track bytes
      serverSocket.on('data', (chunk: Buffer) => {
        bytesTransferred += chunk.length;
      });
      clientSocket.on('data', (chunk: Buffer) => {
        bytesTransferred += chunk.length;
      });
    });

    const cleanup = () => {
      this.activeConnections.delete(clientSocket);
      this.activeConnections.delete(serverSocket);
      this.stats.requestsServed++;
      this.stats.successfulRequests++;
      this.stats.bytesTransferred += bytesTransferred;
      this.reportRequest(true, bytesTransferred, Date.now() - startTime);
    };

    serverSocket.on('end', cleanup);
    clientSocket.on('end', cleanup);

    serverSocket.on('error', (err) => {
      this.stats.failedRequests++;
      this.reportRequest(false, bytesTransferred, Date.now() - startTime, err.message);
      clientSocket.destroy();
      this.activeConnections.delete(clientSocket);
      this.activeConnections.delete(serverSocket);
    });

    clientSocket.on('error', () => {
      serverSocket.destroy();
      this.activeConnections.delete(clientSocket);
      this.activeConnections.delete(serverSocket);
    });
  }

  private isDomainAllowed(targetUrl: string): boolean {
    try {
      const hostname = targetUrl.includes('://')
        ? new URL(targetUrl).hostname
        : targetUrl.split(':')[0];

      // Check blocked domains
      if (this.config.blockedDomains.some(d => hostname.includes(d))) {
        return false;
      }

      // If allowed domains specified, check against them
      if (this.config.allowedDomains.length > 0) {
        return this.config.allowedDomains.some(d => hostname.includes(d));
      }

      return true;
    } catch {
      return false;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat(true);
    }, this.config.heartbeatInterval);
  }

  private async sendHeartbeat(isOnline: boolean): Promise<void> {
    if (!this.nodeInfo) return;

    const serverUrl = new URL(this.config.serverUrl);
    const options: https.RequestOptions = {
      hostname: serverUrl.hostname,
      port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
      path: '/api/proxy-network/heartbeat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.authToken}`,
      },
    };

    const protocol = serverUrl.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          this.emit('heartbeat', { success: true });
        } else {
          this.emit('heartbeat', { success: false, error: data });
        }
      });
    });

    req.on('error', (err) => {
      this.emit('heartbeat', { success: false, error: err.message });
    });

    req.write(JSON.stringify({
      nodeId: this.nodeInfo.nodeId,
      isOnline,
      latency: 0, // TODO: Measure actual latency
      bandwidth: this.config.maxBandwidth,
      currentLoad: (this.activeConnections.size / this.config.maxConcurrentConnections) * 100,
    }));
    req.end();
  }

  private async reportRequest(
    success: boolean,
    bytesTransferred: number,
    responseTime: number,
    errorMessage?: string
  ): Promise<void> {
    if (!this.nodeInfo) return;

    const serverUrl = new URL(this.config.serverUrl);
    const options: https.RequestOptions = {
      hostname: serverUrl.hostname,
      port: serverUrl.port || (serverUrl.protocol === 'https:' ? 443 : 80),
      path: '/api/proxy-network/report',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.authToken}`,
      },
    };

    const protocol = serverUrl.protocol === 'https:' ? https : http;
    const req = protocol.request(options);
    req.on('error', () => {}); // Silently ignore report errors
    req.write(JSON.stringify({
      nodeId: this.nodeInfo.nodeId,
      success,
      bytesTransferred,
      responseTime,
      errorMessage,
    }));
    req.end();
  }
}

// Export for CLI usage
export async function startContributorNode(config: SDKConfig): Promise<MerlinProxySDK> {
  const sdk = new MerlinProxySDK(config);

  sdk.on('started', (nodeInfo) => {
    console.log('🚀 Merlin Proxy Node Started!');
    console.log(`   Node ID: ${nodeInfo.nodeId}`);
    if (nodeInfo.geoData) {
      console.log(`   Location: ${nodeInfo.geoData.country} (${nodeInfo.geoData.countryCode})`);
      console.log(`   ISP: ${nodeInfo.geoData.isp || 'Unknown'}`);
      console.log(`   ASN: ${nodeInfo.geoData.asn || 'Unknown'}`);
    }
    console.log('');
    console.log('💰 You are now earning credits for sharing your bandwidth!');
  });

  sdk.on('listening', (port) => {
    console.log(`📡 Proxy server listening on port ${port}`);
  });

  sdk.on('heartbeat', (result) => {
    if (!result.success) {
      console.error('⚠️ Heartbeat failed:', result.error);
    }
  });

  sdk.on('error', (err) => {
    console.error('❌ Error:', err.message);
  });

  await sdk.start();

  // Stats reporter
  setInterval(() => {
    const stats = sdk.getStats();
    console.log(`📊 Stats: ${stats.requestsServed} requests, ${formatBytes(stats.bytesTransferred)} transferred, ${stats.currentConnections} active connections`);
  }, 60000);

  return sdk;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
