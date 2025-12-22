/**
 * Quick E2E Test - Tests the full flow with fresh user
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:5000';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function quickTest() {
  console.log('🚀 Quick E2E Test\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const testEmail = `test-${Date.now()}@example.com`;

  try {
    // 1. Go to signup
    console.log('1. Signing up...');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle2' });
    await delay(500);

    // Fill signup form
    await page.type('input[type="text"]', 'Test User');
    await page.type('input[type="email"]', testEmail);
    await page.type('input[type="password"]', 'TestPass123');

    // Check terms checkbox
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) await checkbox.click();

    await delay(500);
    await page.click('button[type="submit"]');
    await delay(2000);

    // Check if we're on dashboard
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log('✅ Signup successful - on dashboard\n');
    } else {
      console.log(`⚠️ After signup, URL is: ${url}\n`);
    }

    // 2. Upgrade user via API
    console.log('2. Upgrading user to admin...');
    const upgradeResponse = await page.evaluate(async (email) => {
      const res = await fetch('/api/admin/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, adminSecret: 'merlin-admin-2024' })
      });
      return res.json();
    }, testEmail);
    console.log('✅ Upgraded:', upgradeResponse.message, '\n');

    // 3. Go to dashboard
    console.log('3. Loading dashboard...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: './test-screenshots/quick-01-dashboard.png' });

    // 4. Click Clone Website button
    console.log('4. Opening clone modal...');
    const cloneBtn = await page.$('button');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text?.includes('Clone Website') || text?.includes('Clone Your First')) {
        await btn.click();
        break;
      }
    }
    await delay(1000);
    await page.screenshot({ path: './test-screenshots/quick-02-modal.png' });

    // 5. Enter URL and start clone
    console.log('5. Starting clone of example.com...');
    const urlInput = await page.$('input[type="url"]') ||
                     await page.$('input[placeholder*="http"]') ||
                     await page.$('input[placeholder*="example"]');

    if (urlInput) {
      await urlInput.type('https://example.com');
      await delay(500);

      // Check certification checkbox
      const certCheckboxes = await page.$$('input[type="checkbox"]');
      for (const cb of certCheckboxes) {
        const isChecked = await page.evaluate(el => el.checked, cb);
        if (!isChecked) await cb.click();
      }
      await delay(500);
      await page.screenshot({ path: './test-screenshots/quick-03-url-entered.png' });

      // Click start button
      const allButtons = await page.$$('button');
      for (const btn of allButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes('Start') || text?.includes('Clone Now') || text?.includes('Backup')) {
          await btn.click();
          console.log('✅ Clone started!\n');
          break;
        }
      }

      // Wait for clone to complete
      console.log('6. Waiting for clone to complete...');
      await delay(15000);
      await page.screenshot({ path: './test-screenshots/quick-04-after-clone.png' });

      // Reload dashboard
      await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
      await delay(2000);
      await page.screenshot({ path: './test-screenshots/quick-05-dashboard-with-job.png' });

      // 7. Test preview
      console.log('7. Testing preview...');
      const previewBtns = await page.$$('button');
      let foundPreview = false;
      for (const btn of previewBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes('Preview')) {
          await btn.click();
          foundPreview = true;
          console.log('✅ Preview button clicked!\n');
          break;
        }
      }

      if (foundPreview) {
        await delay(2000);
        await page.screenshot({ path: './test-screenshots/quick-06-preview-modal.png' });
        console.log('✅ Preview modal opened!\n');
      } else {
        console.log('⚠️ No preview button found\n');

        // Check if there's an "Open in New Tab" link instead
        const links = await page.$$('a');
        for (const link of links) {
          const text = await page.evaluate(el => el.textContent, link);
          const href = await page.evaluate(el => el.href, link);
          if (text?.includes('Open in New Tab') || href?.includes('/preview/')) {
            console.log(`Found preview link: ${href}`);
          }
        }
      }

    } else {
      console.log('⚠️ Could not find URL input\n');
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Screenshots saved to ./test-screenshots/quick-*.png');
    console.log('\n⏳ Browser staying open for 30 seconds...');
    await delay(30000);

  } catch (error) {
    console.error('❌ Error:', error);
    await page.screenshot({ path: './test-screenshots/quick-error.png' });
  } finally {
    await browser.close();
  }
}

quickTest().catch(console.error);
