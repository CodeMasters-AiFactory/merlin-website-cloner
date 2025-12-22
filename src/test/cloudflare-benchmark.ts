/**
 * Cloudflare Benchmark Test Suite
 * Tests Merlin against 50 difficult Cloudflare-protected sites
 * Validates 95-99% success rate claim
 */

import { WebsiteCloner } from '../services/websiteCloner.js';
import type { CloneOptions } from '../services/websiteCloner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TestSite {
  url: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  expectedChallenges: string[];
}

interface BenchmarkResult {
  site: TestSite;
  success: boolean;
  duration: number;
  pagesCloned: number;
  errors: string[];
  challengesEncountered: string[];
  proxyUsed: boolean;
  timestamp: string;
}

interface BenchmarkReport {
  totalSites: number;
  successfulSites: number;
  failedSites: number;
  successRate: number;
  averageDuration: number;
  byDifficulty: {
    easy: { total: number; success: number; rate: number };
    medium: { total: number; success: number; rate: number };
    hard: { total: number; success: number; rate: number };
    extreme: { total: number; success: number; rate: number };
  };
  byCategory: Record<string, { total: number; success: number; rate: number }>;
  results: BenchmarkResult[];
  timestamp: string;
}

/**
 * 50 Difficult Test Sites (Cloudflare-Protected)
 * Mix of e-commerce, media, SaaS, and enterprise sites
 */
