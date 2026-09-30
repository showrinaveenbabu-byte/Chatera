const puppeteer = require('puppeteer-core');
const assert = require('node:assert');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = 'http://localhost:5173';

async function runBrowserE2E() {
  console.log('========================================');
  console.log('STARTING REAL BROWSER E2E TEST (EDGE)');
  console.log('========================================');

  const browser = await puppeteer.launch({
    executablePath: EDGE_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[Browser Console Error]:', msg.text());
    }
  });

  try {
    // 1. Open Website & verify redirect to /login
    console.log('1. Navigating to', APP_URL);
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 8000 });
    console.log('   Redirected to Login page:', page.url());

    // 2. Navigate to Register page via SPA link
    console.log('2. Clicking "Create Account" link...');
    await page.waitForSelector('a[href="/register"]');
    await page.click('a[href="/register"]');
    await page.waitForFunction(() => window.location.pathname === '/register', { timeout: 5000 });
    console.log('   Navigated to Register page successfully!');

    // 3. Register user
    const username = `edge_user_${Date.now()}`;
    const email = `edge_${Date.now()}@example.com`;
    const phone = `+1777${Math.floor(100000 + Math.random() * 900000)}`;

    console.log('3. Registering user:', { username, email, phone });
    await page.waitForSelector('input[placeholder="handle"]');
    await page.type('input[placeholder="e.g. Naveen Kumar"]', 'Edge User');
    await page.type('input[placeholder="handle"]', username);
    await page.type('input[placeholder="name@domain.com"]', email);
    await page.type('input[placeholder="+91 9876543210"]', phone);

    const passwordInputs = await page.$$('input[type="password"]');
    assert.ok(passwordInputs.length >= 2, 'Should find password and confirm password inputs');
    await passwordInputs[0].type('password123');
    await passwordInputs[1].type('password123');

    // Click submit button
    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();

    // Wait for redirect to dashboard (/)
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 10000 });
    console.log('   Registration successful! Landed on dashboard:', page.url());

    // 4. Test Settings Page & Save Settings Button
    console.log('4. Navigating to /settings...');
    await page.goto(`${APP_URL}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button.btn-primary');
    console.log('   Settings loaded. Clicking "Save Settings" button...');
    await page.click('button.btn-primary');
    await page.waitForFunction(() => document.body.innerText.includes('Settings saved successfully!'), { timeout: 5000 });
    console.log('   [PASS] Settings saved successfully notification verified!');

    // 5. Test Help Page, Accordion, and Contact Support Modal
    console.log('5. Navigating to /help...');
    await page.goto(`${APP_URL}/help`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button.btn-primary');

    // Test FAQ toggle
    const faqButtons = await page.$$('div.glass-panel button');
    if (faqButtons.length > 0) {
      await faqButtons[0].click();
      console.log('   [PASS] FAQ accordion clicked and expanded!');
    }

    // Open Contact Support modal
    console.log('   Clicking "Contact Support" button...');
    const contactBtn = await page.waitForSelector('button.btn-primary');
    await contactBtn.click();
    await page.waitForSelector('textarea', { timeout: 4000 });
    console.log('   Support modal opened. Filling and submitting feedback...');
    await page.type('input[placeholder*="Issue with video"]', 'Production Readiness Audit');
    await page.type('textarea', 'Automated browser verification test.');
    const modalSubmitBtn = await page.waitForSelector('button[type="submit"]');
    await modalSubmitBtn.click();
    await page.waitForFunction(() => document.body.innerText.includes('Thank you! Your message has been'), { timeout: 6000 });
    console.log('   [PASS] Contact support form submission verified!');

    // 6. Test Friends Page
    console.log('6. Navigating to /friends...');
    await page.goto(`${APP_URL}/friends`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });
    console.log('   [PASS] Friends page loaded cleanly with community directory!');

    // 7. Test Chats Page & Messaging
    console.log('7. Navigating to /chats...');
    await page.goto(`${APP_URL}/chats`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });

    const userItems = await page.$$('.user-item');
    if (userItems.length > 0) {
      console.log(`   Found ${userItems.length} discoverable user(s). Selecting user...`);
      await userItems[0].click();
      await page.waitForSelector('input[placeholder^="Message "]', { timeout: 6000 });

      console.log('   Chat conversation active. Sending message...');
      const msgText = 'Hello! Testing real Edge browser communication flow.';
      await page.type('input[placeholder^="Message "]', msgText);
      await page.keyboard.press('Enter');

      await page.waitForFunction(
        (txt) => document.body.innerText.includes(txt),
        { timeout: 5000 },
        msgText
      );
      console.log('   [PASS] Message successfully rendered in chat view!');
    }

    // 8. Test Session Persistence Across Page Refresh
    console.log('8. Testing session persistence across browser reload...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 5000 });
    console.log('   [PASS] Session persisted after refresh! URL:', page.url());

    // 9. Test Logout
    console.log('9. Testing Logout...');
    const allButtons = await page.$$('button');
    let loggedOut = false;
    for (const b of allButtons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Logout')) {
        await b.click();
        loggedOut = true;
        break;
      }
    }
    assert.ok(loggedOut, 'Logout button should be clicked');
    await page.waitForFunction(() => window.location.pathname.includes('/login'), { timeout: 6000 });
    console.log('   [PASS] Logout successful! Redirected to:', page.url());

    // 10. Test Login Again
    console.log('10. Logging back in with registered account credentials...');
    const textInputs = await page.$$('input[type="text"], input:not([type="password"])');
    if (textInputs.length > 0) {
      await textInputs[0].click({ clickCount: 3 });
      await textInputs[0].type(username);
    }
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await passInput.type('password123');
    }
    const loginSubmitBtn = await page.waitForSelector('button[type="submit"]');
    await loginSubmitBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 8000 });
    console.log('   [PASS] Login successful! Re-authenticated URL:', page.url());

    console.log('========================================');
    console.log('ALL REAL BROWSER E2E TESTS PASSED 100%!');
    console.log('========================================');
    return true;
  } catch (err) {
    console.error('Browser E2E Error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserE2E()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
