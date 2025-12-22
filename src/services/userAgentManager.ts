/**
 * User-Agent Manager
 * Rotation with matching browser fingerprints
 */

export interface UserAgentConfig {
  userAgent: string;
  platform: string;
  vendor: string;
  language: string;
  languages: string[];
  screenResolution: string;
  timezone: string;
  webdriver: boolean;
  plugins: string[];
  canvasFingerprint?: string;
  webglFingerprint?: string;
  audioFingerprint?: string;
}

export class UserAgentManager {
  private userAgents: UserAgentConfig[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.loadDefaultUserAgents();
  }

  /**
   * Loads default user agents with fingerprints
   */
  private loadDefaultUserAgents(): void {
    this.userAgents = [
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Win32',
        vendor: 'Google Inc.',
        language: 'en-US',
        languages: ['en-US', 'en'],
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        webdriver: false,
        plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client']
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        platform: 'Win32',
        vendor: '',
        language: 'en-US',
        languages: ['en-US', 'en'],
        screenResolution: '1920x1080',
        timezone: 'America/New_York',
        webdriver: false,
        plugins: []
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'MacIntel',
        vendor: 'Google Inc.',
        language: 'en-US',
        languages: ['en-US', 'en'],
        screenResolution: '2560x1440',
        timezone: 'America/Los_Angeles',
        webdriver: false,
        plugins: ['Chrome PDF Plugin', 'Chrome PDF Viewer']
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        platform: 'MacIntel',
        vendor: 'Apple Computer, Inc.',
        language: 'en-US',
        languages: ['en-US', 'en'],
        screenResolution: '2560x1440',
        timezone: 'America/Los_Angeles',
        webdriver: false,
        plugins: []
      },
      {
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        platform: 'Linux x86_64',
        vendor: 'Google Inc.',
        language: 'en-US',
        languages: ['en-US', 'en'],
        screenResolution: '1920x1080',
        timezone: 'UTC',
        webdriver: false,
        plugins: ['Chrome PDF Plugin']
      }
    ];
  }

  /**
   * Gets the next user agent in rotation
   */
  getNextUserAgent(): UserAgentConfig {
    const ua = this.userAgents[this.currentIndex % this.userAgents.length];
    this.currentIndex = (this.currentIndex + 1) % this.userAgents.length;
    return ua;
  }

  /**
   * Gets a random user agent
   */
  getRandomUserAgent(): UserAgentConfig {
    const index = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[index];
  }

  /**
   * Adds a custom user agent
   */
  addUserAgent(config: UserAgentConfig): void {
    this.userAgents.push(config);
  }

  /**
   * Gets headers for a user agent
   */
  getHeaders(config: UserAgentConfig): Record<string, string> {
    return {
      'User-Agent': config.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': config.languages.join(',') + ';q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    };
  }

  /**
   * Applies user agent to Puppeteer page
   */
  async applyToPage(page: any, config: UserAgentConfig): Promise<void> {
    await page.setUserAgent(config.userAgent);
    await page.setViewport({
      width: parseInt(config.screenResolution.split('x')[0]),
      height: parseInt(config.screenResolution.split('x')[1])
    });

    // Override navigator properties
    await page.evaluateOnNewDocument((uaConfig: UserAgentConfig) => {
      Object.defineProperty(navigator, 'platform', {
        get: () => uaConfig.platform
      });
      
      Object.defineProperty(navigator, 'vendor', {
        get: () => uaConfig.vendor
      });
      
      Object.defineProperty(navigator, 'language', {
        get: () => uaConfig.language
      });
      
      Object.defineProperty(navigator, 'languages', {
        get: () => uaConfig.languages
      });
      
      Object.defineProperty(navigator, 'webdriver', {
        get: () => uaConfig.webdriver
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = uaConfig.plugins.map(name => ({
            name,
            description: '',
            filename: '',
            length: 0
          }));
          return plugins as any;
        }
      });
    }, config);
  }
}

