// Errands on the real web. While the elder is on the phone, Claude does what she asked on real websites:
//  - it searches and reads the real web (Anthropic's web search and web fetch) for doctors and for lookups;
//  - it operates real sites in a sandboxed browser (a fresh, isolated Chromium context per errand), such as
//    Apollo Pharmacy for her medicines and the TNPDCL quick-pay page for the electricity bill.
// It never logs in, enters OTPs or card details, pays, or gets past captchas or bot checks. When the next step
// needs any of those, it stops and hands the real page to a family member to finish ("ready_for_family").
// Choices that are hers (which doctor, which time) are asked on the call. The family sees every step and a live
// picture of the browser. Without ANTHROPIC_API_KEY there is no agent, so errands are unavailable (never faked).
import Anthropic from "@anthropic-ai/sdk";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";
import { all, get, run, uid, nowIso, parse } from "./db.ts";
import * as S from "./store.ts";
import { toFamily } from "./realtime.ts";
import type { Errand, ErrandKind, ErrandStatus, Patient } from "../shared/types.ts";
import { ERRAND_TITLE } from "../shared/types.ts";

const ERRAND_MODEL = process.env.SAATHI_ERRAND_MODEL || "claude-opus-5-5";
const client = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? new Anthropic() : null;
export const errandsAvailable = () => !!client;
const WAIT_MS = 10 * 60 * 1000; // how long an errand waits for her choice
const MAX_RUNNING = 3;

/* ------------------------------------------------------------------ Storage and live updates */

const toErrand = (r: any): Errand => ({
  id: r.id, patientId: r.patient_id, kind: r.kind, title: ERRAND_TITLE[r.kind as ErrandKind] ?? "Errand", request: r.request, status: r.status,
  question: parse(r.question, null), handoff: parse(r.handoff, null), result: r.result, steps: parse(r.steps, []), site: r.site,
  startedBy: r.started_by, createdAt: r.created_at, updatedAt: r.updated_at,
});
export const errandById = (id: string) => { const r = get("SELECT * FROM errands WHERE id = ?", id); return r ? toErrand(r) : null; };
export const errandsFor = (patientId: string, limit = 20) => all("SELECT * FROM errands WHERE patient_id = ? ORDER BY created_at DESC LIMIT ?", patientId, limit).map(toErrand);

const frames = new Map<string, string>(); // errand id → latest JPEG (base64)
export const frameOf = (id: string) => frames.get(id) ?? null;
const waiters = new Map<string, (() => void)[]>();
const pending = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
const cancelled = new Set<string>();

const familyOf = (e: Errand) => S.patientById(e.patientId)?.familyId ?? null;
function emit(e: Errand) { const f = familyOf(e); if (f) toFamily(f, "errand", e); }
function update(id: string, fields: Partial<Record<"status" | "question" | "handoff" | "result" | "steps" | "site", unknown>>) {
  const sets = Object.keys(fields).map((k) => `${k} = ?`).join(", ");
  const vals = Object.values(fields).map((v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v));
  run(`UPDATE errands SET ${sets}, updated_at = ? WHERE id = ?`, ...vals, nowIso(), id);
  const e = errandById(id)!;
  emit(e);
  if (e.status !== "running") { for (const w of waiters.get(id) ?? []) w(); waiters.delete(id); }
  return e;
}

/** Resolve when the errand stops for a choice, a hand-off or the end, or after `ms`. */
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

interface Ctx { errand: Errand; patient: Patient; page: Page | null; context: BrowserContext | null; step: (text: string) => Promise<void>; ask: (prompt: string, options: string[]) => Promise<string>; open: () => Promise<Page> }

async function frame(ctx: Ctx) {
  if (!ctx.page) return;
  try {
    const jpeg = (await ctx.page.screenshot({ type: "jpeg", quality: 55 })).toString("base64");
    frames.set(ctx.errand.id, jpeg);
    const f = familyOf(ctx.errand); if (f) toFamily(f, "errand_frame", { id: ctx.errand.id, jpeg });
  } catch { /* the page may be navigating */ }
}

