// End-to-end smoke test: walks the whole questionnaire and checks the report and broker dashboard.
// Usage: node e2e/flow.cjs [baseUrl] [screenshotDir]
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const shots = process.argv[3];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => m.type() === 'error' && errors.push(m.text()));
  const snap = async n => shots && p.screenshot({ path: `${shots}/${n}.png`, fullPage: true });
  const choose = async name => { await p.getByRole('radio', { name }).first().click(); await p.waitForTimeout(700); };
  const cont = async () => { await p.getByRole('button', { name: /^(Continue|See my results)/ }).click(); await p.waitForTimeout(450); };
  const money = async (label, v) => { await p.getByLabel(label, { exact: false }).first().fill(String(v)); };
  const heading = async () => (await p.locator('h1').first().innerText()).trim();

  await p.goto(base); await snap('01-landing');
  await p.getByRole('link', { name: /Check my readiness/ }).click();
  await choose(/Just me/); await snap('02-mode');
  await choose(/Yes, first home/);
  await p.getByLabel('Age in years').fill('31'); await cont();
  await choose(/Australian citizen/);
  await choose(/Full-time/);
  await choose(/More than 3 years/);
  await money('Base pay before tax', 112000); await snap('03-income'); await cont();
  await money('Overtime', 6000); await cont();
  await money('Savings', 105000); await cont();
  await money('Credit card limits', 10000); await money('HECS/HELP balance', 15000); await snap('04-debts'); await cont();
  await cont(); // household default: just me
  await p.getByRole('button', { name: /Skip — none/ }).click(); await p.waitForTimeout(450);
  await choose(/Live in it/);
  await cont(); // dwelling defaults
  await p.getByRole('radio', { name: 'WA' }).click(); await cont();
  await money('Roughly what price', 640000);
  await p.getByRole('button', { name: /Work it out from my savings/ }).click(); await p.waitForTimeout(400);
  await snap('05-price'); await cont();
  await cont(); // defaults: no
  await p.getByRole('button', { name: /don’t know it/ }).click();
  await p.waitForTimeout(3200);
  console.log('REPORT URL', p.url());
  console.log('HEADLINE', await heading());
  await snap('06-report');
  const fixes = await p.locator('text=Try it').count();
  console.log('FIXES', fixes);
  if (fixes) { await p.getByRole('button', { name: 'Try it' }).first().click(); await p.waitForTimeout(800); console.log('AFTER TRY', await heading()); await snap('07-whatif'); }
  await p.getByRole('button', { name: /Connect with a broker/ }).first().click();
  await p.getByLabel('Name').fill('Test Buyer'); await p.getByLabel('Email').fill('test@example.com'); await p.getByLabel('Mobile').fill('0400 000 000');
  await p.getByRole('checkbox').check(); await snap('08-connect');
  await p.getByRole('button', { name: /Send my report/ }).click(); await p.waitForTimeout(600);
  console.log('CONNECT', await p.locator('#connect-title').innerText());
  await p.goto(base + '#/broker'); await p.waitForTimeout(600);
  console.log('BROKER LEADS', await p.locator('main li').count()); await snap('09-broker');

  // Mobile pass
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  m.on('pageerror', e => errors.push('mobile: ' + e.message));
  await m.goto(base); if (shots) await m.screenshot({ path: `${shots}/m1-landing.png`, fullPage: true });
  await m.goto(base + '#/check'); await m.waitForTimeout(400); if (shots) await m.screenshot({ path: `${shots}/m2-check.png` });
  await m.goto(base + '#/report?sample'); await m.waitForTimeout(800); if (shots) await m.screenshot({ path: `${shots}/m3-report.png`, fullPage: true });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log('MOBILE H-OVERFLOW', overflow);
  console.log('ERRORS', JSON.stringify(errors));
  await b.close();
  if (errors.length || overflow) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
