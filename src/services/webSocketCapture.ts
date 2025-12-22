/**
 * WebSocket Capture Service
 * Captures and replays WebSocket messages for offline functionality
 */

import type { Page, CDPSession } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface WebSocketMessage {
  timestamp: number;
  type: 'sent' | 'received';
  data: string | Buffer;
  url: string;
}

export interface WebSocketConnection {
  url: string;
  protocol?: string;
  messages: WebSocketMessage[];
  openedAt: number;
  closedAt?: number;
}

export interface WebSocketCaptureOptions {
  outputDir: string;
  pageUrl: string;
  saveToFile?: boolean;
}

/**
 * WebSocket Capture Service
 */
export class WebSocketCapture {
  private connections: Map<string, WebSocketConnection> = new Map();
  private cdpSessions: Map<Page, CDPSession> = new Map();

  /**
   * Starts capturing WebSocket messages for a page
   */
  async startCapture(page: Page, options: WebSocketCaptureOptions): Promise<void> {
    try {
      // Enable Network domain to intercept WebSocket frames
      const client = await page.target().createCDPSession();
      this.cdpSessions.set(page, client);
      
      await client.send('Network.enable');
      await client.send('Runtime.enable');
      
      // Listen for WebSocket frame events
      client.on('Network.webSocketFrameReceived', (params: any) => {
        this.handleWebSocketMessage(
          params.requestId,
          'received',
          params.response.payloadData,
          options
        );
      });
      
      client.on('Network.webSocketFrameSent', (params: any) => {
        this.handleWebSocketMessage(
          params.requestId,
          'sent',
          params.response.payloadData,
          options
        );
      });
      
      // Listen for WebSocket handshake
      client.on('Network.webSocketWillSendHandshakeRequest', (params: any) => {
        this.handleWebSocketOpen(params.requestId, params.request.url, params.request.headers, options);
      });
      
      client.on('Network.webSocketHandshakeResponseReceived', (params: any) => {
        this.handleWebSocketHandshake(params.requestId, params.response, options);
      });
      
      client.on('Network.webSocketClosed', (params: any) => {
        this.handleWebSocketClose(params.requestId, options);
      });
      
    } catch (error) {
      // CDP might not be available, use fallback method
      await this.startCaptureFallback(page, options);
    }
  }
  
  /**
   * Fallback WebSocket capture using page evaluation
   */
  private async startCaptureFallback(page: Page, options: WebSocketCaptureOptions): Promise<void> {
    await page.evaluateOnNewDocument((opts) => {
      interface WebSocketMessage {
        timestamp: number;
        type: 'sent' | 'received';
        data: string;
        url: string;
      }
      
      interface WebSocketConnection {
        url: string;
        protocol?: string;
        messages: WebSocketMessage[];
        openedAt: number;
        closedAt?: number;
      }
      
      const connections: Map<string, WebSocketConnection> = new Map();
      
      // Intercept WebSocket constructor
      const OriginalWebSocket = (window as any).WebSocket;
      (window as any).WebSocket = function(url: string, protocols?: string | string[]) {
        const ws = new OriginalWebSocket(url, protocols);
        const connectionId = `${url}-${Date.now()}`;
        
        const connection: WebSocketConnection = {
          url,
          protocol: typeof protocols === 'string' ? protocols : protocols?.[0],
          messages: [],
          openedAt: Date.now(),
        };
        
        connections.set(connectionId, connection);
        
        // Capture sent messages
        const originalSend = ws.send;
        ws.send = function(data: string | ArrayBuffer | Blob) {
          connection.messages.push({
            timestamp: Date.now(),
            type: 'sent',
            data: typeof data === 'string' ? data : String(data),
            url,
          });
          return originalSend.apply(ws, [data]);
        };
        
        // Capture received messages
        ws.addEventListener('message', (event: MessageEvent) => {
          connection.messages.push({
            timestamp: Date.now(),
            type: 'received',
            data: typeof event.data === 'string' ? event.data : String(event.data),
            url,
          });
        });
        
        ws.addEventListener('close', () => {
          connection.closedAt = Date.now();
          // Store in global for retrieval
          (window as any).__capturedWebSockets = (window as any).__capturedWebSockets || [];
          (window as any).__capturedWebSockets.push(connection);
        });
        
        return ws;
      };
    }, options);
  }
  
  /**
   * Handles WebSocket message
   */
  private handleWebSocketMessage(
    requestId: string,
    type: 'sent' | 'received',
    data: string,
    options: WebSocketCaptureOptions
  ): void {
    const connection = this.connections.get(requestId);
    if (!connection) {
      return;
    }
    
    connection.messages.push({
      timestamp: Date.now(),
      type,
      data,
      url: connection.url,
    });
  }
  
  /**
   * Handles WebSocket open
   */
  private handleWebSocketOpen(
    requestId: string,
    url: string,
    headers: Record<string, string>,
    options: WebSocketCaptureOptions
  ): void {
    const connection: WebSocketConnection = {
      url,
      messages: [],
      openedAt: Date.now(),
    };
    
    this.connections.set(requestId, connection);
  }
  
  /**
   * Handles WebSocket handshake
   */
  private handleWebSocketHandshake(
    requestId: string,
    response: any,
    options: WebSocketCaptureOptions
  ): void {
    const connection = this.connections.get(requestId);
    if (connection && response.headers) {
      connection.protocol = response.headers['Sec-WebSocket-Protocol'];
    }
  }
  
  /**
   * Handles WebSocket close
   */
  private handleWebSocketClose(requestId: string, options: WebSocketCaptureOptions): void {
    const connection = this.connections.get(requestId);
    if (connection) {
      connection.closedAt = Date.now();
    }
  }
  
  /**
   * Stops capturing and saves WebSocket data
   */
  async stopCapture(page: Page, options: WebSocketCaptureOptions): Promise<WebSocketConnection[]> {
    const client = this.cdpSessions.get(page);
    if (client) {
      try {
        await client.send('Network.disable');
        this.cdpSessions.delete(page);
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Also try to get WebSocket data from page evaluation (fallback)
    try {
      const fallbackConnections = await page.evaluate(() => {
        return (window as any).__capturedWebSockets || [];
      });
      
      for (const conn of fallbackConnections) {
        const connection: WebSocketConnection = {
          url: conn.url,
          protocol: conn.protocol,
          messages: conn.messages || [],
          openedAt: conn.openedAt,
          closedAt: conn.closedAt,
        };
        this.connections.set(`${conn.url}-${conn.openedAt}`, connection);
      }
    } catch (error) {
      // Ignore errors
    }
    
    const allConnections = Array.from(this.connections.values());
    
    // Save to file if requested
    if (options.saveToFile !== false && allConnections.length > 0) {
      await this.saveWebSocketData(allConnections, options);
    }
    
    return allConnections;
  }
  
  /**
   * Saves WebSocket data to file
   */
  private async saveWebSocketData(
    connections: WebSocketConnection[],
    options: WebSocketCaptureOptions
  ): Promise<void> {
    try {
      const wsDir = path.join(options.outputDir, 'websockets');
      await fs.mkdir(wsDir, { recursive: true });
      
      const filename = `websockets-${Date.now()}.json`;
      const filePath = path.join(wsDir, filename);
      
      await fs.writeFile(
        filePath,
        JSON.stringify(connections, null, 2),
        'utf-8'
      );
    } catch (error) {
      // Ignore save errors
    }
  }
  
  /**
   * Gets captured WebSocket connections
   */
  getConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }
  
  /**
   * Clears captured connections
   */
  clear(): void {
    this.connections.clear();
  }
}

