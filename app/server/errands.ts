// Errands: Saathi gets things done for the elder in a sandboxed browser while she is on the phone.
//
// Each errand gets a fresh, isolated browser context on the server. Two drivers operate it:
//  - "claude": Claude reads the page and decides each click and keystroke (needs ANTHROPIC_API_KEY);
//  - "scripted": fixed Playwright steps for each partner site, so the demo still works without a key.
// An errand pauses for anything that is hers to decide (which time slot, whether to pay a bill) and for anything
// that costs money, which waits for a family member to approve in the app. The family sees every step and a live
// picture of the browser. Nothing is paid, booked or entered beyond what the elder asked for.
import Anthropic from "@anthropic-ai/sdk";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { all, get, run, uid, nowIso, parse } from "./db.ts";
import * as S from "./store.ts";
import { toFamily } from "./realtime.ts";
import { PARTNER_PROFILE } from "./sites.ts";
import type { Errand, ErrandKind, ErrandStatus, Patient } from "../shared/types.ts";
import { ERRAND_TITLE } from "../shared/types.ts";

const PORT = Number(process.env.PORT || 3000);
const SELF = process.env.SITES_ORIGIN || `http://127.0.0.1:${PORT}`;
const ERRAND_MODEL = process.env.SAATHI_ERRAND_MODEL || "claude-opus-5-5";
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;
export const errandDriver = (): "claude" | "scripted" => (client && process.env.ERRAND_DRIVER !== "scripted" ? "claude" : "scripted");
const WAIT_MS = 10 * 60 * 1000; // how long an errand waits for her choice or the family's approval
const MAX_RUNNING = 3;

/* ------------------------------------------------------------------ Storage and live updates */

const toErrand = (r: any): Errand => ({
  id: r.id, patientId: r.patient_id, kind: r.kind, title: ERRAND_TITLE[r.kind as ErrandKind] ?? "Errand", request: r.request, status: r.status,
  question: parse(r.question, null), approval: parse(r.approval, null), result: r.result, steps: parse(r.steps, []), site: r.site,
  driver: r.driver, startedBy: r.started_by, createdAt: r.created_at, updatedAt: r.updated_at,
});
export const errandById = (id: string) => { const r = get("SELECT * FROM errands WHERE id = ?", id); return r ? toErrand(r) : null; };
export const errandsFor = (patientId: string, limit = 20) => all("SELECT * FROM errands WHERE patient_id = ? ORDER BY created_at DESC LIMIT ?", patientId, limit).map(toErrand);

const frames = new Map<string, string>(); // errand id → latest JPEG (base64)
export const frameOf = (id: string) => frames.get(id) ?? null;
const waiters = new Map<string, (() => void)[]>();
const pending = new Map<string, { kind: "choice" | "approval"; resolve: (v: string) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
const cancelled = new Set<string>();

function familyOf(e: Errand) { return S.patientById(e.patientId)?.familyId ?? null; }
function emit(e: Errand) { const f = familyOf(e); if (f) toFamily(f, "errand", e); }
function update(id: string, fields: Partial<Record<"status" | "question" | "approval" | "result" | "steps" | "site", unknown>>) {
  const sets = Object.keys(fields).map((k) => `${k} = ?`).join(", ");
  const vals = Object.values(fields).map((v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v));
  run(`UPDATE errands SET ${sets}, updated_at = ? WHERE id = ?`, ...vals, nowIso(), id);
  const e = errandById(id)!;
  emit(e);
  if (e.status !== "running") { for (const w of waiters.get(id) ?? []) w(); waiters.delete(id); }
  return e;
}

/** Resolve when the errand stops for a choice, an approval or the end, or after `ms`. */
export function waitForMilestone(id: string, ms: number): Promise<Errand | null> {
  const now = errandById(id);
  if (!now || now.status !== "running") return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); resolve(errandById(id)); };
    const t = setTimeout(() => { waiters.set(id, (waiters.get(id) ?? []).filter((f) => f !== done)); resolve(errandById(id)); }, ms);
    waiters.set(id, [...(waiters.get(id) ?? []), done]);
  });
}

