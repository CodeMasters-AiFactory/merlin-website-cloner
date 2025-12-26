/**
 * Authentication Cloner Service
 *
 * Enables cloning of websites behind authentication:
 * - Cookie import from browser
 * - Session recording and replay
 * - OAuth token handling
 * - 2FA support with manual code entry
 *
 * This is the #1 requested feature that NO COMPETITOR has!
 */

import type { Page, Browser, Cookie } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AuthSession {
  id: string;
  domain: string;
  createdAt: string;
  expiresAt?: string;
  cookies: Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  headers?: Record<string, string>;
}

export interface AuthConfig {
  // Cookie-based auth
  cookies?: Cookie[];
  cookieFile?: string; // Path to exported cookies JSON

  // Session auth
  sessionId?: string;
  sessionToken?: string;

  // OAuth/Bearer token
  bearerToken?: string;
  apiKey?: string;

  // Custom headers
  headers?: Record<string, string>;

  // Login credentials (for auto-login)
  credentials?: {
    username: string;
    password: string;
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    loginUrl?: string;
  };

  // 2FA callback (will pause and wait for user input)
  twoFactorCallback?: () => Promise<string>;

  // Session persistence
  saveSession?: boolean;
  sessionPath?: string;
}

export class AuthCloner {
  private sessions: Map<string, AuthSession> = new Map();

  /**
   * Import cookies from a browser export (JSON format)
   */
  async importCookiesFromFile(filePath: string): Promise<Cookie[]> {
    const data = await fs.readFile(filePath, 'utf-8');
    const cookies = JSON.parse(data);

    // Handle different cookie export formats
    if (Array.isArray(cookies)) {
      return cookies.map(this.normalizeCookie);
    }

    // Handle Netscape/wget format
    if (typeof cookies === 'string') {
      return this.parseNetscapeCookies(cookies);
    }

    throw new Error('Unsupported cookie format');
  }

