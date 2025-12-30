/**
 * Proxy Stealth Test
 * Tests the enhanced proxy system against protected sites
 *
 * Usage: npx ts-node src/test/proxy-stealth-test.ts
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { enhancedProxyNetwork } from '../services/proxyNetworkEnhanced.js';
import {
  getRandomFingerprint,
  getChromeFingerprint,
  getRequestHeaders,
  getFingerprintForSite,
} from '../services/tlsFingerprints.js';
import { lookupIP } from '../services/ipGeolocation.js';

// Add stealth plugin
puppeteer.use(StealthPlugin());

interface TestResult {
  url: string;
  protection: string;
  success: boolean;
  statusCode?: number;
  blocked?: boolean;
  captcha?: boolean;
  error?: string;
  latencyMs: number;
  proxyUsed?: string;
  fingerprintUsed?: string;
}

// Test sites with various protections
const TEST_SITES = [
  { url: 'https://httpbin.org/ip', protection: 'none', description: 'Basic IP check' },
  { url: 'https://httpbin.org/headers', protection: 'none', description: 'Header inspection' },
  { url: 'https://bot.sannysoft.com/', protection: 'fingerprint-test', description: 'Bot detection test' },
  { url: 'https://arh.antoinevastel.com/bots/areyouheadless', protection: 'headless-test', description: 'Headless detection' },
  { url: 'https://nowsecure.nl/', protection: 'cloudflare', description: 'Cloudflare protected' },
  { url: 'https://www.cloudflare.com/', protection: 'cloudflare', description: 'Cloudflare main site' },
  { url: 'https://www.g2.com/', protection: 'datadome', description: 'DataDome protected' },
  { url: 'https://www.nike.com/', protection: 'akamai', description: 'Akamai protected' },
];

async function testSiteWithStealth(
  url: string,
  protection: string,
  useProxy: boolean = false
): Promise<TestResult> {
  const startTime = Date.now();
  const fingerprint = getFingerprintForSite(new URL(url).hostname);

  let browser;
  let proxyUsed: string | undefined;

  try {
    // Get proxy if enabled
    let proxyConfig: { server: string } | undefined;
    if (useProxy) {
      const proxy = await enhancedProxyNetwork.getProxy({
        preferResidential: true,
        minSuccessRate: 0.8,
      });
      if (proxy) {
        proxyConfig = { server: `http://${proxy.host}:${proxy.port}` };
        proxyUsed = `${proxy.host}:${proxy.port} (${proxy.countryCode}, ASN: ${proxy.asn || 'unknown'})`;
      }
    }

    // Launch browser with stealth
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.CHROME_PATH || 'C:\\Users\\DEV1\\.cache\\puppeteer\\chrome\\win64-121.0.6167.85\\chrome-win64\\chrome.exe',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        ...(proxyConfig ? [`--proxy-server=${proxyConfig.server}`] : []),
      ],
    });

    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent and headers
    await page.setUserAgent(fingerprint.userAgent);
    await page.setExtraHTTPHeaders(getRequestHeaders(fingerprint, url));

    // Override navigator properties
    await page.evaluateOnNewDocument((fp) => {
      // Override webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin' },
          { name: 'Chrome PDF Viewer' },
          { name: 'Native Client' },
        ],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override platform if needed
      if (fp.secChUaPlatform) {
        const platform = fp.secChUaPlatform.replace(/"/g, '');
        if (platform === 'Windows') {
          Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        } else if (platform === 'macOS') {
          Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });
        }
      }
    }, fingerprint);

    // Navigate with timeout
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    const statusCode = response?.status();
    const content = await page.content();

    // Check for blocks
    const blocked =
      content.includes('Access Denied') ||
      content.includes('blocked') ||
      content.includes('Error 1020') ||
      content.includes('403 Forbidden') ||
      content.includes('Sorry, you have been blocked');

    const captcha =
      content.includes('captcha') ||
      content.includes('CAPTCHA') ||
      content.includes('challenge-form') ||
      content.includes('cf-turnstile') ||
      content.includes('hcaptcha');

    const success = statusCode === 200 && !blocked && !captcha;

    await browser.close();

    return {
      url,
      protection,
      success,
      statusCode,
      blocked,
      captcha,
      latencyMs: Date.now() - startTime,
      proxyUsed,
      fingerprintUsed: fingerprint.id,
    };
  } catch (error) {
    if (browser) await browser.close();

    return {
      url,
      protection,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startTime,
      proxyUsed,
      fingerprintUsed: fingerprint.id,
    };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('PROXY STEALTH TEST');
  console.log('='.repeat(60));
  console.log('');

  // Initialize proxy network
  await enhancedProxyNetwork.initialize();
  const stats = enhancedProxyNetwork.getNetworkStats();
  console.log(`Proxy Network: ${stats.totalNodes} nodes, ${stats.onlineNodes} online`);
  console.log('');

  // Test fingerprint generation
  console.log('Testing fingerprint generation...');
  const chromeWin = getChromeFingerprint('windows');
  const chromeMac = getChromeFingerprint('mac');
  const chromeAndroid = getChromeFingerprint('android');
  console.log(`  Chrome Windows: ${chromeWin.id} (JA3: ${chromeWin.ja3Hash})`);
  console.log(`  Chrome macOS: ${chromeMac.id}`);
  console.log(`  Chrome Android: ${chromeAndroid.id}`);
  console.log('');

  // Test IP geolocation
  console.log('Testing IP geolocation...');
  const testIP = '8.8.8.8';
  const geoData = await lookupIP(testIP);
  if (geoData) {
    console.log(`  ${testIP}: ${geoData.country} (${geoData.countryCode}), ASN: ${geoData.asn} (${geoData.asnOrg})`);
  }
  console.log('');

  // Run site tests
  console.log('Testing protected sites...');
  console.log('-'.repeat(60));

  const results: TestResult[] = [];

  for (const site of TEST_SITES) {
    console.log(`\nTesting: ${site.description}`);
    console.log(`URL: ${site.url}`);
    console.log(`Protection: ${site.protection}`);

    // Test without proxy first
    const result = await testSiteWithStealth(site.url, site.protection, false);
    results.push(result);

    if (result.success) {
      console.log(`  ✅ SUCCESS (${result.latencyMs}ms, fingerprint: ${result.fingerprintUsed})`);
    } else if (result.captcha) {
      console.log(`  ⚠️  CAPTCHA required (${result.latencyMs}ms)`);
    } else if (result.blocked) {
      console.log(`  ❌ BLOCKED (status: ${result.statusCode}, ${result.latencyMs}ms)`);
    } else {
      console.log(`  ❌ FAILED: ${result.error || `Status ${result.statusCode}`} (${result.latencyMs}ms)`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const captchas = results.filter(r => r.captcha).length;
  const blocked = results.filter(r => r.blocked).length;
  const failed = results.filter(r => !r.success && !r.captcha && !r.blocked).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`⚠️  CAPTCHA: ${captchas}`);
  console.log(`❌ Blocked: ${blocked}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${((successful / results.length) * 100).toFixed(1)}%`);

  // Breakdown by protection type
  console.log('\nBy protection type:');
  const byProtection = results.reduce((acc, r) => {
    if (!acc[r.protection]) acc[r.protection] = { total: 0, success: 0 };
    acc[r.protection].total++;
    if (r.success) acc[r.protection].success++;
    return acc;
  }, {} as Record<string, { total: number; success: number }>);

  for (const [protection, data] of Object.entries(byProtection)) {
    const rate = ((data.success / data.total) * 100).toFixed(0);
    console.log(`  ${protection}: ${data.success}/${data.total} (${rate}%)`);
  }
}

// Run if called directly
runTests().catch(console.error);