/* ------------------------------------------------------------------ The sandboxed browser */

let browserP: Promise<Browser> | null = null;
function browser() {
  if (!browserP) {
    const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: "localhost,127.0.0.1" } : undefined;
    browserP = chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"], proxy })
      .then((b) => { b.on("disconnected", () => { console.warn("[errands] browser closed; a new one starts with the next errand"); browserP = null; }); return b; })
      .catch((e) => { browserP = null; console.warn("[errands] couldn't start the browser:", (e as Error).message.split("\n")[0]); throw e; });
  }
  return browserP;
}

interface Ctx {
  errand: Errand; patient: Patient; page: Page;
  /** Record a step the family can read, with a fresh picture of the page. */
  step: (text: string) => Promise<void>;
  go: (path: string, text: string) => Promise<void>;
  /** Ask the elder (through Saathi on the call) to choose. */
  ask: (prompt: string, options: string[]) => Promise<string>;
  /** Wait for a family member to approve a payment. */
  approve: (amount: number, what: string) => Promise<boolean>;
  irreversible: boolean;
}
interface Outcome { summary: string; status?: ErrandStatus }

async function snapshotFrame(ctx: Ctx) {
  try {
    const jpeg = (await ctx.page.screenshot({ type: "jpeg", quality: 55 })).toString("base64");
    frames.set(ctx.errand.id, jpeg);
    const f = familyOf(ctx.errand); if (f) toFamily(f, "errand_frame", { id: ctx.errand.id, jpeg });
  } catch { /* the page may be navigating */ }
}

function makeCtx(errand: Errand, patient: Patient, page: Page): Ctx {
  const id = errand.id;
  const ctx: Ctx = {
    errand, patient, page, irreversible: false,
    async step(text) {
      if (cancelled.has(id)) throw new Error("cancelled");
      const steps = [...(errandById(id)?.steps ?? []), { at: nowIso(), text }].slice(-40);
      ctx.errand = update(id, { steps, site: await page.title().catch(() => null) });
      await snapshotFrame(ctx);
    },
    async go(path, text) {
      await page.goto(path.startsWith("http") ? path : SELF + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      await ctx.step(text);
    },
    ask(prompt, options) {
      ctx.errand = update(id, { status: "needs_choice", question: { prompt, options } });
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error("No answer came back in time")); }, WAIT_MS);
        pending.set(id, { kind: "choice", resolve, reject, timer });
      }).finally(() => { if (!cancelled.has(id)) ctx.errand = update(id, { status: "running", question: null }); });
    },
    approve(amount, what) {
      ctx.errand = update(id, { status: "awaiting_approval", approval: { amount, what } });
      const p = S.patientById(errand.patientId)!;
      toFamily(p.familyId, "feed", S.addFeed(p.familyId, "info", "warn", `Approve ₹${amount.toLocaleString("en-IN")} for ${p.nickname}?`, `${what}. Saathi is waiting for a family member to approve it in the app.`));
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error("Nobody approved the payment in time")); }, WAIT_MS);
        pending.set(id, { kind: "approval", resolve, reject, timer });
      }).then((v) => v === "approved").finally(() => { if (!cancelled.has(id)) ctx.errand = update(id, { status: "running", approval: null }); });
    },
  };
  return ctx;
}

/* ------------------------------------------------------------------ Public API */

