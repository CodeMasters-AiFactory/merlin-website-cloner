/**
 * Quick Cloudflare Benchmark Test (10 sites)
 * Tests Merlin against 10 representative sites for quick validation
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
 * 10 Representative Test Sites
 */
const TEST_SITES: TestSite[] = [
  // Easy (3 sites)
  {
    url: 'https://www.cloudflare.com',
    category: 'cdn',
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
    url: 'https://www.figma.com',
    category: 'design',
    difficulty: 'easy',
    expectedChallenges: ['js-challenge']
  },

  // Medium (4 sites)
  {
    url: 'https://www.github.com',
    category: 'developer',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.gitlab.com',
    category: 'developer',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },
  {
    url: 'https://www.reddit.com',
    category: 'social',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'fingerprinting']
  },
  {
    url: 'https://www.coinbase.com',
    category: 'crypto',
    difficulty: 'medium',
    expectedChallenges: ['js-challenge', 'rate-limit']
  },

  // Hard (2 sites)
  {
    url: 'https://www.nike.com',
    category: 'ecommerce',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'fingerprinting']
  },
  {
    url: 'https://www.craigslist.org',
    category: 'classifieds',
    difficulty: 'hard',
    expectedChallenges: ['turnstile', 'rate-limit']
  },

  // Extreme (1 site)
  {
    url: 'https://www.stubhub.com',
    category: 'tickets',
    difficulty: 'extreme',
    expectedChallenges: ['turnstile', 'captcha', 'fingerprinting']
  }
];

/**
 * Benchmark Runner
 */
export class CloudflareBenchmarkQuick {
  private cloner: WebsiteCloner;
  private results: BenchmarkResult[] = [];

  constructor() {
    this.cloner = new WebsiteCloner();
  }

  /**
   * Run full benchmark on all test sites
   */
  async runFullBenchmark(): Promise<BenchmarkReport> {
    console.log(`🚀 Starting Quick Cloudflare Benchmark`);
    console.log(`📊 Testing ${TEST_SITES.length} representative sites\n`);

    for (let i = 0; i < TEST_SITES.length; i++) {
      const site = TEST_SITES[i];
      console.log(`\n[${ i + 1}/${TEST_SITES.length}] Testing: ${site.url}`);
      console.log(`   Category: ${site.category} | Difficulty: ${site.difficulty}`);

      const result = await this.testSite(site);
      this.results.push(result);

      const successRate = (this.results.filter(r => r.success).length / this.results.length * 100).toFixed(1);
      console.log(`   Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'} (${result.duration}ms)`);
      console.log(`   Current Success Rate: ${successRate}% (${this.results.filter(r => r.success).length}/${this.results.length})`);

      // 3 second delay between tests
      if (i < TEST_SITES.length - 1) {
        await this.delay(3000);
      }
    }

    return this.generateReport();
  }

  /**
   * Test a single site
   */
  private async testSite(site: TestSite): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      // Create temporary output directory for this test
      const tmpDir = path.join(process.cwd(), 'benchmark-temp', this.sanitizeUrl(site.url));

      const cloneOptions: CloneOptions = {
        url: site.url,
        outputDir: tmpDir,
        maxPages: 5,
        maxDepth: 2,
        concurrency: 5, // Limit concurrent requests to avoid overwhelming browser
        proxyConfig: {
          enabled: process.env.IPROYAL_API_KEY ? true : false
        }
      };

      const result = await this.cloner.clone(cloneOptions);
      const duration = Date.now() - startTime;

