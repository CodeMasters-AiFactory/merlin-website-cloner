/**
 * Multi-Provider CAPTCHA Solver
 *
 * Supports multiple CAPTCHA solving providers with automatic failover:
 * - 2Captcha (reCAPTCHA, hCaptcha, Turnstile, FunCaptcha)
 * - Anti-Captcha (reCAPTCHA, hCaptcha, Turnstile)
 * - CapSolver (reCAPTCHA, hCaptcha, Turnstile, FunCaptcha)
 *
 * Features:
 * - Automatic provider selection based on cost and success rate
 * - Failover to next provider on failure
 * - Balance checking and warnings
 * - Cost tracking
 */

import { EventEmitter } from 'events';

// Constants for retry and timeout handling
const FETCH_TIMEOUT = 30000; // 30 seconds for API calls
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

/**
 * Fetch with timeout and retry support
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Check for HTTP errors
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort (timeout) or client errors
      if (lastError.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }

      // Exponential backoff before retry
      if (attempt < retries - 1) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

export type CaptchaType =
  | 'recaptcha-v2'
  | 'recaptcha-v2-invisible'
  | 'recaptcha-v3'
  | 'hcaptcha'
  | 'turnstile'
  | 'funcaptcha'
  | 'image-captcha';

export interface CaptchaTask {
  type: CaptchaType;
  siteKey: string;
  pageUrl: string;
  action?: string; // For reCAPTCHA v3
  minScore?: number; // For reCAPTCHA v3
  isInvisible?: boolean;
  enterprisePayload?: Record<string, unknown>; // For enterprise versions
  proxy?: {
    type: 'http' | 'https' | 'socks4' | 'socks5';
    address: string;
    port: number;
    login?: string;
    password?: string;
  };
  userAgent?: string;
}

export interface CaptchaSolution {
  token: string;
  provider: string;
  cost: number;
  solveTime: number;
  taskId: string;
}

export interface CaptchaProvider {
  name: string;
  apiKey: string;
  priority: number; // Lower = higher priority
  balance: number;
  successRate: number;
  avgSolveTime: number; // ms
  supportedTypes: CaptchaType[];
  costPerSolve: Record<CaptchaType, number>;
}

// Provider base costs (in USD)
const PROVIDER_COSTS: Record<string, Record<CaptchaType, number>> = {
  '2captcha': {
    'recaptcha-v2': 0.003,
    'recaptcha-v2-invisible': 0.003,
    'recaptcha-v3': 0.004,
    'hcaptcha': 0.003,
    'turnstile': 0.003,
    'funcaptcha': 0.005,
    'image-captcha': 0.001,
  },
  'anticaptcha': {
    'recaptcha-v2': 0.002,
    'recaptcha-v2-invisible': 0.002,
    'recaptcha-v3': 0.003,
    'hcaptcha': 0.002,
    'turnstile': 0.002,
    'funcaptcha': 0.005,
    'image-captcha': 0.001,
  },
  'capsolver': {
    'recaptcha-v2': 0.0018,
    'recaptcha-v2-invisible': 0.0018,
    'recaptcha-v3': 0.003,
    'hcaptcha': 0.0015,
    'turnstile': 0.0015,
    'funcaptcha': 0.004,
    'image-captcha': 0.0008,
  },
};

export class CaptchaSolver extends EventEmitter {
  private providers: Map<string, CaptchaProvider> = new Map();
  private totalCost: number = 0;
  private totalSolves: number = 0;
  private totalFailed: number = 0;

  constructor() {
    super();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize from environment variables
    if (process.env.TWOCAPTCHA_API_KEY) {
      this.providers.set('2captcha', {
        name: '2captcha',
        apiKey: process.env.TWOCAPTCHA_API_KEY,
        priority: 2,
        balance: 0,
        successRate: 0.95,
        avgSolveTime: 45000,
        supportedTypes: ['recaptcha-v2', 'recaptcha-v2-invisible', 'recaptcha-v3', 'hcaptcha', 'turnstile', 'funcaptcha', 'image-captcha'],
        costPerSolve: PROVIDER_COSTS['2captcha'],
      });
    }

    if (process.env.ANTICAPTCHA_API_KEY) {
      this.providers.set('anticaptcha', {
        name: 'anticaptcha',
        apiKey: process.env.ANTICAPTCHA_API_KEY,
        priority: 1,
        balance: 0,
        successRate: 0.96,
        avgSolveTime: 40000,
        supportedTypes: ['recaptcha-v2', 'recaptcha-v2-invisible', 'recaptcha-v3', 'hcaptcha', 'turnstile', 'funcaptcha', 'image-captcha'],
        costPerSolve: PROVIDER_COSTS['anticaptcha'],
      });
    }

    if (process.env.CAPSOLVER_API_KEY) {
      this.providers.set('capsolver', {
        name: 'capsolver',
        apiKey: process.env.CAPSOLVER_API_KEY,
        priority: 0, // Cheapest, highest priority
        balance: 0,
        successRate: 0.94,
        avgSolveTime: 30000,
        supportedTypes: ['recaptcha-v2', 'recaptcha-v2-invisible', 'recaptcha-v3', 'hcaptcha', 'turnstile', 'funcaptcha', 'image-captcha'],
        costPerSolve: PROVIDER_COSTS['capsolver'],
      });
    }
  }

  /**
   * Get available providers
   */
  getProviders(): CaptchaProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Add or update a provider
   */
  addProvider(name: string, apiKey: string, priority: number = 10): void {
    const costs = PROVIDER_COSTS[name.toLowerCase()];
    if (!costs) {
      throw new Error(`Unknown provider: ${name}`);
    }

    this.providers.set(name.toLowerCase(), {
      name: name.toLowerCase(),
      apiKey,
      priority,
      balance: 0,
      successRate: 0.95,
      avgSolveTime: 40000,
      supportedTypes: Object.keys(costs) as CaptchaType[],
      costPerSolve: costs,
    });
  }

  /**
   * Solve a CAPTCHA
   */
  async solve(task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    // Get providers that support this type, sorted by priority
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.supportedTypes.includes(task.type))
      .sort((a, b) => a.priority - b.priority);

    if (availableProviders.length === 0) {
      throw new Error(`No CAPTCHA providers configured. Set CAPSOLVER_API_KEY, ANTICAPTCHA_API_KEY, or TWOCAPTCHA_API_KEY`);
    }

    let lastError: Error | null = null;

    // Try each provider in priority order
    for (const provider of availableProviders) {
      try {
        this.emit('solving', { provider: provider.name, type: task.type, url: task.pageUrl });

        const solution = await this.solveWithProvider(provider, task);

        // Update stats
        this.totalCost += solution.cost;
        this.totalSolves++;

        // Update provider success rate
        provider.successRate = (provider.successRate * 0.9) + (0.1);
        provider.avgSolveTime = (provider.avgSolveTime * 0.9) + (solution.solveTime * 0.1);

        this.emit('solved', solution);
        return solution;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Update provider success rate
        provider.successRate = provider.successRate * 0.9;

        this.emit('error', { provider: provider.name, error: lastError.message });

        // Continue to next provider
      }
    }

    this.totalFailed++;
    throw lastError || new Error('All CAPTCHA providers failed');
  }

  private async solveWithProvider(provider: CaptchaProvider, task: CaptchaTask): Promise<CaptchaSolution> {
    switch (provider.name) {
      case 'capsolver':
        return this.solveWithCapSolver(provider, task);
      case 'anticaptcha':
        return this.solveWithAntiCaptcha(provider, task);
      case '2captcha':
        return this.solveWith2Captcha(provider, task);
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }
  }

  /**
   * CapSolver implementation with improved error handling
   */
  private async solveWithCapSolver(provider: CaptchaProvider, task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      // Create task with retry support
      const createResponse = await fetchWithRetry('https://api.capsolver.com/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: provider.apiKey,
          task: this.buildCapSolverTask(task),
        }),
      });

      let createResult: { errorId: number; errorCode?: string; errorDescription?: string; taskId?: string };
      try {
        createResult = await createResponse.json();
      } catch (parseError) {
        throw new Error(`CapSolver returned invalid JSON response`);
      }

      if (createResult.errorId !== 0) {
        const errorMsg = createResult.errorDescription || createResult.errorCode || 'Unknown error';
        throw new Error(`CapSolver create task failed: ${errorMsg}`);
      }

      const taskId = createResult.taskId;
      if (!taskId) {
        throw new Error('CapSolver did not return taskId');
      }

      // Poll for result
      const solution = await this.pollCapSolver(provider.apiKey, taskId);

      return {
        token: solution,
        provider: 'capsolver',
        cost: provider.costPerSolve[task.type] || 0.002,
        solveTime: Date.now() - startTime,
        taskId,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`CapSolver failed: ${errorMsg}`);
    }
  }

  private buildCapSolverTask(task: CaptchaTask): Record<string, unknown> {
    const baseTask: Record<string, unknown> = {
      websiteURL: task.pageUrl,
      websiteKey: task.siteKey,
    };

    if (task.proxy) {
      baseTask.proxyType = task.proxy.type;
      baseTask.proxyAddress = task.proxy.address;
      baseTask.proxyPort = task.proxy.port;
      if (task.proxy.login) baseTask.proxyLogin = task.proxy.login;
      if (task.proxy.password) baseTask.proxyPassword = task.proxy.password;
    }

    if (task.userAgent) baseTask.userAgent = task.userAgent;

    switch (task.type) {
      case 'recaptcha-v2':
        return { type: task.proxy ? 'ReCaptchaV2Task' : 'ReCaptchaV2TaskProxyLess', ...baseTask };
      case 'recaptcha-v2-invisible':
        return { type: task.proxy ? 'ReCaptchaV2Task' : 'ReCaptchaV2TaskProxyLess', isInvisible: true, ...baseTask };
      case 'recaptcha-v3':
        return {
          type: task.proxy ? 'ReCaptchaV3Task' : 'ReCaptchaV3TaskProxyLess',
          pageAction: task.action || 'verify',
          minScore: task.minScore || 0.7,
          ...baseTask
        };
      case 'hcaptcha':
        return { type: task.proxy ? 'HCaptchaTask' : 'HCaptchaTaskProxyLess', ...baseTask };
      case 'turnstile':
        return { type: task.proxy ? 'AntiTurnstileTask' : 'AntiTurnstileTaskProxyLess', ...baseTask };
      case 'funcaptcha':
        return { type: task.proxy ? 'FunCaptchaTask' : 'FunCaptchaTaskProxyLess', ...baseTask };
      default:
        throw new Error(`Unsupported CAPTCHA type for CapSolver: ${task.type}`);
    }
  }

  private async pollCapSolver(apiKey: string, taskId: string, timeout: number = 120000): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 3000;
    let lastError: Error | null = null;

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, pollInterval));

      try {
        const response = await fetchWithRetry('https://api.capsolver.com/getTaskResult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: apiKey, taskId }),
        }, 2, 15000); // 2 retries, 15s timeout for polling

        let result: {
          errorId: number;
          errorCode?: string;
          errorDescription?: string;
          status?: string;
          solution?: { gRecaptchaResponse?: string; token?: string }
        };

        try {
          result = await response.json();
        } catch (parseError) {
          lastError = new Error('CapSolver returned invalid JSON during polling');
          continue; // Try again on next poll
        }

        if (result.errorId !== 0) {
          const errorMsg = result.errorDescription || result.errorCode || 'Unknown error';
          throw new Error(`CapSolver poll error: ${errorMsg}`);
        }

        if (result.status === 'ready') {
          const token = result.solution?.gRecaptchaResponse || result.solution?.token;
          if (!token) {
            throw new Error('CapSolver returned ready status but no token');
          }
          return token;
        }

        // Status is processing, continue polling
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // If it's a critical error (not a transient one), throw immediately
        if (lastError.message.includes('poll error') && !lastError.message.includes('CAPCHA_NOT_READY')) {
          throw lastError;
        }
        // Otherwise continue polling
      }
    }

    throw lastError || new Error('CapSolver timeout: task did not complete in time');
  }

  /**
   * Anti-Captcha implementation with improved error handling
   */
  private async solveWithAntiCaptcha(provider: CaptchaProvider, task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      // Create task with retry support
      const createResponse = await fetchWithRetry('https://api.anti-captcha.com/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: provider.apiKey,
          task: this.buildAntiCaptchaTask(task),
        }),
      });

      let createResult: { errorId: number; errorCode?: string; errorDescription?: string; taskId?: number };
      try {
        createResult = await createResponse.json();
      } catch (parseError) {
        throw new Error('Anti-Captcha returned invalid JSON response');
      }

      if (createResult.errorId !== 0) {
        const errorMsg = createResult.errorDescription || createResult.errorCode || 'Unknown error';
        throw new Error(`Anti-Captcha create task failed: ${errorMsg}`);
      }

      const taskId = createResult.taskId;
      if (!taskId) {
        throw new Error('Anti-Captcha did not return taskId');
      }

      // Poll for result
      const solution = await this.pollAntiCaptcha(provider.apiKey, taskId);

      return {
        token: solution,
        provider: 'anticaptcha',
        cost: provider.costPerSolve[task.type] || 0.002,
        solveTime: Date.now() - startTime,
        taskId: String(taskId),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Anti-Captcha failed: ${errorMsg}`);
    }
  }

  private buildAntiCaptchaTask(task: CaptchaTask): Record<string, unknown> {
    const baseTask: Record<string, unknown> = {
      websiteURL: task.pageUrl,
      websiteKey: task.siteKey,
    };

    if (task.proxy) {
      baseTask.proxyType = task.proxy.type;
      baseTask.proxyAddress = task.proxy.address;
      baseTask.proxyPort = task.proxy.port;
      if (task.proxy.login) baseTask.proxyLogin = task.proxy.login;
      if (task.proxy.password) baseTask.proxyPassword = task.proxy.password;
    }

    if (task.userAgent) baseTask.userAgent = task.userAgent;

    switch (task.type) {
      case 'recaptcha-v2':
        return { type: task.proxy ? 'RecaptchaV2Task' : 'RecaptchaV2TaskProxyless', ...baseTask };
      case 'recaptcha-v2-invisible':
        return { type: task.proxy ? 'RecaptchaV2Task' : 'RecaptchaV2TaskProxyless', isInvisible: true, ...baseTask };
      case 'recaptcha-v3':
        return {
          type: task.proxy ? 'RecaptchaV3Task' : 'RecaptchaV3TaskProxyless',
          pageAction: task.action || 'verify',
          minScore: task.minScore || 0.7,
          ...baseTask
        };
      case 'hcaptcha':
        return { type: task.proxy ? 'HCaptchaTask' : 'HCaptchaTaskProxyless', ...baseTask };
      case 'turnstile':
        return { type: 'TurnstileTaskProxyless', ...baseTask };
      default:
        throw new Error(`Unsupported CAPTCHA type for Anti-Captcha: ${task.type}`);
    }
  }

  private async pollAntiCaptcha(apiKey: string, taskId: number, timeout: number = 120000): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 5000;
    let lastError: Error | null = null;

    while (Date.now() - startTime < timeout) {
      await new Promise(r => setTimeout(r, pollInterval));

      try {
        const response = await fetchWithRetry('https://api.anti-captcha.com/getTaskResult', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: apiKey, taskId }),
        }, 2, 15000); // 2 retries, 15s timeout for polling

        let result: {
          errorId: number;
          errorCode?: string;
          errorDescription?: string;
          status?: string;
          solution?: { gRecaptchaResponse?: string; token?: string }
        };

        try {
          result = await response.json();
        } catch (parseError) {
          lastError = new Error('Anti-Captcha returned invalid JSON during polling');
          continue; // Try again on next poll
        }

        if (result.errorId !== 0) {
          const errorMsg = result.errorDescription || result.errorCode || 'Unknown error';
          throw new Error(`Anti-Captcha poll error: ${errorMsg}`);
        }

        if (result.status === 'ready') {
          const token = result.solution?.gRecaptchaResponse || result.solution?.token;
          if (!token) {
            throw new Error('Anti-Captcha returned ready status but no token');
          }
          return token;
        }

        // Status is processing, continue polling
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // If it's a critical error, throw immediately
        if (lastError.message.includes('poll error')) {
          throw lastError;
        }
        // Otherwise continue polling
      }
    }

    throw lastError || new Error('Anti-Captcha timeout: task did not complete in time');
  }

  /**
   * 2Captcha implementation with improved error handling
   */
  private async solveWith2Captcha(provider: CaptchaProvider, task: CaptchaTask): Promise<CaptchaSolution> {
    const startTime = Date.now();

    try {
      // Build request parameters
      const params = new URLSearchParams({
        key: provider.apiKey,
        pageurl: task.pageUrl,
        json: '1',
      });

      switch (task.type) {
        case 'recaptcha-v2':
        case 'recaptcha-v2-invisible':
          params.set('method', 'userrecaptcha');
          params.set('googlekey', task.siteKey);
          if (task.type === 'recaptcha-v2-invisible') params.set('invisible', '1');
          break;
        case 'recaptcha-v3':
          params.set('method', 'userrecaptcha');
          params.set('googlekey', task.siteKey);
          params.set('version', 'v3');
          params.set('action', task.action || 'verify');
          params.set('min_score', String(task.minScore || 0.7));
          break;
        case 'hcaptcha':
          params.set('method', 'hcaptcha');
          params.set('sitekey', task.siteKey);
          break;
        case 'turnstile':
          params.set('method', 'turnstile');
          params.set('sitekey', task.siteKey);
          break;
        case 'funcaptcha':
          params.set('method', 'funcaptcha');
          params.set('publickey', task.siteKey);
          break;
        default:
          throw new Error(`Unsupported CAPTCHA type for 2Captcha: ${task.type}`);
      }

      if (task.proxy) {
        params.set('proxy', `${task.proxy.login}:${task.proxy.password}@${task.proxy.address}:${task.proxy.port}`);
        params.set('proxytype', task.proxy.type.toUpperCase());
      }

      if (task.userAgent) {
        params.set('userAgent', task.userAgent);
      }

      // Submit task with retry support
      const submitResponse = await fetchWithRetry(`https://2captcha.com/in.php?${params.toString()}`, {
        method: 'GET',
      });

      let submitResult: { status: number; request: string };
      try {
        submitResult = await submitResponse.json();
      } catch (parseError) {
        throw new Error('2Captcha returned invalid JSON response');
      }

      if (submitResult.status !== 1) {
        throw new Error(`2Captcha submit error: ${submitResult.request}`);
      }

      const taskId = submitResult.request;
      if (!taskId) {
        throw new Error('2Captcha did not return taskId');
      }

      // Poll for result
      const solution = await this.poll2Captcha(provider.apiKey, taskId);

      return {
        token: solution,
        provider: '2captcha',
        cost: provider.costPerSolve[task.type] || 0.003,
        solveTime: Date.now() - startTime,
        taskId,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`2Captcha failed: ${errorMsg}`);
    }
  }

  private async poll2Captcha(apiKey: string, taskId: string, timeout: number = 120000): Promise<string> {
    const startTime = Date.now();
    const pollInterval = 5000;
    let lastError: Error | null = null;

    // Initial delay - 2Captcha recommends waiting 10s before first poll
    await new Promise(r => setTimeout(r, 10000));

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetchWithRetry(
          `https://2captcha.com/res.php?key=${apiKey}&action=get&id=${taskId}&json=1`,
          { method: 'GET' },
          2,
          15000
        );

        let result: { status: number; request: string };
        try {
          result = await response.json();
        } catch (parseError) {
          lastError = new Error('2Captcha returned invalid JSON during polling');
          await new Promise(r => setTimeout(r, pollInterval));
          continue; // Try again on next poll
        }

        if (result.status === 1) {
          if (!result.request) {
            throw new Error('2Captcha returned success but no token');
          }
          return result.request;
        }

        if (result.request !== 'CAPCHA_NOT_READY') {
          throw new Error(`2Captcha error: ${result.request}`);
        }

        // CAPTCHA not ready yet, continue polling
        await new Promise(r => setTimeout(r, pollInterval));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // If it's a critical error (not CAPCHA_NOT_READY), throw immediately
        if (lastError.message.includes('2Captcha error') && !lastError.message.includes('CAPCHA_NOT_READY')) {
          throw lastError;
        }
        // Otherwise wait and try again
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }

    throw lastError || new Error('2Captcha timeout: task did not complete in time');
  }

  /**
   * Check balance for all providers
   */
  async checkBalances(): Promise<Record<string, number>> {
    const balances: Record<string, number> = {};

    for (const [name, provider] of this.providers) {
      try {
        let balance = 0;

        switch (name) {
          case 'capsolver':
            const csRes = await fetch('https://api.capsolver.com/getBalance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientKey: provider.apiKey }),
            });
            const csData = await csRes.json() as { balance?: number };
            balance = csData.balance || 0;
            break;

          case 'anticaptcha':
            const acRes = await fetch('https://api.anti-captcha.com/getBalance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientKey: provider.apiKey }),
            });
            const acData = await acRes.json() as { balance?: number };
            balance = acData.balance || 0;
            break;

          case '2captcha':
            const tcRes = await fetch(`https://2captcha.com/res.php?key=${provider.apiKey}&action=getbalance&json=1`);
            const tcData = await tcRes.json() as { request?: string };
            balance = parseFloat(tcData.request || '0');
            break;
        }

        provider.balance = balance;
        balances[name] = balance;

        if (balance < 1) {
          this.emit('lowBalance', { provider: name, balance });
        }
      } catch (error) {
        balances[name] = -1; // Error checking balance
      }
    }

    return balances;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalCost: number;
    totalSolves: number;
    totalFailed: number;
    successRate: number;
    providerStats: Array<{ name: string; balance: number; successRate: number; avgSolveTime: number }>;
  } {
    return {
      totalCost: this.totalCost,
      totalSolves: this.totalSolves,
      totalFailed: this.totalFailed,
      successRate: this.totalSolves > 0 ? this.totalSolves / (this.totalSolves + this.totalFailed) : 0,
      providerStats: Array.from(this.providers.values()).map(p => ({
        name: p.name,
        balance: p.balance,
        successRate: p.successRate,
        avgSolveTime: p.avgSolveTime,
      })),
    };
  }
}

