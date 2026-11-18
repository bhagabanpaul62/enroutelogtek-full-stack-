// UX audit customer+admin: node e2e/audit/ca/audit.mjs  (screens -> ca/shots)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const LOG = '/private/tmp/claude-501/-Users-sumanjana-Desktop-enroutelogtek-full-stack-/33131c91-1438-4236-b37e-1df6ee528de8/scratchpad/backend.log';
const OUT = new URL('./shots/', import.meta.url).pathname; fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:3001';
const ACTORS = {
  customer: { email: 'customer@enroute.local', pw: 'Demo@12345', home: '/customer',
    pages: ['', '/network', '/loads', '/rfqs', '/contracts', '/trips', '/reports', '/team', '/settings', '/loads/new', '/rfqs/new', '/rfqs/import'], lists: ['/loads', '/rfqs', '/contracts', '/trips'] },
  admin: { email: 'admin@enroute.local', pw: 'Admin@12345', home: '/rootAdmin',
    pages: ['', '/companies', '/users', '/admins', '/plans', '/subscriptions', '/payments'], lists: ['/companies', '/subscriptions'] },
};
const re = (e) => new RegExp(`Login code for ${e.replace(/\./g, '\\.')}: (\\d+)`, 'g');
const count = (e) => [...fs.readFileSync(LOG, 'utf8').matchAll(re(e))].length;
const codeFor = async (e, n0) => { for (let i = 0; i < 80; i++) { const m = [...fs.readFileSync(LOG, 'utf8').matchAll(re(e))]; if (m.length > n0) return m.at(-1)[1]; await new Promise(r => setTimeout(r, 250)); } throw new Error('no code'); };
const browser = await chromium.launch();
const issues = [];
for (const [name, a] of Object.entries(ACTORS)) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') issues.push(`${name} console ${page.url()}: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', e => issues.push(`${name} pageerror ${page.url()}: ${e.message.slice(0, 160)}`));
  await page.goto(BASE + '/login'); const n0 = count(a.email);
  await page.locator('#email').fill(a.email); await page.getByPlaceholder('Your password').fill(a.pw);
  await page.getByRole('button', { name: 'Log in' }).click(); await page.waitForURL('**/login/verify');
  const code = await codeFor(a.email, n0); await page.locator('#otp').focus(); await page.keyboard.type(code);
  await page.getByRole('button', { name: 'Log in' }).click(); await page.waitForURL('**' + a.home, { timeout: 30000 });
  for (const vp of [{ width: 1280, height: 860, t: 'd' }, { width: 390, height: 844, t: 'm' }]) {
    await page.setViewportSize(vp);
    const targets = [...a.pages.map(p => [p, p]), ...a.lists.map(l => [l + '#first', l])];
    for (const [key, p] of targets) {
      await page.goto(BASE + a.home + p); await page.waitForTimeout(2500);
      if (key.endsWith('#first')) {
        const row = page.locator('tbody tr, [role=row]:not([role=columnheader]), a[href*="' + a.home + p + '/"]').first();
        if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(2500); } else issues.push(`${name} ${p} ${vp.t} no rows to click`);
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) issues.push(`${name} ${page.url()} ${vp.t}: horizontal overflow`);
      await page.screenshot({ path: `${OUT}${name}-${vp.t}-${key.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`, fullPage: true });
    }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(new URL('./issues.txt', import.meta.url).pathname, issues.join('\n'));
console.log(issues.join('\n'));
