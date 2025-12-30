/**
 * MERLIN WEBSITE CLONER - SPA & FRAMEWORK TEST SUITE
 *
 * Tests cloning of modern JavaScript frameworks and SPAs.
 * Verifies: JS rendering, API recording, state preservation, offline functionality.
 *
 * Run: npx tsx src/test/spa-framework-test.ts [mode]
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env' });

// ============================================
// TEST CONFIGURATION
// ============================================

interface SPATestSite {
  url: string;
  name: string;
  framework: string;
  hasAPI: boolean;
  hasState: boolean;
  hasServiceWorker: boolean;
  expectedFeatures: string[];
}

interface SPATestResult {
  site: SPATestSite;
  success: boolean;
  frameworkDetected: string | null;
  jsRendered: boolean;
  apiCallsCaptured: number;
  statePreserved: boolean;
  serviceWorkerCaptured: boolean;
  pagesCloned: number;
  assetsDownloaded: number;
  offlineWorking: boolean;
  visualAccuracy: number; // 0-100%
  errors: string[];
  timeMs: number;
}

// ============================================
// SPA TEST SITES BY FRAMEWORK
// ============================================

const REACT_SITES: SPATestSite[] = [
  {
    url: 'https://react.dev',
    name: 'React Docs',
    framework: 'react',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['JSX rendering', 'React Router', 'Code highlighting'],
  },
  {
    url: 'https://github.com',
    name: 'GitHub',
    framework: 'react',
    hasAPI: true,
    hasState: true,
    hasServiceWorker: true,
    expectedFeatures: ['Turbo navigation', 'API calls', 'Real-time updates'],
  },
  {
    url: 'https://vercel.com',
    name: 'Vercel',
    framework: 'nextjs',
    hasAPI: true,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['SSR/SSG', 'Dynamic routes', 'API routes'],
  },
  {
    url: 'https://cal.com',
    name: 'Cal.com',
    framework: 'nextjs',
    hasAPI: true,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['Calendar widget', 'Booking flow', 'API integration'],
  },
];

const VUE_SITES: SPATestSite[] = [
  {
    url: 'https://vuejs.org',
    name: 'Vue.js Docs',
    framework: 'vue',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['Vue components', 'VitePress', 'Code examples'],
  },
  {
    url: 'https://nuxt.com',
    name: 'Nuxt',
    framework: 'nuxt',
    hasAPI: true,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['SSR', 'Auto imports', 'File-based routing'],
  },
  {
    url: 'https://laravel.com',
    name: 'Laravel',
    framework: 'vue',
    hasAPI: false,
    hasState: false,
    hasServiceWorker: false,
    expectedFeatures: ['Vue components', 'Documentation'],
  },
];

const ANGULAR_SITES: SPATestSite[] = [
  {
    url: 'https://angular.io',
    name: 'Angular Docs',
    framework: 'angular',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: true,
    expectedFeatures: ['Angular Material', 'Service Worker', 'Complex routing'],
  },
  {
    url: 'https://material.angular.io',
    name: 'Angular Material',
    framework: 'angular',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['Component demos', 'Theming'],
  },
];

const SVELTE_SITES: SPATestSite[] = [
  {
    url: 'https://svelte.dev',
    name: 'Svelte Docs',
    framework: 'svelte',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['REPL', 'Tutorials', 'Compiled output'],
  },
  {
    url: 'https://kit.svelte.dev',
    name: 'SvelteKit Docs',
    framework: 'sveltekit',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['SSR', 'File routing', 'Adapters'],
  },
];

const OTHER_FRAMEWORKS: SPATestSite[] = [
  {
    url: 'https://astro.build',
    name: 'Astro',
    framework: 'astro',
    hasAPI: false,
    hasState: false,
    hasServiceWorker: false,
    expectedFeatures: ['Island architecture', 'Partial hydration'],
  },
  {
    url: 'https://solidjs.com',
    name: 'SolidJS',
    framework: 'solid',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['Fine-grained reactivity', 'JSX'],
  },
  {
    url: 'https://qwik.builder.io',
    name: 'Qwik',
    framework: 'qwik',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['Resumability', 'O(1) loading'],
  },
  {
    url: 'https://remix.run',
    name: 'Remix',
    framework: 'remix',
    hasAPI: true,
    hasState: true,
    hasServiceWorker: false,
    expectedFeatures: ['Nested routing', 'Data loading', 'Form handling'],
  },
];

const API_HEAVY_SITES: SPATestSite[] = [
  {
    url: 'https://jsonplaceholder.typicode.com',
    name: 'JSONPlaceholder',
    framework: 'static',
    hasAPI: true,
    hasState: false,
    hasServiceWorker: false,
    expectedFeatures: ['REST API documentation', 'Example responses'],
  },
  {
    url: 'https://pokeapi.co',
    name: 'PokeAPI',
    framework: 'static',
    hasAPI: true,
    hasState: false,
    hasServiceWorker: false,
    expectedFeatures: ['API explorer', 'GraphQL'],
  },
];

const PWA_SITES: SPATestSite[] = [
  {
    url: 'https://web.dev',
    name: 'web.dev',
    framework: 'custom',
    hasAPI: true,
    hasState: true,
    hasServiceWorker: true,
    expectedFeatures: ['PWA', 'Offline support', 'Web Vitals'],
  },
  {
    url: 'https://squoosh.app',
    name: 'Squoosh',
    framework: 'custom',
    hasAPI: false,
    hasState: true,
    hasServiceWorker: true,
    expectedFeatures: ['Web Workers', 'WASM', 'Offline processing'],
  },
];

// ============================================
// ALL TEST SITES
// ============================================

const ALL_SPA_SITES: SPATestSite[] = [
  ...REACT_SITES,
  ...VUE_SITES,
  ...ANGULAR_SITES,
  ...SVELTE_SITES,
  ...OTHER_FRAMEWORKS,
  ...API_HEAVY_SITES,
  ...PWA_SITES,
];

// ============================================
// SPA TEST RUNNER
// ============================================

class SPAFrameworkTester {
  private results: SPATestResult[] = [];
  private apiBaseUrl = 'http://localhost:3000';

  async testSite(site: SPATestSite): Promise<SPATestResult> {
    const startTime = Date.now();

    console.log(`\n  Testing: ${site.name} (${site.framework})`);
    console.log(`  URL: ${site.url}`);
    console.log(`  Features: ${site.expectedFeatures.join(', ')}`);

    try {
      // Start clone with SPA-specific options
      const response = await fetch(`${this.apiBaseUrl}/api/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: site.url,
          options: {
            maxPages: 10,
            maxDepth: 2,
            timeout: 120000,
            stealthMode: true,
            // SPA-specific options
            waitForJs: true,
            waitForNetworkIdle: true,
            captureAPIs: site.hasAPI,
            preserveState: site.hasState,
            captureServiceWorker: site.hasServiceWorker,
            renderJavaScript: true,
            // Framework detection
            detectFramework: true,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const jobId = data.jobId;

      // Wait for completion
      const job = await this.waitForJob(jobId, 180000);

      const result: SPATestResult = {
        site,
        success: job.status === 'completed',
        frameworkDetected: job.frameworkDetected || null,
        jsRendered: job.jsRendered || false,
        apiCallsCaptured: job.apiCallsCaptured || 0,
        statePreserved: job.statePreserved || false,
        serviceWorkerCaptured: job.serviceWorkerCaptured || false,
        pagesCloned: job.pagesCloned || 0,
        assetsDownloaded: job.assetsDownloaded || 0,
        offlineWorking: job.offlineVerified || false,
        visualAccuracy: job.visualAccuracy || 0,
        errors: job.errors || [],
        timeMs: Date.now() - startTime,
      };

      this.logResult(result);
      return result;
    } catch (error: any) {
      const result: SPATestResult = {
        site,
        success: false,
        frameworkDetected: null,
        jsRendered: false,
        apiCallsCaptured: 0,
        statePreserved: false,
        serviceWorkerCaptured: false,
        pagesCloned: 0,
        assetsDownloaded: 0,
        offlineWorking: false,
        visualAccuracy: 0,
        errors: [error.message],
        timeMs: Date.now() - startTime,
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

        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    return { status: 'timeout', error: 'Job timed out' };
  }

  private logResult(result: SPATestResult): void {
    const icon = result.success ? '✅' : '❌';
    const framework = result.frameworkDetected ? `[${result.frameworkDetected}]` : '[unknown]';

    console.log(`\n  ${icon} ${result.site.name} ${framework}`);
    console.log(`     JS Rendered: ${result.jsRendered ? '✓' : '✗'}`);
    console.log(`     Pages: ${result.pagesCloned} | Assets: ${result.assetsDownloaded}`);

    if (result.site.hasAPI) {
      console.log(`     API Calls Captured: ${result.apiCallsCaptured}`);
    }
    if (result.site.hasState) {
      console.log(`     State Preserved: ${result.statePreserved ? '✓' : '✗'}`);
    }
    if (result.site.hasServiceWorker) {
      console.log(`     Service Worker: ${result.serviceWorkerCaptured ? '✓' : '✗'}`);
    }

    console.log(`     Visual Accuracy: ${result.visualAccuracy}%`);
    console.log(`     Time: ${(result.timeMs / 1000).toFixed(1)}s`);

    if (result.errors.length > 0) {
      console.log(`     Errors: ${result.errors.join(', ')}`);
    }
  }

  async runTests(sites: SPATestSite[]): Promise<SPATestResult[]> {
    console.log('\n' + '='.repeat(60));
    console.log('MERLIN SPA & FRAMEWORK TEST SUITE');
    console.log('='.repeat(60));
    console.log(`Testing ${sites.length} sites...`);

    for (const site of sites) {
      const result = await this.testSite(site);
      this.results.push(result);

      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    return this.results;
  }

  generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('SPA TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    // Group by framework
    const byFramework: Record<string, SPATestResult[]> = {};

    for (const result of this.results) {
      const framework = result.site.framework;
      if (!byFramework[framework]) {
        byFramework[framework] = [];
      }
      byFramework[framework].push(result);
    }

    // Print by framework
    for (const [framework, results] of Object.entries(byFramework)) {
      const passed = results.filter(r => r.success).length;
      const total = results.length;
      const rate = ((passed / total) * 100).toFixed(0);

      console.log(`\n${framework.toUpperCase()}`);
      console.log(`  Pass Rate: ${passed}/${total} (${rate}%)`);

      const jsRendered = results.filter(r => r.jsRendered).length;
      console.log(`  JS Rendered: ${jsRendered}/${total}`);

      const apiSites = results.filter(r => r.site.hasAPI);
      if (apiSites.length > 0) {
        const apiCaptured = apiSites.filter(r => r.apiCallsCaptured > 0).length;
        console.log(`  API Captured: ${apiCaptured}/${apiSites.length}`);
      }

      const avgVisual = results.reduce((sum, r) => sum + r.visualAccuracy, 0) / results.length;
      console.log(`  Avg Visual Accuracy: ${avgVisual.toFixed(0)}%`);
    }

    // Overall stats
    const totalPassed = this.results.filter(r => r.success).length;
    const totalTests = this.results.length;
    const overallRate = ((totalPassed / totalTests) * 100).toFixed(0);

    console.log('\n' + '='.repeat(60));
    console.log('OVERALL');
    console.log('='.repeat(60));
    console.log(`Total: ${totalPassed}/${totalTests} (${overallRate}%)`);

    const jsRendered = this.results.filter(r => r.jsRendered).length;
    console.log(`JS Rendering: ${jsRendered}/${totalTests}`);

    const statePreserved = this.results.filter(r => r.site.hasState && r.statePreserved).length;
    const stateSites = this.results.filter(r => r.site.hasState).length;
    console.log(`State Preservation: ${statePreserved}/${stateSites}`);

    const avgVisual = this.results.reduce((sum, r) => sum + r.visualAccuracy, 0) / totalTests;
    console.log(`Avg Visual Accuracy: ${avgVisual.toFixed(0)}%`);

    // Save results
    const reportPath = path.join(process.cwd(), `spa-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: totalPassed,
        rate: overallRate + '%',
        jsRendered,
        avgVisualAccuracy: avgVisual.toFixed(0) + '%',
      },
      byFramework: Object.fromEntries(
        Object.entries(byFramework).map(([k, v]) => [k, {
          total: v.length,
          passed: v.filter(r => r.success).length,
        }])
      ),
      results: this.results,
    }, null, 2));

    console.log(`\nResults saved to: ${reportPath}`);
  }
}

// ============================================
// QUICK TEST SUBSET
// ============================================

const QUICK_SPA_SITES: SPATestSite[] = [
  REACT_SITES[0], // React docs
  VUE_SITES[0],   // Vue docs
  ANGULAR_SITES[0], // Angular docs
  SVELTE_SITES[0], // Svelte docs
  API_HEAVY_SITES[0], // JSONPlaceholder
];

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'quick';

  const tester = new SPAFrameworkTester();

  let sites: SPATestSite[];

  switch (mode) {
    case 'quick':
      console.log('Running QUICK SPA test (5 sites)...');
      sites = QUICK_SPA_SITES;
      break;
    case 'react':
      console.log('Running REACT test...');
      sites = REACT_SITES;
      break;
    case 'vue':
      console.log('Running VUE test...');
      sites = VUE_SITES;
      break;
    case 'angular':
      console.log('Running ANGULAR test...');
      sites = ANGULAR_SITES;
      break;
    case 'all':
      console.log('Running ALL SPA tests...');
      sites = ALL_SPA_SITES;
      break;
    default:
      sites = QUICK_SPA_SITES;
  }

  await tester.runTests(sites);
  tester.generateReport();
}

main().catch(console.error);
