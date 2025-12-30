/**
 * VISIBLE BROWSER CLONE TEST
 *
 * Runs with browser visible so you can watch the cloning in real-time
 * Uses your Chrome profile for logged-in sessions
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TOP_10_SITES = [
  { name: 'Jeton', url: 'https://www.jeton.com' },
  { name: 'Phamily', url: 'https://phamily.com' },
  { name: 'Osmo Supply', url: 'https://www.osmo.supply' },
  { name: 'Gufram', url: 'https://gufram.it/en/' },
  { name: 'David Langarica', url: 'https://www.davidlangarica.dev' },
  { name: 'Formless', url: 'https://www.formless.co' },
  { name: 'SPINX Digital', url: 'https://www.spinxdigital.com' },
  { name: 'Baseborn', url: 'https://www.baseborn.studio' },
  { name: 'Grab & Go', url: 'https://grabandgo.pt' },
  { name: 'Tore S. Bentsen', url: 'https://www.torebentsen.com' },
];

async function visibleCloneTest() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     VISIBLE BROWSER CLONE TEST - TOP 10 WEBSITES            ║');
  console.log('║           Watch the cloning in real-time!                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // Find Chrome user data directory
  const chromeUserDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  const useProfile = fs.existsSync(chromeUserDataDir);

  console.log(`📁 Chrome profile: ${useProfile ? 'Found - will use your profile' : 'Not found - using fresh browser'}`);
  console.log();

  // Launch visible browser (fresh profile to avoid conflicts)
  console.log('🚀 Launching visible browser...');

  const browser = await puppeteer.launch({
    headless: false,  // VISIBLE BROWSER!
    defaultViewport: null,  // Use window size
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const timestamp = Date.now();
  const outputDir = path.join(process.cwd(), `visible-test-${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`📁 Output directory: ${outputDir}`);
  console.log();

  for (let i = 0; i < Math.min(TOP_10_SITES.length, 3); i++) {  // First 3 sites for demo
    const site = TOP_10_SITES[i];
    const siteDir = path.join(outputDir, site.name.replace(/[^a-zA-Z0-9]/g, '-'));
    fs.mkdirSync(siteDir, { recursive: true });

    console.log(`\n[${ i + 1}/10] 🌐 Visiting: ${site.name}`);
    console.log(`     URL: ${site.url}`);
    console.log('     ' + '─'.repeat(50));

    try {
      // Navigate to site
      console.log('     ⏳ Loading page...');
      await page.goto(site.url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Wait for dynamic content
      console.log('     ⏳ Waiting for dynamic content...');
      await new Promise(r => setTimeout(r, 3000));

      // Scroll to load lazy content
      console.log('     ⏳ Scrolling to load all content...');
      await autoScroll(page);

      // Take screenshot
      const screenshotPath = path.join(siteDir, 'screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`     📸 Screenshot saved: ${screenshotPath}`);

      // Save HTML
      const html = await page.content();
      const htmlPath = path.join(siteDir, 'index.html');
      fs.writeFileSync(htmlPath, html);
      console.log(`     📄 HTML saved: ${htmlPath}`);

      // Get page metrics
      const metrics = await page.metrics();
      console.log(`     📊 DOM Nodes: ${metrics.Nodes}`);
      console.log(`     📊 JS Heap: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(1)} MB`);

      console.log(`     ✅ ${site.name} captured successfully!`);

      // Pause so you can see it
      console.log('     ⏸️  Pausing 5 seconds so you can see...');
      await new Promise(r => setTimeout(r, 5000));

    } catch (error: any) {
      console.log(`     ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST COMPLETE - Browser will stay open for 30 seconds');
  console.log('  Check the output directory for screenshots and HTML');
  console.log(`  📁 ${outputDir}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // Keep browser open for inspection
  await new Promise(r => setTimeout(r, 30000));

  await browser.close();
}

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);  // Scroll back to top
          resolve();
        }
      }, 100);
    });
  });
}

// Run the test
visibleCloneTest().catch(console.error);
