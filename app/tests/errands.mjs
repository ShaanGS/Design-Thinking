// Errand checks: node tests/errands.mjs http://localhost:3000
// Errands are real-web only (Claude operating real sites). Without ANTHROPIC_API_KEY on the server they must say so
// and refuse, never fake a result. With the key, a real lookup runs end to end. The browser check opens the real
// sites Saathi uses, to catch blocked hosts or a missing Chromium before a demo.
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); } };
async function call(method, path, token, body) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const signIn = async (persona) => (await call("POST", "/api/auth/demo", null, { persona })).body.token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Errand checks against ${BASE}`);
const paati = await signIn("elder");
let r = await call("GET", "/api/errands", paati);
ok(r.status === 200 && typeof r.body.available === "boolean", "errands report whether the agent is available");
const available = r.body.available;
r = await call("POST", "/api/errands", null, { kind: "web_lookup", request: "x" });
ok(r.status === 401, "errands need a session");
r = await call("POST", "/api/errands", paati, { kind: "book_gas", request: "x" });
ok(r.status === 400, "made-up errand kinds are refused");

if (!available) {
  r = await call("POST", "/api/errands", paati, { kind: "web_lookup", request: "Kapaleeshwarar temple timings" });
  ok(r.status === 409 && /ANTHROPIC_API_KEY/.test(r.body.error || ""), "without the Claude key, errands refuse instead of faking", JSON.stringify(r.body));
  const c = await call("POST", "/api/voice/calls", paati, { lang: "en" });
  const t = await call("POST", `/api/voice/calls/${c.body.callId}/tools/start_errand`, paati, { kind: "web_lookup", details: "temple timings" });
  ok(t.body.ok === false && /switched off/.test(t.body.error || ""), "on the call, Saathi says it can't rather than pretending");
  await call("POST", `/api/voice/calls/${c.body.callId}/end`, paati);
} else {
  r = await call("POST", "/api/errands", paati, { kind: "web_lookup", request: "What time does Kapaleeshwarar Temple in Mylapore open in the morning?" });
  ok(r.status === 200 && r.body.id, "a real lookup starts");
  let e = null;
  for (let i = 0; i < 120; i++) { await sleep(1500); e = (await call("GET", "/api/errands", paati)).body.errands.find((x) => x.id === r.body.id); if (e && e.status !== "running") break; }
  ok(e?.status === "done" && (e.result || "").length > 20, "the lookup finishes with a real answer", `${e?.status}: ${e?.result}`);
  console.log(`    → ${e?.result}`);
}

// The real sites Saathi operates load in the server's browser
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
const ctx = await browser.newContext({ ignoreHTTPSErrors: !!process.env.HTTPS_PROXY, locale: "en-IN" });
for (const [name, url, expect] of [
  ["Apollo Pharmacy search", "https://www.apollopharmacy.in/search-medicines/clopidogrel", /clopi/i],
  ["TNPDCL quick pay", "https://www.tnebnet.org/qwp/qpay", /Consumer Number/i],
]) {
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); await page.getByText(expect).first().waitFor({ timeout: 25000 }); ok(true, `real site loads: ${name}`); }
  catch (err) { ok(false, `real site loads: ${name}`, err.message.split("\n")[0]); }
  await page.close();
}
await browser.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