function makeCtx(errand: Errand, patient: Patient): Ctx {
  const id = errand.id;
  const ctx: Ctx = {
    errand, patient, page: null, context: null,
    async open() {
      if (ctx.page) return ctx.page;
      const opts = { viewport: { width: 1100, height: 760 }, locale: "en-IN", timezoneId: "Asia/Kolkata", ignoreHTTPSErrors: !!process.env.HTTPS_PROXY };
      try { ctx.context = await (await browser()).newContext(opts); }
      catch { const old = browserP; browserP = null; void old?.then((b) => b.close()).catch(() => undefined); ctx.context = await (await browser()).newContext(opts); }
      ctx.page = await ctx.context.newPage();
      ctx.page.setDefaultTimeout(25000);
      return ctx.page;
    },
    async step(text) {
      if (cancelled.has(id)) throw new Error("cancelled");
      const steps = [...(errandById(id)?.steps ?? []), { at: nowIso(), text: text.slice(0, 200) }].slice(-40);
      ctx.errand = update(id, { steps, site: ctx.page ? await ctx.page.title().catch(() => null) : null });
      await frame(ctx);
    },
    ask(prompt, options) {
      ctx.errand = update(id, { status: "needs_choice", question: { prompt, options } });
      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error("No answer came back in time")); }, WAIT_MS);
        pending.set(id, { resolve, reject, timer });
      }).finally(() => { if (!cancelled.has(id)) ctx.errand = update(id, { status: "running", question: null }); });
    },
  };
  return ctx;
}

/* ------------------------------------------------------------------ Public API */

export function startErrand(patient: Patient, kind: ErrandKind, request: string, startedBy: string, callId: string | null = null): Errand {
  if (!client) throw new Error("Errands need the Claude API key (ANTHROPIC_API_KEY) on the server.");
  const id = uid("err_"); const now = nowIso();
  run("INSERT INTO errands (id, patient_id, kind, request, status, steps, driver, call_id, started_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    id, patient.id, kind, request.slice(0, 400), "running", "[]", "claude", callId, startedBy, now, now);
  const e = errandById(id)!;
  emit(e);
  toFamily(patient.familyId, "feed", S.addFeed(patient.familyId, "info", "info", `Saathi is on it: ${e.title.toLowerCase()}`, `${startedBy === patient.name ? `${patient.nickname} asked on her call` : `Asked by ${startedBy}`}: “${request.slice(0, 140)}”`));
  void execute(e, patient);
  return e;
}

export function answerErrand(id: string, answer: string) {
  const p = pending.get(id); if (!p) return false;
  clearTimeout(p.timer); pending.delete(id); p.resolve(answer.slice(0, 200));
  return true;
}

/** A family member finished the last step on the real site. */
export function markFinished(id: string, byName: string) {
  const e = errandById(id); if (!e || e.status !== "ready_for_family") return false;
  const done = update(id, { status: "done", result: `${e.result ?? e.title} Finished by ${byName}.` });
  const p = S.patientById(e.patientId)!;
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "info", "ok", `${done.title}: finished by ${byName}`, e.handoff?.what ?? ""));
  return true;
}

export function cancelErrand(id: string) {
  const e = errandById(id); if (!e || ["done", "failed", "cancelled"].includes(e.status)) return false;
  cancelled.add(id);
  const p = pending.get(id); if (p) { clearTimeout(p.timer); pending.delete(id); p.reject(new Error("cancelled")); }
  update(id, { status: "cancelled", question: null, result: "Stopped. Nothing was booked or paid." });
  return true;
}

/** A short, honest line about an errand for Saathi to say aloud. */
export function errandForVoice(e: Errand) {
  return {
    errand_id: e.id, what: e.title, status: e.status,
    question_for_her: e.question ? { question: e.question.prompt, options: e.question.options } : null,
    family_finishes: e.handoff ? `${e.handoff.what} (on ${e.handoff.site})` : null,
    result: e.result, last_step: e.steps.at(-1)?.text ?? null,
  };
}

