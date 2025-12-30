/**
 * Real Clone Test - 3 Random Sites
 * Tests actual cloning with proxy + CAPTCHA solving
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// Load environment
require('dotenv').config();
require('dotenv').config({ path: '.env.services' });

const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;
const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

// 3 Random sites - mix of protection levels
const testSites = [
  { url: 'https://stripe.com/', name: 'Stripe', expected: 'fintech' },
  { url: 'https://www.notion.so/', name: 'Notion', expected: 'productivity' },
  { url: 'https://tailwindcss.com/', name: 'Tailwind CSS', expected: 'docs' },
];

async function solveTurnstile(page, apiKey) {
  const siteKey = await page.evaluate(() => {
    const el = document.querySelector('[data-sitekey], .cf-turnstile');
    return el?.getAttribute('data-sitekey') || null;
  });

  if (!siteKey || siteKey.startsWith('1x') || siteKey.startsWith('2x') || siteKey.startsWith('3x')) {
    return null; // Test key or not found
  }

  console.log('    Solving Turnstile with CapSolver...');

  const createRes = await fetch('https://api.capsolver.com/createTask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientKey: apiKey,
      task: {
        type: 'AntiTurnstileTaskProxyLess',
        websiteURL: page.url(),
        websiteKey: siteKey
      }
    })
  });

  const createData = await createRes.json();
  if (createData.errorId !== 0) {
    console.log('    CapSolver error:', createData.errorCode);
    return null;
  }

  // Poll for result
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientKey: apiKey, taskId: createData.taskId })
    });

    const resultData = await resultRes.json();
    if (resultData.status === 'ready') {
      return resultData.solution.token;
    }
    if (resultData.status === 'failed') {
      return null;
    }
    process.stdout.write('.');
  }
  return null;
}

async function cloneSite(browser, site) {
  const page = await browser.newPage();
  const outputDir = path.join(__dirname, 'test-clones', site.name.toLowerCase().replace(/\s+/g, '-'));

  try {
    // Setup
    await page.authenticate({ username: PROXY.username, password: PROXY.password });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`  Loading ${site.url}...`);
    const start = Date.now();

    const response = await page.goto(site.url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    const loadTime = Date.now() - start;
    const status = response?.status() || 0;
    let content = await page.content();
    const lower = content.toLowerCase();

    // Check for challenges
    const hasTurnstile = lower.includes('cf-turnstile') || lower.includes('checking your browser');
    const hasChallenge = lower.includes('challenge') && lower.includes('captcha');

    if (hasTurnstile && CAPSOLVER_API_KEY) {
      console.log('  Challenge detected, attempting solve...');
      const token = await solveTurnstile(page, CAPSOLVER_API_KEY);
      if (token) {
        await page.evaluate((t) => {
          const input = document.querySelector('[name="cf-turnstile-response"]');
          if (input) input.value = t;
        }, token);
        await page.waitForNavigation({ timeout: 15000 }).catch(() => {});
        content = await page.content();
      }
    }

    // Save clone
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), content);

    // Get page info
    const title = await page.title();
    const links = await page.evaluate(() => document.querySelectorAll('a').length);
    const images = await page.evaluate(() => document.querySelectorAll('img').length);
    const scripts = await page.evaluate(() => document.querySelectorAll('script').length);

    // Take screenshot
    await page.screenshot({ path: path.join(outputDir, 'screenshot.png'), fullPage: false });

    await page.close();

    return {
      success: status === 200,
      status,
      loadTime,
      title,
      contentSize: content.length,
      links,
      images,
      scripts,
      outputDir,
      challenged: hasTurnstile || hasChallenge
    };

  } catch (e) {
    await page.close();
    return { success: false, error: e.message };
  }
}

async function run() {
  console.log('');
  console.log('='.repeat(65));
  console.log('MERLIN REAL CLONE TEST - 3 RANDOM SITES');
  console.log('Proxy: DataImpulse | CAPTCHA: CapSolver');
  console.log('='.repeat(65));
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
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  const results = [];

  for (const site of testSites) {
    console.log(`[${site.name}]`);
    const result = await cloneSite(browser, site);
    results.push({ site: site.name, ...result });

    if (result.success) {
      console.log(`  ✅ SUCCESS`);
      console.log(`     HTTP: ${result.status} | Load: ${result.loadTime}ms | Size: ${(result.contentSize/1024).toFixed(1)}KB`);
      console.log(`     Title: ${result.title?.slice(0, 50)}`);
      console.log(`     Elements: ${result.links} links, ${result.images} images, ${result.scripts} scripts`);
      console.log(`     Saved: ${result.outputDir}`);
    } else {
      console.log(`  ❌ FAILED: ${result.error || 'HTTP ' + result.status}`);
    }
    console.log('');

    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // Summary
  const passed = results.filter(r => r.success).length;
  console.log('='.repeat(65));
  console.log(`RESULTS: ${passed}/${testSites.length} sites cloned successfully`);
  console.log('='.repeat(65));

  if (passed === testSites.length) {
    console.log('🎉 ALL SITES CLONED! Proxy + CAPTCHA integration working!');
  } else if (passed > 0) {
    console.log('✅ Partial success. Check failed sites for specific issues.');
  } else {
    console.log('⚠️ All failed. Check proxy connection and credentials.');
  }
}

run().catch(console.error);
