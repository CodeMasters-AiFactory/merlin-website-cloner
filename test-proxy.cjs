/**
 * DataImpulse Proxy Test
 * Tests residential proxy connection with protected sites
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// DataImpulse Credentials
const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

const testSites = [
  { url: 'https://httpbin.org/ip', name: 'IP Check', protection: 'none' },
  { url: 'https://bot.sannysoft.com/', name: 'Bot Detection', protection: 'fingerprint' },
  { url: 'https://www.cloudflare.com/', name: 'Cloudflare', protection: 'cloudflare' },
  { url: 'https://www.nike.com/', name: 'Nike (Akamai)', protection: 'akamai' },
  { url: 'https://www.g2.com/', name: 'G2 (DataDome)', protection: 'datadome' },
  { url: 'https://www.zillow.com/', name: 'Zillow (PerimeterX)', protection: 'perimeterx' },
];

async function testProxy() {
  console.log('='.repeat(70));
  console.log('MERLIN RESIDENTIAL PROXY TEST');
  console.log('Provider: DataImpulse');
  console.log('Proxy: ' + PROXY.host + ':' + PROXY.port);
  console.log('='.repeat(70));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  let passed = 0;
  let failed = 0;
  let captcha = 0;

  for (const site of testSites) {
    try {
      const page = await browser.newPage();

      // Authenticate with proxy
      await page.authenticate({
        username: PROXY.username,
        password: PROXY.password
      });

      // Set realistic headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      const start = Date.now();
      const response = await page.goto(site.url, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });
      const time = Date.now() - start;
      const status = response ? response.status() : 0;

      const content = await page.content();
      const lowerContent = content.toLowerCase();

      // Check results
      const isBlocked = lowerContent.includes('blocked') ||
                        lowerContent.includes('access denied') ||
                        lowerContent.includes('error 1020') ||
                        status === 403 || status === 503;

      const hasCaptcha = lowerContent.includes('captcha') ||
                         lowerContent.includes('challenge-form') ||
                         lowerContent.includes('cf-turnstile') ||
                         lowerContent.includes('hcaptcha') ||
                         lowerContent.includes('please verify');

      // For IP check, show the IP
      if (site.name === 'IP Check') {
        const ipMatch = content.match(/"origin":\s*"([^"]+)"/);
        if (ipMatch) {
          console.log('YOUR PROXY IP: ' + ipMatch[1]);
          console.log('');
        }
      }

      // Determine result
      let resultStr;
      if (status === 200 && !isBlocked && !hasCaptcha) {
        resultStr = '✅ PASS';
        passed++;
      } else if (hasCaptcha) {
        resultStr = '⚠️  CAPTCHA';
        captcha++;
      } else if (isBlocked) {
        resultStr = '❌ BLOCKED';
        failed++;
      } else {
        resultStr = '❌ FAIL';
        failed++;
      }

      console.log(resultStr + ': ' + site.name.padEnd(25) + ' [' + site.protection.padEnd(12) + '] ' + time + 'ms (HTTP ' + status + ')');

      await page.close();
    } catch (e) {
      console.log('❌ ERROR: ' + site.name.padEnd(25) + ' - ' + e.message.slice(0, 50));
      failed++;
    }

    // Small delay between tests
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Summary
  const total = testSites.length;
  const successRate = ((passed / total) * 100).toFixed(0);

  console.log('');
  console.log('='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));
  console.log('Total:    ' + total);
  console.log('Passed:   ' + passed + ' (' + successRate + '%)');
  console.log('CAPTCHA:  ' + captcha);
  console.log('Failed:   ' + failed);
  console.log('');

  if (passed >= total * 0.7) {
    console.log('🎉 EXCELLENT! Residential proxy is working great!');
  } else if (passed >= total * 0.5) {
    console.log('✅ GOOD! Proxy working. Add CAPTCHA solver for remaining sites.');
  } else {
    console.log('⚠️  Check proxy credentials or try different country.');
  }

  console.log('');
  console.log('Traffic used: ~' + (total * 2) + ' MB estimated');
  console.log('='.repeat(70));
}

testProxy().catch(console.error);