let runningCount = 0;
const queue: (() => void)[] = [];
async function execute(e: Errand, patient: Patient) {
  if (runningCount >= MAX_RUNNING) await new Promise<void>((r) => queue.push(r));
  runningCount++;
  const ctx = makeCtx(e, patient);
  try {
    const out = await agent(ctx);
    if (!cancelled.has(e.id)) {
      const done = update(e.id, { status: out.status, result: out.summary.slice(0, 700), question: null, handoff: out.handoff ?? null });
      const p = S.patientById(e.patientId)!;
      const title = done.status === "ready_for_family" ? `Ready for you to finish: ${done.title.toLowerCase()}` : `${done.title}: ${done.status === "done" ? "done" : "couldn't be done"}`;
      toFamily(p.familyId, "feed", S.addFeed(p.familyId, "info", done.status === "failed" ? "info" : done.status === "ready_for_family" ? "warn" : "ok", title, done.handoff ? `${done.result} ${done.handoff.what}` : done.result ?? ""));
    }
  } catch (err) {
    if (!cancelled.has(e.id)) {
      const msg = (err as Error).message || "Something went wrong";
      console.warn("[errands] failed:", e.kind, msg);
      update(e.id, { status: "failed", question: null, result: /No answer/.test(msg) ? msg : "Saathi couldn't finish this on the website right now. Nothing was booked or paid." });
    }
  } finally {
    await ctx.context?.close().catch(() => undefined);
    cancelled.delete(e.id);
    runningCount--; queue.shift()?.();
  }
}

/* ------------------------------------------------------------------ The agent */

const GUIDE: Record<ErrandKind, string> = {
  find_doctor: "Use web_search (and web_fetch) to find suitable, real doctors or clinics near her home (East Tambaram, Chennai) for what she needs: names, speciality, clinic address, consultation timings and fee if listed, and the booking page (Practo, the hospital's site) or clinic phone number. Offer her 2 or 3 with ask_elder (doctor and when they see patients). Then hand off: the family books the chosen one on the real booking page, which needs their login and OTP. Do not open Practo in the browser: it does not allow automated browsers.",
  order_medicines: "Use the browser on https://www.apollopharmacy.in: search each of her medicines (https://www.apollopharmacy.in/search-medicines/NAME), open the matching product (same molecule and strength), and note the real price, pack size and whether it is in stock. If a product is missing, say so; never substitute a different medicine. Then hand off with the product page link(s): checkout needs the family's login and payment.",
  electricity_bill: "Use the browser on the real TNPDCL quick-pay page https://www.tnebnet.org/qwp/qpay. If you know her service connection number, enter it; if not, ask her with ask_elder. The site asks for a captcha before showing the bill: never try to read or solve it. Hand off at that point so the family can enter the captcha, see the bill and pay.",
  web_lookup: "Use web_search and web_fetch to find the answer from reliable, current sources (official sites first). Finish with the facts in plain words and where they came from. Use the browser only if a page needs it.",
};

