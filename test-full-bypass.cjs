/**
 * Full Protection Bypass Test
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

// CapSolver API
const CAPSOLVER_API_KEY = 'CAP-92C903B5D8A81B08683E02A5C2A8531BC142238E86F73E89310D959D430225BE';

// Test sites
const testSites = [
  { url: 'https://httpbin.org/ip', name: 'IP Check', protection: 'none' },
  { url: 'https://bot.sannysoft.com/', name: 'Bot Detection', protection: 'fingerprint' },
  { url: 'https://nowsecure.nl/', name: 'NowSecure', protection: 'cloudflare' },
  { url: 'https://www.g2.com/', name: 'G2', protection: 'datadome' },
  { url: 'https://www.nike.com/', name: 'Nike', protection: 'akamai' },
  { url: 'https://www.zillow.com/', name: 'Zillow', protection: 'perimeterx' },
  { url: 'https://discord.com/', name: 'Discord', protection: 'cloudflare' },
  { url: 'https://www.reddit.com/', name: 'Reddit', protection: 'datadome' },
];

// Solve CAPTCHA using CapSolver
async function solveCaptcha(page, type) {
  console.log('    -> Attempting CAPTCHA solve with CapSolver...');

  try {
    const pageUrl = page.url();

    // Create task based on type
    let taskData;
    if (type === 'turnstile' || type === 'cloudflare') {
      // Get sitekey from page
      const sitekey = await page.evaluate(() => {
        const turnstile = document.querySelector('[data-sitekey]');
        return turnstile ? turnstile.getAttribute('data-sitekey') : null;
      });

      if (!sitekey) {
        console.log('    -> No sitekey found, skipping CAPTCHA solve');
        return false;
      }

      taskData = {
        clientKey: CAPSOLVER_API_KEY,
        task: {
          type: 'AntiTurnstileTaskProxyLess',
          websiteURL: pageUrl,
          websiteKey: sitekey,
        }
      };
    } else if (type === 'recaptcha') {
      const sitekey = await page.evaluate(() => {
        const recaptcha = document.querySelector('.g-recaptcha');
        return recaptcha ? recaptcha.getAttribute('data-sitekey') : null;
      });

      if (!sitekey) return false;

      taskData = {
        clientKey: CAPSOLVER_API_KEY,
        task: {
          type: 'ReCaptchaV2TaskProxyLess',
          websiteURL: pageUrl,
          websiteKey: sitekey,
        }
      };
    } else {
      return false;
    }

    // Create task
    const createResponse = await fetch('https://api.capsolver.com/createTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });

    const createResult = await createResponse.json();
    if (createResult.errorId !== 0) {
      console.log('    -> CapSolver error:', createResult.errorDescription);
      return false;
    }

    const taskId = createResult.taskId;
    console.log('    -> Task created:', taskId);

    // Poll for result
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const resultResponse = await fetch('https://api.capsolver.com/getTaskResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: CAPSOLVER_API_KEY,
          taskId: taskId
        })
      });

      const result = await resultResponse.json();

      if (result.status === 'ready') {
        console.log('    -> CAPTCHA solved!');

        // Inject solution
        if (result.solution && result.solution.token) {
          await page.evaluate((token) => {
            // Try to submit the token
            const callback = window.turnstile?.callback || window.grecaptcha?.callback;
            if (callback) callback(token);

            // Also try hidden input
            const input = document.querySelector('[name="cf-turnstile-response"]') ||
                          document.querySelector('[name="g-recaptcha-response"]');
            if (input) input.value = token;
          }, result.solution.token);

          return true;
        }
      } else if (result.status === 'failed') {
        console.log('    -> CAPTCHA solve failed');
        return false;
      }
    }

    return false;
  } catch (e) {
    console.log('    -> CAPTCHA error:', e.message);
    return false;
  }
}

async function testSite(browser, site) {
  const page = await browser.newPage();

  try {
    // Authenticate proxy
    await page.authenticate({
      username: PROXY.username,
      password: PROXY.password
    });

    // Set headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    const start = Date.now();
    const response = await page.goto(site.url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    const time = Date.now() - start;
    const status = response ? response.status() : 0;

    const content = await page.content();
    const lowerContent = content.toLowerCase();

    // Show IP for httpbin
    if (site.name === 'IP Check') {
      const ipMatch = content.match(/"origin":\s*"([^"]+)"/);
      if (ipMatch) console.log('PROXY IP: ' + ipMatch[1]);
    }

    // Check for challenges
    const hasCaptcha = lowerContent.includes('captcha') ||
                       lowerContent.includes('cf-turnstile') ||
                       lowerContent.includes('challenge-form') ||
                       lowerContent.includes('hcaptcha') ||
                       lowerContent.includes('please verify');

    const isBlocked = lowerContent.includes('blocked') ||
                      lowerContent.includes('access denied') ||
                      lowerContent.includes('error 1020') ||
                      status === 403 || status === 503;

    // Try to solve CAPTCHA if detected
    let solved = false;
    if (hasCaptcha && !isBlocked) {
      const captchaType = lowerContent.includes('turnstile') ? 'turnstile' :
                         lowerContent.includes('recaptcha') ? 'recaptcha' : 'cloudflare';
      solved = await solveCaptcha(page, captchaType);

      if (solved) {
        // Wait and reload
        await new Promise(r => setTimeout(r, 3000));
        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
      }
    }

    // Final check
    const finalContent = await page.content();
    const finalLower = finalContent.toLowerCase();
    const finalBlocked = finalLower.includes('blocked') || finalLower.includes('access denied');
    const finalCaptcha = finalLower.includes('captcha') || finalLower.includes('challenge');

    await page.close();

    if (status === 200 && !finalBlocked && !finalCaptcha) {
      return { status: 'pass', time, httpStatus: status, solved };
    } else if (hasCaptcha || finalCaptcha) {
      return { status: 'captcha', time, httpStatus: status, solved };
    } else if (isBlocked || finalBlocked) {
      return { status: 'blocked', time, httpStatus: status };
    } else {
      return { status: 'fail', time, httpStatus: status };
    }

  } catch (e) {
    await page.close();
    return { status: 'error', error: e.message };
  }
}

async function runTests() {
  console.log('='.repeat(70));
  console.log('MERLIN FULL PROTECTION BYPASS TEST');
  console.log('Proxy: DataImpulse Residential');
  console.log('CAPTCHA: CapSolver');
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

  const results = { pass: 0, captcha: 0, blocked: 0, error: 0 };

  for (const site of testSites) {
    process.stdout.write(site.name.padEnd(20) + ' [' + site.protection.padEnd(12) + '] ');

    const result = await testSite(browser, site);

    if (result.status === 'pass') {
      console.log('✅ PASS (' + result.time + 'ms)' + (result.solved ? ' [CAPTCHA SOLVED]' : ''));
      results.pass++;
    } else if (result.status === 'captcha') {
      console.log('⚠️  CAPTCHA (' + result.httpStatus + ')' + (result.solved ? ' [SOLVE ATTEMPTED]' : ''));
      results.captcha++;
    } else if (result.status === 'blocked') {
      console.log('❌ BLOCKED (' + result.httpStatus + ')');
      results.blocked++;
    } else {
      console.log('❌ ERROR: ' + (result.error || 'Unknown').slice(0, 40));
      results.error++;
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();

  // Summary
  const total = testSites.length;
  const successRate = ((results.pass / total) * 100).toFixed(0);

  console.log('');
  console.log('='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));
  console.log('Total:    ' + total);
  console.log('Passed:   ' + results.pass + ' (' + successRate + '%)');
  console.log('CAPTCHA:  ' + results.captcha);
  console.log('Blocked:  ' + results.blocked);
  console.log('Errors:   ' + results.error);
  console.log('');

  if (results.pass >= total * 0.6) {
    console.log('🎉 SUCCESS! Protection bypass working well!');
  } else if (results.pass >= total * 0.4) {
    console.log('✅ GOOD progress. Some sites need manual review.');
  } else {
    console.log('⚠️  Need to investigate failures.');
  }
  console.log('='.repeat(70));
}

runTests().catch(console.error);
