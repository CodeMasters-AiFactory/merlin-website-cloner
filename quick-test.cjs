const puppeteer = require('puppeteer');

const sites = [
  { url: 'https://httpbin.org/html', name: 'httpbin (no protection)' },
  { url: 'https://www.cloudflare.com/', name: 'cloudflare.com' },
  { url: 'https://www.nike.com/', name: 'nike.com (Akamai)' },
  { url: 'https://www.g2.com/', name: 'g2.com (DataDome)' },
  { url: 'https://www.zillow.com/', name: 'zillow.com (PerimeterX)' },
];

async function test() {
  console.log('='.repeat(60));
  console.log('MERLIN QUICK PROTECTION TEST');
  console.log('='.repeat(60));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let passed = 0;
  let failed = 0;

  for (const site of sites) {
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      const start = Date.now();
      const response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      const time = Date.now() - start;
      const status = response ? response.status() : 0;

      const content = await page.content();
      const lowerContent = content.toLowerCase();

      const blocked = lowerContent.includes('blocked') ||
                      lowerContent.includes('access denied') ||
                      lowerContent.includes('captcha') ||
                      lowerContent.includes('challenge-form') ||
                      lowerContent.includes('please verify') ||
                      lowerContent.includes('are you a robot');

      const hasCaptcha = lowerContent.includes('captcha') ||
                         lowerContent.includes('recaptcha') ||
                         lowerContent.includes('hcaptcha') ||
                         lowerContent.includes('turnstile');

      if (status === 200 && !blocked && !hasCaptcha) {
        console.log('✅ PASS: ' + site.name.padEnd(30) + ' (' + time + 'ms)');
        passed++;
      } else if (hasCaptcha) {
        console.log('⚠️  CAPTCHA: ' + site.name.padEnd(27) + ' (needs solving)');
        failed++;
      } else if (blocked) {
        console.log('❌ BLOCKED: ' + site.name.padEnd(27) + ' (status ' + status + ')');
        failed++;
      } else {
        console.log('❌ FAIL: ' + site.name.padEnd(30) + ' (status ' + status + ')');
        failed++;
      }

      await page.close();
    } catch (e) {
      console.log('❌ ERROR: ' + site.name.padEnd(30) + ' - ' + e.message.slice(0,40));
      failed++;
    }

    // Small delay between tests
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  console.log('');
  console.log('='.repeat(60));
  console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed');
  console.log('Success Rate: ' + ((passed / sites.length) * 100).toFixed(0) + '%');
  console.log('='.repeat(60));

  if (passed / sites.length < 0.5) {
    console.log('');
    console.log('⚠️  RECOMMENDATION: Success rate too low.');
    console.log('   Need residential proxies for better bypass rates.');
  }
}

test().catch(console.error);
