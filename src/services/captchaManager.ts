/**
 * CAPTCHA Manager
 * Multi-provider CAPTCHA solving with automatic selection and caching
 */

export type CaptchaProvider = '2captcha' | 'capsolver' | 'anticaptcha' | 'deathbycaptcha';

export interface CaptchaTask {
  siteKey: string;
  pageUrl: string;
  type: 'recaptcha-v2' | 'recaptcha-v3' | 'turnstile' | 'hcaptcha';
  provider?: CaptchaProvider;
}

export interface CaptchaSolution {
  token: string;
  provider: CaptchaProvider;
  solvedAt: Date;
  taskId?: string;
}

export interface CaptchaProviderConfig {
  apiKey: string;
  enabled: boolean;
  priority: number; // Lower = higher priority
  timeout: number; // Milliseconds
}

export interface CaptchaCacheEntry {
  task: CaptchaTask;
  solution: CaptchaSolution;
  expiresAt: Date;
}

/**
 * CAPTCHA Manager with multi-provider support and caching
 */
export class CaptchaManager {
  private providers: Map<CaptchaProvider, CaptchaProviderConfig> = new Map();
  private cache: Map<string, CaptchaCacheEntry> = new Map();
  private cacheTimeout: number = 120000; // 2 minutes default

  constructor() {
    // Initialize with default disabled state
    this.providers.set('2captcha', {
      apiKey: '',
      enabled: false,
      priority: 1,
      timeout: 120000,
    });
    this.providers.set('capsolver', {
      apiKey: '',
      enabled: false,
      priority: 2,
      timeout: 120000,
    });
    this.providers.set('anticaptcha', {
      apiKey: '',
      enabled: false,
      priority: 3,
      timeout: 120000,
    });
    this.providers.set('deathbycaptcha', {
      apiKey: '',
      enabled: false,
      priority: 4,
      timeout: 120000,
    });
  }

  /**
   * Configures a CAPTCHA provider
   */
  configureProvider(
    provider: CaptchaProvider,
    config: Partial<CaptchaProviderConfig>
  ): void {
    const current = this.providers.get(provider);
    if (current) {
      this.providers.set(provider, { ...current, ...config });
    }
  }

  /**
   * Gets available providers sorted by priority
   */
  private getAvailableProviders(): CaptchaProvider[] {
    return Array.from(this.providers.entries())
      .filter(([_, config]) => config.enabled && config.apiKey)
      .sort(([_, a], [__, b]) => a.priority - b.priority)
      .map(([provider]) => provider);
  }

  /**
   * Gets cache key for a task
   */
  private getCacheKey(task: CaptchaTask): string {
    return `${task.type}:${task.siteKey}:${task.pageUrl}`;
  }

  /**
   * Gets cached solution if available
   */
  getCachedSolution(task: CaptchaTask): CaptchaSolution | null {
    const key = this.getCacheKey(task);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry.solution;
  }

  /**
   * Caches a solution
   */
  cacheSolution(task: CaptchaTask, solution: CaptchaSolution): void {
    const key = this.getCacheKey(task);
    const expiresAt = new Date(Date.now() + this.cacheTimeout);

    this.cache.set(key, {
      task,
      solution,
      expiresAt,
    });
  }

  /**
   * Solves a CAPTCHA using the best available provider
   */
  async solveCaptcha(task: CaptchaTask): Promise<CaptchaSolution | null> {
    // Check cache first
    const cached = this.getCachedSolution(task);
    if (cached) {
      return cached;
    }

    // Get available providers
    const providers = this.getAvailableProviders();
    if (providers.length === 0) {
      // Return null to allow fallback to passive waiting strategies
      return null;
    }

    // Try providers in priority order
    for (const provider of providers) {
      try {
        const solution = await this.solveWithProvider(task, provider);
        if (solution) {
          this.cacheSolution(task, solution);
          return solution;
        }
      } catch (error) {
        console.error(`Failed to solve CAPTCHA with ${provider}:`, error);
        // Try next provider
        continue;
      }
    }

    return null;
  }

