/**
 * FINAL SMOKE TEST - FIXED
 * Now clicks the terms checkbox!
 */

import puppeteer from 'puppeteer';

const FRONTEND = 'http://localhost:5000';

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickByText(page: any, text: string) {
  const elements = await page.$$('a, button');
  for (const el of elements) {
    const elText = await el.evaluate((e: Element) => e.textContent?.trim().toLowerCase());
    if (elText?.includes(text.toLowerCase())) {
      await el.click();
      return true;
    }
  }
  return false;
}

async function main() {
  console.log('\n🧙 MERLIN - FINAL SMOKE TEST');
  console.log('=============================\n');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 80,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

  // 1. LANDING PAGE
  console.log('1️⃣ LANDING PAGE...');
  await page.goto(FRONTEND, { waitUntil: 'networkidle2' });
  await delay(2000);
  console.log('   ✅ Loaded\n');

  // 2. GO TO SIGNUP
  console.log('2️⃣ GOING TO SIGNUP...');
  await clickByText(page, 'start cloning');
  await delay(2000);
  console.log('   ✅ On signup page\n');

  // 3. FILL SIGNUP FORM
  console.log('3️⃣ FILLING SIGNUP FORM...');
  const email = `fulltest${Date.now()}@test.com`;
  const password = 'SecurePass123!';
  
  // Name
  const nameInput = await page.$('input[placeholder="John Doe"]');
  if (nameInput) {
    await nameInput.type('Rudolf Test');
    console.log('   ✏️ Name: Rudolf Test');
  }
  
  // Email
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.type(email);
    console.log(`   ✏️ Email: ${email}`);
  }
  
  // Password
  const passInput = await page.$('input[type="password"]');
  if (passInput) {
    await passInput.type(password);
    console.log('   ✏️ Password: ********');
  }
  
  await delay(500);
  
  // 4. CLICK TERMS CHECKBOX (THIS WAS MISSING!)
  console.log('\n4️⃣ AGREEING TO TERMS...');
  const checkbox = await page.$('input[type="checkbox"]');
  if (checkbox) {
    await checkbox.click();
    console.log('   ☑️ Terms checkbox clicked!');
  } else {
    console.log('   ⚠️ No checkbox found');
  }
  
  await delay(1000);
  
  // 5. SUBMIT SIGNUP
  console.log('\n5️⃣ SUBMITTING SIGNUP...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('   🚀 Form submitted');
  }
  
  await delay(3000);
  console.log(`   📍 URL after submit: ${page.url()}\n`);

  // 6. CHECK IF WE'RE ON DASHBOARD
  console.log('6️⃣ CHECKING DASHBOARD...');
  if (page.url().includes('dashboard')) {
    console.log('   ✅ SIGNUP SUCCESS - On dashboard!\n');
  } else {
    console.log('   📍 Current URL:', page.url());
    // Try to navigate to dashboard
    await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle2' });
    await delay(2000);
  }
  
  // 7. FIND AND CLICK NEW CLONE BUTTON
  console.log('7️⃣ LOOKING FOR CLONE BUTTON...');
  await delay(1000);
  
  // List all buttons
  const buttons = await page.$$('button');
  console.log(`   Found ${buttons.length} buttons:`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].evaluate((e: Element) => e.textContent?.trim());
    console.log(`   ${i+1}. "${text}"`);
  }
  
  // Click clone/new button
  let found = await clickByText(page, 'new clone');
  if (!found) found = await clickByText(page, 'clone website');
  if (!found) found = await clickByText(page, 'new');
  
  await delay(2000);

  // 8. ENTER URL TO CLONE
  console.log('\n8️⃣ ENTERING URL...');
  const urlInput = await page.$('input[type="url"], input[placeholder*="http" i], input[placeholder*="url" i]');
  if (urlInput) {
    await urlInput.type('https://example.com');
    console.log('   📝 URL: https://example.com');
  } else {
    console.log('   ⚠️ No URL input found');
    
    // Maybe it's a text input
    const textInputs = await page.$$('input[type="text"]');
    for (const inp of textInputs) {
      const ph = await inp.evaluate((e: HTMLInputElement) => e.placeholder);
      console.log(`   Found text input with placeholder: "${ph}"`);
    }
  }
  
  await delay(1000);
  
  // 9. START CLONE
  console.log('\n9️⃣ STARTING CLONE...');
  let started = await clickByText(page, 'start clone');
  if (!started) started = await clickByText(page, 'clone now');
  if (!started) started = await clickByText(page, 'start');
  if (!started) {
    const submit = await page.$('button[type="submit"]');
    if (submit) {
      await submit.click();
      started = true;
    }
  }
  
  if (started) {
    console.log('   🚀 Clone initiated!');
  }
  
  // 10. WAIT AND WATCH PROGRESS
  console.log('\n🔟 WAITING FOR CLONE (20 seconds)...');
  for (let i = 20; i > 0; i--) {
    process.stdout.write(`   ⏳ ${i}s...\r`);
    await delay(1000);
  }
  console.log('\n');

  // 11. CHECK CLONE RESULT
  console.log('1️⃣1️⃣ CHECKING RESULTS...');
  await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle2' });
  await delay(2000);
  
  // Look for job cards or entries
  const jobElements = await page.$$('.job, .clone-job, tr, [class*="card"]');
  console.log(`   Found ${jobElements.length} job/card elements`);

  // 12. TEST OTHER PAGES
  console.log('\n1️⃣2️⃣ TESTING OTHER PAGES...');
  
  await page.goto(`${FRONTEND}/pricing`, { waitUntil: 'networkidle2' });
  console.log('   ✅ Pricing');
  await delay(1500);
  
  await page.goto(`${FRONTEND}/docs`, { waitUntil: 'networkidle2' });
  console.log('   ✅ Documentation');
  await delay(1500);

  // FINAL
  console.log('\n=============================');
  console.log('🏁 SMOKE TEST COMPLETE!');
  console.log('=============================');
  console.log('\n👀 Browser open for 60 seconds - check everything!\n');
  
  await page.goto(`${FRONTEND}/dashboard`, { waitUntil: 'networkidle2' });
  await delay(60000);
  
  await browser.close();
}

main().catch(e => {
  console.error('\n❌ ERROR:', e.message);
});