  /**
   * Import cookies from browser (Chrome/Firefox export format)
   */
  private normalizeCookie(cookie: any): Cookie {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || cookie.host,
      path: cookie.path || '/',
      expires: cookie.expirationDate || cookie.expires || -1,
      httpOnly: cookie.httpOnly ?? true,
      secure: cookie.secure ?? false,
      sameSite: cookie.sameSite || 'Lax',
    };
  }

  /**
   * Parse Netscape cookie format (used by wget, curl)
   */
  private parseNetscapeCookies(content: string): Cookie[] {
    const cookies: Cookie[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('#') || !line.trim()) continue;

      const parts = line.split('\t');
      if (parts.length >= 7) {
        cookies.push({
          domain: parts[0],
          path: parts[2],
          secure: parts[3] === 'TRUE',
          expires: parseInt(parts[4]) || -1,
          name: parts[5],
          value: parts[6],
          httpOnly: false,
          sameSite: 'Lax',
        });
      }
    }

    return cookies;
  }

  /**
   * Apply authentication to a page
   */
  async applyAuth(page: Page, config: AuthConfig): Promise<void> {
    const browser = page.browser();

    // Apply cookies
    if (config.cookies) {
      await page.setCookie(...config.cookies);
    }

    // Load cookies from file
    if (config.cookieFile) {
      const cookies = await this.importCookiesFromFile(config.cookieFile);
      await page.setCookie(...cookies);
    }

    // Set up request interception for custom headers
    if (config.headers || config.bearerToken || config.apiKey) {
      await page.setRequestInterception(true);

      page.on('request', (request) => {
        const headers = { ...request.headers() };

        if (config.headers) {
          Object.assign(headers, config.headers);
        }

        if (config.bearerToken) {
          headers['Authorization'] = `Bearer ${config.bearerToken}`;
        }

        if (config.apiKey) {
          headers['X-API-Key'] = config.apiKey;
        }

        request.continue({ headers });
      });
    }

    // Apply localStorage/sessionStorage from saved session
    const url = page.url();
    const domain = new URL(url).hostname;
    const savedSession = this.sessions.get(domain);

    if (savedSession) {
      await page.evaluate((session: AuthSession) => {
        // Restore localStorage
        for (const [key, value] of Object.entries(session.localStorage)) {
          localStorage.setItem(key, value);
        }

        // Restore sessionStorage
        for (const [key, value] of Object.entries(session.sessionStorage)) {
          sessionStorage.setItem(key, value);
        }
      }, savedSession);
    }
  }

  /**
   * Perform automated login
   */
  async performLogin(
    page: Page,
    config: AuthConfig
  ): Promise<boolean> {
    if (!config.credentials) {
      throw new Error('Credentials required for login');
    }

    const {
      username,
      password,
      usernameSelector = 'input[name="username"], input[name="email"], input[type="email"], #username, #email',
      passwordSelector = 'input[name="password"], input[type="password"], #password',
      submitSelector = 'button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign in")',
      loginUrl
    } = config.credentials;

    try {
      // Navigate to login page if provided
      if (loginUrl) {
        await page.goto(loginUrl, { waitUntil: 'networkidle2' });
      }

      // Wait for login form
      await page.waitForSelector(usernameSelector, { timeout: 10000 });

      // Enter username
      await page.type(usernameSelector, username, { delay: 50 });

      // Enter password
      await page.type(passwordSelector, password, { delay: 50 });

      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click(submitSelector),
      ]);

      // Check for 2FA
      const needs2FA = await this.check2FA(page);
      if (needs2FA && config.twoFactorCallback) {
        const code = await config.twoFactorCallback();
        await this.enter2FACode(page, code);
      }

      // Verify login success
      const isLoggedIn = await this.verifyLogin(page);

      if (isLoggedIn && config.saveSession) {
        await this.saveSession(page, config.sessionPath);
      }

      return isLoggedIn;

    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  /**
   * Check if 2FA is required
   */
  private async check2FA(page: Page): Promise<boolean> {
    const twoFactorSelectors = [
      'input[name="otp"]',
      'input[name="code"]',
      'input[name="2fa"]',
      'input[name="totp"]',
      'input[placeholder*="code"]',
      'input[placeholder*="2FA"]',
      '[data-testid="2fa-input"]',
    ];

    for (const selector of twoFactorSelectors) {
      const element = await page.$(selector);
      if (element) return true;
    }

    // Check page content for 2FA keywords
    const content = await page.content();
    const keywords = ['two-factor', '2FA', 'verification code', 'authenticator', 'one-time'];
    return keywords.some(kw => content.toLowerCase().includes(kw.toLowerCase()));
  }

  /**
   * Enter 2FA code
   */
  private async enter2FACode(page: Page, code: string): Promise<void> {
    const twoFactorSelectors = [
      'input[name="otp"]',
      'input[name="code"]',
      'input[name="2fa"]',
      'input[name="totp"]',
      'input[placeholder*="code"]',
    ];

    for (const selector of twoFactorSelectors) {
      const element = await page.$(selector);
      if (element) {
        await element.type(code, { delay: 50 });

        // Look for submit button
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:contains("Verify")',
          'button:contains("Submit")',
        ];

        for (const submitSelector of submitSelectors) {
          const submitBtn = await page.$(submitSelector);
          if (submitBtn) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
              submitBtn.click(),
            ]);
            return;
          }
        }

        // Try pressing Enter if no button found
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        return;
      }
    }
  }

  /**
   * Verify login was successful
   */
  private async verifyLogin(page: Page): Promise<boolean> {
    // Check for common logout indicators (means we're logged in)
    const logoutSelectors = [
      'a[href*="logout"]',
      'button:contains("Logout")',
      'button:contains("Sign out")',
      '[data-testid="user-menu"]',
      '.user-avatar',
      '.profile-menu',
    ];

    for (const selector of logoutSelectors) {
      const element = await page.$(selector);
      if (element) return true;
    }

    // Check for login form (means we're NOT logged in)
    const loginSelectors = [
      'form[action*="login"]',
      'input[name="password"]',
      'button:contains("Login")',
      'button:contains("Sign in")',
    ];

    for (const selector of loginSelectors) {
      const element = await page.$(selector);
      if (element) return false;
    }

    // Default to checking cookies for session tokens
    const cookies = await page.cookies();
    const sessionCookies = cookies.filter(c =>
      c.name.toLowerCase().includes('session') ||
      c.name.toLowerCase().includes('token') ||
      c.name.toLowerCase().includes('auth')
    );

    return sessionCookies.length > 0;
  }

  /**
   * Save current session for later use
   */
  async saveSession(page: Page, sessionPath?: string): Promise<AuthSession> {
    const url = page.url();
    const domain = new URL(url).hostname;

    // Get all cookies
    const cookies = await page.cookies();

    // Get localStorage and sessionStorage
    const storageData = await page.evaluate(() => {
      const localStorage: Record<string, string> = {};
      const sessionStorage: Record<string, string> = {};

      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }

      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }

      return { localStorage, sessionStorage };
    });

    const session: AuthSession = {
      id: `session-${Date.now()}`,
      domain,
      createdAt: new Date().toISOString(),
      cookies,
      localStorage: storageData.localStorage,
      sessionStorage: storageData.sessionStorage,
    };

    // Calculate expiry from cookies
    const sessionCookies = cookies.filter(c =>
      c.name.toLowerCase().includes('session') && c.expires !== -1
    );
    if (sessionCookies.length > 0) {
      const minExpiry = Math.min(...sessionCookies.map(c => c.expires));
      session.expiresAt = new Date(minExpiry * 1000).toISOString();
    }

    // Save to memory
    this.sessions.set(domain, session);

    // Save to file if path provided
    if (sessionPath) {
      await fs.mkdir(path.dirname(sessionPath), { recursive: true });
      await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    }

    return session;
  }

  /**
   * Load session from file
   */
  async loadSession(sessionPath: string): Promise<AuthSession | null> {
    try {
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(data) as AuthSession;

      // Check if expired
      if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
        return null;
      }

      this.sessions.set(session.domain, session);
      return session;

    } catch {
      return null;
    }
  }

  /**
   * Apply saved session to page
   */
  async applySavedSession(page: Page, session: AuthSession): Promise<void> {
    // Set cookies
    await page.setCookie(...session.cookies);

    // Set storage
    await page.evaluate((session: AuthSession) => {
      for (const [key, value] of Object.entries(session.localStorage)) {
        localStorage.setItem(key, value);
      }
      for (const [key, value] of Object.entries(session.sessionStorage)) {
        sessionStorage.setItem(key, value);
      }
    }, session);
  }

  /**
   * Export cookies in various formats
   */
  async exportCookies(
    page: Page,
    format: 'json' | 'netscape' | 'curl' = 'json'
  ): Promise<string> {
    const cookies = await page.cookies();

    switch (format) {
      case 'json':
        return JSON.stringify(cookies, null, 2);

      case 'netscape':
        return cookies.map(c =>
          `${c.domain}\t${c.httpOnly ? 'TRUE' : 'FALSE'}\t${c.path}\t${c.secure ? 'TRUE' : 'FALSE'}\t${c.expires}\t${c.name}\t${c.value}`
        ).join('\n');

      case 'curl':
        return cookies.map(c =>
          `--cookie "${c.name}=${c.value}"`
        ).join(' ');

      default:
        return JSON.stringify(cookies);
    }
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
  }

  /**
   * Check if we have a valid session for a domain
   */
  hasValidSession(domain: string): boolean {
    const session = this.sessions.get(domain);
    if (!session) return false;

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(domain);
      return false;
    }

    return true;
  }
}

/**
 * Factory function
 */
export function createAuthCloner(): AuthCloner {
  return new AuthCloner();
}

/**
 * Helper to prompt user for 2FA code (for CLI usage)
 */
export async function prompt2FACode(): Promise<string> {
  // In a real implementation, this would use readline or inquirer
  // For now, we'll use a simple timeout placeholder
  return new Promise((resolve) => {
    console.log('\n[2FA REQUIRED] Please enter your 2FA code:');
    // In production, use readline interface
    // For now, this is a placeholder
    setTimeout(() => resolve(''), 60000);
  });
}
