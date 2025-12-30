/**
 * Nike Clone Test - Heavy Protection (Akamai Bot Manager)
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

require('dotenv').config();
require('dotenv').config({ path: '.env.services' });

const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;
const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

const outputDir = path.join(__dirname, 'test-clones', 'nike');

async function solveAkamai(page) {
  // Akamai uses sensor data collection - we need to let it run
  console.log('  Waiting for Akamai sensor collection...');
  await new Promise(r => setTimeout(r, 5000));

  // Check for any CAPTCHA
  const content = await page.content();
  const lower = content.toLowerCase();

  if (lower.includes('captcha') || lower.includes('challenge')) {
    console.log('  CAPTCHA detected, checking type...');

    // Check for reCAPTCHA
    const siteKey = await page.evaluate(() => {
      const el = document.querySelector('[data-sitekey], .g-recaptcha');
      return el?.getAttribute('data-sitekey') || null;
    });

    if (siteKey && CAPSOLVER_API_KEY) {
      console.log('  Solving reCAPTCHA with CapSolver...');

      const createRes = await fetch('https://api.capsolver.com/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: CAPSOLVER_API_KEY,
          task: {
            type: 'ReCaptchaV2TaskProxyLess',
            websiteURL: page.url(),
            websiteKey: siteKey
          }
        })
      });

      const createData = await createRes.json();
      if (createData.errorId === 0) {
        console.log('  Task created, waiting for solution...');

        for (let i = 0; i < 40; i++) {
          await new Promise(r => setTimeout(r, 3000));
          process.stdout.write('.');

          const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientKey: CAPSOLVER_API_KEY, taskId: createData.taskId })
          });

          const resultData = await resultRes.json();
          if (resultData.status === 'ready') {
            console.log('\n  CAPTCHA SOLVED!');

            await page.evaluate((token) => {
              const textarea = document.querySelector('[name="g-recaptcha-response"]');
              if (textarea) textarea.value = token;

              // Try callback
              if (window.grecaptcha?.callback) {
                window.grecaptcha.callback(token);
              }
            }, resultData.solution.gRecaptchaResponse);

            await new Promise(r => setTimeout(r, 2000));
            return true;
          }
          if (resultData.status === 'failed') {
            console.log('\n  Solve failed');
            return false;
          }
        }
      }
    }
  }

  return true;
}

async function cloneNike() {
  console.log('');
  console.log('='.repeat(60));
  console.log('NIKE CLONE TEST');
  console.log('Protection: Akamai Bot Manager (EXTREME)');
  console.log('='.repeat(60));
  console.log('');

  // Check balance
  const balRes = await fetch('https://api.capsolver.com/getBalance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientKey: CAPSOLVER_API_KEY })
  });
  const balData = await balRes.json();
  console.log('CapSolver Balance: $' + (balData.balance || 0).toFixed(2));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  try {
    const page = await browser.newPage();

    // Setup stealth
    await page.authenticate({ username: PROXY.username, password: PROXY.password });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    console.log('Loading https://www.nike.com/...');
    const start = Date.now();

    const response = await page.goto('https://www.nike.com/', {
      waitUntil: 'networkidle2',
      timeout: 90000
    });

    const loadTime = Date.now() - start;
    const status = response?.status() || 0;

    console.log(`  Initial load: HTTP ${status} in ${loadTime}ms`);

    // Handle Akamai protection
    await solveAkamai(page);

    // Wait for page to fully render
    console.log('  Waiting for full render...');
    await new Promise(r => setTimeout(r, 5000));

    // Get final content
    const content = await page.content();
    const title = await page.title();

    // Check if we got real content
    const hasProducts = content.includes('product') || content.includes('shoe') || content.includes('Nike');
    const hasNav = content.includes('nav') || content.includes('menu');
    const contentSize = content.length;

    // Save
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), content);
    await page.screenshot({ path: path.join(outputDir, 'screenshot.png'), fullPage: false });

    // Count elements
    const stats = await page.evaluate(() => ({
      links: document.querySelectorAll('a').length,
      images: document.querySelectorAll('img').length,
      scripts: document.querySelectorAll('script').length,
      divs: document.querySelectorAll('div').length,
    }));

    await browser.close();

    console.log('');
    console.log('='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));
    console.log(`Status:     HTTP ${status}`);
    console.log(`Title:      ${title}`);
    console.log(`Size:       ${(contentSize/1024).toFixed(1)} KB`);
    console.log(`Links:      ${stats.links}`);
    console.log(`Images:     ${stats.images}`);
    console.log(`Scripts:    ${stats.scripts}`);
    console.log(`DIVs:       ${stats.divs}`);
    console.log(`Has Nav:    ${hasNav ? 'YES' : 'NO'}`);
    console.log(`Has Content:${hasProducts ? 'YES' : 'NO'}`);
    console.log(`Saved:      ${outputDir}`);
    console.log('');

    if (status === 200 && contentSize > 50000 && hasProducts) {
      console.log('🎉 SUCCESS! Nike cloned with full content!');
    } else if (status === 200 && contentSize > 10000) {
      console.log('✅ PARTIAL - Page loaded but may be missing dynamic content');
    } else {
      console.log('⚠️ Check screenshot - may have been blocked or challenged');
    }
    console.log('='.repeat(60));

  } catch (e) {
    console.log('ERROR:', e.message);
    await browser.close();
  }
}

cloneNike().catch(console.error);
