/**
 * Robots.txt Parser
 * Parses and enforces robots.txt rules
 */

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
  sitemap?: string[];
}

export interface RobotsTxt {
  rules: RobotsRule[];
  sitemaps: string[];
}

/**
 * Robots.txt Parser
 * Parses robots.txt and checks if URLs are allowed
 */
export class RobotsTxtParser {
  /**
   * Parses robots.txt content
   */
  parse(robotsTxt: string, baseUrl: string): RobotsTxt {
    const lines = robotsTxt.split('\n').map(line => line.trim());
    const rules: RobotsRule[] = [];
    const sitemaps: string[] = [];
    let currentRule: RobotsRule | null = null;

    for (const line of lines) {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) {
        continue;
      }

      const [directive, ...valueParts] = line.split(':').map(s => s.trim());
      const value = valueParts.join(':').trim();

      if (directive.toLowerCase() === 'user-agent') {
        // Save previous rule
        if (currentRule) {
          rules.push(currentRule);
        }

        // Start new rule
        currentRule = {
          userAgent: value,
          allow: [],
          disallow: [],
        };
      } else if (currentRule) {
        switch (directive.toLowerCase()) {
          case 'allow':
            currentRule.allow.push(value);
            break;
          case 'disallow':
            currentRule.disallow.push(value);
            break;
          case 'crawl-delay':
            currentRule.crawlDelay = parseFloat(value);
            break;
        }
      }

      // Handle sitemap (global)
      if (directive.toLowerCase() === 'sitemap') {
        sitemaps.push(value);
      }
    }

    // Add last rule
    if (currentRule) {
      rules.push(currentRule);
    }

    return { rules, sitemaps };
  }

  /**
   * Checks if a URL is allowed by robots.txt
   */
  isAllowed(url: string, robotsTxt: RobotsTxt, userAgent: string = '*'): boolean {
    const urlPath = new URL(url).pathname;

    // Find matching rule
    let matchingRule: RobotsRule | null = null;

    // First, try to find exact user-agent match
    for (const rule of robotsTxt.rules) {
      if (rule.userAgent.toLowerCase() === userAgent.toLowerCase()) {
        matchingRule = rule;
        break;
      }
    }

    // If no exact match, use wildcard rule
    if (!matchingRule) {
      for (const rule of robotsTxt.rules) {
        if (rule.userAgent === '*') {
          matchingRule = rule;
          break;
        }
      }
    }

    if (!matchingRule) {
      return true; // No rules = allowed
    }

    // Check disallow rules first
    for (const disallowPath of matchingRule.disallow) {
      if (this.matchesPath(urlPath, disallowPath)) {
        // Check if there's an allow rule that overrides
        for (const allowPath of matchingRule.allow) {
          if (this.matchesPath(urlPath, allowPath)) {
            return true; // Allow overrides disallow
          }
        }
        return false; // Disallowed
      }
    }

    // Check allow rules
    for (const allowPath of matchingRule.allow) {
      if (this.matchesPath(urlPath, allowPath)) {
        return true;
      }
    }

    // If no disallow matches, it's allowed
    return true;
  }

  /**
   * Checks if a path matches a pattern
   */
  private matchesPath(path: string, pattern: string): boolean {
    // Convert pattern to regex
    let regexPattern = pattern
      .replace(/\*/g, '.*') // * matches anything
      .replace(/\$/g, '$'); // $ matches end of string

    // Escape special regex characters
    regexPattern = regexPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    regexPattern = regexPattern.replace(/\\\*/g, '.*');
    regexPattern = regexPattern.replace(/\\\$/g, '$');

    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  }

  /**
   * Gets crawl delay for a user agent
   */
  getCrawlDelay(robotsTxt: RobotsTxt, userAgent: string = '*'): number | null {
    for (const rule of robotsTxt.rules) {
      if (rule.userAgent.toLowerCase() === userAgent.toLowerCase() || rule.userAgent === '*') {
        return rule.crawlDelay || null;
      }
    }
    return null;
  }

  /**
   * Fetches and parses robots.txt from a URL
   */
  async fetchRobotsTxt(baseUrl: string): Promise<RobotsTxt | null> {
    try {
      const url = new URL('/robots.txt', baseUrl).href;
      const response = await fetch(url);
      
      if (!response.ok) {
        return null; // No robots.txt or error
      }

      const content = await response.text();
      return this.parse(content, baseUrl);
    } catch (error) {
      return null;
    }
  }
}

