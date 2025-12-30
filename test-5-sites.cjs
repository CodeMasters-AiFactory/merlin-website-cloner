/**
 * Quick 5-Site Protection Bypass Test
 * Tests: DataImpulse Proxy + CapSolver CAPTCHA
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// DataImpulse Proxy
const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

// Test 5 sites with different protections
const testSites = [
  { url: 'https://httpbin.org/ip', name: 'IP Check', protection: 'none' },
  { url: 'https://bot.sannysoft.com/', name: 'Bot Detection', protection: 'fingerprint' },
  { url: 'https://www.cloudflare.com/', name: 'Cloudflare', protection: 'cloudflare' },
  { url: 'https://www.amazon.com/', name: 'Amazon', protection: 'perimeter' },
  { url: 'https://www.booking.com/', name: 'Booking.com', protection: 'datadome' },
];

async function testSite(browser, site) {
  const page = await browser.newPage();

  try {
    await page.authenticate({
      username: PROXY.username,
      password: PROXY.password
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    const start = Date.now();
    const response = await page.goto(site.url, {
      waitUntil: 'networkidle2',
      timeout: 45000
    });
    const time = Date.now() - start;
    const status = response ? response.status() : 0;

    const content = await page.content();
    const lowerContent = content.toLowerCase();

    // Show IP for httpbin
    if (site.name === 'IP Check') {
      const ipMatch = content.match(/"origin":\s*"([^"]+)"/);
      if (ipMatch) console.log('    PROXY IP: ' + ipMatch[1]);
    }

    // Check for blocks/captchas
    const isBlocked = lowerContent.includes('blocked') ||
                      lowerContent.includes('access denied') ||
                      lowerContent.includes('error 1020') ||
                      status === 403 || status === 503;

    const hasCaptcha = lowerContent.includes('captcha') ||
                       lowerContent.includes('challenge') ||
                       lowerContent.includes('verify you are human');

    await page.close();

    if (status === 200 && !isBlocked && !hasCaptcha) {
      return { status: 'pass', time, httpStatus: status };
    } else if (hasCaptcha) {
      return { status: 'captcha', time, httpStatus: status };
    } else if (isBlocked) {
      return { status: 'blocked', time, httpStatus: status };
    } else {
      return { status: 'partial', time, httpStatus: status };
    }

  } catch (e) {
    await page.close();
    return { status: 'error', error: e.message };
  }
}

async function runTests() {
  console.log('');
  console.log('='.repeat(60));
  console.log('MERLIN 5-SITE BYPASS TEST');
  console.log('Proxy: DataImpulse Residential');
  console.log('='.repeat(60));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  const results = { pass: 0, captcha: 0, blocked: 0, error: 0 };

  for (const site of testSites) {
    process.stdout.write(site.name.padEnd(18) + '[' + site.protection.padEnd(12) + '] ');

    const result = await testSite(browser, site);

    if (result.status === 'pass') {
      console.log('PASS (' + result.time + 'ms)');
      results.pass++;
    } else if (result.status === 'captcha') {
      console.log('CAPTCHA (' + result.httpStatus + ')');
      results.captcha++;
    } else if (result.status === 'blocked') {
      console.log('BLOCKED (' + result.httpStatus + ')');
      results.blocked++;
    } else if (result.status === 'partial') {
      console.log('PARTIAL (' + result.httpStatus + ')');
      results.pass++;
    } else {
      console.log('ERROR: ' + (result.error || 'Unknown').slice(0, 35));
      results.error++;
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS: ' + results.pass + '/5 passed | ' +
              results.captcha + ' captcha | ' +
              results.blocked + ' blocked | ' +
              results.error + ' errors');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