      // Clean up temp directory after test
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }

      return {
        site,
        success: result.pagesCloned > 0 && result.errors.length === 0,
        duration,
        pagesCloned: result.pagesCloned,
        errors: result.errors.map(e => String(e)),
        challengesEncountered: [], // TODO: Extract from logs
        proxyUsed: cloneOptions.proxyConfig?.enabled || false,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        site,
        success: false,
        duration,
        pagesCloned: 0,
        errors: [String(error)],
        challengesEncountered: [],
        proxyUsed: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Sanitize URL for directory name
   */
  private sanitizeUrl(url: string): string {
    return url
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
  }

  /**
   * Generate report from results
   */
  private generateReport(): BenchmarkReport {
    const successfulSites = this.results.filter(r => r.success).length;
    const failedSites = this.results.filter(r => !r.success).length;
    const successRate = (successfulSites / this.results.length) * 100;
    const averageDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;

    // Calculate by difficulty
    const byDifficulty = {
      easy: this.calculateDifficultyStats('easy'),
      medium: this.calculateDifficultyStats('medium'),
      hard: this.calculateDifficultyStats('hard'),
      extreme: this.calculateDifficultyStats('extreme')
    };

    // Calculate by category
    const byCategory: Record<string, { total: number; success: number; rate: number }> = {};
    for (const result of this.results) {
      const category = result.site.category;
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, success: 0, rate: 0 };
      }
      byCategory[category].total++;
      if (result.success) byCategory[category].success++;
    }
    Object.values(byCategory).forEach(cat => {
      cat.rate = (cat.success / cat.total) * 100;
    });

    return {
      totalSites: this.results.length,
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
  private calculateDifficultyStats(difficulty: string): { total: number; success: number; rate: number } {
    const filtered = this.results.filter(r => r.site.difficulty === difficulty);
    const success = filtered.filter(r => r.success).length;
    return {
      total: filtered.length,
      success,
      rate: filtered.length > 0 ? (success / filtered.length) * 100 : 0
    };
  }

  /**
   * Save report to files
   */
  async saveReport(report: BenchmarkReport): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportsDir = path.join(process.cwd(), 'benchmark-reports');

    // Create reports directory
    await fs.mkdir(reportsDir, { recursive: true });

    // Save JSON report
    const jsonPath = path.join(reportsDir, `quick-benchmark-${timestamp}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Save Markdown report
    const mdPath = path.join(reportsDir, `quick-benchmark-${timestamp}.md`);
    await fs.writeFile(mdPath, this.generateMarkdownReport(report));

    return jsonPath;
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(report: BenchmarkReport): string {
    let md = '# Merlin Quick Cloudflare Benchmark Report\n\n';
    md += `**Generated:** ${report.timestamp}\n`;
    md += `**Total Sites Tested:** ${report.totalSites}\n`;
    md += `**Overall Success Rate:** ${report.successRate.toFixed(1)}%\n\n`;

    md += '## Executive Summary\n\n';
    md += `✅ **Successful Sites:** ${report.successfulSites}/${report.totalSites}\n`;
    md += `❌ **Failed Sites:** ${report.failedSites}/${report.totalSites}\n`;
    md += `⏱️ **Average Duration:** ${report.averageDuration.toFixed(0)}ms\n\n`;

    md += '## Success Rate by Difficulty\n\n';
    md += '| Difficulty | Total | Success | Failure | Success Rate |\n';
    md += '|------------|-------|---------|---------|-------------|\n';
    md += `| Easy | ${report.byDifficulty.easy.total} | ${report.byDifficulty.easy.success} | ${report.byDifficulty.easy.total - report.byDifficulty.easy.success} | ${report.byDifficulty.easy.rate.toFixed(1)}% |\n`;
    md += `| Medium | ${report.byDifficulty.medium.total} | ${report.byDifficulty.medium.success} | ${report.byDifficulty.medium.total - report.byDifficulty.medium.success} | ${report.byDifficulty.medium.rate.toFixed(1)}% |\n`;
    md += `| Hard | ${report.byDifficulty.hard.total} | ${report.byDifficulty.hard.success} | ${report.byDifficulty.hard.total - report.byDifficulty.hard.success} | ${report.byDifficulty.hard.rate.toFixed(1)}% |\n`;
    md += `| Extreme | ${report.byDifficulty.extreme.total} | ${report.byDifficulty.extreme.success} | ${report.byDifficulty.extreme.total - report.byDifficulty.extreme.success} | ${report.byDifficulty.extreme.rate.toFixed(1)}% |\n\n`;

    md += '## Detailed Results\n\n';
    for (const result of report.results) {
      md += `### ${result.site.url}\n`;
      md += `- **Category:** ${result.site.category}\n`;
      md += `- **Difficulty:** ${result.site.difficulty}\n`;
      md += `- **Status:** ${result.success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
      md += `- **Duration:** ${result.duration}ms\n`;
      md += `- **Pages Cloned:** ${result.pagesCloned}\n`;
      if (result.errors.length > 0) {
        md += `- **Errors:** ${result.errors.join(', ')}\n`;
      }
      md += '\n';
    }

    return md;
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
if (isMainModule || process.argv[1]?.includes('cloudflare-benchmark-quick')) {
  (async () => {
    const benchmark = new CloudflareBenchmarkQuick();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   Merlin Quick Cloudflare Benchmark Test Suite v1.0       ║');
    console.log('║   Testing 10 Representative Cloudflare-Protected Sites    ║');
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

    // Exit with success if >= 80% for quick test (lower bar than full 95%)
    process.exit(report.successRate >= 80 ? 0 : 1);
  })().catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}