export function startErrand(patient: Patient, kind: ErrandKind, request: string, startedBy: string, callId: string | null = null): Errand {
  const id = uid("err_");
  const now = nowIso();
  run("INSERT INTO errands (id, patient_id, kind, request, status, steps, driver, call_id, started_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    id, patient.id, kind, request.slice(0, 400), "running", "[]", errandDriver(), callId, startedBy, now, now);
  const e = errandById(id)!;
  emit(e);
  toFamily(patient.familyId, "feed", S.addFeed(patient.familyId, "info", "info", `Saathi is on it: ${e.title.toLowerCase()}`, `${startedBy === patient.name ? `${patient.nickname} asked on her call` : `Asked by ${startedBy}`}: “${request.slice(0, 140)}”`));
  void execute(e, patient);
  return e;
}

/** Her answer to the errand's question (or a family member answering for her). */
export function answerErrand(id: string, answer: string) {
  const p = pending.get(id);
  if (!p || p.kind !== "choice") return false;
  clearTimeout(p.timer); pending.delete(id); p.resolve(answer.slice(0, 200));
  return true;
}
/** A family member approves or declines a payment. */
export function approveErrand(id: string, approved: boolean, byName: string) {
  const p = pending.get(id);
  if (!p || p.kind !== "approval") return false;
  clearTimeout(p.timer); pending.delete(id);
  const e = errandById(id)!;
  const pt = S.patientById(e.patientId)!;
  toFamily(pt.familyId, "feed", S.addFeed(pt.familyId, "info", approved ? "ok" : "info", `${byName} ${approved ? "approved" : "declined"} ₹${e.approval?.amount.toLocaleString("en-IN") ?? ""}`, e.approval?.what ?? e.title));
  p.resolve(approved ? "approved" : "declined");
  return true;
}
export function cancelErrand(id: string) {
  const e = errandById(id); if (!e || ["done", "failed", "declined", "cancelled"].includes(e.status)) return false;
  cancelled.add(id);
  const p = pending.get(id); if (p) { clearTimeout(p.timer); pending.delete(id); p.reject(new Error("cancelled")); }
  update(id, { status: "cancelled", question: null, approval: null, result: "Stopped before finishing. Nothing was paid." });
  return true;
}

/** A short, honest line about an errand for Saathi to say aloud. */
export function errandForVoice(e: Errand) {
  return {
    errand_id: e.id, what: e.title, status: e.status,
    question_for_her: e.question ? { question: e.question.prompt, options: e.question.options } : null,
    waiting_for_family_approval: e.approval ? `₹${e.approval.amount} for ${e.approval.what}` : null,
    result: e.result, last_step: e.steps.at(-1)?.text ?? null,
  };
}

let runningCount = 0;
const queue: (() => void)[] = [];
async function execute(e: Errand, patient: Patient) {
  if (runningCount >= MAX_RUNNING) await new Promise<void>((r) => queue.push(r));
  runningCount++;
  let context: BrowserContext | null = null;
  try {
    const opts = { viewport: { width: 860, height: 720 }, locale: "en-IN", ignoreHTTPSErrors: !!process.env.HTTPS_PROXY };
    try { context = await (await browser()).newContext(opts); }
    catch { // a crashed browser: start a fresh one and try once more
      const old = browserP; browserP = null; void old?.then((b) => b.close()).catch(() => undefined);
      context = await (await browser()).newContext(opts);
    }
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const ctx = makeCtx(e, patient, page);
    let out: Outcome;
    if (e.driver === "claude") {
      try { out = await claudeDriver(ctx); }
      catch (err) {
        // The AI service failed before anything irreversible: finish the job with the scripted steps instead.
        if (cancelled.has(e.id) || ctx.irreversible || !(err instanceof Anthropic.APIError) || !SCRIPTED[e.kind]) throw err;
        console.warn("[errands] Claude driver failed, using scripted steps:", (err as Error).message);
        await ctx.step("Switching to Saathi's standard steps for this site");
        out = await SCRIPTED[e.kind](ctx);
      }
    } else out = await SCRIPTED[e.kind](ctx);
    if (!cancelled.has(e.id)) {
      const done = update(e.id, { status: out.status ?? "done", result: out.summary.slice(0, 600), question: null, approval: null });
      const p = S.patientById(e.patientId)!;
      toFamily(p.familyId, "feed", S.addFeed(p.familyId, "info", done.status === "done" ? "ok" : "info", `${done.title}: ${done.status === "done" ? "done" : done.status}`, done.result ?? ""));
    }
  } catch (err) {
    if (!cancelled.has(e.id)) {
      const msg = (err as Error).message || "Something went wrong";
      console.warn("[errands] failed:", e.kind, msg);
      update(e.id, { status: "failed", question: null, approval: null, result: /cancel|No answer|Nobody approved/.test(msg) ? msg : "Saathi couldn't finish this on the website. Nothing was paid." });
    }
  } finally {
    await context?.close().catch(() => undefined);
    cancelled.delete(e.id);
    runningCount--; queue.shift()?.();
  }
}

/* ------------------------------------------------------------------ Helpers for both drivers */

const spokenSlot = (value: string) => {
  const [d, t] = value.split(" ");
  const dt = new Date(`${d}T${t}:00`);
  return `${dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} at ${dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
};
/** Match a spoken answer ("the second one", "Friday ten thirty", "yes") to one of the offered options. */
export function matchOption(answer: string, options: string[]): number {
  const a = answer.toLowerCase();
  const exact = options.findIndex((o) => o.toLowerCase() === a.trim());
  if (exact >= 0) return exact;
  const ord = [["first", "1", "one"], ["second", "2", "two"], ["third", "3", "three"]].findIndex((ws) => ws.some((w) => new RegExp(`\\b${w}\\b`).test(a)));
  const words = a.replace(/[^a-z0-9: ]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  const scores = options.map((o) => { const ol = o.toLowerCase(); return words.filter((w) => ol.includes(w)).length; });
  const best = Math.max(...scores);
  if (best > 0 && scores.filter((s) => s === best).length === 1) return scores.indexOf(best);
  if (ord >= 0 && ord < options.length) return ord;
  if (/\b(yes|yeah|ok|okay|sure|pay|ஆமா|சரி)\b/.test(a)) return 0;
  if (/\b(no|don't|dont|not|வேண்டாம்)\b/.test(a)) return options.length - 1;
  return -1;
}
const rupees = (text: string) => Number((text.match(/₹\s?([\d,]+)/)?.[1] ?? "0").replace(/,/g, ""));

/* ------------------------------------------------------------------ Scripted driver (no AI key needed) */

const DOCTOR_FOR: [RegExp, string][] = [[/sugar|diabet|arjun/i, "Dr. K. Arjun"], [/general|fever|cold|meenakshi|gp/i, "Dr. P. Meenakshi"], [/.*/, "Dr. S. Raman"]];

const SCRIPTED: Record<ErrandKind, (c: Ctx) => Promise<Outcome>> = {
  async book_doctor(c) {
    const doctor = DOCTOR_FOR.find(([re]) => re.test(c.errand.request))![1];
    await c.go("/sites/clinic", "Opened the Raman Heart & Diabetes Clinic website");
    await c.page.getByRole("link", { name: `Book appointment with ${doctor}` }).click();
    await c.page.waitForLoadState("domcontentloaded");
    await c.step(`Checking ${doctor}'s free times`);
    const free = await c.page.locator("input[name=slot]:not([disabled])").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    if (!free.length) return { summary: `${doctor} has no free times in the next three days.`, status: "failed" };
    const picks = free.slice(0, 3);
    const options = picks.map(spokenSlot);
    const answer = await c.ask(`${doctor} is free at these times. Which one suits her?`, options);
    const i = matchOption(answer, options);
    if (i < 0) return { summary: `She didn't pick one of the times, so nothing was booked.`, status: "cancelled" };
    await c.page.locator(`input[name=slot][value="${picks[i]}"]`).check();
    await c.page.getByLabel("Patient name").fill(PARTNER_PROFILE.name);
    await c.page.getByLabel("Mobile number").fill(PARTNER_PROFILE.mobile);
    await c.step(`Filled in ${options[i]} for ${PARTNER_PROFILE.name}`);
    c.irreversible = true;
    await c.page.getByRole("button", { name: "Confirm booking" }).click();
    const ref = (await c.page.locator("#ref").textContent({ timeout: 15000 }))?.trim();
    await c.step(`Booking confirmed: ${ref}`);
    return { summary: `Booked with ${doctor} on ${options[i]}. Booking number ${ref}. The fee is paid at the clinic.` };
  },

  async order_medicines(c) {
    const meds = S.meds(c.patient.id);
    const req = c.errand.request.toLowerCase();
    let wanted = meds.filter((m) => req.includes(m.name.toLowerCase()) || (m.generic && req.includes(m.generic.toLowerCase())));
    if (!wanted.length) {
      const low = meds.filter((m) => m.stock / Math.max(1, m.slots.length) <= 10);
      wanted = (low.length ? low : meds).slice(0, 4);
    }
    const strips = Number(req.match(/(\d+)\s*strips?/)?.[1]) || 2;
    const added: string[] = [];
    for (const m of wanted) {
      await c.go(`/sites/pharmacy/search?q=${encodeURIComponent(m.name)}`, `Searching CarePlus Pharmacy for ${m.name}`);
      const add = c.page.getByRole("button", { name: /^Add .* to cart$/ }).first();
      if (!(await add.count())) { await c.step(`${m.name} isn't sold here`); continue; }
      const label = (await add.getAttribute("aria-label"))!.replace(/^Add | to cart$/g, "");
      await c.page.getByLabel(`Number of strips of ${label}`).selectOption(String(Math.min(6, strips)));
      await add.click();
      await c.page.waitForLoadState("domcontentloaded");
      added.push(`${label} × ${Math.min(6, strips)}`);
      await c.step(`Added ${label} (${Math.min(6, strips)} strips) to the cart`);
    }
    if (!added.length) return { summary: "The pharmacy didn't have any of those medicines.", status: "failed" };
    await c.page.getByRole("link", { name: "Proceed to checkout" }).click();
    await c.page.getByLabel("Mobile number").fill(PARTNER_PROFILE.mobile);
    await c.page.getByLabel("Delivery address").fill(PARTNER_PROFILE.address);
    await c.step("Filled in her delivery address");
    await c.page.getByRole("button", { name: "Continue to payment" }).click();
    const amount = rupees((await c.page.locator("#amount").textContent()) ?? "");
    await c.step(`Ready to pay ₹${amount}. Waiting for the family to approve`);
    const ok = await c.approve(amount, `Medicines from CarePlus Pharmacy: ${added.join(", ")}`);
    if (!ok) return { summary: `The order (${added.join(", ")}, ₹${amount}) wasn't paid because the family declined it.`, status: "declined" };
    c.irreversible = true;
    await c.page.getByRole("button", { name: /^Pay .* with UPI$/ }).click();
    const order = (await c.page.locator("#order").textContent({ timeout: 15000 }))?.trim();
    await c.step(`Order ${order} placed and paid`);
    return { summary: `Ordered ${added.join(", ")} from CarePlus Pharmacy for ₹${amount}, paid with the family's approval. Order ${order}, arriving tomorrow by 7 pm.` };
  },

  async book_gas(c) {
    await c.go("/sites/gas", "Opened the Jyothi Gas Agency website");
    await c.page.getByLabel("Consumer number").fill(PARTNER_PROFILE.gasConsumer);
    await c.page.getByLabel("Registered mobile number").fill(PARTNER_PROFILE.mobile);
    await c.page.getByRole("button", { name: "Continue" }).click();
    await c.page.waitForLoadState("domcontentloaded");
    await c.step("Opened her gas connection");
    const already = c.page.getByText(/already booked/);
    if (await already.count()) return { summary: `A refill is already booked (${(await already.textContent())?.split(": ")[1]}).` };
    c.irreversible = true;
    await c.page.getByRole("button", { name: "Book refill" }).click();
    const no = (await c.page.locator("#booking").textContent({ timeout: 15000 }))?.trim();
    const when = (await c.page.locator("tr", { hasText: "Expected delivery" }).locator("td").textContent())?.trim();
    await c.step(`Refill booked: ${no}`);
    return { summary: `Gas cylinder refill booked, number ${no}. Delivery expected ${when}. Pay ₹905 in cash to the delivery person.` };
  },

  async electricity_bill(c) {
    await c.go("/sites/power", "Opened the Chennai Power Board website");
    await c.page.getByLabel("Service connection number").fill(PARTNER_PROFILE.powerConnection);
    await c.page.getByRole("button", { name: "View bill" }).click();
    await c.page.waitForLoadState("domcontentloaded");
    const amountText = (await c.page.locator("#amount").textContent()) ?? "";
    const due = (await c.page.locator("tr", { hasText: "Due date" }).locator("td").textContent())?.trim();
    await c.step(`Found the bill: ${amountText.trim()}, due ${due}`);
    if (/paid/.test(amountText)) return { summary: "This month's electricity bill is already paid." };
    const amount = rupees(amountText);
    const wantsPay = /\bpay\b/i.test(c.errand.request);
    const answer = wantsPay ? "Yes, pay it" : await c.ask(`The electricity bill is ₹${amount}, due ${due}. Shall I pay it?`, ["Yes, pay it", "No, just tell me"]);
    if (matchOption(answer, ["Yes, pay it", "No, just tell me"]) !== 0) return { summary: `The electricity bill is ₹${amount}, due ${due}. Not paid yet.` };
    await c.page.getByRole("link", { name: "Pay now" }).click();
    await c.step(`Ready to pay ₹${amount}. Waiting for the family to approve`);
    const ok = await c.approve(amount, "Electricity bill, Chennai Power Board");
    if (!ok) return { summary: `The ₹${amount} electricity bill wasn't paid because the family declined it. It's due ${due}.`, status: "declined" };
    c.irreversible = true;
    await c.page.getByRole("button", { name: /^Pay / }).click();
    const receipt = (await c.page.locator("#receipt").textContent({ timeout: 15000 }))?.trim();
    await c.step(`Paid. Receipt ${receipt}`);
    return { summary: `Paid the ₹${amount} electricity bill with the family's approval. Receipt ${receipt}.` };
  },

  async web_lookup(c) {
    const q = c.errand.request;
    await c.go(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, `Searching the web for “${q.slice(0, 80)}”`);
    const results = await c.page.locator(".result").evaluateAll((els) => els.slice(0, 5).map((el) => ({
      title: (el.querySelector(".result__title") as HTMLElement | null)?.innerText.trim() ?? "",
      snippet: (el.querySelector(".result__snippet") as HTMLElement | null)?.innerText.trim() ?? "",
      url: (el.querySelector(".result__url") as HTMLElement | null)?.innerText.trim() ?? "",
    })).filter((r) => r.title));
    if (!results.length) return { summary: "The web search didn't return anything useful.", status: "failed" };
    await c.step(`Reading the top ${results.length} results`);
    return { summary: results.map((r) => `${r.title} (${r.url}): ${r.snippet}`).join("\n").slice(0, 1500) };
  },
};

