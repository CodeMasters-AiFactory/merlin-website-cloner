/**
 * Real Clone Test v2 - 3 Different Sites
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

require('dotenv').config();
require('dotenv').config({ path: '.env.services' });

const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

// 3 Different sites - simpler, faster
const testSites = [
  { url: 'https://react.dev/', name: 'React Docs' },
  { url: 'https://vuejs.org/', name: 'Vue.js' },
  { url: 'https://nextjs.org/', name: 'Next.js' },
];

async function cloneSite(browser, site) {
  const page = await browser.newPage();
  const outputDir = path.join(__dirname, 'test-clones', site.name.toLowerCase().replace(/\s+/g, '-'));

  try {
    await page.authenticate({ username: PROXY.username, password: PROXY.password });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`  Loading ${site.url}...`);
    const start = Date.now();

    const response = await page.goto(site.url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    // Wait a bit for JS rendering
    await new Promise(r => setTimeout(r, 3000));

    const loadTime = Date.now() - start;
    const status = response?.status() || 0;
    const content = await page.content();

    // Save
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'index.html'), content);
    await page.screenshot({ path: path.join(outputDir, 'screenshot.png') });

    const title = await page.title();
    const links = await page.evaluate(() => document.querySelectorAll('a').length);

    await page.close();

    return {
      success: status >= 200 && status < 400,
      status,
      loadTime,
      title,
      size: content.length,
      links,
      outputDir
    };

  } catch (e) {
    await page.close();
    return { success: false, error: e.message.slice(0, 50) };
  }
}

async function run() {
  console.log('');
  console.log('='.repeat(60));
  console.log('MERLIN CLONE TEST v2 - 3 SITES');
  console.log('='.repeat(60));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  let passed = 0;

  for (const site of testSites) {
    console.log(`[${site.name}]`);
    const r = await cloneSite(browser, site);

    if (r.success) {
      passed++;
      console.log(`  ✅ HTTP ${r.status} | ${r.loadTime}ms | ${(r.size/1024).toFixed(0)}KB | ${r.links} links`);
      console.log(`     Title: ${r.title?.slice(0, 45)}`);
    } else {
      console.log(`  ❌ ${r.error || 'HTTP ' + r.status}`);
    }
    console.log('');
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  console.log('='.repeat(60));
  console.log(`RESULT: ${passed}/3 cloned`);
  console.log('='.repeat(60));
}

run().catch(console.error);
