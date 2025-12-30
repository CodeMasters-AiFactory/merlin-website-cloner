/**
 * Success Rate Test - Calculate real bypass percentage
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

require('dotenv').config();
require('dotenv').config({ path: '.env.services' });

const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

// 10 sites across difficulty levels
const testSites = [
  // EASY (3)
  { url: 'https://example.com/', name: 'Example', tier: 'EASY' },
  { url: 'https://wikipedia.org/', name: 'Wikipedia', tier: 'EASY' },
  { url: 'https://github.com/', name: 'GitHub', tier: 'EASY' },

  // MEDIUM (4)
  { url: 'https://react.dev/', name: 'React', tier: 'MEDIUM' },
  { url: 'https://nextjs.org/', name: 'Next.js', tier: 'MEDIUM' },
  { url: 'https://tailwindcss.com/', name: 'Tailwind', tier: 'MEDIUM' },
  { url: 'https://vercel.com/', name: 'Vercel', tier: 'MEDIUM' },

  // HARD (3)
  { url: 'https://www.nike.com/', name: 'Nike', tier: 'HARD' },
  { url: 'https://www.amazon.com/', name: 'Amazon', tier: 'HARD' },
  { url: 'https://www.instagram.com/', name: 'Instagram', tier: 'HARD' },
];

async function testSite(browser, site) {
  const page = await browser.newPage();

  try {
    await page.authenticate({ username: PROXY.username, password: PROXY.password });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const response = await page.goto(site.url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    await new Promise(r => setTimeout(r, 2000));

    const status = response?.status() || 0;
    const content = await page.content();
    const size = content.length;

    await page.close();

    // Success criteria: HTTP 200 + substantial content
    const success = status === 200 && size > 5000;
    return { success, status, size };

  } catch (e) {
    await page.close();
    return { success: false, error: e.message.slice(0, 30) };
  }
}

async function run() {
  console.log('');
  console.log('='.repeat(55));
  console.log('MERLIN SUCCESS RATE TEST - 10 SITES');
  console.log('='.repeat(55));
  console.log('');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  const results = { EASY: [], MEDIUM: [], HARD: [] };
  let total = 0, passed = 0;

  for (const site of testSites) {
    process.stdout.write(`${site.name.padEnd(12)} [${site.tier.padEnd(6)}] `);

    const result = await testSite(browser, site);
    total++;

    if (result.success) {
      passed++;
      results[site.tier].push(true);
      console.log(`✅ ${result.status} (${(result.size/1024).toFixed(0)}KB)`);
    } else {
      results[site.tier].push(false);
      console.log(`❌ ${result.error || result.status}`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  // Calculate percentages
  const easyRate = (results.EASY.filter(x => x).length / results.EASY.length * 100).toFixed(0);
  const medRate = (results.MEDIUM.filter(x => x).length / results.MEDIUM.length * 100).toFixed(0);
  const hardRate = (results.HARD.filter(x => x).length / results.HARD.length * 100).toFixed(0);
  const totalRate = (passed / total * 100).toFixed(0);

  console.log('');
  console.log('='.repeat(55));
  console.log('SUCCESS RATES');
  console.log('='.repeat(55));
  console.log(`EASY:    ${easyRate}% (${results.EASY.filter(x=>x).length}/${results.EASY.length})`);
  console.log(`MEDIUM:  ${medRate}% (${results.MEDIUM.filter(x=>x).length}/${results.MEDIUM.length})`);
  console.log(`HARD:    ${hardRate}% (${results.HARD.filter(x=>x).length}/${results.HARD.length})`);
  console.log('');
  console.log(`OVERALL: ${totalRate}% (${passed}/${total})`);
  console.log('='.repeat(55));
}

run().catch(console.error);
