import { chromium } from 'playwright';

async function testPreview() {
  console.log('🚀 Starting browser test...\n');

  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5000/login');
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Login page loaded\n');

    // 2. Login with 777
    console.log('2. Logging in with user 777...');
    await page.fill('input.input', '777');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('   ✅ Logged in successfully\n');

    // 3. Check for completed jobs in dashboard
    console.log('3. Looking for completed jobs...');
    await page.waitForTimeout(2000); // Wait for jobs to load

    // Take screenshot of dashboard
    await page.screenshot({ path: 'dashboard-screenshot.png' });
    console.log('   Dashboard screenshot saved\n');

    // Find a completed job hostname button (has class text-primary-600)
    const completedHostname = await page.locator('button').filter({ hasText: /jeton|\.com/ }).first();
    const exists = await completedHostname.count() > 0;
    console.log(`   Found ${await page.locator('button').count()} buttons total`);

    if (exists) {
      const hostname = await completedHostname.textContent();
      console.log(`   ✅ Found completed job: ${hostname}\n`);

      // 4. Click on hostname to open preview
      console.log('4. Clicking hostname to open preview...');
      await completedHostname.click();

      // Wait for preview modal
      await page.waitForTimeout(1000);

      // Check if iframe exists
      const iframe = await page.locator('iframe').first();
      const iframeExists = await iframe.count() > 0;

      if (iframeExists) {
        console.log('   ✅ Preview modal opened with iframe\n');

        // 5. Check if iframe has content
        console.log('5. Checking iframe content...');
        const iframeSrc = await iframe.getAttribute('src');
        console.log(`   Iframe src: ${iframeSrc}`);

        // Wait a bit for iframe to load
        await page.waitForTimeout(2000);

        // Take screenshot
        await page.screenshot({ path: 'preview-test-screenshot.png', fullPage: false });
        console.log('   ✅ Screenshot saved to preview-test-screenshot.png\n');

        console.log('🎉 TEST PASSED! Preview is working!\n');
      } else {
        console.log('   ❌ No iframe found in preview modal\n');
      }
    } else {
      console.log('   ⚠️  No completed jobs found. Clone a website first.\n');
    }

    // Keep browser open for 5 seconds to see result
    console.log('Keeping browser open for 5 seconds...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('Error screenshot saved.');
  } finally {
    await browser.close();
  }
}

testPreview();
