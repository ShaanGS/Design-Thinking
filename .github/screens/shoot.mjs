// Screenshots of the live app for the pitch deck: phone screens at 3x, plus the stage view.
// Runs in GitHub Actions (the dev container can't reach the live site, map tiles or routing).
import { chromium } from "playwright";
import fs from "node:fs";

const U = process.env.SITE || "https://saathi-app-eta.vercel.app";
const OUT = process.argv[2] || "out";
fs.mkdirSync(OUT, { recursive: true });
const post = (p, b, t) => fetch(U + p, { method: "POST", headers: { "content-type": "application/json", ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(b || {}) }).then((r) => r.json());
const get = (p, t) => fetch(U + p, { headers: { authorization: `Bearer ${t}` } }).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const login = async (persona) => (await post("/api/auth/demo", { persona })).token;

const reset = async () => { await post("/api/demo/reset", {}, await login("guardian")); };
await reset();

const browser = await chromium.launch();
async function phone(persona, path, name, { wait = 3500, after } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, timezoneId: "Asia/Kolkata", locale: "en-IN" });
  if (persona) { const t = await login(persona); await ctx.addInitScript((tok) => localStorage.setItem("saathi-token", tok), t); }
  const pg = await ctx.newPage();
  await pg.goto(U + path, { waitUntil: "networkidle" }).catch(() => {});
  await sleep(wait);
  if (after) await after(pg);
  await pg.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
  return { pg, ctx };
}
const done = async (x) => x.ctx.close();

// Calm state
await done(await phone(null, "/", "landing"));
await done(await phone("elder", "/elder", "elder-home"));
await done(await phone("guardian", "/family", "family-home"));
await done(await phone("guardian", "/family/vault", "vault"));
await done(await phone("guardian", "/family/meds", "meds"));
await done(await phone("hospital", "/hospital", "er-calm"));
await done(await phone("hospital", "/hospital/network", "er-network"));
await done(await phone("guardian", "/family/family?card=1", "card", { wait: 4000 }));
const card = await get("/api/card", await login("guardian"));
if (card.cardToken) await done(await phone(null, `/help/${card.cardToken}`, "bystander"));
await done(await phone("guardian", "/family/emergency?cpr=1", "cpr", {
  after: async (pg) => { await pg.getByText("Start compressions").click().catch(() => {}); await sleep(2200); },
}));

// Live emergency: Paati's SOS, then every screen reacts
await post("/api/sos", { condition: "cardiac", source: "app" }, await login("elder"));
await sleep(5000);
const fam = await phone("guardian", "/family/emergency", "family-emergency", { wait: 6000 });
const map = fam.pg.locator(".leaflet-container").first();
if (await map.count()) { await map.scrollIntoViewIfNeeded(); await sleep(2500); await map.screenshot({ path: `${OUT}/map.png` }); console.log("shot map"); }
await fam.pg.screenshot({ path: `${OUT}/family-emergency-full.png`, fullPage: true });
await done(fam);
await done(await phone("hospital", "/hospital", "er-incoming"));
await done(await phone("elder", "/elder", "elder-emergency"));
await done(await phone("guardian", "/family", "family-alert"));

// Stage view (three phones) during the emergency
const sctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, timezoneId: "Asia/Kolkata" });
const st = await sctx.newPage();
await st.goto(U + "/stage", { waitUntil: "networkidle" }).catch(() => {});
await sleep(9000);
await st.screenshot({ path: `${OUT}/stage.png` });
console.log("shot stage");
await sctx.close();

await browser.close();
await reset();
