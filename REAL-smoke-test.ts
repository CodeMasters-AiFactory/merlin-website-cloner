/**
 * REAL SMOKE TEST - FIXED SELECTORS
 */

import puppeteer from 'puppeteer';

const FRONTEND = 'http://localhost:5000';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function clickByText(page: any, text: string) {
  const elements = await page.$$('a, button');
  for (const el of elements) {
    const elText = await el.evaluate((e: Element) => e.textContent?.toLowerCase() || '');
    if (elText.includes(text.toLowerCase())) {
      await el.click();
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('\n🧙 MERLIN - REAL SMOKE TEST\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    slowMo: 80
  });
  
  const page = await browser.newPage();
  
  // STEP 1: LANDING PAGE
  console.log('📍 STEP 1: Loading Landing Page...');
  await page.goto(FRONTEND, { waitUntil: 'networkidle2' });
  await delay(2000);
  console.log('   ✅ Landing page loaded\n');
  
  // STEP 2: CLICK GET STARTED
  console.log('📍 STEP 2: Clicking "Get Started"...');
  const clicked = await clickByText(page, 'get started') || await clickByText(page, 'start cloning');
  if (clicked) {
    await delay(2000);
    console.log('   ✅ Navigated to signup\n');
  } else {
    await page.goto(`${FRONTEND}/signup`, { waitUntil: 'networkidle2' });
    console.log('   ✅ Went directly to signup\n');
  }
  
  // STEP 3: SIGNUP
  console.log('📍 STEP 3: Creating new account...');
  const testEmail = `smoke${Date.now()}@test.com`;
  const testPass = 'TestPass123!';
  
  await page.waitForSelector('input');
  const inputs = await page.$$('input');
  
  for (const input of inputs) {
    const type = await input.evaluate((el: HTMLInputElement) => el.type);
    const name = await input.evaluate((el: HTMLInputElement) => el.name);
    const placeholder = await input.evaluate((el: HTMLInputElement) => el.placeholder?.toLowerCase() || '');
    
    if (type === 'email' || name === 'email' || placeholder.includes('email')) {
      await input.type(testEmail, { delay: 30 });
    } else if (type === 'password' && (name === 'password' || placeholder.includes('password') && !placeholder.includes('confirm'))) {
      await input.type(testPass, { delay: 30 });
    } else if (type === 'password' && (name === 'confirmPassword' || placeholder.includes('confirm'))) {
      await input.type(testPass, { delay: 30 });
    } else if (name === 'name' || placeholder.includes('name')) {
      await input.type('Smoke Test', { delay: 30 });
    }
  }
  
  console.log(`   📧 Email: ${testEmail}`);
  await delay(1000);
  
  // Submit
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await delay(3000);
  console.log('   ✅ Account created\n');
  
  // STEP 4: GO TO DASHBOARD
  console.log('📍 STEP 4: Going to Dashboard...');
  await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle2' });
  await delay(2000);
  
  // Check if redirected to login
  if (page.url().includes('login')) {
    console.log('   🔐 Logging in...');
    const loginInputs = await page.$$('input');
    for (const input of loginInputs) {
      const type = await input.evaluate((el: HTMLInputElement) => el.type);
      if (type === 'email') await input.type(testEmail, { delay: 30 });
      if (type === 'password') await input.type(testPass, { delay: 30 });
    }
    const loginBtn = await page.$('button[type="submit"]');
    if (loginBtn) await loginBtn.click();
    await delay(3000);
  }
  console.log('   ✅ Dashboard loaded\n');
  
  // STEP 5: START CLONE
  console.log('📍 STEP 5: Looking for clone button...');
  await delay(1000);
  
  let cloneStarted = await clickByText(page, 'new clone') 
    || await clickByText(page, 'clone') 
    || await clickByText(page, 'new')
    || await clickByText(page, '+');
  
  await delay(2000);
  
  // STEP 6: ENTER URL
  console.log('📍 STEP 6: Entering URL to clone...');
  const urlInput = await page.$('input[type="url"]') 
    || await page.$('input[name="url"]') 
    || await page.$('input[placeholder*="http"]')
    || await page.$('input[placeholder*="URL"]');
    
  if (urlInput) {
    await urlInput.type('https://example.com', { delay: 30 });
    console.log('   🌐 URL: https://example.com');
    await delay(1000);
    
    // Click start
    const started = await clickByText(page, 'start') || await clickByText(page, 'clone');
    await delay(2000);
  }
  console.log('   ✅ Clone initiated\n');
  
  // STEP 7: WAIT FOR CLONE
  console.log('📍 STEP 7: Monitoring clone progress...');
  for (let i = 0; i < 10; i++) {
    await delay(3000);
    const content = await page.content();
    if (content.includes('complete') || content.includes('success') || content.includes('100%')) {
      console.log('   ✅ Clone completed!');
      break;
    }
    console.log(`   ⏳ ${(i+1)*3}s elapsed...`);
  }
  
  // STEP 8: PRICING
  console.log('\n📍 STEP 8: Checking Pricing...');
  await page.goto(`${FRONTEND}/pricing`, { waitUntil: 'networkidle2' });
  await delay(2000);
  console.log('   ✅ Pricing loaded\n');
  
  // STEP 9: DOCS
  console.log('📍 STEP 9: Checking Docs...');
  await page.goto(`${FRONTEND}/docs`, { waitUntil: 'networkidle2' });
  await delay(2000);
  console.log('   ✅ Docs loaded\n');
  
  // DONE
  console.log('═'.repeat(50));
  console.log('🏁 SMOKE TEST COMPLETE - CHECK BROWSER');
  console.log('═'.repeat(50));
  console.log('\nKeeping browser open 60 seconds...\n');
  
  await delay(60000);
  await browser.close();
}

main().catch(err => {
  console.error('❌ ERROR:', err.message);
});
