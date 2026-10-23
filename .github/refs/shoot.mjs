// Screenshots design-reference galleries listed in urls.txt ("name url" per line) for study.
import { chromium } from 'playwright';
import fs from 'fs';
const lines = fs.readFileSync('.github/refs/urls.txt', 'utf8').trim().split('\n').map((l) => l.trim().split(/\s+/));
fs.mkdirSync('.github/refs/out', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
for (const [name, url] of lines) {
  const pg = await ctx.newPage();
  try {
    await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await pg.waitForTimeout(4000);
    for (let i = 0; i < 6; i++) { await pg.mouse.wheel(0, 900); await pg.waitForTimeout(900); }
    await pg.evaluate(() => window.scrollTo(0, 0)); await pg.waitForTimeout(1500);
    await pg.screenshot({ path: `.github/refs/out/${name}.jpg`, fullPage: true, type: 'jpeg', quality: 70 });
    // also save the biggest images on the page
    const srcs = await pg.evaluate(() => [...document.images].filter((i) => i.naturalWidth >= 600).map((i) => i.currentSrc || i.src).slice(0, 12));
    fs.writeFileSync(`.github/refs/out/${name}.txt`, srcs.join('\n'));
    let k = 0;
    for (const s of srcs) {
      try { const r = await ctx.request.get(s, { timeout: 20000 }); if (r.ok()) fs.writeFileSync(`.github/refs/out/${name}-${k++}.${(r.headers()['content-type'] || '').includes('png') ? 'png' : 'jpg'}`, await r.body()); } catch {}
    }
    console.log('ok', name, srcs.length);
  } catch (e) { console.log('fail', name, e.message); }
  await pg.close();
}
await b.close();
