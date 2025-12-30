/**
 * MERLIN WEBSITE CLONER - COMPREHENSIVE PROTECTION BYPASS TEST SUITE
 *
 * Tests against 75+ real protected sites to verify bypass capabilities.
 * Uses DataImpulse residential proxy and CapSolver for CAPTCHA solving.
 *
 * Run: npx tsx src/test/protection-bypass-comprehensive.ts
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.services' });
config({ path: '.env.proxy' });
config({ path: '.env' });

// ============================================
// TEST CONFIGURATION
// ============================================

interface TestSite {
  url: string;
  name: string;
  protection: string;
  level?: string;
  expectedDifficulty: 'easy' | 'medium' | 'hard' | 'extreme';
}

interface TestResult {
  site: TestSite;
  success: boolean;
  statusCode?: number;
  protectionDetected?: string;
  bypassMethod?: string;
  timeMs: number;
  captchaEncountered: boolean;
  captchaSolved: boolean;
  pagesCloned: number;
  error?: string;
  timestamp: string;
}

// ============================================
// TEST SITES BY PROTECTION TYPE
// ============================================

const CLOUDFLARE_SITES: TestSite[] = [
  // Level 1 - Basic JS Challenge
  { url: 'https://www.cloudflare.com', name: 'Cloudflare', protection: 'cloudflare', level: '1', expectedDifficulty: 'easy' },
  { url: 'https://discord.com', name: 'Discord', protection: 'cloudflare', level: '1', expectedDifficulty: 'easy' },
  { url: 'https://medium.com', name: 'Medium', protection: 'cloudflare', level: '1', expectedDifficulty: 'easy' },
  { url: 'https://pastebin.com', name: 'Pastebin', protection: 'cloudflare', level: '1', expectedDifficulty: 'easy' },
  { url: 'https://www.binance.com', name: 'Binance', protection: 'cloudflare', level: '1', expectedDifficulty: 'medium' },

  // Level 2 - CAPTCHA Challenge
  { url: 'https://www.coinbase.com', name: 'Coinbase', protection: 'cloudflare', level: '2', expectedDifficulty: 'medium' },
  { url: 'https://opensea.io', name: 'OpenSea', protection: 'cloudflare', level: '2', expectedDifficulty: 'medium' },

  // Enterprise Cloudflare (Bot Management)
  { url: 'https://www.shopify.com', name: 'Shopify', protection: 'cloudflare-enterprise', expectedDifficulty: 'hard' },
  { url: 'https://www.zendesk.com', name: 'Zendesk', protection: 'cloudflare-enterprise', expectedDifficulty: 'hard' },
  { url: 'https://www.canva.com', name: 'Canva', protection: 'cloudflare-enterprise', expectedDifficulty: 'hard' },
  { url: 'https://www.notion.so', name: 'Notion', protection: 'cloudflare-enterprise', expectedDifficulty: 'hard' },
];

const AKAMAI_SITES: TestSite[] = [
  { url: 'https://www.sony.com', name: 'Sony', protection: 'akamai', expectedDifficulty: 'hard' },
  { url: 'https://www.adobe.com', name: 'Adobe', protection: 'akamai', expectedDifficulty: 'hard' },
  { url: 'https://www.nike.com', name: 'Nike', protection: 'akamai', expectedDifficulty: 'hard' },
  { url: 'https://www.airbnb.com', name: 'Airbnb', protection: 'akamai', expectedDifficulty: 'hard' },
  { url: 'https://www.marriott.com', name: 'Marriott', protection: 'akamai', expectedDifficulty: 'hard' },
  { url: 'https://www.delta.com', name: 'Delta', protection: 'akamai', expectedDifficulty: 'hard' },
  { url: 'https://www.espn.com', name: 'ESPN', protection: 'akamai', expectedDifficulty: 'medium' },
];

const DATADOME_SITES: TestSite[] = [
  { url: 'https://www.footlocker.com', name: 'Foot Locker', protection: 'datadome', expectedDifficulty: 'hard' },
  { url: 'https://www.reddit.com', name: 'Reddit', protection: 'datadome', expectedDifficulty: 'medium' },
  { url: 'https://www.tripadvisor.com', name: 'TripAdvisor', protection: 'datadome', expectedDifficulty: 'hard' },
  { url: 'https://www.sephora.com', name: 'Sephora', protection: 'datadome', expectedDifficulty: 'hard' },
  { url: 'https://www.ticketmaster.com', name: 'Ticketmaster', protection: 'datadome', expectedDifficulty: 'extreme' },
];

const PERIMETERX_SITES: TestSite[] = [
  { url: 'https://www.zillow.com', name: 'Zillow', protection: 'perimeterx', expectedDifficulty: 'hard' },
  { url: 'https://www.priceline.com', name: 'Priceline', protection: 'perimeterx', expectedDifficulty: 'hard' },
  { url: 'https://www.homedepot.com', name: 'Home Depot', protection: 'perimeterx', expectedDifficulty: 'hard' },
  { url: 'https://www.lowes.com', name: 'Lowes', protection: 'perimeterx', expectedDifficulty: 'hard' },
  { url: 'https://www.indeed.com', name: 'Indeed', protection: 'perimeterx', expectedDifficulty: 'hard' },
  { url: 'https://www.craigslist.org', name: 'Craigslist', protection: 'perimeterx', expectedDifficulty: 'medium' },
];

const IMPERVA_SITES: TestSite[] = [
  { url: 'https://www.chase.com', name: 'Chase', protection: 'imperva', expectedDifficulty: 'extreme' },
  { url: 'https://www.bankofamerica.com', name: 'Bank of America', protection: 'imperva', expectedDifficulty: 'extreme' },
  { url: 'https://www.capitalone.com', name: 'Capital One', protection: 'imperva', expectedDifficulty: 'extreme' },
];

const AWS_WAF_SITES: TestSite[] = [
  { url: 'https://www.amazon.com', name: 'Amazon', protection: 'aws-waf', expectedDifficulty: 'hard' },
  { url: 'https://www.twitch.tv', name: 'Twitch', protection: 'aws-waf', expectedDifficulty: 'hard' },
  { url: 'https://www.imdb.com', name: 'IMDB', protection: 'aws-waf', expectedDifficulty: 'medium' },
];

const OTHER_PROTECTED_SITES: TestSite[] = [
  // Shape Security (F5)
  { url: 'https://www.southwest.com', name: 'Southwest', protection: 'shape', expectedDifficulty: 'extreme' },
  { url: 'https://www.aa.com', name: 'American Airlines', protection: 'shape', expectedDifficulty: 'extreme' },

  // Kasada
  { url: 'https://www.kick.com', name: 'Kick', protection: 'kasada', expectedDifficulty: 'extreme' },

  // Generic/Mixed
  { url: 'https://www.linkedin.com', name: 'LinkedIn', protection: 'mixed', expectedDifficulty: 'hard' },
  { url: 'https://www.instagram.com', name: 'Instagram', protection: 'mixed', expectedDifficulty: 'hard' },
  { url: 'https://www.facebook.com', name: 'Facebook', protection: 'mixed', expectedDifficulty: 'hard' },
  { url: 'https://twitter.com', name: 'Twitter/X', protection: 'mixed', expectedDifficulty: 'hard' },
];

// Simple/unprotected sites for baseline
const BASELINE_SITES: TestSite[] = [
  { url: 'https://example.com', name: 'Example.com', protection: 'none', expectedDifficulty: 'easy' },
  { url: 'https://httpbin.org', name: 'HTTPBin', protection: 'none', expectedDifficulty: 'easy' },
  { url: 'https://www.wikipedia.org', name: 'Wikipedia', protection: 'none', expectedDifficulty: 'easy' },
  { url: 'https://news.ycombinator.com', name: 'Hacker News', protection: 'none', expectedDifficulty: 'easy' },
  { url: 'https://github.com', name: 'GitHub', protection: 'minimal', expectedDifficulty: 'easy' },
];

// Fingerprint detection test sites
const FINGERPRINT_TEST_SITES: TestSite[] = [
  { url: 'https://bot.sannysoft.com', name: 'Sannysoft Bot Test', protection: 'fingerprint-test', expectedDifficulty: 'easy' },
  { url: 'https://browserleaks.com/canvas', name: 'BrowserLeaks Canvas', protection: 'fingerprint-test', expectedDifficulty: 'easy' },
  { url: 'https://pixelscan.net', name: 'PixelScan', protection: 'fingerprint-test', expectedDifficulty: 'easy' },
];

// ============================================
// ALL TEST SITES
// ============================================

const ALL_TEST_SITES: TestSite[] = [
  ...BASELINE_SITES,
  ...FINGERPRINT_TEST_SITES,
  ...CLOUDFLARE_SITES,
  ...AKAMAI_SITES,
  ...DATADOME_SITES,
  ...PERIMETERX_SITES,
  ...IMPERVA_SITES,
  ...AWS_WAF_SITES,
  ...OTHER_PROTECTED_SITES,
];

// ============================================
// TEST RUNNER
// ============================================

class ProtectionBypassTester {
  private results: TestResult[] = [];
  private apiBaseUrl = 'http://localhost:3000';

  async testSite(site: TestSite): Promise<TestResult> {
    const startTime = Date.now();

    console.log(`\n  Testing: ${site.name} (${site.protection})`);
    console.log(`  URL: ${site.url}`);

    try {
      // Call the clone API to test bypass
      const response = await fetch(`${this.apiBaseUrl}/api/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: site.url,
          options: {
            maxPages: 3, // Just test a few pages
            maxDepth: 1,
            timeout: 60000,
            useProxy: true,
            stealthMode: true,
            bypassProtection: true,
            solveCaptchas: true,
          }
        })
      });

      const data = await response.json();
      const timeMs = Date.now() - startTime;

      if (response.ok && data.jobId) {
        // Wait for job to complete (with timeout)
        const jobResult = await this.waitForJob(data.jobId, 120000);

        const result: TestResult = {
          site,
          success: jobResult.status === 'completed',
          statusCode: response.status,
          protectionDetected: jobResult.protectionDetected,
          bypassMethod: jobResult.bypassMethod,
          timeMs: Date.now() - startTime,
          captchaEncountered: jobResult.captchaEncountered || false,
          captchaSolved: jobResult.captchaSolved || false,
          pagesCloned: jobResult.pagesCloned || 0,
          error: jobResult.error,
          timestamp: new Date().toISOString(),
        };

        this.logResult(result);
        return result;
      } else {
        const result: TestResult = {
          site,
          success: false,
          statusCode: response.status,
          timeMs,
          captchaEncountered: false,
          captchaSolved: false,
          pagesCloned: 0,
          error: data.error || 'API request failed',
          timestamp: new Date().toISOString(),
        };

        this.logResult(result);
        return result;
      }
    } catch (error: any) {
      const result: TestResult = {
        site,
        success: false,
        timeMs: Date.now() - startTime,
        captchaEncountered: false,
        captchaSolved: false,
        pagesCloned: 0,
        error: error.message,
        timestamp: new Date().toISOString(),
      };

      this.logResult(result);
      return result;
    }
  }

  private async waitForJob(jobId: string, timeoutMs: number): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/jobs/${jobId}`);
        const job = await response.json();

        if (job.status === 'completed' || job.status === 'failed') {
          return job;
        }

        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { status: 'timeout', error: 'Job timed out' };
  }

  private logResult(result: TestResult): void {
    const icon = result.success ? '✅' : '❌';
    const captcha = result.captchaEncountered ? (result.captchaSolved ? '🔓' : '🔒') : '';

    console.log(`  ${icon} ${result.site.name}: ${result.success ? 'PASSED' : 'FAILED'} ${captcha}`);
    console.log(`     Time: ${result.timeMs}ms | Pages: ${result.pagesCloned}`);

    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  }

  async runTests(sites: TestSite[]): Promise<TestResult[]> {
    console.log('\n' + '='.repeat(60));
    console.log('MERLIN PROTECTION BYPASS TEST SUITE');
    console.log('='.repeat(60));
    console.log(`Testing ${sites.length} sites...`);
    console.log(`Proxy: DataImpulse (${process.env.PROXY_HOST})`);
    console.log(`CAPTCHA Solver: CapSolver`);
    console.log('='.repeat(60));

    for (const site of sites) {
      const result = await this.testSite(site);
      this.results.push(result);

      // Small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return this.results;
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    // Group by protection type
    const byProtection: Record<string, TestResult[]> = {};

    for (const result of this.results) {
      const protection = result.site.protection;
      if (!byProtection[protection]) {
        byProtection[protection] = [];
      }
      byProtection[protection].push(result);
    }

    // Print summary for each protection type
    for (const [protection, results] of Object.entries(byProtection)) {
      const passed = results.filter(r => r.success).length;
      const total = results.length;
      const rate = ((passed / total) * 100).toFixed(1);

      console.log(`\n${protection.toUpperCase()}`);
      console.log(`  Pass Rate: ${passed}/${total} (${rate}%)`);

      const avgTime = results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;
      console.log(`  Avg Time: ${(avgTime / 1000).toFixed(1)}s`);

      const captchaEncounters = results.filter(r => r.captchaEncountered).length;
      const captchaSolved = results.filter(r => r.captchaSolved).length;
      if (captchaEncounters > 0) {
        console.log(`  CAPTCHAs: ${captchaSolved}/${captchaEncounters} solved`);
      }
    }

    // Overall stats
    const totalPassed = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    const overallRate = ((totalPassed / totalTests) * 100).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('OVERALL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total: ${totalPassed}/${totalTests} (${overallRate}%)`);

    // Success by difficulty
    for (const difficulty of ['easy', 'medium', 'hard', 'extreme']) {
      const diffResults = this.results.filter(r => r.site.expectedDifficulty === difficulty);
      if (diffResults.length > 0) {
        const diffPassed = diffResults.filter(r => r.success).length;
        const diffRate = ((diffPassed / diffResults.length) * 100).toFixed(1);
        console.log(`  ${difficulty.toUpperCase()}: ${diffPassed}/${diffResults.length} (${diffRate}%)`);
      }
    }

    // Save results to file
    const reportPath = path.join(process.cwd(), `test-results-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: totalPassed,
        rate: overallRate + '%',
      },
      byProtection: Object.fromEntries(
        Object.entries(byProtection).map(([k, v]) => [k, {
          total: v.length,
          passed: v.filter(r => r.success).length,
          rate: ((v.filter(r => r.success).length / v.length) * 100).toFixed(1) + '%',
        }])
      ),
      results: this.results,
    }, null, 2));

    console.log(`\nResults saved to: ${reportPath}`);
  }
}

// ============================================
// QUICK TEST (subset for fast validation)
// ============================================

const QUICK_TEST_SITES: TestSite[] = [
  // Baseline
  { url: 'https://example.com', name: 'Example.com', protection: 'none', expectedDifficulty: 'easy' },
  { url: 'https://httpbin.org', name: 'HTTPBin', protection: 'none', expectedDifficulty: 'easy' },

  // Fingerprint
  { url: 'https://bot.sannysoft.com', name: 'Sannysoft', protection: 'fingerprint-test', expectedDifficulty: 'easy' },

  // Cloudflare
  { url: 'https://www.cloudflare.com', name: 'Cloudflare', protection: 'cloudflare', level: '1', expectedDifficulty: 'easy' },
  { url: 'https://medium.com', name: 'Medium', protection: 'cloudflare', level: '1', expectedDifficulty: 'easy' },

  // Other protections
  { url: 'https://www.reddit.com', name: 'Reddit', protection: 'datadome', expectedDifficulty: 'medium' },
  { url: 'https://www.imdb.com', name: 'IMDB', protection: 'aws-waf', expectedDifficulty: 'medium' },
  { url: 'https://github.com', name: 'GitHub', protection: 'minimal', expectedDifficulty: 'easy' },
];

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'quick';

  const tester = new ProtectionBypassTester();

  let sites: TestSite[];

  switch (mode) {
    case 'quick':
      console.log('Running QUICK test (8 sites)...');
      sites = QUICK_TEST_SITES;
      break;
    case 'cloudflare':
      console.log('Running CLOUDFLARE test...');
      sites = CLOUDFLARE_SITES;
      break;
    case 'all':
      console.log('Running ALL tests (50+ sites)...');
      sites = ALL_TEST_SITES;
      break;
    case 'baseline':
      console.log('Running BASELINE test...');
      sites = BASELINE_SITES;
      break;
    default:
      console.log('Running QUICK test (default)...');
      sites = QUICK_TEST_SITES;
  }

  await tester.runTests(sites);
  tester.generateReport();
}

main().catch(console.error);
