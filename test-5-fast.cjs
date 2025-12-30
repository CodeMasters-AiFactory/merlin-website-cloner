/**
 * Fast 5-Site Test - Simpler sites that load quickly
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PROXY = {
  host: 'gw.dataimpulse.com',
  port: 823,
  username: '1f88c0d191acb71aec1f',
  password: 'c265a541f1a13012'
};

const testSites = [
  { url: 'https://httpbin.org/ip', name: 'IP Check' },
  { url: 'https://bot.sannysoft.com/', name: 'Bot Test' },
  { url: 'https://example.com/', name: 'Example.com' },
  { url: 'https://www.wikipedia.org/', name: 'Wikipedia' },
  { url: 'https://www.github.com/', name: 'GitHub' },
];

async function test() {
  console.log('\n' + '='.repeat(50));
  console.log('MERLIN FAST 5-SITE TEST');
  console.log('='.repeat(50) + '\n');

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
    const page = await browser.newPage();
    try {
      await page.authenticate({ username: PROXY.username, password: PROXY.password });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const start = Date.now();
      const resp = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const time = Date.now() - start;
      const status = resp?.status() || 0;

      const content = await page.content();

      if (site.name === 'IP Check') {
        const ip = content.match(/"origin":\s*"([^"]+)"/);
        if (ip) console.log('  PROXY IP: ' + ip[1]);
      }

      if (status >= 200 && status < 400) {
        console.log('PASS: ' + site.name.padEnd(15) + ' (' + time + 'ms, HTTP ' + status + ')');
        passed++;
      } else {
        console.log('FAIL: ' + site.name.padEnd(15) + ' (HTTP ' + status + ')');
      }
    } catch (e) {
      console.log('ERR:  ' + site.name.padEnd(15) + ' - ' + e.message.slice(0, 30));
    }
    await page.close();
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  console.log('\n' + '='.repeat(50));
  console.log('RESULT: ' + passed + '/5 sites passed');
  console.log('='.repeat(50) + '\n');
}

test().catch(console.error);