const BROWSER_TOOLS: Anthropic.Beta.BetaToolUnion[] = [
  { name: "goto", description: "Open a URL in the sandboxed browser.", input_schema: { type: "object", properties: { url: { type: "string" }, note: { type: "string", description: "One short sentence for her family about this step." } }, required: ["url", "note"] } },
  { name: "read_page", description: "Read the current page: title, URL, visible text and every link, button and form field with a ref number.", input_schema: { type: "object", properties: {}, required: [] } },
  { name: "click", description: "Click the element with this ref (from read_page).", input_schema: { type: "object", properties: { ref: { type: "string" }, note: { type: "string" } }, required: ["ref", "note"] } },
  { name: "fill", description: "Type text into the input with this ref.", input_schema: { type: "object", properties: { ref: { type: "string" }, text: { type: "string" }, note: { type: "string" } }, required: ["ref", "text", "note"] } },
  { name: "select", description: "Choose an option (by its visible text) in the dropdown with this ref.", input_schema: { type: "object", properties: { ref: { type: "string" }, option: { type: "string" }, note: { type: "string" } }, required: ["ref", "option", "note"] } },
  { name: "ask_elder", description: "Ask her a choice only she can make (which doctor, which day). 2 or 3 short options she can say aloud. Waits for her answer from the phone call.", input_schema: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } } }, required: ["question", "options"] } },
  { name: "hand_off_to_family", description: "Stop and give a family member the last step on the real site (log in, OTP, captcha, confirm, pay). Give the exact real URL to open and one sentence on what to do there. This ends the errand.", input_schema: { type: "object", properties: { site: { type: "string" }, url: { type: "string" }, what_to_do: { type: "string" }, summary_for_her: { type: "string", description: "Two short sentences she can be told on the phone: what Saathi found and that Karthik will finish it." } }, required: ["site", "url", "what_to_do", "summary_for_her"] } },
  { name: "finish", description: "End the errand when nothing is left for the family (for example a lookup). The summary is read to her: facts, dates, amounts, sources. Use status 'failed' if it could not be done.", input_schema: { type: "object", properties: { summary: { type: "string" }, status: { type: "string", enum: ["done", "failed"] } }, required: ["summary", "status"] } },
  { type: "web_search_20260209", name: "web_search", max_uses: 6, user_location: { type: "approximate", city: "Chennai", region: "Tamil Nadu", country: "IN", timezone: "Asia/Kolkata" } } as Anthropic.Beta.BetaToolUnion,
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 } as Anthropic.Beta.BetaToolUnion,
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
      const label = el.getAttribute("aria-label") || (input.labels?.[0]?.innerText) || input.placeholder || el.innerText || (el as HTMLAnchorElement).href || "";
      const extra = tag === "select" ? ` options=[${Array.from((el as HTMLSelectElement).options).map((o) => o.text).slice(0, 12).join(" | ")}]` : tag === "input" ? ` type=${input.type}${input.value ? ` value="${input.value.slice(0, 40)}"` : ""}` : tag === "a" ? ` href=${(el as HTMLAnchorElement).href.slice(0, 120)}` : "";
      out.push(`[${ref}] ${tag}${extra} "${label.replace(/\s+/g, " ").trim().slice(0, 80)}"`);
      if (n >= 150) break;
    }
    return `Title: ${document.title}\nURL: ${location.href}\n\nText:\n${document.body.innerText.replace(/\n{3,}/g, "\n\n").slice(0, 5000)}\n\nElements:\n${out.join("\n")}`;
  });
}

interface Outcome { summary: string; status: ErrandStatus; handoff?: Errand["handoff"] }

