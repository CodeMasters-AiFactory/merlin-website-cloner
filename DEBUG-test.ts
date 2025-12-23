/**
 * DEBUG TEST - Capture signup errors
 */

import puppeteer from 'puppeteer';

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🔍 DEBUG: Capturing signup errors\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: null
  });

  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  // Capture network errors
  page.on('response', response => {
    if (!response.ok() && response.url().includes('/api/')) {
      console.log(`❌ API ERROR: ${response.status()} ${response.url()}`);
      response.text().then(body => console.log('   Response:', body));
    }
  });

  await page.goto('http://localhost:5000/signup', { waitUntil: 'networkidle2' });
  await delay(1000);

  // Fill form
  const nameInput = await page.$('input[placeholder="John Doe"]');
  if (nameInput) await nameInput.type('Debug User');

  const emailInput = await page.$('input[type="email"]');
  if (emailInput) await emailInput.type(`debug${Date.now()}@test.com`);

  const passInput = await page.$('input[type="password"]');
  if (passInput) await passInput.type('SecurePass123!');

  // Click checkbox
  const checkbox = await page.$('input[type="checkbox"]');
  if (checkbox) await checkbox.click();
  
  await delay(500);

  // Submit
  console.log('\n📤 Submitting form...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();

  await delay(3000);

  // Check for error message on page
  const errorDiv = await page.$('.bg-red-50, .error, [class*="error"]');
  if (errorDiv) {
    const errorText = await errorDiv.evaluate((e: Element) => e.textContent);
    console.log('\n🚨 ERROR ON PAGE:', errorText);
  }

  // Check current URL
  console.log('\n📍 Current URL:', page.url());

  // Check localStorage for token
  const token = await page.evaluate(() => localStorage.getItem('token'));
  console.log('🔑 Token in localStorage:', token ? 'YES' : 'NO');

  console.log('\n⏳ Browser open for 30s - check the page yourself...\n');
  await delay(30000);
  await browser.close();
}

main().catch(e => console.error('Error:', e));
