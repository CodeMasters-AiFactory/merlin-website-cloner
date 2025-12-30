/**
 * Protection Bypass Test Suite
 * Tests Merlin against 50+ protected websites
 *
 * Run: npx ts-node src/test/protection-bypass-test.ts
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// Import will be dynamic to avoid module issues
let protectionDetector: any = null;
let enhancedProxyNetwork: any = null;
import * as fs from 'fs/promises';

puppeteer.use(StealthPlugin());

// Simple protection detection from content
function detectProtectionFromContent(content: string, url: string): string | null {
  if (content.includes('cf-browser-verification') || content.includes('cf-ray') || content.includes('cloudflare')) {
    return 'cloudflare';
  }
  if (content.includes('akamai') || content.includes('_abck')) {
    return 'akamai';
  }
  if (content.includes('datadome') || content.includes('dd.js')) {
    return 'datadome';
  }
  if (content.includes('perimeterx') || content.includes('_pxhd')) {
    return 'perimeterx';
  }
  if (content.includes('imperva') || content.includes('incapsula')) {
    return 'imperva';
  }
  return null;
}

// Test sites organized by protection type
const TEST_SITES = {
  cloudflare: [
    'https://www.cloudflare.com/',
    'https://discord.com/',
    'https://medium.com/',
    'https://canva.com/',
    'https://pastebin.com/',
    'https://coinbase.com/',
    'https://glassdoor.com/',
    'https://crunchbase.com/',
    'https://npmjs.com/',
    'https://cursor.com/',
  ],
  akamai: [
    'https://www.nike.com/',
    'https://www.dell.com/',
    'https://www.airbnb.com/',
    'https://www.ticketmaster.com/',
    'https://www.stubhub.com/',
    'https://www.sephora.com/',
    'https://www.newegg.com/',
    'https://www.costco.com/',
    'https://www.homedepot.com/',
    'https://www.nordstrom.com/',
  ],
  datadome: [
    'https://www.g2.com/',
    'https://www.footlocker.com/',
    'https://www.hermes.com/',
    'https://www.tripadvisor.com/',
    'https://www.leboncoin.fr/',
    'https://www.reddit.com/',
    'https://www.soundcloud.com/',
    'https://www.rakuten.com/',
    'https://www.fnac.com/',
    'https://www.cdiscount.com/',
  ],
  perimeterx: [
    'https://www.zillow.com/',
    'https://www.poshmark.com/',
    'https://www.craigslist.org/',
    'https://www.wayfair.com/',
    'https://www.chegg.com/',
    'https://www.indeed.com/',
    'https://www.realtor.com/',
    'https://www.redfin.com/',
    'https://www.opentable.com/',
    'https://www.grubhub.com/',
  ],
  other: [
    'https://www.amazon.com/',
    'https://www.google.com/',
    'https://www.facebook.com/',
    'https://www.linkedin.com/',
    'https://www.twitter.com/',
    'https://www.instagram.com/',
    'https://www.youtube.com/',
    'https://www.wikipedia.org/',
    'https://www.github.com/',
    'https://www.stackoverflow.com/',
  ],
};

interface TestResult {
  url: string;
  protectionType: string;
  detected: string | null;
  success: boolean;
  blocked: boolean;
  captcha: boolean;
  statusCode: number | null;
  loadTime: number;
  error: string | null;
  timestamp: string;
}

interface TestSummary {
  date: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  captcha: number;
  successRate: string;
  byProtection: Record<string, { tested: number; passed: number; rate: string }>;
  results: TestResult[];
  recommendations: string[];
}

async function testSite(url: string, expectedProtection: string): Promise<TestResult> {
  const startTime = Date.now();
  let browser;

  const result: TestResult = {
    url,
    protectionType: expectedProtection,
    detected: null,
    success: false,
    blocked: false,
    captcha: false,
    statusCode: null,
    loadTime: 0,
    error: null,
    timestamp: new Date().toISOString(),
  };

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const page = await browser.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate with timeout
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    result.statusCode = response?.status() || null;
    result.loadTime = Date.now() - startTime;

    // Get page content for analysis
    const content = await page.content();
    const pageUrl = page.url();

    // Detect protection from content
    result.detected = detectProtectionFromContent(content, pageUrl);

    // Check for blocks
    result.blocked =
      content.includes('Access Denied') ||
      content.includes('blocked') ||
      content.includes('Error 1020') ||
      content.includes('403 Forbidden') ||
      content.includes('Sorry, you have been blocked') ||
      content.includes('Please verify you are a human') ||
      result.statusCode === 403 ||
      result.statusCode === 503;

    // Check for CAPTCHA
    result.captcha =
      content.includes('captcha') ||
      content.includes('CAPTCHA') ||
      content.includes('challenge-form') ||
      content.includes('cf-turnstile') ||
      content.includes('hcaptcha') ||
      content.includes('recaptcha') ||
      content.includes('g-recaptcha');

    // Success = loaded without block or captcha
    result.success =
      result.statusCode === 200 &&
      !result.blocked &&
      !result.captcha;

    await browser.close();
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    result.loadTime = Date.now() - startTime;
    if (browser) await browser.close();
  }

  return result;
}

async function runTests(): Promise<TestSummary> {
  console.log('='.repeat(70));
  console.log('MERLIN PROTECTION BYPASS TEST SUITE');
  console.log('='.repeat(70));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('');

  const allResults: TestResult[] = [];
  const byProtection: Record<string, { tested: number; passed: number; rate: string }> = {};

  console.log('Testing WITHOUT proxies (baseline test)');
  console.log('');

  // Test each protection type
  for (const [protection, sites] of Object.entries(TEST_SITES)) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Testing ${protection.toUpperCase()} protected sites (${sites.length})`);
    console.log('─'.repeat(50));

    byProtection[protection] = { tested: 0, passed: 0, rate: '0%' };

    for (const site of sites) {
      process.stdout.write(`  ${site.padEnd(40)}`);

      const result = await testSite(site, protection);
      allResults.push(result);
      byProtection[protection].tested++;

      if (result.success) {
        byProtection[protection].passed++;
        console.log(`✅ PASS (${result.loadTime}ms)`);
      } else if (result.captcha) {
        console.log(`⚠️  CAPTCHA (${result.detected || 'unknown'})`);
      } else if (result.blocked) {
        console.log(`❌ BLOCKED (${result.statusCode})`);
      } else {
        console.log(`❌ FAIL: ${result.error?.slice(0, 30) || 'Unknown'}`);
      }

      // Rate limiting - wait between requests
      await new Promise(r => setTimeout(r, 2000));
    }

    // Calculate rate for this protection
    const rate = (byProtection[protection].passed / byProtection[protection].tested * 100).toFixed(1);
    byProtection[protection].rate = `${rate}%`;
    console.log(`\n  ${protection} Success Rate: ${rate}%`);
  }

  // Calculate totals
  const totalTests = allResults.length;
  const passed = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success && !r.blocked && !r.captcha).length;
  const blocked = allResults.filter(r => r.blocked).length;
  const captcha = allResults.filter(r => r.captcha).length;
  const successRate = ((passed / totalTests) * 100).toFixed(1);

  // Generate recommendations
  const recommendations: string[] = [];

  if (passed / totalTests < 0.5) {
    recommendations.push('CRITICAL: Success rate below 50%. Need residential proxies.');
  }

  for (const [protection, stats] of Object.entries(byProtection)) {
    const rate = stats.passed / stats.tested;
    if (rate < 0.3) {
      recommendations.push(`${protection}: Only ${stats.rate} success. Improve ${protection} bypass logic.`);
    }
  }

  if (captcha > totalTests * 0.3) {
    recommendations.push('High CAPTCHA rate. Integrate CAPTCHA solving service with API keys.');
  }

  if (blocked > totalTests * 0.2) {
    recommendations.push('High block rate. Improve TLS fingerprinting and behavioral simulation.');
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests:   ${totalTests}`);
  console.log(`Passed:        ${passed} (${successRate}%)`);
  console.log(`Blocked:       ${blocked}`);
  console.log(`CAPTCHA:       ${captcha}`);
  console.log(`Failed:        ${failed}`);
  console.log('');
  console.log('By Protection Type:');
  for (const [protection, stats] of Object.entries(byProtection)) {
    console.log(`  ${protection.padEnd(15)} ${stats.passed}/${stats.tested} (${stats.rate})`);
  }
  console.log('');
  console.log('Recommendations:');
  for (const rec of recommendations) {
    console.log(`  • ${rec}`);
  }

  // Create summary object
  const summary: TestSummary = {
    date: new Date().toISOString(),
    totalTests,
    passed,
    failed,
    blocked,
    captcha,
    successRate: `${successRate}%`,
    byProtection,
    results: allResults,
    recommendations,
  };

  // Save results to file
  const resultsPath = `./test-results-protection-${Date.now()}.json`;
  await fs.writeFile(resultsPath, JSON.stringify(summary, null, 2));
  console.log(`\nResults saved to: ${resultsPath}`);

  return summary;
}

// Run if called directly
runTests()
  .then(summary => {
    console.log('\n✅ Test suite completed');
    process.exit(summary.passed / summary.totalTests >= 0.5 ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  });