// Singleton instance
export const captchaSolver = new CaptchaSolver();

// Detect CAPTCHA type from page content
export function detectCaptchaType(html: string, url: string): { type: CaptchaType; siteKey: string } | null {
  // reCAPTCHA v2/v3
  const recaptchaMatch = html.match(/data-sitekey="([^"]+)"/);
  if (recaptchaMatch) {
    const isV3 = html.includes('grecaptcha.execute') || html.includes('recaptcha/api.js?render=');
    return {
      type: isV3 ? 'recaptcha-v3' : 'recaptcha-v2',
      siteKey: recaptchaMatch[1],
    };
  }

  // hCaptcha
  const hcaptchaMatch = html.match(/data-sitekey="([^"]+)"[^>]*class="[^"]*h-captcha/);
  if (hcaptchaMatch) {
    return { type: 'hcaptcha', siteKey: hcaptchaMatch[1] };
  }

  // Cloudflare Turnstile
  const turnstileMatch = html.match(/data-sitekey="([^"]+)"[^>]*class="[^"]*cf-turnstile/);
  if (turnstileMatch) {
    return { type: 'turnstile', siteKey: turnstileMatch[1] };
  }

  // FunCaptcha
  const funcaptchaMatch = html.match(/data-pkey="([^"]+)"/);
  if (funcaptchaMatch) {
    return { type: 'funcaptcha', siteKey: funcaptchaMatch[1] };
  }

  return null;
}
