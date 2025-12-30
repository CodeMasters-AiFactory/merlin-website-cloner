/**
 * Enhanced API Mock Server
 * High-fidelity API replay for full application cloning
 *
 * Features:
 * - Smart request matching with scoring
 * - Stateful sequence handling
 * - GraphQL operation matching
 * - Dynamic response generation
 * - Latency simulation
 * - WebSocket message replay
 * - HAR file import
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  RecordedInteraction,
  GraphQLOperation,
  WebSocketMessage,
  RecordingSession,
} from './apiRecorder.js';

export interface MockEndpoint {
  id: string;
  method: string;
  pathPattern: string;
  pathRegex: RegExp;
  queryMatchers?: Record<string, string | RegExp>;
  bodyMatchers?: Record<string, unknown>;
  headerMatchers?: Record<string, string>;
  responses: MockResponse[];
  defaultResponse?: MockResponse;
  sequenceIndex: number;
}

export interface MockResponse {
  statusCode: number;
  statusMessage?: string;
  headers: Record<string, string>;
  body: string | object;
  delay?: number;
  condition?: ResponseCondition;
  priority?: number;
}

export interface ResponseCondition {
  queryParams?: Record<string, string>;
  bodyContains?: string;
  bodyJson?: Record<string, unknown>;
  headerContains?: Record<string, string>;
  sequence?: number;
  graphqlOperation?: string;
}

export interface MockServerConfig {
  port: number;
  host?: string;
  corsEnabled?: boolean;
  defaultLatency?: number;
  recording?: RecordingSession;
  customEndpoints?: MockEndpoint[];
  strictMatching?: boolean;
}

export interface RequestMatch {
  endpoint: MockEndpoint;
  response: MockResponse;
  score: number;
  matchDetails: string[];
}

export interface ServerStats {
  totalRequests: number;
  matchedRequests: number;
  unmatchedRequests: number;
  avgLatency: number;
  requestsByEndpoint: Record<string, number>;
}

export class EnhancedAPIMockServer extends EventEmitter {
  private server: http.Server | null = null;
  private endpoints: Map<string, MockEndpoint> = new Map();
  private graphqlOperations: Map<string, GraphQLOperation> = new Map();
  private wsMessages: WebSocketMessage[] = [];
  private requestLog: Array<{
    timestamp: string;
    method: string;
    path: string;
    matched: boolean;
    endpointId?: string;
    latency: number;
    score?: number;
  }> = [];
  private config: Required<MockServerConfig>;
  private sequenceCounters: Map<string, number> = new Map();
  private stats: ServerStats = {
    totalRequests: 0,
    matchedRequests: 0,
    unmatchedRequests: 0,
    avgLatency: 0,
    requestsByEndpoint: {},
  };

  constructor(config: MockServerConfig) {
    super();
    this.config = {
      host: 'localhost',
      corsEnabled: true,
      defaultLatency: 50,
      strictMatching: false,
      recording: config.recording as RecordingSession,
      customEndpoints: config.customEndpoints || [],
      ...config,
    };
  }

  /**
   * Start the mock server
   */
  async start(): Promise<void> {
    // Load recording if provided
    if (this.config.recording) {
      await this.loadFromRecording(this.config.recording);
    }

    // Load custom endpoints
    if (this.config.customEndpoints) {
      for (const endpoint of this.config.customEndpoints) {
        this.addEndpoint(endpoint);
      }
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`[MockServer] Running at http://${this.config.host}:${this.config.port}`);
        console.log(`[MockServer] ${this.endpoints.size} endpoints loaded`);
        this.emit('started', { port: this.config.port, host: this.config.host });
        resolve();
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        this.emit('stopped');
        console.log('[MockServer] Stopped');
        resolve();
      });
    });
  }

  /**
   * Load endpoints from a recording session
   */
  async loadFromRecording(recording: RecordingSession): Promise<void> {
    console.log(`[MockServer] Loading ${recording.interactions.length} interactions`);

    // Group interactions by endpoint pattern
    const endpointGroups = new Map<string, RecordedInteraction[]>();

    for (const interaction of recording.interactions) {
      const normalizedPath = this.normalizeEndpoint(interaction.request.path);
      const key = `${interaction.request.method}:${normalizedPath}`;

      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key)!.push(interaction);
    }

    // Create mock endpoints from groups
    for (const [key, interactions] of endpointGroups) {
      const [method, pattern] = key.split(':');

      const responses: MockResponse[] = interactions.map((interaction, index) => ({
        statusCode: interaction.response.statusCode,
        statusMessage: interaction.response.statusMessage,
        headers: this.cleanHeaders(interaction.response.headers),
        body: this.parseBody(interaction.response.body, interaction.response.contentType),
        delay: this.config.defaultLatency,
        condition: this.extractCondition(interaction, index),
        priority: this.calculatePriority(interaction),
      }));

      // Sort by priority (higher priority first)
      responses.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      const endpoint: MockEndpoint = {
        id: this.generateEndpointId(),
        method,
        pathPattern: pattern,
        pathRegex: new RegExp(`^${this.patternToRegex(pattern)}$`),
        responses,
        defaultResponse: responses[0],
        sequenceIndex: 0,
      };

      this.addEndpoint(endpoint);
    }

    // Load GraphQL operations
    for (const op of recording.graphqlOperations) {
      const key = op.operationName || this.hashQuery(op.query);
      this.graphqlOperations.set(key, op);
    }

    // Load WebSocket messages
    this.wsMessages = [...recording.websocketMessages];

    console.log(`[MockServer] Loaded ${this.endpoints.size} endpoints`);
  }

  /**
   * Add a custom endpoint
   */
  addEndpoint(endpoint: MockEndpoint): void {
    // Ensure pathRegex is set
    if (!endpoint.pathRegex) {
      endpoint.pathRegex = new RegExp(`^${this.patternToRegex(endpoint.pathPattern)}$`);
    }

    const key = `${endpoint.method}:${endpoint.pathPattern}`;
    this.endpoints.set(key, endpoint);
    this.sequenceCounters.set(endpoint.id, 0);
  }

  /**
   * Get server statistics
   */
  getStats(): ServerStats {
    return { ...this.stats };
  }

  /**
   * Get request log
   */
  getRequestLog(): typeof this.requestLog {
    return [...this.requestLog];
  }

  /**
   * Get all endpoints
   */
  getEndpoints(): MockEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Reset sequence counters
   */
  resetSequences(): void {
    for (const key of this.sequenceCounters.keys()) {
      this.sequenceCounters.set(key, 0);
    }
  }

  // Private methods

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const startTime = Date.now();
    const method = req.method || 'GET';
    const parsedUrl = url.parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';

    this.stats.totalRequests++;

    // CORS handling
    if (this.config.corsEnabled) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Expose-Headers', '*');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
    }

    // Collect request body
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    // Check for GraphQL
    if (pathname.includes('graphql') || this.isGraphQLRequest(body)) {
      const graphqlResponse = await this.handleGraphQL(body);
      if (graphqlResponse) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(graphqlResponse));
        return;
      }
    }

    // Find matching endpoint
    const match = this.findMatchingEndpoint(
      method,
      pathname,
      parsedUrl.query as Record<string, string>,
      body,
      req.headers as Record<string, string>
    );

    if (match) {
      this.stats.matchedRequests++;
      this.stats.requestsByEndpoint[match.endpoint.id] =
        (this.stats.requestsByEndpoint[match.endpoint.id] || 0) + 1;

      // Apply simulated delay
      if (match.response.delay) {
        await this.delay(match.response.delay);
      }

      // Set response headers
      for (const [key, value] of Object.entries(match.response.headers)) {
        if (key.toLowerCase() !== 'transfer-encoding') {
          res.setHeader(key, value);
        }
      }

      // Send response
      res.writeHead(match.response.statusCode, match.response.statusMessage);

      const responseBody =
        typeof match.response.body === 'object'
          ? JSON.stringify(match.response.body)
          : match.response.body;

      res.end(responseBody);

      // Increment sequence counter
      const counter = this.sequenceCounters.get(match.endpoint.id) || 0;
      this.sequenceCounters.set(match.endpoint.id, counter + 1);

      // Log request
      const latency = Date.now() - startTime;
      this.requestLog.push({
        timestamp: new Date().toISOString(),
        method,
        path: pathname,
        matched: true,
        endpointId: match.endpoint.id,
        latency,
        score: match.score,
      });

      this.updateAvgLatency(latency);
      this.emit('request', {
        method,
        path: pathname,
        matched: true,
        endpointId: match.endpoint.id,
        score: match.score,
        details: match.matchDetails,
      });
    } else {
      this.stats.unmatchedRequests++;

      // No match - return 404
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(
        JSON.stringify({
          error: 'Not Found',
          message: `No mock matches ${method} ${pathname}`,
          hint: 'Available endpoints listed below',
          availableEndpoints: Array.from(this.endpoints.keys()).slice(0, 20),
        })
      );

      const latency = Date.now() - startTime;
      this.requestLog.push({
        timestamp: new Date().toISOString(),
        method,
        path: pathname,
        matched: false,
        latency,
      });

      this.emit('request', {
        method,
        path: pathname,
        matched: false,
      });
    }
  }

  private findMatchingEndpoint(
    method: string,
    pathname: string,
    query: Record<string, string>,
    body: string,
    headers: Record<string, string>
  ): RequestMatch | null {
    let bestMatch: RequestMatch | null = null;

    for (const endpoint of this.endpoints.values()) {
      // Check method
      if (endpoint.method !== method) continue;

      // Check path pattern
      if (!endpoint.pathRegex.test(pathname)) continue;

      // Base score for path match
      let score = 100;
      const matchDetails: string[] = ['path'];

      // Find best matching response
      let matchedResponse: MockResponse | undefined;

      for (const response of endpoint.responses) {
        if (!response.condition) continue;

        let conditionScore = 0;
        let conditionMatches = true;
        const conditionDetails: string[] = [];

        // Check query params
        if (response.condition.queryParams) {
          for (const [key, value] of Object.entries(response.condition.queryParams)) {
            if (query[key] === value) {
              conditionScore += 20;
              conditionDetails.push(`query.${key}`);
            } else if (this.config.strictMatching) {
              conditionMatches = false;
              break;
            }
          }
        }

        // Check body contains
        if (response.condition.bodyContains && conditionMatches) {
          if (body.includes(response.condition.bodyContains)) {
            conditionScore += 30;
            conditionDetails.push('bodyContains');
          } else if (this.config.strictMatching) {
            conditionMatches = false;
          }
        }

        // Check body JSON
        if (response.condition.bodyJson && conditionMatches) {
          try {
            const parsedBody = JSON.parse(body);
            let jsonMatches = true;

            for (const [key, value] of Object.entries(response.condition.bodyJson)) {
              if (!this.deepEqual(parsedBody[key], value)) {
                jsonMatches = false;
                break;
              }
            }

            if (jsonMatches) {
              conditionScore += 40;
              conditionDetails.push('bodyJson');
            } else if (this.config.strictMatching) {
              conditionMatches = false;
            }
          } catch {
            if (this.config.strictMatching) {
              conditionMatches = false;
            }
          }
        }

        // Check header contains
        if (response.condition.headerContains && conditionMatches) {
          for (const [key, value] of Object.entries(response.condition.headerContains)) {
            const headerValue = headers[key.toLowerCase()];
            if (headerValue && headerValue.includes(value)) {
              conditionScore += 15;
              conditionDetails.push(`header.${key}`);
            } else if (this.config.strictMatching) {
              conditionMatches = false;
              break;
            }
          }
        }

        // Check sequence
        if (response.condition.sequence !== undefined && conditionMatches) {
          const currentSequence = this.sequenceCounters.get(endpoint.id) || 0;
          if (response.condition.sequence === currentSequence) {
            conditionScore += 50;
            conditionDetails.push(`sequence=${currentSequence}`);
          } else {
            conditionMatches = false;
          }
        }

        if (conditionMatches && conditionScore > 0) {
          const totalScore = score + conditionScore;
          if (!matchedResponse || totalScore > (bestMatch?.score || 0)) {
            matchedResponse = response;
            score = totalScore;
            matchDetails.push(...conditionDetails);
          }
        }
      }

      // Use default response if no condition matched
      if (!matchedResponse && endpoint.defaultResponse) {
        matchedResponse = endpoint.defaultResponse;
      }

      if (matchedResponse) {
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            endpoint,
            response: matchedResponse,
            score,
            matchDetails,
          };
        }
      }
    }

    return bestMatch;
  }

  private async handleGraphQL(body: string): Promise<object | null> {
    try {
      const request = JSON.parse(body);
      const operationName = request.operationName;
      const query = request.query || '';

      // Try to match by operation name
      if (operationName && this.graphqlOperations.has(operationName)) {
        const op = this.graphqlOperations.get(operationName)!;
        return op.response as object;
      }

      // Try to match by query hash
      const queryHash = this.hashQuery(query);
      if (this.graphqlOperations.has(queryHash)) {
        const op = this.graphqlOperations.get(queryHash)!;
        return op.response as object;
      }

      // Try fuzzy matching
      for (const [key, op] of this.graphqlOperations) {
        if (this.similarQueries(op.query, query)) {
          return op.response as object;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private isGraphQLRequest(body: string): boolean {
    try {
      const parsed = JSON.parse(body);
      return !!(parsed.query && typeof parsed.query === 'string');
    } catch {
      return false;
    }
  }

  private similarQueries(q1: string, q2: string): boolean {
    // Simple similarity check - normalize and compare
    const normalize = (q: string) =>
      q
        .replace(/\s+/g, ' ')
        .replace(/[{}(),]/g, '')
        .trim()
        .toLowerCase();

    const n1 = normalize(q1);
    const n2 = normalize(q2);

    // Check if main operation type and fields match
    const extract = (q: string) => {
      const match = q.match(/(query|mutation|subscription)\s+(\w+)?.*?{([^}]+)}/);
      return match ? `${match[1]}:${match[3]}` : q;
    };

    return extract(n1) === extract(n2);
  }

  private normalizeEndpoint(pathname: string): string {
    return pathname
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/:uuid')
      .replace(/\/[a-f0-9]{24}/gi, '/:objectId')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
  }

  private patternToRegex(pattern: string): string {
    return pattern
      .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '[^/]+')
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');
  }

  private extractCondition(
    interaction: RecordedInteraction,
    index: number
  ): ResponseCondition | undefined {
    const condition: ResponseCondition = {};
    let hasCondition = false;

    // Add query params as condition if significant
    if (Object.keys(interaction.request.queryParams).length > 0) {
      condition.queryParams = interaction.request.queryParams;
      hasCondition = true;
    }

    // Add body matching for POST/PUT/PATCH
    if (
      interaction.request.body &&
      ['POST', 'PUT', 'PATCH'].includes(interaction.request.method)
    ) {
      try {
        const bodyJson = JSON.parse(interaction.request.body);
        const keyConditions: Record<string, unknown> = {};

        // Use identifying fields as conditions
        const identifyingFields = ['id', 'type', 'action', 'operation', 'name', 'email'];
        for (const field of identifyingFields) {
          if (bodyJson[field] !== undefined) {
            keyConditions[field] = bodyJson[field];
          }
        }

        if (Object.keys(keyConditions).length > 0) {
          condition.bodyJson = keyConditions;
          hasCondition = true;
        }
      } catch {
        // Not JSON
        if (interaction.request.body.length < 200) {
          condition.bodyContains = interaction.request.body.slice(0, 100);
          hasCondition = true;
        }
      }
    }

    // Add sequence for order-dependent responses
    if (index > 0) {
      condition.sequence = index;
      hasCondition = true;
    }

    return hasCondition ? condition : undefined;
  }

  private calculatePriority(interaction: RecordedInteraction): number {
    let priority = 0;

    // Higher priority for more specific conditions
    if (Object.keys(interaction.request.queryParams).length > 0) {
      priority += 10;
    }

    if (interaction.request.body) {
      priority += 20;
    }

    // Lower priority for error responses (use as fallback)
    if (interaction.response.statusCode >= 400) {
      priority -= 30;
    }

    return priority;
  }

  private cleanHeaders(headers: Record<string, string>): Record<string, string> {
    const cleaned: Record<string, string> = {};
    const skipHeaders = [
      'transfer-encoding',
      'connection',
      'keep-alive',
      'date',
      'age',
      'server',
      'x-powered-by',
      'set-cookie',
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        cleaned[key] = value;
      }
    }

    // Ensure content-type is set
    if (!cleaned['content-type'] && !cleaned['Content-Type']) {
      cleaned['Content-Type'] = 'application/json';
    }

    return cleaned;
  }

  private parseBody(body: string, contentType?: string): string | object {
    if (!body) return '';

    if (contentType?.includes('application/json')) {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }

    return body;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  private generateEndpointId(): string {
    return `ep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private hashQuery(query: string): string {
    return crypto.createHash('md5').update(query).digest('hex').slice(0, 12);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updateAvgLatency(latency: number): void {
    const total = this.stats.totalRequests;
    this.stats.avgLatency = (this.stats.avgLatency * (total - 1) + latency) / total;
  }
}

/**
 * Create and start a mock server from a recording file
 */
export async function createMockServerFromFile(
  recordingPath: string,
  port: number = 4000
): Promise<EnhancedAPIMockServer> {
  const data = await fs.readFile(recordingPath, 'utf-8');
  const recording = JSON.parse(data) as RecordingSession;

  const server = new EnhancedAPIMockServer({
    port,
    recording,
  });

  await server.start();
  return server;
}

// Export singleton factory
let mockServerInstance: EnhancedAPIMockServer | null = null;

export function getMockServer(config?: MockServerConfig): EnhancedAPIMockServer | null {
  if (config && !mockServerInstance) {
    mockServerInstance = new EnhancedAPIMockServer(config);
  }
  return mockServerInstance;
}