  /**
   * Solves CAPTCHA with a specific provider
   */
  private async solveWithProvider(
    task: CaptchaTask,
    provider: CaptchaProvider
  ): Promise<CaptchaSolution | null> {
    const config = this.providers.get(provider);
    if (!config || !config.enabled) {
      return null;
    }

    switch (provider) {
      case '2captcha':
        return await this.solveWith2Captcha(task, config);
      case 'capsolver':
        return await this.solveWithCapSolver(task, config);
      case 'anticaptcha':
        return await this.solveWithAntiCaptcha(task, config);
      case 'deathbycaptcha':
        return await this.solveWithDeathByCaptcha(task, config);
      default:
        return null;
    }
  }

  /**
   * Solves with 2Captcha
   */
  private async solveWith2Captcha(
    task: CaptchaTask,
    config: CaptchaProviderConfig
  ): Promise<CaptchaSolution | null> {
    const apiKey = config.apiKey;
    const apiUrl = 'http://2captcha.com';

    // Create task
    let taskId: string;
    if (task.type === 'recaptcha-v2') {
      const createResponse = await fetch(
        `${apiUrl}/in.php?key=${apiKey}&method=userrecaptcha&googlekey=${task.siteKey}&pageurl=${encodeURIComponent(task.pageUrl)}`
      );
      const createText = await createResponse.text();
      if (createText.startsWith('OK|')) {
        taskId = createText.split('|')[1];
      } else {
        throw new Error(`2Captcha create failed: ${createText}`);
      }
    } else if (task.type === 'turnstile') {
      const createResponse = await fetch(
        `${apiUrl}/in.php?key=${apiKey}&method=turnstile&sitekey=${task.siteKey}&pageurl=${encodeURIComponent(task.pageUrl)}`
      );
      const createText = await createResponse.text();
      if (createText.startsWith('OK|')) {
        taskId = createText.split('|')[1];
      } else {
        throw new Error(`2Captcha create failed: ${createText}`);
      }
    } else {
      throw new Error(`Unsupported CAPTCHA type for 2Captcha: ${task.type}`);
    }

    // Poll for result
    const startTime = Date.now();
    while (Date.now() - startTime < config.timeout) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

      const resultResponse = await fetch(
        `${apiUrl}/res.php?key=${apiKey}&action=get&id=${taskId}`
      );
      const resultText = await resultResponse.text();

      if (resultText.startsWith('OK|')) {
        return {
          token: resultText.split('|')[1],
          provider: '2captcha',
          solvedAt: new Date(),
          taskId,
        };
      } else if (resultText === 'CAPCHA_NOT_READY') {
        continue; // Keep polling
      } else {
        throw new Error(`2Captcha solve failed: ${resultText}`);
      }
    }

