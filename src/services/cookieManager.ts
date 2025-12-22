/**
 * Cookie Manager
 * Advanced cookie management with persistence and session handling
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Protocol } from 'puppeteer';
type Cookie = Protocol.Network.Cookie;

export interface CookieJar {
  domain: string;
  cookies: Cookie[];
  lastUpdated: number;
}

export interface CookieManagerOptions {
  cookieDir?: string;
  persistCookies?: boolean;
  sessionTimeout?: number; // milliseconds
}

/**
 * Cookie Manager
 * Manages cookies with persistence and session handling
 */
export class CookieManager {
  private cookieDir: string;
  private persistCookies: boolean;
  private sessionTimeout: number;
  private cookieJars: Map<string, CookieJar> = new Map();

  constructor(options: CookieManagerOptions = {}) {
    this.cookieDir = options.cookieDir || './cookies';
    this.persistCookies = options.persistCookies !== false;
    this.sessionTimeout = options.sessionTimeout || 3600000; // 1 hour default
  }

  /**
   * Initializes cookie directory
   */
  async initialize(): Promise<void> {
    if (this.persistCookies) {
      await fs.mkdir(this.cookieDir, { recursive: true });
      await this.loadCookies();
    }
  }

  /**
   * Gets cookies for a domain (with subdomain support)
   */
  async getCookies(domain: string): Promise<Cookie[]> {
    // Get cookies for exact domain
    let cookies = await this.getCookiesForDomain(domain);
    
    // Also get cookies from parent domains (for subdomain support)
    const parentDomains = this.getParentDomains(domain);
    for (const parentDomain of parentDomains) {
      const parentCookies = await this.getCookiesForDomain(parentDomain);
      // Only add cookies that are valid for the requested domain
      for (const cookie of parentCookies) {
        if (this.isCookieValidForDomain(cookie, domain)) {
          // Check if we already have this cookie (don't duplicate)
          if (!cookies.find(c => c.name === cookie.name && c.domain === cookie.domain)) {
            cookies.push(cookie);
          }
        }
      }
    }
    
    return cookies;
  }
  
  /**
   * Gets cookies for a specific domain (internal)
   */
  private async getCookiesForDomain(domain: string): Promise<Cookie[]> {
    const jar = this.cookieJars.get(domain);
    if (!jar) {
      return [];
    }

    // Filter out expired cookies
    const now = Date.now() / 1000; // Convert to seconds
    const validCookies = jar.cookies.filter((cookie) => {
      if (cookie.expires && cookie.expires < now) {
        return false;
      }
      return true;
    });

    // Update jar with valid cookies only
    if (validCookies.length !== jar.cookies.length) {
      jar.cookies = validCookies;
      await this.saveCookies(domain, jar);
    }

    return validCookies;
  }
  
  /**
   * Gets parent domains for subdomain support
   */
  private getParentDomains(domain: string): string[] {
    const parts = domain.split('.');
    const parents: string[] = [];
    
    // Build parent domains (e.g., sub.example.com -> example.com -> com)
    for (let i = 1; i < parts.length; i++) {
      parents.push(parts.slice(i).join('.'));
    }
    
    return parents;
  }
  
  /**
   * Checks if a cookie is valid for a domain
   */
  private isCookieValidForDomain(cookie: Cookie, domain: string): boolean {
    const cookieDomain = cookie.domain || '';
    
    // Exact match
    if (cookieDomain === domain) {
      return true;
    }
    
    // Subdomain match (cookie.domain = .example.com, domain = sub.example.com)
    if (cookieDomain.startsWith('.') && domain.endsWith(cookieDomain.slice(1))) {
      return true;
    }
    
    // Parent domain match (cookie.domain = example.com, domain = sub.example.com)
    if (domain.endsWith('.' + cookieDomain) || domain === cookieDomain) {
      return true;
    }
    
    return false;
  }

  /**
   * Sets cookies for a domain
   */
  async setCookies(domain: string, cookies: Cookie[]): Promise<void> {
    const jar: CookieJar = {
      domain,
      cookies: [...cookies],
      lastUpdated: Date.now(),
    };

    this.cookieJars.set(domain, jar);

    if (this.persistCookies) {
      await this.saveCookies(domain, jar);
    }
  }

  /**
   * Adds a single cookie
   */
  async addCookie(domain: string, cookie: Cookie): Promise<void> {
    const existing = await this.getCookies(domain);
    
    // Remove existing cookie with same name if present
    const filtered = existing.filter((c) => c.name !== cookie.name);
    
    // Add new cookie
    await this.setCookies(domain, [...filtered, cookie]);
  }

  /**
   * Removes a cookie
   */
  async removeCookie(domain: string, cookieName: string): Promise<void> {
    const existing = await this.getCookies(domain);
    const filtered = existing.filter((c) => c.name !== cookieName);
    await this.setCookies(domain, filtered);
  }

