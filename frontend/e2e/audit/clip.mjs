// clip.mjs: crops top 1100px of a full-page screenshot via a data-URL page
import { chromium } from '@playwright/test'; import fs from 'node:fs';
const [,, src, out, h='1100'] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: +h } });
await p.setContent(`<body style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(src).toString('base64')}" style="width:390px;display:block"></body>`);
await p.screenshot({ path: out }); await b.close();
