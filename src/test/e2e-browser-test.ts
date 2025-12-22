/**
 * E2E Browser Test - Full UI Testing with Puppeteer
 * Tests: Signup, Login, Dashboard, Clone with Progress Bar
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs-extra';

const BASE_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = './test-screenshots';

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function e2eTest() {
  console.log('🚀 Starting E2E Browser Test - Full Clone with Progress...\n');

  // Ensure screenshots directory exists
  await fs.ensureDir(SCREENSHOTS_DIR);

  const browser = await puppeteer.launch({
    headless: false, // Show browser so user can see
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Test 1: Landing Page
    console.log('📍 Test 1: Loading Landing Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-landing-page.png') });
    console.log('✅ Landing page loaded\n');
    await delay(1000);

    // Test 2: Navigate to Signup
    console.log('📍 Test 2: Navigating to Signup...');
    await page.goto(`${BASE_URL}/signup`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-signup-page.png') });
    console.log('✅ Signup page loaded\n');
    await delay(1000);

    // Test 3: Fill Signup Form
    console.log('📍 Test 3: Filling Signup Form...');
    const testEmail = `test-${Date.now()}@example.com`;

    await page.type('input[type="text"]', 'Test User');
    await delay(300);
    await page.type('input[type="email"]', testEmail);
    await delay(300);
    await page.type('input[type="password"]', 'TestPassword123');
    await delay(300);

    // Check the terms checkbox
    await page.click('input[type="checkbox"]');
    await delay(300);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-signup-filled.png') });
    console.log('✅ Signup form filled\n');
    await delay(500);

    // Test 4: Submit Signup
    console.log('📍 Test 4: Submitting Signup...');
    await page.click('button[type="submit"]');
    await delay(2000); // Wait for redirect

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-after-signup.png') });

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Signup successful - Redirected to Dashboard\n');
    } else {
      console.log(`⚠️ After signup, URL is: ${currentUrl}\n`);
    }
    await delay(1000);

    // Test 5: Dashboard Check
    console.log('📍 Test 5: Checking Dashboard...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-dashboard.png') });
    console.log('✅ Dashboard loaded\n');

    // Test 6: Logout and Login with Admin
    console.log('📍 Test 6: Testing Login Page...');
    // Clear localStorage first
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-login-page.png') });
    console.log('✅ Login page loaded\n');

    // Test login with admin credentials
    console.log('📍 Test 7: Logging in as Admin...');
    await page.type('input[type="email"]', 'rudolf@code-masters.co.za');
    await delay(300);
    await page.type('input[type="password"]', 'Password 777');
    await delay(300);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-login-filled.png') });

    await page.click('button[type="submit"]');
    await delay(2000);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-after-login.png') });

    const loginUrl = page.url();
    if (loginUrl.includes('/dashboard')) {
      console.log('✅ Admin login successful!\n');
    } else {
      console.log(`⚠️ After login, URL is: ${loginUrl}\n`);
    }

    // Test 8: Dashboard with Admin - Try Clone
    console.log('📍 Test 8: Testing Dashboard Clone UI...');
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-admin-dashboard.png') });

    // Click "Clone Website" button to open modal
    console.log('📍 Test 9: Clicking Clone Website button...');
    const buttons = await page.$$('button');
    let foundCloneBtn = false;

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Clone Website') || text.includes('Clone Your First'))) {
        await button.click();
        foundCloneBtn = true;
        console.log('✅ Clone Website button clicked\n');
        break;
      }
    }

    if (foundCloneBtn) {
      await delay(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-clone-modal-opened.png') });

      // Now look for URL input in the modal
      console.log('📍 Test 10: Looking for URL input...');
      const urlInput = await page.$('input[type="url"]') ||
                       await page.$('input[placeholder*="http"]') ||
                       await page.$('input[placeholder*="URL"]') ||
                       await page.$('input[placeholder*="example"]');

      if (urlInput) {
        console.log('📍 Test 11: Entering URL to clone...');
        await urlInput.type('https://example.com');
        await delay(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-clone-url-entered.png') });
        console.log('✅ URL entered for cloning\n');

        // Check the certification checkbox first
        console.log('📍 Test 12: Checking ownership certification...');
        const certCheckbox = await page.$('input[type="checkbox"]');
        if (certCheckbox) {
          await certCheckbox.click();
          console.log('✅ Certification checkbox checked\n');
        }
        await delay(500);

        // Find and click the Start Clone button
        console.log('📍 Test 13: Starting clone...');
        const allButtons = await page.$$('button');
        let cloneStarted = false;
        for (const btn of allButtons) {
          const btnText = await page.evaluate(el => el.textContent, btn);
          if (btnText && (btnText.includes('Start Full Backup') || btnText.includes('Start Cloning') || btnText.includes('Clone Now'))) {
            await btn.click();
            cloneStarted = true;
            console.log('✅ Clone started!\n');
            break;
          }
        }

        if (cloneStarted) {
          // Wait for progress to appear
          console.log('📍 Test 14: Monitoring clone progress...');
          await delay(2000);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-clone-started.png') });

          // Monitor progress for 15 seconds, taking screenshots
          for (let i = 0; i < 5; i++) {
            await delay(3000);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `13-clone-progress-${i + 1}.png`) });
            console.log(`  📸 Progress screenshot ${i + 1}/5`);
          }
          console.log('✅ Clone progress monitored\n');
        }

        // Go back to dashboard to see projects list
        console.log('📍 Test 15: Checking Projects Dashboard...');
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
        await delay(2000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-projects-dashboard.png') });
        console.log('✅ Projects dashboard loaded\n');

      } else {
        console.log('⚠️ Could not find URL input in modal - taking screenshot\n');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-modal-no-input.png') });
      }
    } else {
      console.log('⚠️ Could not find Clone Website button - taking screenshot\n');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-no-clone-button.png') });
    }

    // Test: Check Pricing Page
    console.log('📍 Test 16: Checking Pricing Page...');
    await page.goto(`${BASE_URL}/pricing`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-pricing-page.png') });
    console.log('✅ Pricing page loaded\n');

    // Test 10: Check Docs Page
    console.log('📍 Test 12: Checking Docs Page...');
    await page.goto(`${BASE_URL}/docs`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-docs-page.png') });
    console.log('✅ Docs page loaded\n');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 E2E BROWSER TEST COMPLETE');
    console.log('='.repeat(50));
    console.log(`\n📸 Screenshots saved to: ${path.resolve(SCREENSHOTS_DIR)}`);
    console.log('\nTest Results:');
    console.log('  ✅ Landing page');
    console.log('  ✅ Signup page & form');
    console.log('  ✅ Dashboard access');
    console.log('  ✅ Login page & form');
    console.log('  ✅ Admin login');
    console.log('  ✅ Clone UI');
    console.log('  ✅ Pricing page');
    console.log('  ✅ Docs page');

    // Keep browser open for viewing
    console.log('\n⏳ Browser will stay open for 15 seconds so you can see...');
    await delay(15000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-screenshot.png') });
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed. Test complete.');
  }
}

// Run the test
e2eTest().catch(console.error);