  /**
   * Clears all cookies for a domain
   */
  async clearCookies(domain: string): Promise<void> {
    this.cookieJars.delete(domain);
    
    if (this.persistCookies) {
      const filePath = path.join(this.cookieDir, `${this.sanitizeDomain(domain)}.json`);
      await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
    }
  }

  /**
   * Merges cookies from a page into the cookie jar (with subdomain support)
   */
  async mergeCookiesFromPage(domain: string, pageCookies: Cookie[]): Promise<void> {
    // Group cookies by their domain
    const cookiesByDomain = new Map<string, Cookie[]>();
    
    for (const cookie of pageCookies) {
      const cookieDomain = cookie.domain || domain;
      
      // Normalize domain (remove leading dot if present for storage)
      const normalizedDomain = cookieDomain.startsWith('.') ? cookieDomain.slice(1) : cookieDomain;
      
      if (!cookiesByDomain.has(normalizedDomain)) {
        cookiesByDomain.set(normalizedDomain, []);
      }
      cookiesByDomain.get(normalizedDomain)!.push(cookie);
    }
    
    // Merge cookies for each domain
    for (const [cookieDomain, cookies] of cookiesByDomain.entries()) {
      const existing = await this.getCookiesForDomain(cookieDomain);
      const existingMap = new Map(existing.map((c) => [c.name, c]));
      
      // Merge new cookies, overwriting existing ones with same name
      for (const cookie of cookies) {
        existingMap.set(cookie.name, cookie);
      }
      
      await this.setCookies(cookieDomain, Array.from(existingMap.values()));
    }
    
    // Also merge into the requested domain for quick access
    const existing = await this.getCookiesForDomain(domain);
    const existingMap = new Map(existing.map((c) => [c.name + ':' + (c.domain || domain), c]));
    
    for (const cookie of pageCookies) {
      const key = cookie.name + ':' + (cookie.domain || domain);
      existingMap.set(key, cookie);
    }
    
    await this.setCookies(domain, Array.from(existingMap.values()));
  }
  
  /**
   * Renews session by updating lastUpdated timestamp
   */
  async renewSession(domain: string): Promise<void> {
    const jar = this.cookieJars.get(domain);
    if (jar) {
      jar.lastUpdated = Date.now();
      await this.saveCookies(domain, jar);
    }
  }
  
  /**
   * Checks if session is still valid
   */
  isSessionValid(domain: string): boolean {
    const jar = this.cookieJars.get(domain);
    if (!jar) {
      return false;
    }
    
    return Date.now() - jar.lastUpdated < this.sessionTimeout;
  }

  /**
   * Gets cookies formatted for Puppeteer
   */
  async getCookiesForPuppeteer(domain: string): Promise<Cookie[]> {
    return await this.getCookies(domain);
  }

  /**
   * Saves cookies to disk
   */
  private async saveCookies(domain: string, jar: CookieJar): Promise<void> {
    if (!this.persistCookies) {
      return;
    }

    try {
      const filePath = path.join(this.cookieDir, `${this.sanitizeDomain(domain)}.json`);
      await fs.writeFile(filePath, JSON.stringify(jar, null, 2), 'utf-8');
    } catch (error) {
      // Ignore save errors
    }
  }

  /**
   * Loads cookies from disk
   */
  private async loadCookies(): Promise<void> {
    if (!this.persistCookies) {
      return;
    }

    try {
      const files = await fs.readdir(this.cookieDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        try {
          const filePath = path.join(this.cookieDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const jar: CookieJar = JSON.parse(data);
          
          // Check if session expired
          if (Date.now() - jar.lastUpdated > this.sessionTimeout) {
            await fs.unlink(filePath).catch(() => {});
            continue;
          }
          
          this.cookieJars.set(jar.domain, jar);
        } catch (error) {
          // Skip invalid files
        }
      }
    } catch (error) {
      // Directory might not exist yet, that's okay
    }
  }

  /**
   * Sanitizes domain name for filename
   */
  private sanitizeDomain(domain: string): string {
    return domain.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  /**
   * Gets all domains with cookies
   */
  getDomains(): string[] {
    return Array.from(this.cookieJars.keys());
  }

  /**
   * Clears all cookies
   */
  async clearAll(): Promise<void> {
    this.cookieJars.clear();
    
    if (this.persistCookies) {
      try {
        const files = await fs.readdir(this.cookieDir);
        await Promise.all(
          files.map((file) => fs.unlink(path.join(this.cookieDir, file)))
        );
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Gets cookie statistics
   */
  getStats(): {
    totalDomains: number;
    totalCookies: number;
    domains: Array<{ domain: string; cookieCount: number }>;
  } {
    const domains: Array<{ domain: string; cookieCount: number }> = [];
    let totalCookies = 0;

    for (const [domain, jar] of this.cookieJars.entries()) {
      const count = jar.cookies.length;
      domains.push({ domain, cookieCount: count });
      totalCookies += count;
    }

    return {
      totalDomains: this.cookieJars.size,
      totalCookies,
      domains,
    };
  }
}

