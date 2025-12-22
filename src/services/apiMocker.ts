/**
 * API Mocker
 * Captures API responses and generates mock server for offline functionality
 * Also supports direct API scraping mode (bypassing browser)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Page } from 'puppeteer';
import fetch from 'node-fetch';

export interface ApiRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
}

export interface ApiCall {
  request: ApiRequest;
  response: ApiResponse;
  endpoint: string;
  params?: Record<string, string>;
}

export interface MockServerConfig {
  outputDir: string;
  baseUrl: string;
  port?: number;
}

/**
 * API Mocker
 * Captures API calls and generates mock server
 */
export class ApiMocker {
  private apiCalls: Map<string, ApiCall> = new Map();
  private requestInterceptionEnabled: boolean = false;

  /**
   * Starts intercepting API requests
   */
  async startInterception(page: Page): Promise<void> {
    if (this.requestInterceptionEnabled) {
      return;
    }

    await page.setRequestInterception(true);

    page.on('request', async (request) => {
      const url = request.url();
      const requestMethod = request.method();

      // Only intercept API calls
      if (this.isApiRequest(url)) {
        const apiRequest: ApiRequest = {
          url,
          method: requestMethod,
          headers: request.headers(),
          body: request.postData() ? JSON.parse(request.postData() || '{}') : undefined,
          timestamp: Date.now(),
        };

        // Continue request and capture response
        request.continue();
      } else {
        request.continue();
      }
    });

    page.on('response', async (response) => {
      const url = response.url();
      const request = response.request();

      if (this.isApiRequest(url)) {
        try {
          const apiResponse: ApiResponse = {
            status: response.status(),
            headers: response.headers(),
            body: await response.json().catch(() => ({})),
            timestamp: Date.now(),
          };

          const requestMethod = request.method();
          const apiRequest: ApiRequest = {
            url: request.url(),
            method: requestMethod,
            headers: request.headers(),
            body: request.postData() ? JSON.parse(request.postData() || '{}') : undefined,
            timestamp: Date.now(),
          };

          const endpoint = this.extractEndpoint(url);
          const params = this.extractParams(url);

          const apiCall: ApiCall = {
            request: apiRequest,
            response: apiResponse,
            endpoint,
            params,
          };

          // Store by endpoint + method
          const key = `${requestMethod}:${endpoint}`;
          this.apiCalls.set(key, apiCall);
        } catch (error) {
          // Ignore errors
        }
      }
    });

    this.requestInterceptionEnabled = true;
  }

  /**
   * Stops intercepting API requests
   */
  async stopInterception(page: Page): Promise<void> {
    if (!this.requestInterceptionEnabled) {
      return;
    }

    await page.setRequestInterception(false);
    this.requestInterceptionEnabled = false;
  }

  /**
   * Checks if URL is an API request
   */
  private isApiRequest(url: string): boolean {
    return (
      url.includes('/api/') ||
      url.includes('/graphql') ||
      url.includes('/rest/') ||
      url.includes('/v1/') ||
      url.includes('/v2/') ||
      url.endsWith('.json') ||
      url.includes('?format=json')
    );
  }

  /**
   * Extracts endpoint from URL
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Extracts query parameters from URL
   */
  private extractParams(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch {
      return {};
    }
  }

