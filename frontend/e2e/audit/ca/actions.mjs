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

const STEPS = {
 customer: [
  ['/rfqs', t=>t.getByText('Q1 FY27 open lanes').first().click(), 'rfq-detail'],
  ['/contracts', t=>t.getByText('CON-2026-000001').first().click(), 'contract-detail'],
  ['/team', t=>t.getByRole('button',{name:'Add person'}).click(), 'team-add'],
  ['/settings?tab=billing', async t=>{}, 'billing'],
  ['/network', t=>t.getByRole('tab',{name:'Discover'}).or(t.getByText('Discover',{exact:true})).first().click(), 'net-discover'],
  ['/loads', t=>t.getByRole('button',{name:'Filter'}).click(), 'loads-filter'],
 ],
 admin: [
  ['/plans', t=>t.getByRole('button',{name:'New plan'}).click(), 'plan-new'],
  ['/admins', t=>t.getByRole('button',{name:'Add admin'}).click(), 'admin-add'],
  ['', t=>t.getByRole('tab',{name:/Approved/}).or(t.getByText('Approved',{exact:false}).first()).first().click().then(()=>t.waitForTimeout(1500)).then(()=>t.locator('tbody tr, [role=row]').nth(1).click()), 'company-detail'],
  ['/subscriptions', t=>t.getByText('Demo Steel Pvt Ltd').first().click(), 'sub-detail'],
  ['/payments', t=>t.getByText('Demo Brokers').first().click(), 'pay-detail'],
 ]};
const browser = await chromium.launch(); const issues=[];
for (const [name,a] of Object.entries(ACTORS)) {
  const ctx = await browser.newContext({ viewport:{width:1280,height:860} }); const page = await ctx.newPage();
  page.on('console', m => { if (m.type()==='error') issues.push(`${name} console ${page.url()}: ${m.text().slice(0,160)}`); });
  await page.goto(BASE+'/login'); const n0=count(a.email);
  await page.locator('#email').fill(a.email); await page.getByPlaceholder('Your password').fill(a.pw);
  await page.getByRole('button',{name:'Log in'}).click(); await page.waitForURL('**/login/verify');
  const code=await codeFor(a.email,n0); await page.locator('#otp').focus(); await page.keyboard.type(code);
  await page.getByRole('button',{name:'Log in'}).click(); await page.waitForURL('**'+a.home,{timeout:30000});
  for (const [p,act,tag] of STEPS[name]) for (const vp of [{width:1280,height:860,t:'d'},{width:390,height:844,t:'m'}]) {
    await page.setViewportSize(vp); await page.goto(BASE+a.home+p); await page.waitForTimeout(2500);
    try { await act(page); } catch(e) { issues.push(`${name} ${tag} ${vp.t} action failed: ${e.message.split('\n')[0]}`); }
    await page.waitForTimeout(2000);
    if (await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)) issues.push(`${name} ${tag} ${vp.t} overflow`);
    await page.screenshot({path:`${OUT}x-${name}-${vp.t}-${tag}.png`,fullPage:true});
  }
  await ctx.close();
}
await browser.close(); console.log(issues.join('\n'));