/* ------------------------------------------------------------------ Claude driver */

const SITES_GUIDE = `Partner websites (fictional demo businesses; use these for bookings, orders and bills):
- Clinic appointments: ${SELF}/sites/clinic  (Raman Heart & Diabetes Clinic: Dr. S. Raman cardiologist, Dr. P. Meenakshi general physician, Dr. K. Arjun diabetologist)
- Medicines: ${SELF}/sites/pharmacy  (CarePlus Pharmacy; search, add strips to cart, checkout, pay)
- Gas cylinder refill: ${SELF}/sites/gas  (Jyothi Gas Agency)
- Electricity bill: ${SELF}/sites/power  (Chennai Power Board)
For general information, search the real web with https://html.duckduckgo.com/html/?q=YOUR+QUERY and open results.`;

const BROWSER_TOOLS: Anthropic.Tool[] = [
  { name: "goto", description: "Open a URL in the browser.", input_schema: { type: "object", properties: { url: { type: "string" }, note: { type: "string", description: "One short sentence for her family about this step." } }, required: ["url", "note"] } },
  { name: "read_page", description: "Read the current page: its title, visible text and every link, button and form field, each with a ref number.", input_schema: { type: "object", properties: {}, required: [] } },
  { name: "click", description: "Click the element with this ref (from read_page). Use for links, buttons, radio buttons and checkboxes.", input_schema: { type: "object", properties: { ref: { type: "string" }, note: { type: "string", description: "One short sentence for her family about this step." } }, required: ["ref", "note"] } },
  { name: "fill", description: "Type text into the input or textarea with this ref, replacing what is there.", input_schema: { type: "object", properties: { ref: { type: "string" }, text: { type: "string" }, note: { type: "string" } }, required: ["ref", "text", "note"] } },
  { name: "select", description: "Choose an option (by its visible text) in the dropdown with this ref.", input_schema: { type: "object", properties: { ref: { type: "string" }, option: { type: "string" }, note: { type: "string" } }, required: ["ref", "option", "note"] } },
  { name: "ask_elder", description: "Ask her a choice only she can make (which time slot, whether to go ahead). Give 2 or 3 short options she can say aloud. Waits for her answer.", input_schema: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } } }, required: ["question", "options"] } },
  { name: "request_payment_approval", description: "Before ANY payment, ask her family to approve the exact amount in the app. Waits; returns approved or declined. Never pay without approved.", input_schema: { type: "object", properties: { amount_rupees: { type: "number" }, what: { type: "string" } }, required: ["amount_rupees", "what"] } },
  { name: "finish", description: "End the errand with a short, plain summary she can be told on the phone: what was done, reference numbers, dates, amounts. Use status 'failed' if it could not be done.", input_schema: { type: "object", properties: { summary: { type: "string" }, status: { type: "string", enum: ["done", "failed", "declined"] } }, required: ["summary", "status"] } },
];

