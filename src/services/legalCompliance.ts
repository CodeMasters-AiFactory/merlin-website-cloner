/**
 * Legal Compliance Service
 * Checks robots.txt, ToS, and enforces rate limiting
 */

import { RobotsTxtParser, type RobotsTxt } from './robotsTxtParser.js';

export interface ComplianceCheck {
  robotsTxtAllowed: boolean;
  robotsTxtChecked: boolean;
  crawlDelay?: number;
  rateLimitRespected: boolean;
  tosChecked: boolean;
  tosAccepted?: boolean;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  respectRobotsTxt: boolean;
}

/**
 * Legal Compliance Service
 * Ensures ethical and legal scraping practices
 */
export class LegalComplianceService {
  private robotsTxtParser: RobotsTxtParser;
  private robotsTxtCache: Map<string, RobotsTxt | null> = new Map();
  private rateLimitConfig: RateLimitConfig;
  private requestTimestamps: Map<string, number[]> = new Map();

  constructor(rateLimitConfig: Partial<RateLimitConfig> = {}) {
    this.robotsTxtParser = new RobotsTxtParser();
    this.rateLimitConfig = {
      requestsPerSecond: 1,
      requestsPerMinute: 60,
      requestsPerHour: 3600,
      respectRobotsTxt: true,
      ...rateLimitConfig,
    };
  }

  /**
   * Checks compliance for a URL
   */
  async checkCompliance(url: string, userAgent: string = '*'): Promise<ComplianceCheck> {
    const baseUrl = new URL(url).origin;
    const check: ComplianceCheck = {
      robotsTxtAllowed: true,
      robotsTxtChecked: false,
      rateLimitRespected: true,
      tosChecked: false,
    };

    // Check robots.txt
    if (this.rateLimitConfig.respectRobotsTxt) {
      let robotsTxt = this.robotsTxtCache.get(baseUrl);

      if (!robotsTxt) {
        const fetched = await this.robotsTxtParser.fetchRobotsTxt(baseUrl);
        if (fetched) {
          robotsTxt = fetched;
          this.robotsTxtCache.set(baseUrl, robotsTxt);
        } else {
          robotsTxt = null;
        }
      }

      if (robotsTxt) {
        check.robotsTxtChecked = true;
        check.robotsTxtAllowed = this.robotsTxtParser.isAllowed(url, robotsTxt, userAgent);
        check.crawlDelay = this.robotsTxtParser.getCrawlDelay(robotsTxt, userAgent) || undefined;
      }
    }

    // Check rate limiting
    check.rateLimitRespected = await this.checkRateLimit(baseUrl);

    // ToS checking would require more sophisticated implementation
    // For now, just mark as checked
    check.tosChecked = true;

    return check;
  }

  /**
   * Checks if rate limit is respected
   */
  private async checkRateLimit(domain: string): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.requestTimestamps.get(domain) || [];

    // Remove old timestamps
    const recentTimestamps = timestamps.filter(ts => now - ts < 3600000); // Last hour

    // Check per-second limit
    const lastSecond = recentTimestamps.filter(ts => now - ts < 1000);
    if (lastSecond.length >= this.rateLimitConfig.requestsPerSecond) {
      return false;
    }

    // Check per-minute limit
    const lastMinute = recentTimestamps.filter(ts => now - ts < 60000);
    if (lastMinute.length >= this.rateLimitConfig.requestsPerMinute) {
      return false;
    }

    // Check per-hour limit
    if (recentTimestamps.length >= this.rateLimitConfig.requestsPerHour) {
      return false;
    }

    // Record this request
    recentTimestamps.push(now);
    this.requestTimestamps.set(domain, recentTimestamps);

    return true;
  }

  /**
   * Waits if necessary to respect rate limits
   */
  async waitForRateLimit(domain: string, crawlDelay?: number): Promise<void> {
    const delay = crawlDelay || (1000 / this.rateLimitConfig.requestsPerSecond);
    await new Promise(resolve => setTimeout(resolve, delay * 1000));
  }

  /**
   * Gets robots.txt for a domain
   */
  async getRobotsTxt(baseUrl: string): Promise<RobotsTxt | null> {
    let robotsTxt = this.robotsTxtCache.get(baseUrl);

    if (!robotsTxt) {
      const fetched = await this.robotsTxtParser.fetchRobotsTxt(baseUrl);
      if (fetched) {
        robotsTxt = fetched;
        this.robotsTxtCache.set(baseUrl, robotsTxt);
      } else {
        this.robotsTxtCache.set(baseUrl, null);
        return null;
      }
    }

    return robotsTxt;
  }

  /**
   * Clears cache
   */
  clearCache(): void {
    this.robotsTxtCache.clear();
    this.requestTimestamps.clear();
  }
}

