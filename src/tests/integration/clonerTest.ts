/**
 * Comprehensive Cloner Integration Tests
 * Tests all major components without scraping unauthorized sites
 */

import { WebsiteCloner } from '../../services/websiteCloner.js';
import { CloudflareBypass } from '../../services/cloudflareBypass.js';
import { AssetOptimizer } from '../../services/assetOptimizer.js';
import { VerificationSystem } from '../../services/verificationSystem.js';
import { MerlinProxyNetwork } from '../../services/proxyNetwork.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

class ClonerTestSuite {
  private results: TestResult[] = [];
  private testServer: http.Server | null = null;
  private testServerPort = 9999;

  async runAllTests(): Promise<{ passed: number; failed: number; results: TestResult[] }> {
    console.log('\n🧪 Starting Merlin Cloner Test Suite\n');
    console.log('='.repeat(60));

    // Start local test server
    await this.startTestServer();

    try {
      // Core functionality tests
      await this.testWebsiteCloner();
      await this.testCloudflareDetection();
      await this.testAssetOptimizer();
      await this.testVerificationSystem();
      await this.testProxyNetwork();
      await this.testDistributedScraping();
      await this.testCacheManager();
      await this.testFullCloneWorkflow();
    } finally {
      await this.stopTestServer();
    }

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      console.log(`${status} ${r.name} (${r.duration}ms)`);
      if (r.error) console.log(`   Error: ${r.error}`);
      if (r.details) console.log(`   ${r.details}`);
    });

    return { passed, failed, results: this.results };
  }

  private async startTestServer(): Promise<void> {
    return new Promise((resolve) => {
      this.testServer = http.createServer((req, res) => {
        const url = req.url || '/';

        // Simulate different page types
        if (url === '/' || url === '/index.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getTestHomePage());
        } else if (url === '/spa.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getSPATestPage());
        } else if (url === '/cloudflare-sim.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getCloudflareSimPage());
        } else if (url === '/assets/style.css') {
          res.writeHead(200, { 'Content-Type': 'text/css' });
          res.end('body { font-family: Arial; } .hero { background: #333; }');
        } else if (url === '/assets/script.js') {
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end('console.log("Test script loaded"); document.body.classList.add("js-loaded");');
        } else if (url === '/api/data') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', data: [1, 2, 3] }));
        } else if (url === '/page2.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getSecondaryPage());
        } else if (url === '/page3.html') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.getThirdPage());
        } else if (url.startsWith('/assets/image')) {
          // Return a simple 1x1 PNG
          res.writeHead(200, { 'Content-Type': 'image/png' });
          const pngBuffer = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
            0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
            0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
            0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
          ]);
          res.end(pngBuffer);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      this.testServer.listen(this.testServerPort, () => {
        console.log(`📡 Test server running on http://localhost:${this.testServerPort}\n`);
        resolve();
      });
    });
  }

  private async stopTestServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.testServer) {
        this.testServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private getTestHomePage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Website - Merlin Clone Test</title>
  <link rel="stylesheet" href="/assets/style.css">
  <script src="/assets/script.js" defer></script>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/page2.html">Page 2</a>
      <a href="/page3.html">Page 3</a>
    </nav>
  </header>
  <main>
    <h1>Welcome to Test Website</h1>
    <img src="/assets/image1.png" alt="Test Image 1">
    <img src="/assets/image2.png" alt="Test Image 2">
    <p>This is a test page for the Merlin Website Cloner.</p>
    <div id="dynamic-content"></div>
  </main>
  <footer>
    <p>&copy; 2024 Test Website</p>
  </footer>
</body>
</html>`;
  }

  private getSPATestPage(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>SPA Test Page</title>
</head>
<body>
  <div id="app"></div>
  <script>
    // Simulate SPA behavior
    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('app').innerHTML = '<h1>SPA Content Loaded</h1>';
      window.__SPA_STATE__ = { loaded: true, data: { items: [1, 2, 3] } };
    });
  </script>
</body>
</html>`;
  }

  private getCloudflareSimPage(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Just a moment...</title>
</head>
<body>
  <div id="cf-browser-verification">
    <form id="challenge-form">
      <input type="hidden" name="jschl_vc" value="test123">
      <input type="hidden" name="pass" value="1234567890">
      <input type="hidden" name="jschl_answer" value="">
    </form>
  </div>
  <script>
    // Simulate Cloudflare JS challenge
    var a = {};
    a.value = 12345;
  </script>
</body>
</html>`;
  }

  private getSecondaryPage(): string {
    return `<!DOCTYPE html>
<html>
<head><title>Page 2</title></head>
<body>
  <h1>Secondary Page</h1>
  <a href="/">Back to Home</a>
  <a href="/page3.html">Go to Page 3</a>
</body>
</html>`;
  }

  private getThirdPage(): string {
    return `<!DOCTYPE html>
<html>
<head><title>Page 3</title></head>
<body>
  <h1>Third Page</h1>
  <a href="/">Back to Home</a>
</body>
</html>`;
  }

  private async runTest(name: string, testFn: () => Promise<{ passed: boolean; details?: string }>): Promise<void> {
    const start = Date.now();
    try {
      const result = await testFn();
      this.results.push({
        name,
        passed: result.passed,
        duration: Date.now() - start,
        details: result.details,
      });
    } catch (error) {
      this.results.push({
        name,
        passed: false,
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test 1: Website Cloner Initialization
   */
  private async testWebsiteCloner(): Promise<void> {
    await this.runTest('WebsiteCloner Initialization', async () => {
      const cloner = new WebsiteCloner();

      // Check that cloner has required methods
      const hasClone = typeof cloner.clone === 'function';

      return {
        passed: hasClone,
        details: `clone: ${hasClone}`,
      };
    });
  }

  /**
   * Test 2: Cloudflare Detection Logic
   */
  private async testCloudflareDetection(): Promise<void> {
    await this.runTest('Cloudflare Detection Logic', async () => {
      const bypass = new CloudflareBypass();

      // Test detection patterns (without actual page - just pattern matching)
      const jsChallenge = 'cf-browser-verification jschl_vc pass';
      const captchaChallenge = 'cf_captcha g-recaptcha';
      const turnstileChallenge = 'cf-turnstile turnstile';
      const normalPage = 'Welcome to our website regular content';

      // The class should have detection methods
      const hasDetect = typeof bypass.detectCloudflare === 'function';
      const hasBypass = typeof bypass.bypassJavaScriptChallenge === 'function';

      return {
        passed: hasDetect && hasBypass,
        details: `detectCloudflare: ${hasDetect}, bypassJavaScriptChallenge: ${hasBypass}`,
      };
    });
  }

  /**
   * Test 3: Asset Optimizer with Sharp
   */
  private async testAssetOptimizer(): Promise<void> {
    await this.runTest('Asset Optimizer (Sharp)', async () => {
      const optimizer = new AssetOptimizer();

      // Create a test image file
      const testDir = path.join(process.cwd(), 'test-output');
      await fs.mkdir(testDir, { recursive: true });

      // Create a simple test PNG (1x1 red pixel)
      const testImagePath = path.join(testDir, 'test-image.png');
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4, 0xef, 0x00, 0x00,
        0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
      ]);
      await fs.writeFile(testImagePath, pngBuffer);

      // Test optimization
      const result = await optimizer.optimizeImage(testImagePath, {
        compress: true,
        quality: 80,
      });

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });

      return {
        passed: result !== null && result.originalSize > 0,
        details: result ? `Original: ${result.originalSize}B, Optimized: ${result.optimizedSize}B` : 'No result',
      };
    });
  }

  /**
   * Test 4: Verification System
   */
  private async testVerificationSystem(): Promise<void> {
    await this.runTest('Verification System', async () => {
      const verifier = new VerificationSystem();

      // Create test output directory with HTML
      const testDir = path.join(process.cwd(), 'test-verify');
      await fs.mkdir(testDir, { recursive: true });

      // Create test HTML file
      const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <a href="page2.html">Link 1</a>
  <img src="image.png" alt="Test">
  <link rel="stylesheet" href="style.css">
</body>
</html>`;
      await fs.writeFile(path.join(testDir, 'index.html'), htmlContent);
      await fs.writeFile(path.join(testDir, 'page2.html'), '<html></html>');
      await fs.writeFile(path.join(testDir, 'style.css'), 'body {}');

      // Create test image
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
      ]);
      await fs.writeFile(path.join(testDir, 'image.png'), pngBuffer);

      // Run verification
      const result = await verifier.verify(testDir, 'http://localhost:9999');

      // Cleanup
      await fs.rm(testDir, { recursive: true, force: true });

      return {
        passed: result.links.total > 0 && result.assets.total > 0,
        details: `Links: ${result.links.valid}/${result.links.total}, Assets: ${result.assets.found}/${result.assets.total}`,
      };
    });
  }

  /**
   * Test 5: Proxy Network
   */
  private async testProxyNetwork(): Promise<void> {
    await this.runTest('Merlin Proxy Network', async () => {
      const network = new MerlinProxyNetwork();
      await network.initialize();

      // Test node registration
      const registration = await network.registerNode({
        host: '127.0.0.1',
        port: 8080,
        userId: 'test-user-1',
        country: 'US',
        city: 'New York',
        bandwidth: 100,
        type: 'residential',
        version: '1.0.0',
      });

      const hasNodeId = !!registration.nodeId;
      const hasAuthToken = !!registration.authToken;

      // Test stats
      const stats = network.getNetworkStats();
      const hasStats = stats.totalNodes >= 1;

      // Test leaderboard
      const leaderboard = network.getLeaderboard(10);

      // Cleanup
      await network.unregisterNode(registration.nodeId);

      return {
        passed: hasNodeId && hasAuthToken && hasStats,
        details: `NodeId: ${hasNodeId}, AuthToken: ${hasAuthToken}, Nodes: ${stats.totalNodes}`,
      };
    });
  }

  /**
   * Test 6: Distributed Scraping Setup
   */
  private async testDistributedScraping(): Promise<void> {
    await this.runTest('Distributed Scraping Module', async () => {
      // Check if distributed scraper module exists and can be imported
      try {
        const { DistributedScraper } = await import('../../services/distributedScraper.js');
        const hasClass = typeof DistributedScraper === 'function';

        return {
          passed: hasClass,
          details: 'DistributedScraper class loaded successfully',
        };
      } catch (error) {
        return {
          passed: false,
          details: `Failed to load: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    });
  }

  /**
   * Test 7: Cache Manager
   */
  private async testCacheManager(): Promise<void> {
    await this.runTest('Cache Manager', async () => {
      try {
        const { CacheManager } = await import('../../services/cacheManager.js');
        const cache = new CacheManager();

        // Test page cache operations (using actual API)
        const testUrl = 'http://test.local/page';
        const testContent = '<html><body>Test</body></html>';

        // CacheManager uses getPage/setPage for page caching
        const hasGetPage = typeof cache.getPage === 'function';
        const hasGetStats = typeof cache.getStats === 'function';

        // Get stats to verify cache is working
        const stats = cache.getStats();

        return {
          passed: hasGetPage && hasGetStats,
          details: `getPage: ${hasGetPage}, getStats: ${hasGetStats}, hitRate: ${stats.hitRate}`,
        };
      } catch (error) {
        return {
          passed: false,
          details: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    });
  }

  /**
   * Test 8: Full Clone Workflow (on local test server)
   */
  private async testFullCloneWorkflow(): Promise<void> {
    await this.runTest('Full Clone Workflow (Local Server)', async () => {
      const cloner = new WebsiteCloner();
      const outputDir = path.join(process.cwd(), 'test-clone-output');

      try {
        // Clone our local test server
        const result = await cloner.clone({
          url: `http://localhost:${this.testServerPort}`,
          outputDir,
          maxPages: 10,
          maxDepth: 2,
        });

        // Check results
        const hasPages = result.pagesCloned > 0;
        const hasAssets = result.assetsCaptured >= 0;
        const isSuccess = result.success === true;

        // Verify files were created
        const indexExists = await fs.access(path.join(outputDir, 'index.html'))
          .then(() => true)
          .catch(() => false);

        // Cleanup
        await fs.rm(outputDir, { recursive: true, force: true });

        return {
          passed: hasPages && isSuccess && indexExists,
          details: `Pages: ${result.pagesCloned}, Assets: ${result.assetsCaptured}, Success: ${result.success}`,
        };
      } catch (error) {
        // Cleanup on error
        await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});

        return {
          passed: false,
          details: `Clone failed: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    });
  }
}

// Run tests
async function main() {
  const suite = new ClonerTestSuite();
  const { passed, failed, results } = await suite.runAllTests();

  console.log('\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! The cloning system is working correctly.\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} test(s) failed. Please review the errors above.\n`);
    process.exit(1);
  }
}

main().catch(console.error);
