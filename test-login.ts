import puppeteer from 'puppeteer';

async function testLogin() {
  console.log('🔑 Testing Login...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  // Go to login page
  await page.goto('http://localhost:5000/login', { waitUntil: 'networkidle2' });
  console.log('✅ Login page loaded');

  // Fill in credentials
  await page.type('input[type="email"]', 'admin@merlin.com');
  await page.type('input[type="password"]', 'admin123');
  console.log('✅ Credentials entered: admin@merlin.com / admin123');

  // Click login button
  await page.click('button[type="submit"]');
  console.log('✅ Login button clicked');

  // Wait for navigation
  await new Promise(r => setTimeout(r, 3000));

  const url = page.url();
  console.log('\n📍 Current URL:', url);

  if (url.includes('/dashboard')) {
    console.log('\n🎉 LOGIN SUCCESSFUL! You are now on the dashboard.');
  } else {
    console.log('\n⚠️ Login may have failed. Still on:', url);
  }

  // Keep browser open for 15 seconds so user can see
  console.log('\n⏳ Browser will stay open for 15 seconds...');
  await new Promise(r => setTimeout(r, 15000));

  await browser.close();
  console.log('\n👋 Done!');
}

testLogin().catch(console.error);
