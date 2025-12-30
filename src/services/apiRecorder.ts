/**
 * API Recorder Service
 * Records all API interactions during website cloning for full app reproduction
 *
 * Features:
 * - Intercepts and records HTTP/HTTPS requests
 * - GraphQL introspection and query recording
 * - REST endpoint discovery
 * - WebSocket message capture
 * - Request/response pair storage
 * - Smart response matching for replay
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

export interface RecordedRequest {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  bodyHash?: string;
}

export interface RecordedResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string;
  bodyHash: string;
  contentType?: string;
  size: number;
  latency: number;
}

export interface RecordedInteraction {
  id: string;
  sessionId: string;
  timestamp: string;
  request: RecordedRequest;
  response: RecordedResponse;
  type: 'rest' | 'graphql' | 'websocket' | 'xhr' | 'fetch';
  endpoint?: string; // Normalized endpoint pattern
  tags: string[];
}

export interface GraphQLOperation {
  operationName?: string;
  operationType: 'query' | 'mutation' | 'subscription';
  query: string;
  variables?: Record<string, unknown>;
  response?: unknown;
}

export interface WebSocketMessage {
  id: string;
  sessionId: string;
  timestamp: string;
  url: string;
  direction: 'sent' | 'received';
  type: 'text' | 'binary';
  data: string;
  size: number;
}

export interface RecordingSession {
  id: string;
  targetUrl: string;
  startTime: string;
  endTime?: string;
  status: 'recording' | 'completed' | 'failed';
  interactions: RecordedInteraction[];
  websocketMessages: WebSocketMessage[];
  graphqlOperations: GraphQLOperation[];
  discoveredEndpoints: EndpointInfo[];
  stats: {
    totalRequests: number;
    totalResponses: number;
    totalBytes: number;
    avgLatency: number;
    uniqueEndpoints: number;
    graphqlQueries: number;
    websocketMessages: number;
  };
}

export interface EndpointInfo {
  pattern: string; // e.g., /api/users/:id
  method: string;
  exampleUrl: string;
  requestCount: number;
  avgLatency: number;
  responseTypes: string[];
  parameters: {
    path: string[];
    query: string[];
    body: string[];
  };
}

export class APIRecorder extends EventEmitter {
  private sessions: Map<string, RecordingSession> = new Map();
  private dataDir: string;
  private isRecording: Map<string, boolean> = new Map();

  constructor(dataDir: string = './data/api-recordings') {
    super();
    this.dataDir = dataDir;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    console.log('[APIRecorder] Service initialized');
  }

  /**
   * Start a new recording session
   */
  async startSession(targetUrl: string): Promise<RecordingSession> {
    const sessionId = this.generateSessionId();

    const session: RecordingSession = {
      id: sessionId,
      targetUrl,
      startTime: new Date().toISOString(),
      status: 'recording',
      interactions: [],
      websocketMessages: [],
      graphqlOperations: [],
      discoveredEndpoints: [],
      stats: {
        totalRequests: 0,
        totalResponses: 0,
        totalBytes: 0,
        avgLatency: 0,
        uniqueEndpoints: 0,
        graphqlQueries: 0,
        websocketMessages: 0,
      },
    };

    this.sessions.set(sessionId, session);
    this.isRecording.set(sessionId, true);

    // Create session directory
    const sessionDir = path.join(this.dataDir, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    this.emit('sessionStarted', { sessionId, targetUrl });
    console.log(`[APIRecorder] Started session ${sessionId} for ${targetUrl}`);

    return session;
  }

  /**
   * Stop a recording session
   */
  async stopSession(sessionId: string): Promise<RecordingSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    this.isRecording.set(sessionId, false);
    session.status = 'completed';
    session.endTime = new Date().toISOString();

    // Analyze and discover endpoints
    session.discoveredEndpoints = this.analyzeEndpoints(session.interactions);
    session.stats.uniqueEndpoints = session.discoveredEndpoints.length;

    // Save session to disk
    await this.saveSession(session);

    this.emit('sessionStopped', { sessionId });
    console.log(`[APIRecorder] Stopped session ${sessionId}`);

    return session;
  }

  /**
   * Record an HTTP interaction
   */
  async recordInteraction(
    sessionId: string,
    request: {
      method: string;
      url: string;
      headers: Record<string, string>;
      body?: string;
    },
    response: {
      statusCode: number;
      statusMessage: string;
      headers: Record<string, string>;
      body: string;
      latency: number;
    }
  ): Promise<RecordedInteraction | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !this.isRecording.get(sessionId)) return null;

    const parsedUrl = new URL(request.url);
    const interactionId = this.generateInteractionId();

    // Determine request type
    const type = this.classifyRequest(request, response);

    // Parse query parameters
    const queryParams: Record<string, string> = {};
    parsedUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    const interaction: RecordedInteraction = {
      id: interactionId,
      sessionId,
      timestamp: new Date().toISOString(),
      request: {
        id: interactionId,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: request.url,
        path: parsedUrl.pathname,
        queryParams,
        headers: this.sanitizeHeaders(request.headers),
        body: request.body,
        bodyHash: request.body ? this.hashContent(request.body) : undefined,
      },
      response: {
        statusCode: response.statusCode,
        statusMessage: response.statusMessage,
        headers: this.sanitizeHeaders(response.headers),
        body: response.body,
        bodyHash: this.hashContent(response.body),
        contentType: response.headers['content-type'] || undefined,
        size: response.body.length,
        latency: response.latency,
      },
      type,
      endpoint: this.normalizeEndpoint(parsedUrl.pathname),
      tags: this.generateTags(request, response),
    };

    session.interactions.push(interaction);
    session.stats.totalRequests++;
    session.stats.totalResponses++;
    session.stats.totalBytes += response.body.length;
    session.stats.avgLatency =
      (session.stats.avgLatency * (session.stats.totalRequests - 1) + response.latency) /
      session.stats.totalRequests;

    // If GraphQL, extract operation
    if (type === 'graphql') {
      const operation = this.extractGraphQLOperation(request.body, response.body);
      if (operation) {
        session.graphqlOperations.push(operation);
        session.stats.graphqlQueries++;
      }
    }

    this.emit('interactionRecorded', { sessionId, interaction });
    return interaction;
  }

  /**
   * Record a WebSocket message
   */
  async recordWebSocketMessage(
    sessionId: string,
    message: {
      url: string;
      direction: 'sent' | 'received';
      type: 'text' | 'binary';
      data: string;
    }
  ): Promise<WebSocketMessage | null> {
    const session = this.sessions.get(sessionId);
    if (!session || !this.isRecording.get(sessionId)) return null;

    const wsMessage: WebSocketMessage = {
      id: this.generateInteractionId(),
      sessionId,
      timestamp: new Date().toISOString(),
      url: message.url,
      direction: message.direction,
      type: message.type,
      data: message.data,
      size: message.data.length,
    };

    session.websocketMessages.push(wsMessage);
    session.stats.websocketMessages++;

    this.emit('websocketMessageRecorded', { sessionId, message: wsMessage });
    return wsMessage;
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): RecordingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): RecordingSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Load a session from disk
   */
  async loadSession(sessionId: string): Promise<RecordingSession | null> {
    const sessionPath = path.join(this.dataDir, sessionId, 'session.json');

    try {
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(data) as RecordingSession;
      this.sessions.set(sessionId, session);
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Export session as HAR format
   */
  async exportAsHAR(sessionId: string): Promise<object | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const har = {
      log: {
        version: '1.2',
        creator: {
          name: 'Merlin API Recorder',
          version: '1.0.0',
        },
        entries: session.interactions.map((interaction) => ({
          startedDateTime: interaction.timestamp,
          time: interaction.response.latency,
          request: {
            method: interaction.request.method,
            url: interaction.request.url,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: Object.entries(interaction.request.headers).map(([name, value]) => ({
              name,
              value,
            })),
            queryString: Object.entries(interaction.request.queryParams).map(
              ([name, value]) => ({ name, value })
            ),
            postData: interaction.request.body
              ? {
                  mimeType:
                    interaction.request.headers['content-type'] || 'application/octet-stream',
                  text: interaction.request.body,
                }
              : undefined,
            headersSize: -1,
            bodySize: interaction.request.body?.length || 0,
          },
          response: {
            status: interaction.response.statusCode,
            statusText: interaction.response.statusMessage,
            httpVersion: 'HTTP/1.1',
            cookies: [],
            headers: Object.entries(interaction.response.headers).map(([name, value]) => ({
              name,
              value,
            })),
            content: {
              size: interaction.response.size,
              mimeType: interaction.response.contentType || 'application/octet-stream',
              text: interaction.response.body,
            },
            redirectURL: '',
            headersSize: -1,
            bodySize: interaction.response.size,
          },
          cache: {},
          timings: {
            send: 0,
            wait: interaction.response.latency,
            receive: 0,
          },
        })),
      },
    };

    return har;
  }

  /**
   * Export session for mock server
   */
  async exportForMocking(sessionId: string): Promise<object | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Group interactions by endpoint
    const mockConfig: Record<
      string,
      {
        method: string;
        pattern: string;
        responses: Array<{
          condition?: Record<string, unknown>;
          response: {
            statusCode: number;
            headers: Record<string, string>;
            body: string;
          };
        }>;
      }
    > = {};

    for (const interaction of session.interactions) {
      const key = `${interaction.request.method}:${interaction.endpoint}`;

      if (!mockConfig[key]) {
        mockConfig[key] = {
          method: interaction.request.method,
          pattern: interaction.endpoint || interaction.request.path,
          responses: [],
        };
      }

      mockConfig[key].responses.push({
        condition: interaction.request.body
          ? { bodyHash: interaction.request.bodyHash }
          : interaction.request.queryParams
            ? { queryParams: interaction.request.queryParams }
            : undefined,
        response: {
          statusCode: interaction.response.statusCode,
          headers: interaction.response.headers,
          body: interaction.response.body,
        },
      });
    }

    return {
      sessionId,
      targetUrl: session.targetUrl,
      endpoints: Object.values(mockConfig),
      graphqlOperations: session.graphqlOperations,
      websocketMessages: session.websocketMessages,
    };
  }

  // Private methods

  private classifyRequest(
    request: { method: string; url: string; headers: Record<string, string>; body?: string },
    response: { headers: Record<string, string> }
  ): 'rest' | 'graphql' | 'websocket' | 'xhr' | 'fetch' {
    const url = request.url.toLowerCase();
    const contentType = (
      request.headers['content-type'] ||
      response.headers['content-type'] ||
      ''
    ).toLowerCase();

    // Check for GraphQL
    if (url.includes('graphql') || url.includes('gql')) {
      return 'graphql';
    }

    // Check request body for GraphQL structure
    if (request.body) {
      try {
        const body = JSON.parse(request.body);
        if (body.query && typeof body.query === 'string') {
          return 'graphql';
        }
      } catch {
        // Not JSON
      }
    }

    // Check headers for XHR vs Fetch
    const requestedWith = request.headers['x-requested-with']?.toLowerCase();
    if (requestedWith === 'xmlhttprequest') {
      return 'xhr';
    }

    // Default to REST
    return 'rest';
  }

  private normalizeEndpoint(pathname: string): string {
    // Replace IDs with placeholders
    // e.g., /api/users/123 -> /api/users/:id
    // e.g., /api/posts/abc-def-ghi -> /api/posts/:id

    return pathname
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid') // UUIDs
      .replace(/\/[a-f0-9]{24}/gi, '/:objectId') // MongoDB ObjectIDs
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token'); // Long tokens/slugs
  }

  private analyzeEndpoints(interactions: RecordedInteraction[]): EndpointInfo[] {
    const endpointMap = new Map<
      string,
      {
        interactions: RecordedInteraction[];
        methods: Set<string>;
        pathParams: Set<string>;
        queryParams: Set<string>;
        bodyParams: Set<string>;
        responseTypes: Set<string>;
        latencies: number[];
      }
    >();

    for (const interaction of interactions) {
      const key = `${interaction.request.method}:${interaction.endpoint}`;

      if (!endpointMap.has(key)) {
        endpointMap.set(key, {
          interactions: [],
          methods: new Set(),
          pathParams: new Set(),
          queryParams: new Set(),
          bodyParams: new Set(),
          responseTypes: new Set(),
          latencies: [],
        });
      }

      const endpoint = endpointMap.get(key)!;
      endpoint.interactions.push(interaction);
      endpoint.methods.add(interaction.request.method);
      endpoint.latencies.push(interaction.response.latency);

      // Extract path parameters
      const pathParts = (interaction.endpoint || '').split('/');
      for (const part of pathParts) {
        if (part.startsWith(':')) {
          endpoint.pathParams.add(part.slice(1));
        }
      }

      // Extract query parameters
      for (const key of Object.keys(interaction.request.queryParams)) {
        endpoint.queryParams.add(key);
      }

      // Extract body parameters
      if (interaction.request.body) {
        try {
          const body = JSON.parse(interaction.request.body);
          for (const key of Object.keys(body)) {
            endpoint.bodyParams.add(key);
          }
        } catch {
          // Not JSON
        }
      }

      // Track response types
      if (interaction.response.contentType) {
        endpoint.responseTypes.add(interaction.response.contentType);
      }
    }

    return Array.from(endpointMap.entries()).map(([key, data]) => ({
      pattern: key.split(':')[1],
      method: key.split(':')[0],
      exampleUrl: data.interactions[0]?.request.url || '',
      requestCount: data.interactions.length,
      avgLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
      responseTypes: Array.from(data.responseTypes),
      parameters: {
        path: Array.from(data.pathParams),
        query: Array.from(data.queryParams),
        body: Array.from(data.bodyParams),
      },
    }));
  }

  private extractGraphQLOperation(
    requestBody?: string,
    responseBody?: string
  ): GraphQLOperation | null {
    if (!requestBody) return null;

    try {
      const request = JSON.parse(requestBody);
      const query = request.query || request.mutation;

      if (!query) return null;

      // Determine operation type
      let operationType: 'query' | 'mutation' | 'subscription' = 'query';
      if (query.trim().startsWith('mutation')) {
        operationType = 'mutation';
      } else if (query.trim().startsWith('subscription')) {
        operationType = 'subscription';
      }

      const operation: GraphQLOperation = {
        operationName: request.operationName,
        operationType,
        query,
        variables: request.variables,
      };

      if (responseBody) {
        try {
          operation.response = JSON.parse(responseBody);
        } catch {
          // Not JSON response
        }
      }

      return operation;
    } catch {
      return null;
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
      'x-csrf-token',
    ];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private generateTags(
    request: { method: string; url: string; headers: Record<string, string>; body?: string },
    response: { statusCode: number; headers: Record<string, string> }
  ): string[] {
    const tags: string[] = [];

    // Method tags
    tags.push(request.method.toLowerCase());

    // Status tags
    if (response.statusCode >= 200 && response.statusCode < 300) {
      tags.push('success');
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      tags.push('client-error');
    } else if (response.statusCode >= 500) {
      tags.push('server-error');
    }

    // Content type tags
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('json')) {
      tags.push('json');
    } else if (contentType.includes('xml')) {
      tags.push('xml');
    } else if (contentType.includes('html')) {
      tags.push('html');
    }

    // Auth tags
    if (request.headers['authorization']) {
      tags.push('authenticated');
    }

    return tags;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private generateInteractionId(): string {
    return `int_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  }

  private async saveSession(session: RecordingSession): Promise<void> {
    const sessionDir = path.join(this.dataDir, session.id);
    await fs.mkdir(sessionDir, { recursive: true });

    // Save main session file
    await fs.writeFile(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(session, null, 2)
    );

    // Save interactions separately for large sessions
    await fs.writeFile(
      path.join(sessionDir, 'interactions.json'),
      JSON.stringify(session.interactions, null, 2)
    );

    // Save GraphQL operations
    if (session.graphqlOperations.length > 0) {
      await fs.writeFile(
        path.join(sessionDir, 'graphql.json'),
        JSON.stringify(session.graphqlOperations, null, 2)
      );
    }

    // Save WebSocket messages
    if (session.websocketMessages.length > 0) {
      await fs.writeFile(
        path.join(sessionDir, 'websocket.json'),
        JSON.stringify(session.websocketMessages, null, 2)
      );
    }

    // Save discovered endpoints
    await fs.writeFile(
      path.join(sessionDir, 'endpoints.json'),
      JSON.stringify(session.discoveredEndpoints, null, 2)
    );

    // Export HAR format
    const har = await this.exportAsHAR(session.id);
    if (har) {
      await fs.writeFile(
        path.join(sessionDir, 'recording.har'),
        JSON.stringify(har, null, 2)
      );
    }

    // Export mock config
    const mockConfig = await this.exportForMocking(session.id);
    if (mockConfig) {
      await fs.writeFile(
        path.join(sessionDir, 'mock-config.json'),
        JSON.stringify(mockConfig, null, 2)
      );
    }

    console.log(`[APIRecorder] Saved session ${session.id} to ${sessionDir}`);
  }
}

// Singleton instance
export const apiRecorder = new APIRecorder();

// Browser integration helper - inject this into the page
export const browserRecordingScript = `
(function() {
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalWebSocket = window.WebSocket;

  // Track requests for correlation
  const pendingRequests = new Map();

  // Hook fetch
  window.fetch = async function(...args) {
    const startTime = performance.now();
    const [url, options = {}] = args;
    const requestId = Math.random().toString(36).slice(2);

    try {
      const response = await originalFetch.apply(this, args);
      const clone = response.clone();
      const body = await clone.text();

      window.postMessage({
        type: 'MERLIN_API_RECORD',
        requestId,
        request: {
          method: options.method || 'GET',
          url: typeof url === 'string' ? url : url.toString(),
          headers: options.headers || {},
          body: options.body,
        },
        response: {
          statusCode: response.status,
          statusMessage: response.statusText,
          headers: Object.fromEntries(response.headers),
          body,
          latency: performance.now() - startTime,
        },
      }, '*');

      return response;
    } catch (error) {
      throw error;
    }
  };

  // Hook XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._merlinMethod = method;
    this._merlinUrl = url;
    this._merlinStartTime = performance.now();
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const originalOnReadyStateChange = xhr.onreadystatechange;

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        window.postMessage({
          type: 'MERLIN_API_RECORD',
          request: {
            method: xhr._merlinMethod,
            url: xhr._merlinUrl,
            headers: {},
            body: body,
          },
          response: {
            statusCode: xhr.status,
            statusMessage: xhr.statusText,
            headers: {},
            body: xhr.responseText,
            latency: performance.now() - xhr._merlinStartTime,
          },
        }, '*');
      }
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.apply(this, arguments);
      }
    };

    return originalXHRSend.apply(this, [body]);
  };

  // Hook WebSocket
  window.WebSocket = class extends originalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      const wsUrl = url;

      this.addEventListener('message', (event) => {
        window.postMessage({
          type: 'MERLIN_WS_RECORD',
          url: wsUrl,
          direction: 'received',
          messageType: typeof event.data === 'string' ? 'text' : 'binary',
          data: event.data,
        }, '*');
      });

      const originalSend = this.send.bind(this);
      this.send = (data) => {
        window.postMessage({
          type: 'MERLIN_WS_RECORD',
          url: wsUrl,
          direction: 'sent',
          messageType: typeof data === 'string' ? 'text' : 'binary',
          data: data,
        }, '*');
        originalSend(data);
      };
    }
  };

  console.log('[Merlin] API Recording initialized');
})();
`;
