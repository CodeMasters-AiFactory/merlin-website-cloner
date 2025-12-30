/**
 * MERLIN TIERED PROTECTION TEST
 * 12 sites: 3 Extreme, 3 Difficult, 3 Standard, 3 Easy
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
  // EXTREME - Heaviest bot protection in industry
  { url: 'https://www.nike.com/', name: 'Nike', protection: 'Akamai Bot Manager', tier: 'EXTREME' },
  { url: 'https://www.linkedin.com/', name: 'LinkedIn', protection: 'Anti-Bot + CAPTCHA', tier: 'EXTREME' },
  { url: 'https://www.ticketmaster.com/', name: 'Ticketmaster', protection: 'PerimeterX/HUMAN', tier: 'EXTREME' },

  // DIFFICULT - Strong protection
  { url: 'https://www.g2.com/', name: 'G2', protection: 'DataDome', tier: 'DIFFICULT' },
  { url: 'https://www.zillow.com/', name: 'Zillow', protection: 'PerimeterX', tier: 'DIFFICULT' },
  { url: 'https://discord.com/', name: 'Discord', protection: 'Cloudflare WAF', tier: 'DIFFICULT' },

  // STANDARD - Light protection
  { url: 'https://www.github.com/', name: 'GitHub', protection: 'Light rate limit', tier: 'STANDARD' },
  { url: 'https://www.reddit.com/', name: 'Reddit', protection: 'Light anti-bot', tier: 'STANDARD' },
  { url: 'https://medium.com/', name: 'Medium', protection: 'Cloudflare Basic', tier: 'STANDARD' },

  // EASY - No protection
  { url: 'https://httpbin.org/ip', name: 'IP Check', protection: 'None', tier: 'EASY' },
  { url: 'https://bot.sannysoft.com/', name: 'Bot Detection', protection: 'Fingerprint test', tier: 'EASY' },
  { url: 'https://www.wikipedia.org/', name: 'Wikipedia', protection: 'None', tier: 'EASY' },
];

async function testSite(browser, site) {
  const page = await browser.newPage();

  try {
    await page.authenticate({ username: PROXY.username, password: PROXY.password });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const start = Date.now();
    const response = await page.goto(site.url, {
      waitUntil: 'domcontentloaded',
      timeout: 40000
    });
    const time = Date.now() - start;
    const status = response ? response.status() : 0;

    // Wait a bit for any JS challenges
    await new Promise(r => setTimeout(r, 2000));

    const content = await page.content();
    const lower = content.toLowerCase();

    // IP check
    if (site.name === 'IP Check') {
      const ip = content.match(/"origin":\s*"([^"]+)"/);
      if (ip) return { status: 'pass', time, http: status, ip: ip[1] };
    }

    // Bot detection check
    if (site.name === 'Bot Detection') {
      const failed = (content.match(/failed/gi) || []).length;
      return { status: failed < 3 ? 'pass' : 'fail', time, http: status, botTests: failed };
    }

    // Check for blocks
    const blocked = lower.includes('access denied') ||
                    lower.includes('blocked') ||
                    lower.includes('error 1020') ||
                    lower.includes('forbidden') ||
                    status === 403 || status === 503 || status === 429;

    // Check for CAPTCHA/challenges
    const captcha = lower.includes('captcha') ||
                    lower.includes('challenge') ||
                    lower.includes('verify') ||
                    lower.includes('checking your browser') ||
                    lower.includes('please wait') ||
                    lower.includes('just a moment');

    // Check for actual content (page loaded successfully)
    const hasContent = content.length > 5000 &&
                       (lower.includes('<body') || lower.includes('<main') || lower.includes('<div'));

    await page.close();

    if (status === 200 && hasContent && !blocked && !captcha) {
      return { status: 'pass', time, http: status };
    } else if (captcha) {
      return { status: 'captcha', time, http: status };
    } else if (blocked) {
      return { status: 'blocked', time, http: status };
    } else {
      return { status: 'partial', time, http: status, len: content.length };
    }

  } catch (e) {
    await page.close();
    if (e.message.includes('timeout')) {
      return { status: 'timeout', error: 'Page load timeout' };
    }
    return { status: 'error', error: e.message.slice(0, 40) };
  }
}

async function runTests() {
  console.log('');
  console.log('='.repeat(75));
  console.log('MERLIN TIERED PROTECTION BYPASS TEST');
  console.log('Proxy: DataImpulse Residential | 12 Sites | 4 Difficulty Tiers');
  console.log('='.repeat(75));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  const results = {
    EXTREME: { pass: 0, total: 0 },
    DIFFICULT: { pass: 0, total: 0 },
    STANDARD: { pass: 0, total: 0 },
    EASY: { pass: 0, total: 0 },
  };

  let currentTier = '';

  for (const site of testSites) {
    // Print tier header
    if (site.tier !== currentTier) {
      currentTier = site.tier;
      console.log('');
      console.log(`--- ${currentTier} ---`);
    }

    results[site.tier].total++;
    process.stdout.write(`  ${site.name.padEnd(14)} [${site.protection.padEnd(18)}] `);

    const result = await testSite(browser, site);

    if (result.status === 'pass') {
      results[site.tier].pass++;
      let extra = '';
      if (result.ip) extra = ` IP: ${result.ip}`;
      if (result.botTests !== undefined) extra = ` (${result.botTests} fails)`;
      console.log(`PASS (${result.time}ms)${extra}`);
    } else if (result.status === 'captcha') {
      console.log(`CAPTCHA (HTTP ${result.http})`);
    } else if (result.status === 'blocked') {
      console.log(`BLOCKED (HTTP ${result.http})`);
    } else if (result.status === 'timeout') {
      console.log(`TIMEOUT`);
    } else if (result.status === 'partial') {
      results[site.tier].pass += 0.5; // partial credit
      console.log(`PARTIAL (HTTP ${result.http}, ${result.len} bytes)`);
    } else {
      console.log(`ERROR: ${result.error}`);
    }

    await new Promise(r => setTimeout(r, 2500));
  }

  await browser.close();

  // Summary
  console.log('');
  console.log('='.repeat(75));
  console.log('RESULTS BY TIER');
  console.log('='.repeat(75));

  let totalPass = 0;
  let totalSites = 0;

  for (const [tier, data] of Object.entries(results)) {
    const pct = ((data.pass / data.total) * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(data.pass)) + '░'.repeat(data.total - Math.round(data.pass));
    console.log(`${tier.padEnd(10)} ${bar} ${data.pass}/${data.total} (${pct}%)`);
    totalPass += data.pass;
    totalSites += data.total;
  }

  const overallPct = ((totalPass / totalSites) * 100).toFixed(0);
  console.log('');
  console.log(`OVERALL: ${totalPass}/${totalSites} (${overallPct}%)`);
  console.log('='.repeat(75));

  // Verdict
  console.log('');
  if (overallPct >= 80) {
    console.log('EXCELLENT! Production-ready protection bypass.');
  } else if (overallPct >= 60) {
    console.log('GOOD. Works for most sites. Add CAPTCHA solving for protected sites.');
  } else if (overallPct >= 40) {
    console.log('MODERATE. Proxy working, but CAPTCHA solver needed for difficult sites.');
  } else {
    console.log('NEEDS WORK. Check proxy configuration and stealth settings.');
  }
  console.log('');
}

runTests().catch(console.error);
