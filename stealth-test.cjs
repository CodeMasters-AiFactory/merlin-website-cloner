const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin with all evasions
puppeteer.use(StealthPlugin());

const sites = [
  { url: 'https://bot.sannysoft.com/', name: 'Bot Detection Test', protection: 'fingerprint' },
  { url: 'https://arh.antoinevastel.com/bots/areyouheadless', name: 'Headless Test', protection: 'headless' },
  { url: 'https://httpbin.org/headers', name: 'Headers Check', protection: 'none' },
  { url: 'https://www.cloudflare.com/', name: 'Cloudflare', protection: 'cloudflare' },
  { url: 'https://nowsecure.nl/', name: 'NowSecure (CF)', protection: 'cloudflare' },
  { url: 'https://www.nike.com/', name: 'Nike (Akamai)', protection: 'akamai' },
  { url: 'https://www.g2.com/', name: 'G2 (DataDome)', protection: 'datadome' },
  { url: 'https://www.zillow.com/', name: 'Zillow (PX)', protection: 'perimeterx' },
  { url: 'https://www.reddit.com/', name: 'Reddit', protection: 'datadome' },
  { url: 'https://www.amazon.com/', name: 'Amazon', protection: 'custom' },
];

async function test() {
  console.log('='.repeat(70));
  console.log('MERLIN STEALTH PROTECTION TEST');
  console.log('Using: puppeteer-extra-plugin-stealth');
  console.log('='.repeat(70));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  });

  const results = {
    passed: 0,
    blocked: 0,
    captcha: 0,
    error: 0,
    byProtection: {}
  };

  for (const site of sites) {
    // Track by protection type
    if (!results.byProtection[site.protection]) {
      results.byProtection[site.protection] = { tested: 0, passed: 0 };
    }
    results.byProtection[site.protection].tested++;

    try {
      const page = await browser.newPage();

      // Set realistic browser properties
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // Override navigator properties
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });

      const start = Date.now();
      const response = await page.goto(site.url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      const time = Date.now() - start;
      const status = response ? response.status() : 0;

      const content = await page.content();
      const lowerContent = content.toLowerCase();

      // Detailed detection
      const isBlocked = lowerContent.includes('blocked') ||
                        lowerContent.includes('access denied') ||
                        lowerContent.includes('error 1020') ||
                        lowerContent.includes('sorry, you have been blocked') ||
                        status === 403 || status === 503;

      const hasCaptcha = lowerContent.includes('captcha') ||
                         lowerContent.includes('challenge-form') ||
                         lowerContent.includes('cf-turnstile') ||
                         lowerContent.includes('hcaptcha') ||
                         lowerContent.includes('recaptcha') ||
                         lowerContent.includes('please verify');

      // Check bot detection page results
      let botDetected = false;
      if (site.name === 'Bot Detection Test') {
        botDetected = content.includes('FAILED') || content.includes('missing') || content.includes('inconsistent');
      }
      if (site.name === 'Headless Test') {
        botDetected = content.includes('You are Chrome headless') || content.includes('HeadlessChrome');
      }

      // Determine result
      let resultStr;
      if (status === 200 && !isBlocked && !hasCaptcha && !botDetected) {
        resultStr = '✅ PASS';
        results.passed++;
        results.byProtection[site.protection].passed++;
      } else if (hasCaptcha) {
        resultStr = '⚠️  CAPTCHA';
        results.captcha++;
      } else if (isBlocked || botDetected) {
        resultStr = '❌ BLOCKED';
        results.blocked++;
      } else {
        resultStr = '❌ FAIL';
        results.error++;
      }

      console.log(resultStr + ': ' + site.name.padEnd(25) + ' [' + site.protection.padEnd(12) + '] ' + time + 'ms');

      await page.close();
    } catch (e) {
      console.log('❌ ERROR: ' + site.name.padEnd(25) + ' - ' + e.message.slice(0,40));
      results.error++;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log('Total Tests:  ' + sites.length);
  console.log('Passed:       ' + results.passed + ' (' + ((results.passed / sites.length) * 100).toFixed(0) + '%)');
  console.log('CAPTCHA:      ' + results.captcha);
  console.log('Blocked:      ' + results.blocked);
  console.log('Errors:       ' + results.error);
  console.log('');
  console.log('By Protection Type:');
  for (const [prot, stats] of Object.entries(results.byProtection)) {
    const rate = ((stats.passed / stats.tested) * 100).toFixed(0);
    console.log('  ' + prot.padEnd(15) + ': ' + stats.passed + '/' + stats.tested + ' (' + rate + '%)');
  }
  console.log('='.repeat(70));

  // Recommendations
  console.log('');
  console.log('ANALYSIS:');
  if (results.passed >= sites.length * 0.7) {
    console.log('🎉 Good stealth! Passing 70%+ of tests.');
  } else if (results.passed >= sites.length * 0.5) {
    console.log('⚠️  Moderate stealth. Need proxies for full bypass.');
  } else {
    console.log('❌ Poor bypass rate. REQUIRE residential proxies.');
  }

  if (results.captcha > 2) {
    console.log('💡 High CAPTCHA rate - integrate 2Captcha/CapSolver with API keys.');
  }
}

test().catch(console.error);