  /**
   * Tests an API endpoint directly (API scraping mode)
   */
  async testEndpoint(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const contentType = response.headers.get('content-type') || '';
      let responseBody: any;

      if (contentType.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      return {
        success: response.ok,
        response: responseBody,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Gets all captured API calls
   */
  getApiCalls(): ApiCall[] {
    return Array.from(this.apiCalls.values());
  }

  /**
   * Gets API calls for a specific endpoint
   */
  getApiCallsForEndpoint(endpoint: string): ApiCall[] {
    return Array.from(this.apiCalls.values()).filter(
      call => call.endpoint === endpoint
    );
  }

  /**
   * Generates mock server files
   */
  async generateMockServer(config: MockServerConfig): Promise<string> {
    const mockDir = path.join(config.outputDir, 'mock-api');
    await fs.mkdir(mockDir, { recursive: true });

    // Generate mock server JavaScript
    const mockServerCode = this.generateMockServerCode(config);
    const serverPath = path.join(mockDir, 'server.js');
    await fs.writeFile(serverPath, mockServerCode, 'utf-8');

    // Generate API data file
    const apiData = {
      calls: this.getApiCalls(),
      generatedAt: new Date().toISOString(),
    };
    const dataPath = path.join(mockDir, 'api-data.json');
    await fs.writeFile(dataPath, JSON.stringify(apiData, null, 2), 'utf-8');

    // Generate package.json for mock server
    const packageJson = {
      name: 'mock-api-server',
      version: '1.0.0',
      main: 'server.js',
      scripts: {
        start: `node server.js --port ${config.port || 3001}`,
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
      },
    };
    const packagePath = path.join(mockDir, 'package.json');
    await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');

    return mockDir;
  }

  /**
   * Generates mock server code
   */
  private generateMockServerCode(config: MockServerConfig): string {
    const apiCalls = this.getApiCalls();
    const routes = apiCalls.map(call => {
      const method = call.request.method.toLowerCase();
      const endpoint = call.endpoint;
      const response = call.response;

      return `
  app.${method}('${endpoint}', (req, res) => {
    res.status(${response.status});
    ${Object.entries(response.headers)
      .map(([key, value]) => `res.setHeader('${key}', '${value}');`)
      .join('\n    ')}
    res.json(${JSON.stringify(response.body, null, 2)});
  });`;
    }).join('\n');

    return `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock API routes
${routes}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

const PORT = process.env.PORT || ${config.port || 3001};
app.listen(PORT, () => {
  console.log(\`Mock API server running on http://localhost:\${PORT}\`);
});
`;
  }

  /**
   * Generates offline API simulation code for client-side
   */
  async generateOfflineApiSimulation(config: MockServerConfig): Promise<string> {
    const apiCalls = this.getApiCalls();
    const simulationCode = `
// Offline API Simulation
// This file provides offline API responses for the cloned website

const API_MOCK_DATA = ${JSON.stringify(apiCalls, null, 2)};

// Override fetch to use mock data
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const endpoint = new URL(url).pathname;
  
  // Find matching API call
  const mockCall = API_MOCK_DATA.find(
    call => call.endpoint === endpoint && call.request.method === method
  );
  
  if (mockCall) {
    return Promise.resolve({
      ok: mockCall.response.status >= 200 && mockCall.response.status < 300,
      status: mockCall.response.status,
      statusText: mockCall.response.statusText || 'OK',
      headers: new Headers(mockCall.response.headers),
      json: () => Promise.resolve(mockCall.response.body),
      text: () => Promise.resolve(JSON.stringify(mockCall.response.body)),
    });
  }
  
  // Fallback to original fetch (for non-API requests)
  return originalFetch.apply(this, arguments);
};

// Override XMLHttpRequest
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...args) {
  this._method = method;
  this._url = url;
  return originalXHROpen.apply(this, [method, url, ...args]);
};

XMLHttpRequest.prototype.send = function(...args) {
  const endpoint = new URL(this._url).pathname;
  const mockCall = API_MOCK_DATA.find(
    call => call.endpoint === endpoint && call.request.method === this._method
  );
  
  if (mockCall) {
    setTimeout(() => {
      this.status = mockCall.response.status;
      this.statusText = mockCall.response.statusText || 'OK';
      this.responseText = JSON.stringify(mockCall.response.body);
      this.response = mockCall.response.body;
      this.readyState = 4;
      if (this.onload) this.onload();
      if (this.onreadystatechange) this.onreadystatechange();
    }, 100);
    return;
  }
  
  return originalXHRSend.apply(this, args);
};
`;

    const simulationPath = path.join(config.outputDir, 'mock-api', 'offline-api.js');
    await fs.writeFile(simulationPath, simulationCode, 'utf-8');
    return simulationPath;
  }

  /**
   * Clears captured API calls
   */
  clear(): void {
    this.apiCalls.clear();
  }
}