async function agent(c: Ctx): Promise<Outcome> {
  const p = c.patient;
  const system = `You run real errands on the real web for ${p.name} ("${p.nickname}"), ${p.age}, who lives at ${p.address}. She is on a phone call with Saathi, her AI assistant, and her family watches every step in their app.
Today is ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.
Her current medicines: ${S.meds(p.id).map((m) => `${m.name}${m.generic ? ` (${m.generic})` : ""} ${m.dose}, stock ${m.stock}`).join("; ")}.

How to do this errand: ${GUIDE[c.errand.kind]}

Rules:
- Everything must be real: real websites, real names, real prices. Never invent a doctor, a price, a slot or a result. If you can't find it, say so.
- Never log in, create accounts, enter OTPs, passwords, card or UPI details, or pay. Never try to solve or get past a captcha, a bot check or a "verify you are human" page. When the next step needs any of these, call hand_off_to_family with the real URL.
- Respect sites: if a site blocks automated browsers, leave it and use web search, or hand off.
- Ask her (ask_elder) only for real choices that are hers, with 2–3 short spoken options. Don't ask what you can find yourself.
- In the browser, call read_page after every navigation or click before acting.
- Keep it quick: a few minutes at most.`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: `Errand (${ERRAND_TITLE[c.errand.kind]}): ${c.errand.request}` }];
  await c.step(c.errand.kind === "find_doctor" || c.errand.kind === "web_lookup" ? "Searching the web" : "Opening the browser");
  for (let turn = 0; turn < 40; turn++) {
    if (cancelled.has(c.errand.id)) throw new Error("cancelled");
    const res = await client!.beta.messages.create({
      model: ERRAND_MODEL, max_tokens: 6000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      cache_control: { type: "ephemeral" }, output_config: { effort: "low" },
      system, tools: BROWSER_TOOLS, messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (res.stop_reason === "refusal") throw new Error("The AI declined this errand");
    messages.push({ role: "assistant", content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
    for (const b of res.content) if (b.type === "server_tool_use") await c.step(b.name === "web_search" ? `Searching the web: ${String((b.input as { query?: string }).query ?? "").slice(0, 80)}` : `Reading ${String((b.input as { url?: string }).url ?? "a page").slice(0, 80)}`);
    if (res.stop_reason === "pause_turn") continue; // a long server-side search: send it back to continue
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!uses.length) {
      const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join(" ").trim();
      return { summary: text || "Finished.", status: text ? "done" : "failed" };
    }
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const u of uses) {
      const a = (u.input ?? {}) as Record<string, any>;
      let out = "ok"; let isError = false;
      try {
        switch (u.name) {
          case "goto": { const pg = await c.open(); await pg.goto(String(a.url), { waitUntil: "domcontentloaded", timeout: 35000 }); await pg.waitForTimeout(2500); await c.step(String(a.note || `Opened ${a.url}`)); out = await readPage(pg); break; }
          case "read_page": out = c.page ? await readPage(c.page) : "No page is open. Use goto first."; break;
          case "click": { const pg = await c.open(); await pg.locator(`[data-sref="${a.ref}"]`).click(); await pg.waitForLoadState("domcontentloaded").catch(() => undefined); await pg.waitForTimeout(1500); await c.step(String(a.note || "Clicked")); out = await readPage(pg); break; }
          case "fill": { const pg = await c.open(); await pg.locator(`[data-sref="${a.ref}"]`).fill(String(a.text)); await c.step(String(a.note || "Filled in a field")); break; }
          case "select": { const pg = await c.open(); await pg.locator(`[data-sref="${a.ref}"]`).selectOption({ label: String(a.option) }); await c.step(String(a.note || `Chose ${a.option}`)); break; }
          case "ask_elder": out = `She answered: ${await c.ask(String(a.question), ((a.options as string[]) ?? []).map(String).slice(0, 4))}`; break;
          case "hand_off_to_family": {
            const url = String(a.url); if (!/^https:\/\//.test(url)) { out = "The URL must be a real https link."; isError = true; break; }
            await c.step(`Ready for the family to finish on ${String(a.site).slice(0, 60)}`);
            return { status: "ready_for_family", summary: String(a.summary_for_her), handoff: { site: String(a.site).slice(0, 80), url: url.slice(0, 500), what: String(a.what_to_do).slice(0, 300) } };
          }
          case "finish": return { summary: String(a.summary), status: a.status === "failed" ? "failed" : "done" };
          default: out = "Unknown tool"; isError = true;
        }
      } catch (err) {
        if (cancelled.has(c.errand.id) || /No answer/.test((err as Error).message)) throw err;
        out = `Error: ${(err as Error).message.split("\n")[0]}`; isError = true;
      }
      results.push({ type: "tool_result", tool_use_id: u.id, content: out.slice(0, 12000), is_error: isError });
    }
    messages.push({ role: "user", content: results });
  }
  return { summary: "This took too many steps, so Saathi stopped. Nothing was booked or paid.", status: "failed" };
}
