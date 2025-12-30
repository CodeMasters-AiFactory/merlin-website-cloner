/**
 * MERLIN WEBSITE CLONER - SCALE & STRESS TEST SUITE
 *
 * Tests system limits: concurrent clones, large sites, memory usage, endurance.
 *
 * Run: npx tsx src/test/scale-stress-test.ts [mode]
 * Modes: quick, concurrent, large, endurance
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

config({ path: '.env' });

// ============================================
// TEST CONFIGURATION
// ============================================

interface ScaleTestConfig {
  name: string;
  description: string;
  sites: string[];
  concurrent: number;
  maxPagesPerSite: number;
  timeout: number;
  memoryLimitMB: number;
}

interface ScaleTestResult {
  config: ScaleTestConfig;
  startTime: string;
  endTime: string;
  durationMs: number;
  sitesAttempted: number;
  sitesCompleted: number;
  sitesFailed: number;
  totalPagesCloned: number;
  peakMemoryMB: number;
  avgMemoryMB: number;
  errors: string[];
  success: boolean;
}

// ============================================
// TEST SITES (variety of sizes and complexity)
// ============================================

const SMALL_SITES = [
  'https://example.com',
  'https://httpbin.org',
  'https://jsonplaceholder.typicode.com',
  'https://news.ycombinator.com',
  'https://lobste.rs',
];

const MEDIUM_SITES = [
  'https://blog.cloudflare.com',
  'https://docs.github.com',
  'https://reactjs.org',
  'https://vuejs.org',
  'https://tailwindcss.com',
  'https://nextjs.org',
  'https://vitejs.dev',
  'https://prisma.io',
];

const LARGE_SITES = [
  'https://developer.mozilla.org',
  'https://docs.microsoft.com',
  'https://docs.aws.amazon.com',
  'https://cloud.google.com/docs',
];

// 100 sites for scale testing
const SCALE_100_SITES = [
  ...SMALL_SITES,
  ...MEDIUM_SITES,
  // Popular sites
  'https://github.com',
  'https://stackoverflow.com',
  'https://medium.com',
  'https://dev.to',
  'https://hashnode.com',
  'https://reddit.com',
  'https://producthunt.com',
  'https://dribbble.com',
  'https://behance.net',
  'https://figma.com',
  // Tech docs
  'https://kubernetes.io/docs',
  'https://docs.docker.com',
  'https://nodejs.org/docs',
  'https://python.org',
  'https://rust-lang.org',
  'https://golang.org',
  'https://typescriptlang.org',
  'https://sass-lang.com',
  'https://lesscss.org',
  'https://webpack.js.org',
  // Frameworks
  'https://angular.io',
  'https://svelte.dev',
  'https://ember.js.com',
  'https://backbonejs.org',
  'https://jquery.com',
  'https://bootstrap.com',
  'https://bulma.io',
  'https://materializecss.com',
  'https://foundation.zurb.com',
  'https://semantic-ui.com',
  // Tools
  'https://eslint.org',
  'https://prettier.io',
  'https://jestjs.io',
  'https://mochajs.org',
  'https://jasmine.github.io',
  'https://cypress.io',
  'https://playwright.dev',
  'https://puppeteer.dev',
  'https://selenium.dev',
  'https://appium.io',
  // News/Blogs
  'https://techcrunch.com',
  'https://theverge.com',
  'https://wired.com',
  'https://arstechnica.com',
  'https://engadget.com',
  'https://mashable.com',
  'https://gizmodo.com',
  'https://lifehacker.com',
  'https://slashdot.org',
  'https://digg.com',
  // E-commerce (landing pages only)
  'https://shopify.com',
  'https://bigcommerce.com',
  'https://woocommerce.com',
  'https://magento.com',
  'https://squarespace.com',
  'https://wix.com',
  'https://weebly.com',
  'https://godaddy.com',
  'https://namecheap.com',
  'https://cloudflare.com',
  // More tech
  'https://digitalocean.com',
  'https://linode.com',
  'https://vultr.com',
  'https://heroku.com',
  'https://netlify.com',
  'https://vercel.com',
  'https://render.com',
  'https://railway.app',
  'https://fly.io',
  'https://supabase.com',
  // APIs/Services
  'https://stripe.com',
  'https://twilio.com',
  'https://sendgrid.com',
  'https://mailchimp.com',
  'https://algolia.com',
  'https://auth0.com',
  'https://okta.com',
  'https://firebase.google.com',
  'https://mongodb.com',
  'https://redis.io',
  // Learning
  'https://freecodecamp.org',
  'https://codecademy.com',
  'https://udemy.com',
  'https://coursera.org',
  'https://edx.org',
  'https://khanacademy.org',
  'https://w3schools.com',
  'https://tutorialspoint.com',
  'https://geeksforgeeks.org',
  'https://leetcode.com',
];

// ============================================
// SCALE TEST RUNNER
// ============================================

class ScaleStressTester {
  private apiBaseUrl = 'http://localhost:3000';
  private memorySnapshots: number[] = [];
  private memoryInterval: NodeJS.Timer | null = null;

  private startMemoryMonitoring(): void {
    this.memorySnapshots = [];
    this.memoryInterval = setInterval(() => {
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      this.memorySnapshots.push(used);
    }, 1000);
  }

  private stopMemoryMonitoring(): { peak: number; avg: number } {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    if (this.memorySnapshots.length === 0) {
      return { peak: 0, avg: 0 };
    }

    const peak = Math.max(...this.memorySnapshots);
    const avg = this.memorySnapshots.reduce((a, b) => a + b, 0) / this.memorySnapshots.length;

    return { peak, avg };
  }

  private async cloneSite(url: string, maxPages: number, timeout: number): Promise<{
    success: boolean;
    pagesCloned: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          options: {
            maxPages,
            maxDepth: 2,
            timeout,
            useProxy: false, // Don't use proxy for scale tests to save bandwidth
            stealthMode: true,
          }
        })
      });

      if (!response.ok) {
        return { success: false, pagesCloned: 0, error: 'API error' };
      }

      const data = await response.json();
      const jobId = data.jobId;

      // Wait for completion
      const startWait = Date.now();
      while (Date.now() - startWait < timeout) {
        const jobResponse = await fetch(`${this.apiBaseUrl}/api/jobs/${jobId}`);
        const job = await jobResponse.json();

        if (job.status === 'completed') {
          return { success: true, pagesCloned: job.pagesCloned || 0 };
        } else if (job.status === 'failed') {
          return { success: false, pagesCloned: job.pagesCloned || 0, error: job.error };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      return { success: false, pagesCloned: 0, error: 'Timeout' };
    } catch (error: any) {
      return { success: false, pagesCloned: 0, error: error.message };
    }
  }

  async runSequentialTest(config: ScaleTestConfig): Promise<ScaleTestResult> {
    console.log('\n' + '='.repeat(60));
    console.log(`SEQUENTIAL TEST: ${config.name}`);
    console.log('='.repeat(60));
    console.log(`Sites: ${config.sites.length}`);
    console.log(`Max pages per site: ${config.maxPagesPerSite}`);
    console.log(`Timeout per site: ${config.timeout / 1000}s`);

    const startTime = new Date();
    this.startMemoryMonitoring();

    let sitesCompleted = 0;
    let sitesFailed = 0;
    let totalPagesCloned = 0;
    const errors: string[] = [];

    for (let i = 0; i < config.sites.length; i++) {
      const site = config.sites[i];
      console.log(`\n[${i + 1}/${config.sites.length}] ${site}`);

      const result = await this.cloneSite(site, config.maxPagesPerSite, config.timeout);

      if (result.success) {
        sitesCompleted++;
        totalPagesCloned += result.pagesCloned;
        console.log(`  ✅ Success (${result.pagesCloned} pages)`);
      } else {
        sitesFailed++;
        errors.push(`${site}: ${result.error}`);
        console.log(`  ❌ Failed: ${result.error}`);
      }

      // Brief pause between sites
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const memory = this.stopMemoryMonitoring();
    const endTime = new Date();

    const result: ScaleTestResult = {
      config,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      sitesAttempted: config.sites.length,
      sitesCompleted,
      sitesFailed,
      totalPagesCloned,
      peakMemoryMB: Math.round(memory.peak),
      avgMemoryMB: Math.round(memory.avg),
      errors,
      success: sitesFailed === 0,
    };

    this.printTestResult(result);
    return result;
  }

  async runConcurrentTest(config: ScaleTestConfig): Promise<ScaleTestResult> {
    console.log('\n' + '='.repeat(60));
    console.log(`CONCURRENT TEST: ${config.name}`);
    console.log('='.repeat(60));
    console.log(`Sites: ${config.sites.length}`);
    console.log(`Concurrent: ${config.concurrent}`);
    console.log(`Max pages per site: ${config.maxPagesPerSite}`);

    const startTime = new Date();
    this.startMemoryMonitoring();

    let sitesCompleted = 0;
    let sitesFailed = 0;
    let totalPagesCloned = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < config.sites.length; i += config.concurrent) {
      const batch = config.sites.slice(i, i + config.concurrent);
      console.log(`\nBatch ${Math.floor(i / config.concurrent) + 1}: ${batch.length} sites`);

      const promises = batch.map(site => this.cloneSite(site, config.maxPagesPerSite, config.timeout));
      const results = await Promise.all(promises);

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const site = batch[j];

        if (result.success) {
          sitesCompleted++;
          totalPagesCloned += result.pagesCloned;
          console.log(`  ✅ ${site} (${result.pagesCloned} pages)`);
        } else {
          sitesFailed++;
          errors.push(`${site}: ${result.error}`);
          console.log(`  ❌ ${site}: ${result.error}`);
        }
      }

      // Check memory pressure
      const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      if (currentMemory > config.memoryLimitMB) {
        console.log(`\n⚠️ Memory limit exceeded (${Math.round(currentMemory)}MB > ${config.memoryLimitMB}MB)`);
        console.log('Stopping test early...');
        break;
      }
    }

    const memory = this.stopMemoryMonitoring();
    const endTime = new Date();

    const result: ScaleTestResult = {
      config,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      sitesAttempted: config.sites.length,
      sitesCompleted,
      sitesFailed,
      totalPagesCloned,
      peakMemoryMB: Math.round(memory.peak),
      avgMemoryMB: Math.round(memory.avg),
      errors,
      success: sitesCompleted >= config.sites.length * 0.9, // 90% success threshold
    };

    this.printTestResult(result);
    return result;
  }

  private printTestResult(result: ScaleTestResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Duration: ${(result.durationMs / 1000 / 60).toFixed(1)} minutes`);
    console.log(`Sites: ${result.sitesCompleted}/${result.sitesAttempted} completed`);
    console.log(`Pages: ${result.totalPagesCloned} total cloned`);
    console.log(`Memory: ${result.peakMemoryMB}MB peak, ${result.avgMemoryMB}MB avg`);

    if (result.errors.length > 0 && result.errors.length <= 10) {
      console.log('\nErrors:');
      result.errors.forEach(e => console.log(`  - ${e}`));
    } else if (result.errors.length > 10) {
      console.log(`\nErrors: ${result.errors.length} total (see log file)`);
    }

    // Save results
    const reportPath = path.join(process.cwd(), `scale-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\nResults saved to: ${reportPath}`);
  }
}

// ============================================
// TEST CONFIGURATIONS
// ============================================

const TEST_CONFIGS: Record<string, ScaleTestConfig> = {
  quick: {
    name: 'Quick Scale Test',
    description: '5 sites sequential, basic validation',
    sites: SMALL_SITES,
    concurrent: 1,
    maxPagesPerSite: 5,
    timeout: 60000,
    memoryLimitMB: 2048,
  },

  concurrent_5: {
    name: '5 Concurrent Clones',
    description: '10 sites, 5 at a time',
    sites: [...SMALL_SITES, ...MEDIUM_SITES.slice(0, 5)],
    concurrent: 5,
    maxPagesPerSite: 10,
    timeout: 120000,
    memoryLimitMB: 4096,
  },

  concurrent_10: {
    name: '10 Concurrent Clones',
    description: '20 sites, 10 at a time',
    sites: [...SMALL_SITES, ...MEDIUM_SITES, ...SMALL_SITES, ...MEDIUM_SITES.slice(0, 2)],
    concurrent: 10,
    maxPagesPerSite: 10,
    timeout: 180000,
    memoryLimitMB: 8192,
  },

  scale_100: {
    name: '100 Sites Sequential',
    description: 'Clone 100 different sites',
    sites: SCALE_100_SITES,
    concurrent: 1,
    maxPagesPerSite: 5,
    timeout: 60000,
    memoryLimitMB: 4096,
  },

  large_site: {
    name: 'Large Site Test',
    description: 'Clone large documentation sites',
    sites: LARGE_SITES.slice(0, 1),
    concurrent: 1,
    maxPagesPerSite: 500,
    timeout: 600000, // 10 minutes
    memoryLimitMB: 4096,
  },
};

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'quick';

  const tester = new ScaleStressTester();

  console.log('\n' + '='.repeat(60));
  console.log('MERLIN SCALE & STRESS TEST SUITE');
  console.log('='.repeat(60));
  console.log(`System: ${os.platform()} ${os.arch()}`);
  console.log(`CPUs: ${os.cpus().length}`);
  console.log(`Total Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);
  console.log(`Free Memory: ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB`);

  const config = TEST_CONFIGS[mode];

  if (!config) {
    console.log(`\nUnknown mode: ${mode}`);
    console.log('Available modes:', Object.keys(TEST_CONFIGS).join(', '));
    process.exit(1);
  }

  console.log(`\nRunning: ${config.name}`);
  console.log(`Description: ${config.description}`);

  if (config.concurrent > 1) {
    await tester.runConcurrentTest(config);
  } else {
    await tester.runSequentialTest(config);
  }
}

main().catch(console.error);