async function readPage(page: Page) {
  return page.evaluate(() => {
    document.querySelectorAll("[data-sref]").forEach((e) => e.removeAttribute("data-sref"));
    const out: string[] = []; let n = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea"))) {
      const r = el.getBoundingClientRect();
      if ((el as HTMLInputElement).type === "hidden" || (r.width === 0 && r.height === 0)) continue;
      const ref = String(++n); el.setAttribute("data-sref", ref);
      const tag = el.tagName.toLowerCase(); const input = el as HTMLInputElement;
      const label = el.getAttribute("aria-label") || (input.labels?.[0]?.innerText) || input.placeholder || el.innerText || "";
      const extra = tag === "select" ? ` options=[${Array.from((el as HTMLSelectElement).options).map((o) => o.text).join(" | ")}]`
        : tag === "input" ? ` type=${input.type}${input.value && input.type !== "radio" ? ` value="${input.value}"` : ""}${input.checked ? " checked" : ""}${input.disabled ? " disabled" : ""}` : "";
      out.push(`[${ref}] ${tag}${extra} "${label.replace(/\s+/g, " ").trim().slice(0, 90)}"`);
      if (n >= 120) break;
    }
    return `Title: ${document.title}\nURL: ${location.href}\n\nText:\n${document.body.innerText.replace(/\n{3,}/g, "\n\n").slice(0, 3500)}\n\nElements:\n${out.join("\n")}`;
  });
}

