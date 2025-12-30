/**
 * CAPTCHA Integration Test
 * Verifies CapSolver is properly configured and can solve challenges
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// Load env vars
require('dotenv').config();
require('dotenv').config({ path: '.env.services' });

const CAPSOLVER_API_KEY = process.env.CAPSOLVER_API_KEY;
const PROXY = {
  host: process.env.PROXY_HOST || 'gw.dataimpulse.com',
  port: process.env.PROXY_PORT || 823,
  username: process.env.PROXY_USERNAME || '1f88c0d191acb71aec1f',
  password: process.env.PROXY_PASSWORD || 'c265a541f1a13012'
};

console.log('');
console.log('='.repeat(60));
console.log('MERLIN CAPTCHA INTEGRATION TEST');
console.log('='.repeat(60));
console.log('');
console.log('CapSolver API Key:', CAPSOLVER_API_KEY ? 'CONFIGURED (' + CAPSOLVER_API_KEY.slice(0, 10) + '...)' : 'MISSING');
console.log('Proxy:', PROXY.host + ':' + PROXY.port);
console.log('');

if (!CAPSOLVER_API_KEY) {
  console.log('ERROR: CAPSOLVER_API_KEY not found in environment!');
  console.log('Make sure .env.services exists with:');
  console.log('  CAPSOLVER_API_KEY=your_key_here');
  process.exit(1);
}

// Check CapSolver balance first
async function checkBalance() {
  console.log('Checking CapSolver balance...');

  const response = await fetch('https://api.capsolver.com/getBalance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientKey: CAPSOLVER_API_KEY })
  });

  const data = await response.json();

  if (data.errorId === 0) {
    console.log('CapSolver Balance: $' + data.balance.toFixed(2));
    return data.balance;
  } else {
    console.log('CapSolver Error:', data.errorCode, data.errorDescription);
    return 0;
  }
}

// Test site with Turnstile
async function testTurnstile() {
  console.log('\n--- Testing Cloudflare Turnstile Bypass ---');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--proxy-server=http://${PROXY.host}:${PROXY.port}`,
    ],
  });

  try {
    const page = await browser.newPage();
    await page.authenticate({ username: PROXY.username, password: PROXY.password });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Try a site with Cloudflare Turnstile
    console.log('Loading nowsecure.nl (Cloudflare protected)...');
    const response = await page.goto('https://nowsecure.nl/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    const status = response?.status() || 0;
    const content = await page.content();
    const lower = content.toLowerCase();

    // Check for Turnstile
    const hasTurnstile = lower.includes('cf-turnstile') || lower.includes('turnstile');
    const hasChallenge = lower.includes('checking your browser') || lower.includes('just a moment');

    if (hasTurnstile || hasChallenge) {
      console.log('Turnstile detected! Attempting to solve...');

      // Extract sitekey
      const siteKey = await page.evaluate(() => {
        const el = document.querySelector('[data-sitekey], .cf-turnstile');
        return el?.getAttribute('data-sitekey') || null;
      });

      if (siteKey) {
        console.log('Sitekey found:', siteKey.slice(0, 20) + '...');

        // Create CapSolver task
        const createRes = await fetch('https://api.capsolver.com/createTask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientKey: CAPSOLVER_API_KEY,
            task: {
              type: 'AntiTurnstileTaskProxyLess',
              websiteURL: page.url(),
              websiteKey: siteKey
            }
          })
        });

        const createData = await createRes.json();

        if (createData.errorId === 0) {
          console.log('Task created:', createData.taskId);

          // Poll for result
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 3000));

            const resultRes = await fetch('https://api.capsolver.com/getTaskResult', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientKey: CAPSOLVER_API_KEY,
                taskId: createData.taskId
              })
            });

            const resultData = await resultRes.json();

            if (resultData.status === 'ready') {
              console.log('CAPTCHA SOLVED!');
              console.log('Token:', resultData.solution.token.slice(0, 30) + '...');

              // Inject token
              await page.evaluate((token) => {
                const input = document.querySelector('[name="cf-turnstile-response"]');
                if (input) input.value = token;
              }, resultData.solution.token);

              console.log('Token injected, waiting for navigation...');
              await page.waitForNavigation({ timeout: 10000 }).catch(() => {});

              const finalContent = await page.content();
              const passed = !finalContent.toLowerCase().includes('turnstile');
              console.log('Result:', passed ? 'BYPASS SUCCESS' : 'Challenge still present');

              await browser.close();
              return passed;
            } else if (resultData.status === 'failed') {
              console.log('Solve failed:', resultData.errorCode);
              break;
            }

            process.stdout.write('.');
          }
        } else {
          console.log('Task creation failed:', createData.errorCode, createData.errorDescription);
        }
      } else {
        console.log('Could not find sitekey - challenge may be different format');
      }
    } else {
      console.log('No Turnstile detected - page may have loaded successfully');
      console.log('HTTP Status:', status);
      console.log('Page title:', await page.title());
    }

    await browser.close();
    return status === 200;

  } catch (e) {
    console.log('Error:', e.message);
    await browser.close();
    return false;
  }
}

async function run() {
  const balance = await checkBalance();

  if (balance < 0.01) {
    console.log('WARNING: CapSolver balance too low!');
    return;
  }

  const result = await testTurnstile();

  console.log('');
  console.log('='.repeat(60));
  console.log('INTEGRATION TEST:', result ? 'PASSED' : 'NEEDS REVIEW');
  console.log('='.repeat(60));
}

run().catch(console.error);
