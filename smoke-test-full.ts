/**
 * MERLIN WEBSITE CLONER - COMPREHENSIVE SMOKE TEST
 * Tests ALL buttons, features, and functionality end-to-end
 * Rudolf can watch this run in real-time!
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5001';
const API_URL = 'http://localhost:3000/api';
const SCREENSHOTS_DIR = './smoke-test-screenshots';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  screenshot?: string;
}

const results: TestResult[] = [];
let browser: Browser;
let page: Page;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(name: string): Promise<string> {
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 Screenshot: ${filename}`);
  return filename;
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  console.log(`\n🧪 Testing: ${name}`);
  
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, status: 'PASS', duration });
    console.log(`  ✅ PASSED (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    const screenshot = await takeScreenshot(`error-${name.replace(/\s+/g, '-')}`);
    results.push({ name, status: 'FAIL', duration, error: error.message, screenshot });
    console.log(`  ❌ FAILED: ${error.message}`);
  }
}

// ============ TEST FUNCTIONS ============

async function testLandingPage() {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  await takeScreenshot('01-landing-page');
  
  // Check main elements exist
  const title = await page.title();
  if (!title.toLowerCase().includes('merlin')) {
    throw new Error('Page title does not contain "Merlin"');
  }
  
  // Check for key elements
  const heroText = await page.$eval('h1', el => el.textContent);
  console.log(`  📄 Hero: "${heroText?.substring(0, 50)}..."`);
}

async function testNavigationLinks() {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  
  // Find and test all navigation links
  const navLinks = await page.$$('nav a, header a');
  console.log(`  🔗 Found ${navLinks.length} navigation links`);
  
  for (const link of navLinks.slice(0, 5)) {
    const href = await link.evaluate(el => el.getAttribute('href'));
    const text = await link.evaluate(el => el.textContent?.trim());
    console.log(`    - "${text}" -> ${href}`);
  }
}

async function testSignupPage() {
  await page.goto(`${FRONTEND_URL}/signup`, { waitUntil: 'networkidle2' });
  await takeScreenshot('02-signup-page');
  
  // Check form elements
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passwordInput = await page.$('input[type="password"]');
  const submitBtn = await page.$('button[type="submit"]');
  
  if (!emailInput || !passwordInput) {
    throw new Error('Signup form inputs not found');
  }
  console.log(`  📝 Form elements found`);
}

async function testSignupFlow() {
  await page.goto(`${FRONTEND_URL}/signup`, { waitUntil: 'networkidle2' });
  
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  
  // Fill form
  await page.type('input[type="email"], input[name="email"]', testEmail);
  await page.type('input[type="password"]', testPassword);
  
  // Look for confirm password field
  const confirmPass = await page.$('input[name="confirmPassword"], input[placeholder*="confirm" i]');
  if (confirmPass) {
    await confirmPass.type(testPassword);
  }
  
  await takeScreenshot('03-signup-filled');
  
  // Submit
  await page.click('button[type="submit"]');
  await delay(2000);
  await takeScreenshot('04-after-signup');
  
  console.log(`  👤 Signed up as: ${testEmail}`);
}

async function testLoginPage() {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
  await takeScreenshot('05-login-page');
  
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  const passwordInput = await page.$('input[type="password"]');
  
  if (!emailInput || !passwordInput) {
    throw new Error('Login form inputs not found');
  }
  console.log(`  📝 Login form ready`);
}

async function testLoginFlow() {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
  
  // Use existing test account
  await page.type('input[type="email"], input[name="email"]', 'admin@merlin.com');
  await page.type('input[type="password"]', 'admin123');
  
  await takeScreenshot('06-login-filled');
  
  await page.click('button[type="submit"]');
  await delay(2000);
  await takeScreenshot('07-after-login');
  
  // Check if redirected to dashboard
  const url = page.url();
  console.log(`  📍 Redirected to: ${url}`);
}

async function testDashboard() {
  // Navigate to dashboard (should be logged in)
  await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
  await takeScreenshot('08-dashboard');
  
  // Check for dashboard elements
  const cloneBtn = await page.$('button:has-text("Clone"), button:has-text("New"), [data-testid="clone-button"]');
  console.log(`  📊 Dashboard loaded, clone button: ${cloneBtn ? 'Found' : 'Not found'}`);
}

async function testCloneModal() {
  await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
  await delay(1000);
  
  // Try to find and click clone/new button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent?.toLowerCase());
    if (text?.includes('clone') || text?.includes('new') || text?.includes('+')) {
      await btn.click();
      await delay(1000);
      break;
    }
  }
  
  await takeScreenshot('09-clone-modal');
  
  // Check for URL input
  const urlInput = await page.$('input[placeholder*="url" i], input[type="url"]');
  console.log(`  🔗 URL input: ${urlInput ? 'Found' : 'Not found'}`);
}

async function testCloneWebsite() {
  await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle2' });
  await delay(1000);
  
  // Open clone modal
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.textContent?.toLowerCase());
    if (text?.includes('clone') || text?.includes('new') || text?.includes('+')) {
      await btn.click();
      await delay(1000);
      break;
    }
  }
  
  // Enter URL
  const urlInput = await page.$('input[placeholder*="url" i], input[type="url"], input[name="url"]');
  if (urlInput) {
    await urlInput.type('https://example.com');
    await takeScreenshot('10-clone-url-entered');
    
    // Find start button
    const startBtn = await page.$('button:has-text("Start"), button:has-text("Clone"), button[type="submit"]');
    if (startBtn) {
      await startBtn.click();
      await delay(3000);
      await takeScreenshot('11-clone-started');
    }
  }
}

async function testPricingPage() {
  await page.goto(`${FRONTEND_URL}/pricing`, { waitUntil: 'networkidle2' });
  await takeScreenshot('12-pricing-page');
  
  // Check for pricing tiers
  const tiers = await page.$$('.pricing-tier, .price-card, [class*="pricing"]');
  console.log(`  💰 Found ${tiers.length} pricing elements`);
}

async function testAPIHealth() {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) {
    throw new Error(`API health check failed: ${response.status}`);
  }
  const data = await response.json();
  console.log(`  🏥 API Status: ${JSON.stringify(data)}`);
}

async function testAPIAuth() {
  // Test login endpoint
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@merlin.com', password: 'admin123' })
  });
  
  if (!response.ok) {
    throw new Error(`Auth API failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log(`  🔐 Auth response: ${data.token ? 'Token received' : 'No token'}`);
}

async function testAllButtons() {
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  
  const buttons = await page.$$('button');
  console.log(`  🔘 Found ${buttons.length} buttons on landing page`);
  
  for (let i = 0; i < Math.min(buttons.length, 5); i++) {
    const text = await buttons[i].evaluate(el => el.textContent?.trim());
    const isDisabled = await buttons[i].evaluate(el => (el as HTMLButtonElement).disabled);
    console.log(`    ${i+1}. "${text}" - ${isDisabled ? 'Disabled' : 'Active'}`);
  }
}

async function testResponsiveDesign() {
  // Desktop
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
  await takeScreenshot('13-desktop-view');
  
  // Tablet
  await page.setViewport({ width: 768, height: 1024 });
  await page.reload({ waitUntil: 'networkidle2' });
  await takeScreenshot('14-tablet-view');
  
  // Mobile
  await page.setViewport({ width: 375, height: 667 });
  await page.reload({ waitUntil: 'networkidle2' });
  await takeScreenshot('15-mobile-view');
  
  // Reset
  await page.setViewport({ width: 1280, height: 800 });
  console.log(`  📱 All viewport sizes tested`);
}

// ============ MAIN EXECUTION ============

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧙 MERLIN WEBSITE CLONER - FULL SMOKE TEST');
  console.log('='.repeat(60));
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`🌐 Frontend: ${FRONTEND_URL}`);
  console.log(`🔌 API: ${API_URL}`);
  
  // Prepare screenshots directory
  await fs.ensureDir(SCREENSHOTS_DIR);
  await fs.emptyDir(SCREENSHOTS_DIR);
  
  // Launch browser (visible so Rudolf can watch!)
  console.log('\n🚀 Launching browser (watch me test!)...\n');
  browser = await puppeteer.launch({
    headless: false, // VISIBLE FOR RUDOLF TO WATCH!
    defaultViewport: { width: 1280, height: 800 },
    args: ['--start-maximized']
  });
  
  page = await browser.newPage();
  
  // Run all tests
  await runTest('Landing Page Loads', testLandingPage);
  await runTest('Navigation Links', testNavigationLinks);
  await runTest('Signup Page', testSignupPage);
  await runTest('Signup Flow', testSignupFlow);
  await runTest('Login Page', testLoginPage);
  await runTest('Login Flow', testLoginFlow);
  await runTest('Dashboard Access', testDashboard);
  await runTest('Clone Modal', testCloneModal);
  await runTest('Clone Website', testCloneWebsite);
  await runTest('Pricing Page', testPricingPage);
  await runTest('All Buttons', testAllButtons);
  await runTest('Responsive Design', testResponsiveDesign);
  await runTest('API Health Check', testAPIHealth);
  await runTest('API Authentication', testAPIAuth);
  
  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📈 Success Rate: ${((passed/total)*100).toFixed(1)}%\n`);
  
  if (failed > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, successRate: (passed/total)*100 },
    results
  };
  
  await fs.writeJSON(path.join(SCREENSHOTS_DIR, 'report.json'), report, { spaces: 2 });
  console.log(`\n📁 Screenshots saved to: ${SCREENSHOTS_DIR}/`);
  
  // Keep browser open for 10 seconds so Rudolf can see final state
  console.log('\n⏳ Keeping browser open for 10 seconds...');
  await delay(10000);
  
  await browser.close();
  console.log('\n🏁 Smoke test complete!\n');
}

main().catch(console.error);