async function claudeDriver(c: Ctx): Promise<Outcome> {
  const p = c.patient;
  const system = `You run errands in a web browser for ${p.name} ("${p.nickname}"), ${p.age}, an elderly woman in Chennai who is on a phone call with Saathi, her AI assistant. Her family watches every step.
Today is ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.

${SITES_GUIDE}

Her details for forms (use only these, only where a form needs them): name ${PARTNER_PROFILE.name}; mobile ${PARTNER_PROFILE.mobile}; address ${PARTNER_PROFILE.address}; gas consumer number ${PARTNER_PROFILE.gasConsumer}; electricity connection ${PARTNER_PROFILE.powerConnection}. Her current medicines: ${S.meds(p.id).map((m) => `${m.name} ${m.dose}`).join(", ")}.

Rules:
- Do exactly the errand asked, nothing more. Call read_page after every navigation or click before acting on the page.
- If there is a real choice that is hers (a time slot, whether to pay), use ask_elder with 2–3 options and wait. Don't ask about things you can see for yourself.
- Before any payment, call request_payment_approval with the exact amount shown on the page. If it is declined, stop and finish with status "declined".
- Never invent details, never create accounts, never enter passwords, OTPs or card numbers. If a site needs them, finish with status "failed" and say why.
- For lookups, read real sources and finish with the facts and where they came from. Prefer official sites.
- Finish with a short summary she can understand when it is read out: what was done, dates, amounts, reference numbers.`;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `Errand (${ERRAND_TITLE[c.errand.kind]}): ${c.errand.request}` }];
  for (let turn = 0; turn < 30; turn++) {
    if (cancelled.has(c.errand.id)) throw new Error("cancelled");
    const res = await client!.beta.messages.create({
      model: ERRAND_MODEL, max_tokens: 4000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      cache_control: { type: "ephemeral" }, output_config: { effort: "low" },
      system, tools: BROWSER_TOOLS as Anthropic.Beta.BetaTool[], messages: messages as Anthropic.Beta.BetaMessageParam[],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (res.stop_reason === "refusal") throw new Error("The AI declined this errand");
    messages.push({ role: "assistant", content: res.content as Anthropic.ContentBlockParam[] });
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!uses.length) {
      const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
      return { summary: text || "Finished.", status: "done" };
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      const a = (u.input ?? {}) as Record<string, any>;
      let out = "ok"; let isError = false;
      try {
        switch (u.name) {
          case "goto": await c.page.goto(String(a.url), { waitUntil: "domcontentloaded", timeout: 30000 }); await c.step(String(a.note || `Opened ${a.url}`)); out = await readPage(c.page); break;
          case "read_page": out = await readPage(c.page); break;
          case "click": {
            const el = c.page.locator(`[data-sref="${a.ref}"]`);
            const label = (await el.innerText().catch(() => "")) || (await el.getAttribute("aria-label")) || "";
            if (/\b(confirm|book|pay|place order)\b/i.test(label)) c.irreversible = true;
            await el.click(); await c.page.waitForLoadState("domcontentloaded").catch(() => undefined);
            await c.step(String(a.note || `Clicked ${label}`)); out = await readPage(c.page); break;
          }
          case "fill": await c.page.locator(`[data-sref="${a.ref}"]`).fill(String(a.text)); await c.step(String(a.note || "Filled in a form field")); break;
          case "select": await c.page.locator(`[data-sref="${a.ref}"]`).selectOption({ label: String(a.option) }); await c.step(String(a.note || `Chose ${a.option}`)); break;
          case "ask_elder": out = `She answered: ${await c.ask(String(a.question), (a.options as string[] ?? []).map(String).slice(0, 4))}`; break;
          case "request_payment_approval": out = (await c.approve(Math.round(Number(a.amount_rupees) || 0), String(a.what))) ? "approved" : "declined"; break;
          case "finish": return { summary: String(a.summary), status: a.status === "failed" ? "failed" : a.status === "declined" ? "declined" : "done" };
          default: out = "Unknown tool"; isError = true;
        }
      } catch (err) {
        if (cancelled.has(c.errand.id) || /No answer|Nobody approved/.test((err as Error).message)) throw err;
        out = `Error: ${(err as Error).message.split("\n")[0]}`; isError = true;
      }
      results.push({ type: "tool_result", tool_use_id: u.id, content: out.slice(0, 9000), is_error: isError });
    }
    messages.push({ role: "user", content: results });
  }
  return { summary: "This took too many steps, so Saathi stopped. Nothing was paid.", status: "failed" };
}
