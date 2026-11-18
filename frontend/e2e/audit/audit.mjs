// UX audit scratch script: node e2e/audit/audit.mjs  (needs dev stack on :3001/:8000)
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const LOG = '/private/tmp/claude-501/-Users-sumanjana-Desktop-enroutelogtek-full-stack-/33131c91-1438-4236-b37e-1df6ee528de8/scratchpad/backend.log';
const BASE = 'http://localhost:3001';
const OUT = new URL('./shots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const ACTORS = {
  transporter: { email: 'transporter@enroute.local', home: '/transporter', slugs: ['', 'network', 'rfqs', 'bids', 'contracts', 'fleet', 'drivers', 'trips', 'reports', 'team', 'settings', 'settings?tab=billing'] },
  fleetowner: { email: 'fleetowner@enroute.local', home: '/fleet-owner', slugs: ['', 'network', 'loads', 'vehicles', 'drivers', 'trips', 'earnings', 'reports', 'team', 'settings'] },
  broker: { email: 'broker@enroute.local', home: '/broker', slugs: ['', 'network', 'loads', 'transporters', 'fleet-owners', 'trips', 'reports', 'team', 'settings'] },
};
const count = (e) => [...fs.readFileSync(LOG, 'utf8').matchAll(new RegExp(`Login code for ${e.replace(/\./g, '\\.')}: `, 'g'))].length;
async function code(e, seen) { const re = new RegExp(`Login code for ${e.replace(/\./g, '\\.')}: (\\d{6})`, 'g'); for (let i = 0; i < 100; i++) { const m = [...fs.readFileSync(LOG, 'utf8').matchAll(re)]; if (m.length > seen) return m.at(-1)[1]; await new Promise(r => setTimeout(r, 100)); } throw new Error('no code'); }
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '_') || 'home';
const findings = [];
const browser = await chromium.launch();
for (const [actor, cfg] of Object.entries(ACTORS)) {
  if (process.env.ONLY && process.env.ONLY !== actor) continue;
  const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p0 = await ctx0.newPage();
  await p0.goto(BASE + '/login');
  const before = count(cfg.email);
  await p0.locator('#email').fill(cfg.email);
  await p0.getByPlaceholder('Your password').fill('Demo@12345');
  await p0.getByRole('button', { name: 'Log in' }).click();
  await p0.waitForURL('**/login/verify');
  const c = await code(cfg.email, before);
  await p0.locator('#otp').focus(); await p0.keyboard.type(c);
  await p0.getByRole('button', { name: 'Log in' }).click();
  await p0.waitForURL('**' + cfg.home, { timeout: 30000 });
  const state = await ctx0.storageState();
  await ctx0.close();
  for (const [vp, size] of [...(process.env.MOBILE_ONLY ? [] : [['d', { width: 1280, height: 860 }]]), ['m', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: size, storageState: state });
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
    page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160)));
    const visit = async (url, tag) => {
      errs.length = 0;
      await page.goto(BASE + url, { waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${OUT}${actor}_${vp}_${tag}.png`, fullPage: true });
      const info = await page.evaluate(() => {
        const t = document.body.innerText;
        return { overflow: document.documentElement.scrollWidth - window.innerWidth, iso: (t.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g) || []).slice(0, 3), uuid: (t.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) || []).slice(0, 3), perm: (t.match(/\b[a-z]+\.(manage|view|create|update|delete)\b/g) || []).slice(0, 3), url: location.pathname + location.search, h1: document.querySelector('h1')?.innerText };
      });
      findings.push({ actor, vp, tag, ...info, errs: [...errs] });
    };
    for (const s of cfg.slugs) {
      const url = s.startsWith('settings?') ? `${cfg.home}/${s}` : s ? `${cfg.home}/${s}` : cfg.home;
      await visit(url, slug(s));
      // detail: first row link
      if (!['', 'settings', 'reports', 'team', 'network', 'earnings'].includes(s) && !s.includes('?')) {
        const row = page.locator('a[href*="' + cfg.home + '/' + s + '/"], tbody tr, [role="row"]:not([role="columnheader"]), [data-row]').first();
        if (await row.count()) {
          errs.length = 0;
          await row.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(1800);
          if (page.url().replace(BASE, '') !== url) {
            await page.screenshot({ path: `${OUT}${actor}_${vp}_${slug(s)}_detail.png`, fullPage: true });
            const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            findings.push({ actor, vp, tag: slug(s) + '_detail', url: page.url().replace(BASE, ''), overflow: ov, errs: [...errs] });
          }
        }
      }
      // primary action: first button with create-ish label in main
      if (vp === 'd') {
        await page.goto(BASE + url).catch(() => {}); await page.waitForTimeout(1200);
        const btn = page.getByRole('button', { name: /^(new|add|create|invite|upload|post|import)/i }).first();
        if (await btn.count()) {
          const label = (await btn.innerText()).trim();
          await btn.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(900);
          await page.screenshot({ path: `${OUT}${actor}_d_${slug(s)}_modal.png` });
          findings.push({ actor, vp, tag: slug(s) + '_modal', action: label, dialog: await page.locator('[role=dialog]').count() });
          await page.keyboard.press('Escape'); await page.waitForTimeout(300);
        }
      }
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(new URL(process.env.ONLY ? './findings_' + process.env.ONLY + '.json' : './findings.json', import.meta.url), JSON.stringify(findings, null, 1));
console.log(JSON.stringify(findings.filter(f => f.overflow > 0 || f.iso?.length || f.uuid?.length || f.perm?.length || f.errs?.length), null, 1));