    throw new Error('2Captcha timeout');
  }

  /**
   * Solves with CapSolver
   */
  private async solveWithCapSolver(
    task: CaptchaTask,
    config: CaptchaProviderConfig
  ): Promise<CaptchaSolution | null> {
    const apiKey = config.apiKey;
    const apiUrl = 'https://api.capsolver.com';

    // Determine task type
    let taskType: string;
    if (task.type === 'recaptcha-v2') {
      taskType = 'ReCaptchaV2TaskProxyLess';
    } else if (task.type === 'turnstile') {
      taskType = 'AntiTurnstileTaskProxyLess';
    } else {
      throw new Error(`Unsupported CAPTCHA type for CapSolver: ${task.type}`);
    }

    // Create task
    const createResponse = await fetch(`${apiUrl}/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: taskType,
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
        },
      }),
    });

    const createData = await createResponse.json();
    if (createData.errorId !== 0) {
      throw new Error(`CapSolver create failed: ${createData.errorDescription}`);
    }

    const taskId = createData.taskId;

    // Poll for result
    const startTime = Date.now();
    while (Date.now() - startTime < config.timeout) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      const resultResponse = await fetch(`${apiUrl}/getTaskResult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientKey: apiKey,
          taskId,
        }),
      });

      const resultData = await resultResponse.json();

      if (resultData.status === 'ready') {
        return {
          token: resultData.solution.token,
          provider: 'capsolver',
          solvedAt: new Date(),
          taskId,
        };
      } else if (resultData.status === 'processing') {
        continue; // Keep polling
      } else {
        throw new Error(`CapSolver solve failed: ${resultData.errorDescription}`);
      }
    }

    throw new Error('CapSolver timeout');
  }

  /**
   * Solves with AntiCaptcha
   */
  private async solveWithAntiCaptcha(
    task: CaptchaTask,
    config: CaptchaProviderConfig
  ): Promise<CaptchaSolution | null> {
    // Similar implementation to 2Captcha
    // API: https://anti-captcha.com/apidoc
    const apiKey = config.apiKey;
    const apiUrl = 'https://api.anti-captcha.com';

    // Create task
    const createResponse = await fetch(`${apiUrl}/createTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientKey: apiKey,
        task: {
          type: task.type === 'recaptcha-v2' ? 'NoCaptchaTaskProxyless' : 'TurnstileTaskProxyless',
          websiteURL: task.pageUrl,
          websiteKey: task.siteKey,
        },
      }),
    });

    const createData = await createResponse.json();
    if (createData.errorId !== 0) {
      throw new Error(`AntiCaptcha create failed: ${createData.errorDescription}`);
    }

    const taskId = createData.taskId;

    // Poll for result
    const startTime = Date.now();
    while (Date.now() - startTime < config.timeout) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const resultResponse = await fetch(`${apiUrl}/getTaskResult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientKey: apiKey,
          taskId,
        }),
      });

      const resultData = await resultResponse.json();

      if (resultData.status === 'ready') {
        return {
          token: resultData.solution.gRecaptchaResponse || resultData.solution.token,
          provider: 'anticaptcha',
          solvedAt: new Date(),
          taskId,
        };
      } else if (resultData.status === 'processing') {
        continue;
      } else {
        throw new Error(`AntiCaptcha solve failed: ${resultData.errorDescription}`);
      }
    }

    throw new Error('AntiCaptcha timeout');
  }

  /**
   * Solves with DeathByCaptcha
   */
  private async solveWithDeathByCaptcha(
    task: CaptchaTask,
    config: CaptchaProviderConfig
  ): Promise<CaptchaSolution | null> {
    // Similar implementation
    // API: http://deathbycaptcha.com/api
    const apiKey = config.apiKey;
    const apiUrl = 'http://api.dbcapi.me/api';

    // Basic auth with username:password format
    const [username, password] = apiKey.split(':');
    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    // Create task
    const createResponse = await fetch(`${apiUrl}/recaptcha`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googlekey: task.siteKey,
        pageurl: task.pageUrl,
      }),
    });

    const createData = await createResponse.json();
    if (createData.status !== 0) {
      throw new Error(`DeathByCaptcha create failed: ${createData.error}`);
    }

    const taskId = createData.task;

    // Poll for result
    const startTime = Date.now();
    while (Date.now() - startTime < config.timeout) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const resultResponse = await fetch(`${apiUrl}/recaptcha/${taskId}`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const resultData = await resultResponse.json();

      if (resultData.status === 0 && resultData.text) {
        return {
          token: resultData.text,
          provider: 'deathbycaptcha',
          solvedAt: new Date(),
          taskId: String(taskId),
        };
      } else if (resultData.status === 1) {
        continue; // Processing
      } else {
        throw new Error(`DeathByCaptcha solve failed: ${resultData.error}`);
      }
    }

    throw new Error('DeathByCaptcha timeout');
  }

  /**
   * Clears expired cache entries
   */
  clearExpiredCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): {
    total: number;
    valid: number;
    expired: number;
  } {
    const now = new Date();
    let valid = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (entry.expiresAt < now) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    };
  }
}