const TEST_SITES: TestSite[] = [
  // Easy Difficulty (10 sites) - Basic Cloudflare protection
  {
    url: 'https://www.cloudflare.com',
    category: 'cdn',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.discord.com',
    category: 'social',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.coinbase.com',
    category: 'crypto',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.notion.so',
    category: 'productivity',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.udemy.com',
    category: 'education',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.shopify.com',
    category: 'ecommerce',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.canva.com',
    category: 'design',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.figma.com',
    category: 'design',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.atlassian.com',
    category: 'productivity',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },
  {
    url: 'https://www.zendesk.com',
    category: 'saas',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },

  // Medium Difficulty (20 sites) - JS Challenge + Rate Limiting
  {
    url: 'https://www.crunchbase.com',
    category: 'business',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.binance.com',
    category: 'crypto',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit', 'geo-block']
  },
  {
    url: 'https://www.gitlab.com',
    category: 'devtools',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.booking.com',
    category: 'travel',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.expedia.com',
    category: 'travel',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.ticketmaster.com',
    category: 'entertainment',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit', 'captcha']
  },
  {
    url: 'https://www.zillow.com',
    category: 'realestate',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.indeed.com',
    category: 'jobs',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.glassdoor.com',
    category: 'jobs',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.wayfair.com',
    category: 'ecommerce',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.etsy.com',
    category: 'ecommerce',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.redfin.com',
    category: 'realestate',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.opentable.com',
    category: 'restaurant',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.yelp.com',
    category: 'review',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.trustpilot.com',
    category: 'review',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.producthunt.com',
    category: 'startup',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.stripe.com',
    category: 'fintech',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.square.com',
    category: 'fintech',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.hubspot.com',
    category: 'saas',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.salesforce.com',
    category: 'saas',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },

  // Hard Difficulty (15 sites) - Turnstile + Advanced Detection
  {
    url: 'https://www.nike.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint', 'geo-block']
  },
  {
    url: 'https://www.adidas.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.bestbuy.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.target.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.walmart.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint', 'geo-block']
  },
  {
    url: 'https://www.homedepot.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.lowes.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },
  {
    url: 'https://www.nordstrom.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.macys.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },
  {
    url: 'https://www.sephora.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.ulta.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },
  {
    url: 'https://www.kohls.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },
  {
    url: 'https://www.jcpenney.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },
  {
    url: 'https://www.newegg.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.bhphotovideo.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },

  // Extreme Difficulty (5 sites) - Maximum Protection
  {
    url: 'https://www.stubhub.com',
    category: 'tickets',
    difficulty: 'extreme',
    expectedChallenges: ['turnstile', 'captcha', 'rate-limit', 'fingerprint', 'geo-block']
  },
  {
    url: 'https://www.tickpick.com',
    category: 'tickets',
    difficulty: 'extreme',
    expectedChallenges: ['turnstile', 'captcha', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.vivid seats.com',
    category: 'tickets',
    difficulty: 'extreme',
    expectedChallenges: ['turnstile', 'captcha', 'rate-limit', 'fingerprint']
  },
  {
    url: 'https://www.stockx.com',
    category: 'marketplace',
    difficulty: 'extreme',
    expectedChallenges: ['turnstile', 'captcha', 'rate-limit', 'fingerprint', 'device-check']
  },
  {
    url: 'https://www.goat.com',
    category: 'marketplace',
    difficulty: 'extreme',
    expectedChallenges: ['turnstile', 'captcha', 'rate-limit', 'fingerprint', 'device-check']
  }
];

/**
 * Cloudflare Benchmark Test Runner
 */
export class CloudflareBenchmark {
  private cloner: WebsiteCloner;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.cloner = new WebsiteCloner();
  }

  /**
   * Run full benchmark on all 50 sites
   */
  async runFullBenchmark(): Promise<BenchmarkReport> {
    console.log('🚀 Starting Cloudflare Benchmark Test Suite');
    console.log(`📊 Testing ${TEST_SITES.length} difficult sites\n`);

    for (let i = 0; i < TEST_SITES.length; i++) {
      const site = TEST_SITES[i];
      console.log(`\n[${i + 1}/${TEST_SITES.length}] Testing: ${site.url}`);
      console.log(`   Category: ${site.category} | Difficulty: ${site.difficulty}`);

      const result = await this.testSite(site);
      this.results.push(result);

      // Progress update
      const successCount = this.results.filter(r => r.success).length;
      const currentRate = (successCount / this.results.length * 100).toFixed(1);
      console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (${result.duration}ms)`);
      console.log(`   Current Success Rate: ${currentRate}% (${successCount}/${this.results.length})`);

      // Delay between tests to avoid rate limiting
      if (i < TEST_SITES.length - 1) {
        await this.delay(3000); // 3 second delay
      }
    }

    return this.generateReport();
  }

  /**
   * Test a single site
   */
  private async testSite(site: TestSite): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const challengesEncountered: string[] = [];

    const options: CloneOptions = {
      url: site.url,
      outputDir: path.join(process.cwd(), 'benchmark-output', this.sanitizeUrl(site.url)),
      maxPages: 5, // Limit to 5 pages for speed
      maxDepth: 1,
      proxyConfig: {
        enabled: true // Enable proxies for all tests
      },
      cloudflareBypass: {
        enabled: true
      },
      verifyAfterClone: false // Skip verification for speed
    };

    try {
      const result = await this.cloner.clone(options);
      const duration = Date.now() - startTime;

      return {
        site,
        success: result.success && result.pagesCloned > 0,
        duration,
        pagesCloned: result.pagesCloned,
        errors: result.errors,
        challengesEncountered,
        proxyUsed: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        site,
        success: false,
        duration,
        pagesCloned: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        challengesEncountered,
        proxyUsed: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate comprehensive benchmark report
   */
  private generateReport(): BenchmarkReport {
    const totalSites = this.results.length;
    const successfulSites = this.results.filter(r => r.success).length;
    const failedSites = totalSites - successfulSites;
    const successRate = (successfulSites / totalSites) * 100;
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalSites;

    // By difficulty
    const byDifficulty = {
      easy: this.calculateDifficultyStats('easy'),
      medium: this.calculateDifficultyStats('medium'),
      hard: this.calculateDifficultyStats('hard'),
      extreme: this.calculateDifficultyStats('extreme')
    };

    // By category
    const categories = [...new Set(this.results.map(r => r.site.category))];
    const byCategory: Record<string, { total: number; success: number; rate: number }> = {};
    for (const category of categories) {
      byCategory[category] = this.calculateCategoryStats(category);
    }

    return {
      totalSites,
      successfulSites,
      failedSites,
      successRate,
      averageDuration,
      byDifficulty,
      byCategory,
      results: this.results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate stats for a difficulty level
   */
  private calculateDifficultyStats(difficulty: string) {
    const difficultyResults = this.results.filter(r => r.site.difficulty === difficulty);
    const total = difficultyResults.length;
    const success = difficultyResults.filter(r => r.success).length;
    const rate = total > 0 ? (success / total) * 100 : 0;

    return { total, success, rate };
  }

  /**
   * Calculate stats for a category
   */
  private calculateCategoryStats(category: string) {
    const categoryResults = this.results.filter(r => r.site.category === category);
    const total = categoryResults.length;
    const success = categoryResults.filter(r => r.success).length;
    const rate = total > 0 ? (success / total) * 100 : 0;

    return { total, success, rate };
  }

  /**
   * Save report to file
   */
  async saveReport(report: BenchmarkReport): Promise<string> {
    const reportDir = path.join(process.cwd(), 'benchmark-reports');
    await fs.mkdir(reportDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const reportPath = path.join(reportDir, `cloudflare-benchmark-${timestamp}.json`);

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Also save markdown report
    const mdPath = path.join(reportDir, `cloudflare-benchmark-${timestamp}.md`);
    await fs.writeFile(mdPath, this.generateMarkdownReport(report));

    return reportPath;
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(report: BenchmarkReport): string {
    return `# Merlin Cloudflare Benchmark Report

**Generated:** ${report.timestamp}
**Total Sites Tested:** ${report.totalSites}
**Overall Success Rate:** ${report.successRate.toFixed(2)}%

---

## Executive Summary

✅ **Successful Sites:** ${report.successfulSites}/${report.totalSites}
❌ **Failed Sites:** ${report.failedSites}/${report.totalSites}
⏱️ **Average Duration:** ${report.averageDuration.toFixed(0)}ms

---

## Success Rate by Difficulty

| Difficulty | Total | Success | Failure | Success Rate |
|------------|-------|---------|---------|--------------|
| Easy | ${report.byDifficulty.easy.total} | ${report.byDifficulty.easy.success} | ${report.byDifficulty.easy.total - report.byDifficulty.easy.success} | ${report.byDifficulty.easy.rate.toFixed(1)}% |
| Medium | ${report.byDifficulty.medium.total} | ${report.byDifficulty.medium.success} | ${report.byDifficulty.medium.total - report.byDifficulty.medium.success} | ${report.byDifficulty.medium.rate.toFixed(1)}% |
| Hard | ${report.byDifficulty.hard.total} | ${report.byDifficulty.hard.success} | ${report.byDifficulty.hard.total - report.byDifficulty.hard.success} | ${report.byDifficulty.hard.rate.toFixed(1)}% |
| Extreme | ${report.byDifficulty.extreme.total} | ${report.byDifficulty.extreme.success} | ${report.byDifficulty.extreme.total - report.byDifficulty.extreme.success} | ${report.byDifficulty.extreme.rate.toFixed(1)}% |

---

## Success Rate by Category

${Object.entries(report.byCategory)
  .sort((a, b) => b[1].rate - a[1].rate)
  .map(([category, stats]) =>
    `- **${category}:** ${stats.success}/${stats.total} (${stats.rate.toFixed(1)}%)`
  )
  .join('\n')}

---

## Detailed Results

${report.results
  .map((result, i) =>
    `### ${i + 1}. ${result.site.url}
- **Category:** ${result.site.category}
- **Difficulty:** ${result.site.difficulty}
- **Result:** ${result.success ? '✅ SUCCESS' : '❌ FAILED'}
- **Duration:** ${result.duration}ms
- **Pages Cloned:** ${result.pagesCloned}
${result.errors.length > 0 ? `- **Errors:** ${result.errors.join(', ')}` : ''}
`
  )
  .join('\n')}

---

**Benchmark Version:** 1.0.0
**Merlin Version:** 1.0.0
`;
  }

  /**
   * Sanitize URL for file path
   */
  private sanitizeUrl(url: string): string {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * CLI Runner
 */
// Run if executed directly (works with both node and tsx)
const isMainModule = import.meta.url.includes(process.argv[1]?.replace(/\\/g, '/') || '');
if (isMainModule || process.argv[1]?.includes('cloudflare-benchmark')) {
  (async () => {
    const benchmark = new CloudflareBenchmark();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Merlin Cloudflare Benchmark Test Suite v1.0           ║');
    console.log('║     Testing 50 Difficult Cloudflare-Protected Sites       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const report = await benchmark.runFullBenchmark();

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL RESULTS                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Successful: ${report.successfulSites}/${report.totalSites}`);
    console.log(`❌ Failed: ${report.failedSites}/${report.totalSites}`);
    console.log(`📊 Success Rate: ${report.successRate.toFixed(2)}%`);
    console.log(`⏱️  Average Duration: ${report.averageDuration.toFixed(0)}ms\n`);

    console.log('Success Rate by Difficulty:');
    console.log(`  Easy: ${report.byDifficulty.easy.rate.toFixed(1)}%`);
    console.log(`  Medium: ${report.byDifficulty.medium.rate.toFixed(1)}%`);
    console.log(`  Hard: ${report.byDifficulty.hard.rate.toFixed(1)}%`);
    console.log(`  Extreme: ${report.byDifficulty.extreme.rate.toFixed(1)}%\n`);

    const reportPath = await benchmark.saveReport(report);
    console.log(`📄 Report saved to: ${reportPath}\n`);

    process.exit(report.successRate >= 95 ? 0 : 1);
  })().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}
