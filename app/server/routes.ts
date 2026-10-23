// REST API.
import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { all, get, run, uid, nowIso, localDate, UPLOAD_DIR, newCardToken } from "./db.ts";
import * as S from "./store.ts";
import * as E from "./emergency.ts";
import * as AI from "./ai.ts";
import { toFamily, toNetwork, userForToken, isOnline } from "./realtime.ts";
import { seed, SAMPLE_BY_HASH, SAMPLE_DOCS, SEED_DOC_DIR, INVENTORY_LABEL } from "./seed.ts";
import type { Condition, HelpStatus, Overview, Slot, User, Vital } from "../shared/types.ts";
import { CONDITION_INFO, SLOT_LABEL } from "../shared/types.ts";

export const api = express.Router();
type AuthedReq = Request & { user: User };
const wrap = (fn: (req: AuthedReq, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req as AuthedReq, res)).catch(next);
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }
const fail = (status: number, msg: string): never => { throw new HttpError(status, msg); };

function auth(req: Request, _res: Response, next: NextFunction) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const user = userForToken(token);
  if (!user) return next(new HttpError(401, "Please sign in again"));
  (req as AuthedReq).user = user; next();
}
const needFamily = (req: AuthedReq) => { if (!req.user.familyId) fail(403, "This account isn't part of a family"); const p = S.patientOfFamily(req.user.familyId!); if (!p) fail(404, "No elder profile yet"); return p!; };
const needHospital = (req: AuthedReq) => { if (req.user.role !== "hospital") fail(403, "Hospital staff only"); };
const newSession = (userId: string) => { const token = crypto.randomBytes(24).toString("hex"); run("INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)", token, userId, nowIso()); return token; };
const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/* ------------------------------------------------------------------ Info & auth */

api.get("/info", (_req, res) => res.json({ ai: AI.aiMode(), model: AI.MODEL, demoSpeed: E.DEMO_SPEED }));

api.post("/auth/demo", wrap((req, res) => {
  const map: Record<string, string> = { elder: "u_kamala", guardian: "u_karthik", granddaughter: "u_divya", neighbour: "u_meena", hospital: "u_priya", pharmacy: "u_raghu" };
  const id = map[clean(req.body?.persona)] || fail(400, "Unknown demo persona");
  const u = get("SELECT * FROM users WHERE id = ?", id) || fail(404, "Demo data missing. Run npm run seed.");
  res.json({ token: newSession(id), user: S.toUser(u) });
}));

api.post("/auth/join", wrap((req, res) => {
  const fam = get("SELECT * FROM families WHERE code = ?", clean(req.body?.code, 12).toUpperCase()) || fail(404, "No family with that code");
  const name = clean(req.body?.name, 40) || fail(400, "Please enter your name");
  const id = uid("u_");
  run("INSERT INTO users (id, family_id, name, role, relation, phone, lang, created_at) VALUES (?,?,?,?,?,?,?,?)", id, fam!.id, name, "guardian", clean(req.body?.relation, 30) || "Family", clean(req.body?.phone, 20) || null, "en", nowIso());
  toFamily(fam!.id, "feed", S.addFeed(fam!.id, "info", "info", `${name} joined the family circle`, `${clean(req.body?.relation, 30) || "Family"} · will get Saathi's alerts.`));
  res.json({ token: newSession(id), user: S.toUser(get("SELECT * FROM users WHERE id = ?", id)) });
}));

api.post("/auth/elder", wrap((req, res) => {
  const fam = get("SELECT * FROM families WHERE code = ?", clean(req.body?.code, 12).toUpperCase()) || fail(404, "No family with that code");
  const u = get("SELECT * FROM users WHERE family_id = ? AND role = 'elder'", fam!.id) || fail(404, "This family has no elder profile");
  res.json({ token: newSession(u!.id), user: S.toUser(u) });
}));

api.post("/auth/hospital", wrap((req, res) => {
  const h = S.hospitalById(clean(req.body?.hospitalId)) || fail(404, "Unknown hospital");
  const id = uid("u_");
  run("INSERT INTO users (id, hospital_id, name, role, relation, lang, created_at) VALUES (?,?,?,?,?,?,?)", id, h!.id, clean(req.body?.name, 40) || "ER desk", "hospital", "Staff", "en", nowIso());
  res.json({ token: newSession(id), user: S.toUser(get("SELECT * FROM users WHERE id = ?", id)) });
}));

api.post("/auth/create-family", wrap((req, res) => {
  const b = req.body || {};
  const elderName = clean(b.elderName, 60) || fail(400, "Enter the elder's name");
  const guardianName = clean(b.guardianName, 40) || fail(400, "Enter your name");
  let code = ""; do { code = elderName.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) + Math.floor(100 + Math.random() * 900); } while (get("SELECT id FROM families WHERE code = ?", code));
  const fam = uid("fam_"), elder = uid("u_"), guardian = uid("u_"), pid = uid("pat_"), at = nowIso();
  run("INSERT INTO families (id, code, name, created_at) VALUES (?,?,?,?)", fam, code, `${elderName.split(" ").slice(-1)[0]} family`, at);
  run("INSERT INTO users (id, family_id, name, role, relation, lang, created_at) VALUES (?,?,?,?,?,?,?)", elder, fam, elderName, "elder", clean(b.nickname, 20) || "Elder", b.lang === "ta" ? "ta" : "en", at);
  run("INSERT INTO users (id, family_id, name, role, relation, phone, lang, created_at) VALUES (?,?,?,?,?,?,?,?)", guardian, fam, guardianName, "guardian", clean(b.relation, 30) || "Family", clean(b.phone, 20) || null, "en", at);
  run(`INSERT INTO patients (id, family_id, user_id, name, nickname, age, sex, blood, address, lat, lng, conditions, allergies, abha, doctor, memory) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    pid, fam, elder, elderName, clean(b.nickname, 20) || elderName.split(" ")[0], Number(b.age) || 70, b.sex === "M" ? "M" : "F", clean(b.blood, 4) || "Unknown",
    clean(b.address, 160) || "Chennai", Number(b.lat) || 12.9235, Number(b.lng) || 80.129, JSON.stringify((b.conditions || []).map((x: unknown) => clean(x, 80)).filter(Boolean)),
    JSON.stringify((b.allergies || []).map((x: unknown) => clean(x, 80)).filter(Boolean)), null, null, "");
  run("UPDATE patients SET card_token = ? WHERE id = ?", newCardToken(), pid);
  res.json({ token: newSession(guardian), user: S.toUser(get("SELECT * FROM users WHERE id = ?", guardian)), code });
}));

api.use(auth);

api.get("/me", (req, res) => res.json({ user: (req as AuthedReq).user, info: { ai: AI.aiMode(), model: AI.MODEL, demoSpeed: E.DEMO_SPEED } }));
api.post("/auth/logout", wrap((req, res) => { run("DELETE FROM sessions WHERE token = ?", (req.headers.authorization || "").replace(/^Bearer\s+/i, "")); res.json({ ok: true }); }));

/* ------------------------------------------------------------------ Family overview */

export function overview(patientId: string, familyId: string): Overview {
  const p = S.patientById(patientId)!;
  const ci = S.latestCheckin(patientId);
  return {
    patient: p, today: S.todayDoses(patientId), adherence: S.adherence(patientId, 14), vitals: S.vitals(patientId, 80), feed: S.feed(familyId, 50),
    emergency: E.activeForFamily(familyId), checkin: ci && (!ci.answeredAt || Date.now() - new Date(ci.answeredAt).getTime() < 3 * 3600000) ? ci : null,
    visits: S.visits(patientId), members: S.members(familyId).map((m) => ({ ...m, online: isOnline(m.id) })), family: S.familyById(familyId)!,
    insightsCount: S.insights(patientId).length,
  };
}
const pushOverview = (patientId: string, familyId: string) => toFamily(familyId, "overview", overview(patientId, familyId));

api.get("/overview", wrap((req, res) => { const p = needFamily(req); res.json(overview(p.id, p.familyId)); }));

// The emergency card, with the token behind its QR. Only the family and the elder see the token.
api.get("/card", wrap((req, res) => { const p = needFamily(req); res.json({ ...S.cardInfo(p.id), cardToken: S.cardTokenOf(p.id), abha: p.abha }); }));

api.patch("/patient", wrap((req, res) => {
  const p = needFamily(req); const b = req.body || {};
  const set = (col: string, v: unknown) => run(`UPDATE patients SET ${col} = ? WHERE id = ?`, v as any, p.id);
  if (b.name) set("name", clean(b.name, 60)); if (b.nickname) set("nickname", clean(b.nickname, 20)); if (b.age) set("age", Number(b.age));
  if (b.blood) set("blood", clean(b.blood, 4)); if (b.address) set("address", clean(b.address, 160)); if (b.doctor !== undefined) set("doctor", clean(b.doctor, 120));
  if (Number.isFinite(+b.lat) && Number.isFinite(+b.lng) && b.lat !== undefined) { set("lat", +b.lat); set("lng", +b.lng); }
  if (Array.isArray(b.conditions)) set("conditions", JSON.stringify(b.conditions.map((x: unknown) => clean(x, 80)).filter(Boolean)));
  if (Array.isArray(b.allergies)) set("allergies", JSON.stringify(b.allergies.map((x: unknown) => clean(x, 80)).filter(Boolean)));
  pushOverview(p.id, p.familyId); res.json(S.patientById(p.id));
}));

/* ------------------------------------------------------------------ Medicines */

api.get("/meds", wrap((req, res) => { const p = needFamily(req); res.json(S.meds(p.id)); }));
api.post("/meds/check", wrap(async (req, res) => { const p = needFamily(req); res.json(await AI.medicineCheck({ name: clean(req.body?.name, 80), generic: clean(req.body?.generic, 80) || null }, S.meds(p.id), p)); }));
api.post("/meds", wrap(async (req, res) => {
  const p = needFamily(req); const b = req.body || {};
  const name = clean(b.name, 80) || fail(400, "Medicine name is required");
  const slots = (Array.isArray(b.slots) ? b.slots : []).filter((s: string) => s in SLOT_LABEL) as Slot[];
  if (!slots.length) fail(400, "Pick at least one time of day");
  const warnings = await AI.medicineCheck({ name: name!, generic: clean(b.generic, 80) || null }, S.meds(p.id), p);
  const id = uid("m_");
  run("INSERT INTO medications (id, patient_id, name, generic, dose, purpose, slots, stock, color, active, prescribed_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)",
    id, p.id, name, clean(b.generic, 80) || null, clean(b.dose, 40) || "1 tablet", clean(b.purpose, 80) || null, JSON.stringify(slots), Math.max(0, Number(b.stock) || 0), clean(b.color, 9) || "#FFFFFF", clean(b.prescribedBy, 60) || null, nowIso());
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "dose", "info", `${name} added to ${p.nickname}'s medicines`, `${slots.map((s) => SLOT_LABEL[s].en).join(" + ")} · added by ${req.user.name}.`));
  pushOverview(p.id, p.familyId);
  res.json({ med: S.meds(p.id).find((m) => m.id === id), warnings });
}));
api.patch("/meds/:id", wrap((req, res) => {
  const p = needFamily(req); const b = req.body || {};
  const m = get("SELECT * FROM medications WHERE id = ? AND patient_id = ?", req.params.id, p.id) || fail(404, "Medicine not found");
  if (b.stock !== undefined) run("UPDATE medications SET stock = ? WHERE id = ?", Math.max(0, Number(b.stock) || 0), m!.id);
  if (b.dose) run("UPDATE medications SET dose = ? WHERE id = ?", clean(b.dose, 40), m!.id);
  if (Array.isArray(b.slots)) run("UPDATE medications SET slots = ? WHERE id = ?", JSON.stringify(b.slots.filter((s: string) => s in SLOT_LABEL)), m!.id);
  if (b.active === false) run("UPDATE medications SET active = 0 WHERE id = ?", m!.id);
  pushOverview(p.id, p.familyId); res.json(S.toMed(get("SELECT * FROM medications WHERE id = ?", m!.id)));
}));

function announceDoses(p: ReturnType<typeof S.patientById> & {}, slot: Slot, byName: string) {
  const today = S.todayDoses(p.id).filter((d) => d.slot === slot);
  const taken = today.filter((d) => d.status === "taken").length;
  if (taken === today.length && today.length) {
    toFamily(p.familyId, "feed", S.addFeed(p.familyId, "dose", "ok", `${p.nickname} took her ${SLOT_LABEL[slot].en.toLowerCase()} tablets`, `${taken} of ${today.length} confirmed${byName !== p.name ? ` by ${byName}` : ""} at ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`));
  }
  const low = S.meds(p.id).filter((m) => m.stock > 0 && m.stock / Math.max(1, m.slots.length) <= 5);
  for (const m of low) {
    const already = get("SELECT id FROM feed WHERE family_id = ? AND title = ? AND at > ?", p.familyId, `${m.name} is running out`, new Date(Date.now() - 86400000).toISOString());
    if (!already) toFamily(p.familyId, "feed", S.addFeed(p.familyId, "dose", "warn", `${m.name} is running out`, `${Math.floor(m.stock / m.slots.length)} days left. Reorder from the Medicines tab.`));
  }
}
api.post("/doses", wrap((req, res) => {
  const p = needFamily(req); const { medId, slot, status } = req.body || {};
  if (!(slot in SLOT_LABEL) || !["taken", "missed"].includes(status)) fail(400, "Bad dose");
  get("SELECT id FROM medications WHERE id = ? AND patient_id = ?", medId, p.id) || fail(404, "Medicine not found");
  S.logDose(p.id, medId, slot, status, req.user.id);
  announceDoses(p, slot, req.user.name); pushOverview(p.id, p.familyId); res.json({ ok: true });
}));
api.post("/doses/slot", wrap((req, res) => {
  const p = needFamily(req); const slot = req.body?.slot as Slot;
  if (!(slot in SLOT_LABEL)) fail(400, "Bad slot");
  for (const d of S.todayDoses(p.id).filter((x) => x.slot === slot && x.status !== "taken")) S.logDose(p.id, d.med.id, slot, "taken", req.user.id);
  announceDoses(p, slot, req.user.name); pushOverview(p.id, p.familyId); res.json({ ok: true });
}));

/* ------------------------------------------------------------------ Vitals, check-ins, visits */

api.post("/vitals", wrap((req, res) => {
  const p = needFamily(req); const b = req.body || {};
  const type = b.type as Vital["type"]; if (!["hr", "bp", "sugar", "spo2"].includes(type)) fail(400, "Bad vital type");
  const value = Number(b.value); if (!Number.isFinite(value) || value <= 0) fail(400, "Enter a value");
  const v = S.addVital(p.id, type, value, b.value2 != null ? Number(b.value2) : null, clean(b.source, 40) || "Manual");
  const label = type === "hr" ? `Pulse ${value} bpm` : type === "bp" ? `BP ${value}/${v.value2}` : type === "sugar" ? `Sugar ${value} mg/dL` : `SpO₂ ${value}%`;
  const abnormal = (type === "hr" && (value < 50 || value > 110)) || (type === "bp" && (value > 170 || value < 95)) || (type === "sugar" && (value > 280 || value < 70)) || (type === "spo2" && value < 92);
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "vital", abnormal ? "warn" : "info", label, `${v.source}${abnormal ? " · outside her usual range" : ""}.`));
  pushOverview(p.id, p.familyId); res.json(v);
}));

api.post("/checkins", wrap((req, res) => {
  const p = needFamily(req);
  const id = uid("ci_");
  run("INSERT INTO checkins (id, patient_id, requested_by, requested_at) VALUES (?,?,?,?)", id, p.id, req.user.name, nowIso());
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "checkin", "info", `${req.user.name} is checking on ${p.nickname}`, "Waiting for her reply."));
  pushOverview(p.id, p.familyId); res.json({ id });
}));
api.post("/checkins/:id/answer", wrap(async (req, res) => {
  const p = needFamily(req); const answer = req.body?.answer === "help" ? "help" : "ok";
  run("UPDATE checkins SET answered_at = ?, answer = ? WHERE id = ? AND patient_id = ?", nowIso(), answer, req.params.id, p.id);
  if (answer === "help") await E.startSOS(p.id, "check-in reply", null, null, req.user.name);
  else toFamily(p.familyId, "feed", S.addFeed(p.familyId, "checkin", "ok", `${p.nickname} says she's OK`, "Replied to the check-in."));
  pushOverview(p.id, p.familyId); res.json({ ok: true });
}));

api.post("/visits", wrap((req, res) => {
  const p = needFamily(req); const b = req.body || {};
  const id = uid("vis_");
  run("INSERT INTO visits (id, patient_id, place, reason, kind, status, at, notes) VALUES (?,?,?,?,?,?,?,?)", id, p.id, clean(b.place, 120) || fail(400, "Where is the visit?"),
    clean(b.reason, 120) || "Check-up", ["opd", "lab", "admission", "followup"].includes(b.kind) ? b.kind : "opd", "scheduled", new Date(b.at || Date.now()).toISOString(), clean(b.notes, 300) || null);
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "visit", "info", `Visit planned: ${clean(b.reason, 60) || "Check-up"}`, `${clean(b.place, 80)} · ${new Date(b.at || Date.now()).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`));
  pushOverview(p.id, p.familyId); res.json({ id });
}));
api.patch("/visits/:id", wrap((req, res) => {
  const p = needFamily(req); const status = req.body?.status;
  if (!["scheduled", "checked_in", "done"].includes(status)) fail(400, "Bad status");
  const v = get("SELECT * FROM visits WHERE id = ? AND patient_id = ?", req.params.id, p.id) || fail(404, "Visit not found");
  run("UPDATE visits SET status = ?, notes = COALESCE(?, notes) WHERE id = ?", status, clean(req.body?.notes, 300) || null, v!.id);
  const msg = status === "checked_in" ? [`${p.nickname} checked in at ${v!.place}`, `${v!.reason}. Saathi shared her doctor brief with the clinic.`] : status === "done" ? [`Visit done: ${v!.reason}`, clean(req.body?.notes, 200) || "Notes can be added from the Visits tab."] : null;
  if (msg) toFamily(p.familyId, "feed", S.addFeed(p.familyId, "visit", "ok", msg[0], msg[1]));
  pushOverview(p.id, p.familyId); res.json({ ok: true });
}));

/* ------------------------------------------------------------------ Saathi companion */

api.get("/chat", wrap((req, res) => { const p = needFamily(req); res.json(S.chats(p.id)); }));
api.post("/chat", wrap(async (req, res) => {
  const p = needFamily(req);
  const text = clean(req.body?.text, 500) || fail(400, "Say something");
  const userTurn = S.addChat(p.id, "user", text!, null);
  toFamily(p.familyId, "chat", userTurn);
  const today = S.todayDoses(p.id).map((d) => `${d.med.name} ${d.med.dose} (${d.slot}): ${d.status}`);
  const r = await AI.companionReply(p, S.patientMemory(p.id), S.chats(p.id, 12), text!, today);
  const reply = S.addChat(p.id, "assistant", r.say, r.english, r.redFlag);
  toFamily(p.familyId, "chat", reply);
  let emergency = null;
  if (r.redFlag || r.action === "emergency") emergency = await E.startSOS(p.id, "Saathi conversation", text!, null, p.name);
  if (r.action === "log_meds" || r.signals?.meds === "taken") {
    const due = S.todayDoses(p.id).filter((d) => d.status === "due");
    for (const d of due) S.logDose(p.id, d.med.id, d.slot, "taken", req.user.id);
    if (due.length) announceDoses(p, due[0].slot, "Saathi (from her call)");
  }
  if (r.action === "connect_family") toFamily(p.familyId, "feed", S.addFeed(p.familyId, "chat", "info", `${p.nickname} wants to talk to you`, "She asked Saathi to connect her to the family. Give her a call."));
  if (r.action === "suggest_doctor" || r.signals?.sleep === "poor") toFamily(p.familyId, "feed", S.addFeed(p.familyId, "chat", "warn", `${p.nickname} ${r.signals?.sleep === "poor" ? "slept badly again" : "may need a doctor's visit"}`, `From today's conversation: “${r.english}”`));
  pushOverview(p.id, p.familyId);
  res.json({ user: userTurn, reply, signals: r.signals, action: r.action, emergency });
}));

/* ------------------------------------------------------------------ Health Vault */

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 10 } });
const MIME_EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "application/pdf": ".pdf" };

async function processDocument(docId: string, buf: Buffer, mime: string, patientId: string, familyId: string) {
  try {
    const sample = SAMPLE_BY_HASH.get(crypto.createHash("sha256").update(buf).digest("hex"));
    let extraction;
    if (AI.aiMode() === "claude") extraction = await AI.extractDocument(buf, mime);
    else if (sample) { await new Promise((r) => setTimeout(r, 900 + Math.random() * 900)); extraction = sample.extraction; }
    else throw new Error("Reading new papers needs the Claude API key (ANTHROPIC_API_KEY). In demo mode, try the sample papers.");
    run("UPDATE documents SET status = 'done', extraction = ?, error = NULL WHERE id = ?", JSON.stringify(extraction), docId);
    const p = S.patientById(patientId)!;
    const newAllergies = (extraction.allergies || []).filter((a: string) => !p.allergies.some((x) => x.toLowerCase().includes(a.toLowerCase().split(" ")[0])));
    if (newAllergies.length) run("UPDATE patients SET allergies = ? WHERE id = ?", JSON.stringify([...p.allergies, ...newAllergies]), patientId);
    toFamily(familyId, "feed", S.addFeed(familyId, "doc", "info", `Saathi read: ${extraction.title}`, extraction.summary));
  } catch (e) {
    run("UPDATE documents SET status = 'error', error = ? WHERE id = ?", (e as Error).message.slice(0, 300), docId);
  }
  toFamily(familyId, "vault", { docId });
}
async function refreshInsights(patientId: string, familyId: string) {
  const before = S.insights(patientId).map((i) => i.title).sort().join("|");
  const list = await AI.buildInsights(S.healthRecord(patientId), S.meds(patientId));
  S.replaceInsights(patientId, list);
  // Only tell the family when the findings actually changed
  if (list.map((i) => i.title).sort().join("|") === before) { toFamily(familyId, "vault", { insights: true }); return; }
  const high = list.filter((i) => i.level === "high").length;
  if (list.length) toFamily(familyId, "feed", S.addFeed(familyId, "insight", high ? "warn" : "info", `Saathi found ${list.length} thing${list.length > 1 ? "s" : ""} to ask the doctor`, list.slice(0, 3).map((i) => i.title).join(" · ")));
  toFamily(familyId, "vault", { insights: true });
}

api.get("/vault", wrap((req, res) => { const p = needFamily(req); res.json(S.healthRecord(p.id)); }));
api.post("/vault/upload", upload.array("files", 10), wrap(async (req, res) => {
  const p = needFamily(req);
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) fail(400, "Choose at least one photo or PDF");
  const ids: string[] = [];
  const jobs: Promise<void>[] = [];
  for (const f of files) {
    const ext = MIME_EXT[f.mimetype] || fail(400, `${f.originalname}: only photos (JPG, PNG, WebP) and PDFs are supported`);
    const id = uid("doc_"), stored = `${id}${crypto.randomBytes(6).toString("hex")}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), f.buffer);
    run("INSERT INTO documents (id, patient_id, filename, path, mime, status, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?)", id, p.id, clean(f.originalname, 120), stored, f.mimetype, "processing", req.user.name, nowIso());
    ids.push(id);
    jobs.push(processDocument(id, f.buffer, f.mimetype, p.id, p.familyId));
  }
  toFamily(p.familyId, "vault", { added: ids });
  res.json({ ids });
  await Promise.all(jobs);
  await refreshInsights(p.id, p.familyId);
}));
api.post("/vault/samples", wrap(async (req, res) => {
  const p = needFamily(req);
  const ids: string[] = [];
  const jobs: Promise<void>[] = [];
  for (const d of SAMPLE_DOCS) {
    const buf = fs.readFileSync(path.join(SEED_DOC_DIR, d.file));
    const id = uid("doc_"), stored = `${id}${crypto.randomBytes(6).toString("hex")}.jpg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, stored), buf);
    run("INSERT INTO documents (id, patient_id, filename, path, mime, status, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?)", id, p.id, `Sample ${d.key}: ${d.extraction.title}.jpg`, stored, "image/jpeg", "processing", req.user.name, nowIso());
    ids.push(id); jobs.push(processDocument(id, buf, "image/jpeg", p.id, p.familyId));
  }
  toFamily(p.familyId, "vault", { added: ids });
  res.json({ ids });
  await Promise.all(jobs);
  await refreshInsights(p.id, p.familyId);
}));
api.post("/vault/analyse", wrap(async (req, res) => { const p = needFamily(req); await refreshInsights(p.id, p.familyId); res.json(S.insights(p.id)); }));
api.delete("/vault/docs/:id", wrap(async (req, res) => {
  const p = needFamily(req);
  const d = get("SELECT * FROM documents WHERE id = ? AND patient_id = ?", req.params.id, p.id) || fail(404, "Document not found");
  run("DELETE FROM documents WHERE id = ?", d!.id); fs.rmSync(path.join(UPLOAD_DIR, d!.path), { force: true });
  toFamily(p.familyId, "vault", { removed: d!.id }); res.json({ ok: true });
  await refreshInsights(p.id, p.familyId);
}));
api.post("/vault/ask", wrap(async (req, res) => { const p = needFamily(req); res.json(await AI.askRecord(S.healthRecord(p.id), clean(req.body?.question, 400) || fail(400, "Ask a question"))); }));

const breakGlassLog = new Set<string>();
const shares = new Map<string, { patientId: string; expires: number }>();
api.post("/vault/share", wrap((req, res) => {
  const p = needFamily(req);
  const token = crypto.randomBytes(12).toString("base64url");
  shares.set(token, { patientId: p.id, expires: Date.now() + 24 * 3600000 });
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "doc", "info", "Doctor link created", `${req.user.name} shared ${p.nickname}'s record. The link expires in 24 hours.`));
  res.json({ token, expires: new Date(Date.now() + 24 * 3600000).toISOString() });
}));
export const publicApi = express.Router();
publicApi.get("/hospitals", (_req, res) => res.json(S.hospitals().map((h) => ({ id: h.id, name: h.name, short: h.short }))));
publicApi.get("/share/:token", (req, res) => {
  const s = shares.get(req.params.token);
  if (!s || s.expires < Date.now()) return res.status(404).json({ error: "This link has expired. Ask the family for a new one." });
  res.json({ record: S.healthRecord(s.patientId), meds: S.meds(s.patientId), expires: new Date(s.expires).toISOString() });
});

/* Bystander page (/help/:token): anyone who scans the QR on the elder's emergency card. No login.
   The token is a separate random value per patient (not the family code, which would let anyone join the family). */
function helpStatus(patientId: string, familyId: string): HelpStatus {
  const r = get("SELECT * FROM emergencies WHERE patient_id = ? AND started_at > ? ORDER BY started_at DESC LIMIT 1", patientId, new Date(Date.now() - 3 * 3600000).toISOString());
  const e = r ? E.hydrate(r) : null;
  const h = e ? S.hospitalById(e.hospitalId || e.route?.hospitalId || "") : null;
  return {
    emergency: e && {
      id: e.id, status: e.status, startedAt: e.startedAt, source: e.source, condition: e.triage?.label ?? null, etaLeftMin: e.etaLeftMin, progress: e.progress,
      hospital: h && { name: h.name, short: h.short, phone: h.phone }, responders: e.responders.map((x) => ({ name: x.name, relation: x.relation })),
    },
    familyTold: S.members(familyId).filter((m) => m.role === "guardian").map((m) => ({ name: m.name, relation: m.relation })),
  };
}
const helpAlerts = new Map<string, number>();
publicApi.get("/help/:token", (req, res) => {
  const p = S.patientByCardToken(req.params.token);
  if (!p) return res.status(404).json({ error: "This card isn't active. Call 108 for an ambulance." });
  res.json(S.cardInfo(p.id));
});
publicApi.get("/help/:token/status", (req, res) => {
  const p = S.patientByCardToken(req.params.token);
  if (!p) return res.status(404).json({ error: "This card isn't active. Call 108 for an ambulance." });
  res.json(helpStatus(p.id, p.familyId));
});
publicApi.post("/help/:token/alert", async (req, res) => {
  try {
    const p = S.patientByCardToken(req.params.token);
    if (!p) return res.status(404).json({ error: "This card isn't active. Call 108 for an ambulance." });
    const last = helpAlerts.get(p.id) || 0;
    if (Date.now() - last > 60000 || !E.activeForFamily(p.familyId)) {
      helpAlerts.set(p.id, Date.now());
      const lat = Number(req.body?.lat), lng = Number(req.body?.lng);
      const where = Number.isFinite(lat) && Number.isFinite(lng) && req.body?.lat != null ? ` They shared where she is: https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}` : "";
      toFamily(p.familyId, "feed", S.addFeed(p.familyId, "sos", "sos", `A passer-by scanned ${p.nickname}'s card`, `Someone found ${p.nickname} and started an emergency from her Saathi card.${where}`));
      await E.startSOS(p.id, "bystander", "Found unwell in a public place by a passer-by who scanned her Saathi emergency card.", null, "A passer-by");
    }
    res.json(helpStatus(p.id, p.familyId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Couldn't reach her family. Call 108 now." });
  }
});

/* ------------------------------------------------------------------ Emergencies */

api.post("/sos", wrap(async (req, res) => {
  const p = needFamily(req); const b = req.body || {};
  const cond = (b.condition && b.condition in CONDITION_INFO ? b.condition : null) as Condition | null;
  res.json(await E.startSOS(p.id, clean(b.source, 40) || "app", clean(b.text, 300) || null, cond, req.user.name));
}));
api.post("/sos/:id/symptom", wrap(async (req, res) => {
  const p = needFamily(req); const b = req.body || {};
  get("SELECT id FROM emergencies WHERE id = ? AND patient_id = ?", req.params.id, p.id) || fail(404, "Emergency not found");
  const cond = (b.condition && b.condition in CONDITION_INFO ? b.condition : null) as Condition | null;
  res.json(await E.addSymptom(req.params.id, clean(b.text, 300) || null, cond));
}));
api.post("/sos/:id/cancel", wrap((req, res) => { const p = needFamily(req); get("SELECT id FROM emergencies WHERE id = ? AND patient_id = ?", req.params.id, p.id) || fail(404, "Emergency not found"); res.json(E.cancelSOS(req.params.id, req.user.name)); }));
api.post("/sos/:id/respond", wrap((req, res) => { const p = needFamily(req); get("SELECT id FROM emergencies WHERE id = ? AND patient_id = ?", req.params.id, p.id) || fail(404, "Emergency not found"); res.json(E.respond(req.params.id, req.user.name, req.user.relation)); }));

/* ------------------------------------------------------------------ Hospital network */

api.get("/hospitals", (_req, res) => res.json(S.hospitals()));
api.get("/network", wrap((req, res) => { needHospital(req); res.json({ emergencies: E.networkEmergencies(), hospitals: S.hospitals(), relays: S.relays() }); }));
api.get("/network/patient/:id", wrap((req, res) => {
  needHospital(req);
  const active = get("SELECT id, family_id FROM emergencies WHERE patient_id = ? AND status IN ('triage','dispatched','arrived','admitted') LIMIT 1", req.params.id) || fail(403, "Records open only during an active emergency (break-glass)");
  // Break-glass access is logged where the family can see it, once per staff member per emergency
  const key = `${active!.id}:${req.user.id}`;
  if (!breakGlassLog.has(key)) {
    breakGlassLog.add(key);
    const h = req.user.hospitalId ? S.hospitalById(req.user.hospitalId) : null;
    console.log(`[break-glass] ${req.user.name} (${h?.short || "hospital"}) opened record of patient ${req.params.id} for emergency ${active!.id}`);
    toFamily(active!.family_id, "feed", S.addFeed(active!.family_id, "emergency", "info", `${h?.short || "The ER"} opened her medical record`, `${req.user.name} viewed it for this emergency. Every access is logged.`));
  }
  res.json({ record: S.healthRecord(req.params.id), meds: S.meds(req.params.id), emergencyId: active!.id });
}));
api.post("/emergencies/:id/:action(ready|admit|resolve)", wrap((req, res) => { needHospital(req); res.json(E.hospitalAction(req.params.id, req.params.action as "ready" | "admit" | "resolve")); }));
api.patch("/hospitals/:id", wrap((req, res) => {
  needHospital(req); const b = req.body || {};
  const h = S.hospitalById(req.params.id) || fail(404, "Unknown hospital");
  if (b.icuBeds !== undefined) run("UPDATE hospitals SET icu_beds = ? WHERE id = ?", Math.max(0, Number(b.icuBeds) || 0), h!.id);
  if (b.erBeds !== undefined) run("UPDATE hospitals SET er_beds = ? WHERE id = ?", Math.max(0, Number(b.erBeds) || 0), h!.id);
  if (b.caps && typeof b.caps === "object") run("UPDATE hospitals SET caps = ? WHERE id = ?", JSON.stringify({ ...h!.caps, ...Object.fromEntries(Object.entries(b.caps).map(([k, v]) => [k, !!v])) }), h!.id);
  run("UPDATE hospitals SET updated_at = ? WHERE id = ?", nowIso(), h!.id);
  toNetwork("hospitals", S.hospitals()); res.json(S.hospitalById(h!.id));
}));
api.patch("/hospitals/:id/inventory/:item", wrap((req, res) => {
  needHospital(req);
  if (!(req.params.item in INVENTORY_LABEL)) fail(400, "Unknown item");
  run("UPDATE inventory SET qty = ?, updated_at = ? WHERE hospital_id = ? AND item = ?", Math.max(0, Number(req.body?.qty) || 0), nowIso(), req.params.id, req.params.item);
  toNetwork("hospitals", S.hospitals()); res.json(S.hospitalById(req.params.id));
}));
api.get("/relays", wrap((req, res) => { needHospital(req); res.json(S.relays()); }));
api.post("/relays", wrap((req, res) => {
  needHospital(req);
  const item = clean(req.body?.item, 30); if (!(item in INVENTORY_LABEL)) fail(400, "Unknown item");
  try { res.json(E.requestRelay(item, Math.max(1, Number(req.body?.qty) || 10), clean(req.body?.toId, 20))); }
  catch (e) { fail(409, (e as Error).message); }
}));

/* ------------------------------------------------------------------ Demo controls */

api.post("/demo/reset", wrap((_req, res) => { seed(); toNetwork("hospitals", S.hospitals()); res.json({ ok: true }); }));
api.post("/demo/missed-dose", wrap(async (req, res) => {
  const p = needFamily(req);
  const steps: [number, string, string, string][] = [
    [0, "warn", "Morning tablets not confirmed", `It's past 10 AM and ${p.nickname} hasn't confirmed her tablets.`],
    [4000, "warn", "Saathi is calling her", "Voice call in Tamil · 1st try."],
    [9000, "warn", "No answer · Meena alerted", "Neighbour Meena is going to check on her."],
    [15000, "info", "Karthik notified", "Escalated to the family because there's still no reply."],
  ];
  toFamily(p.familyId, "escalation", { stage: "calling" });
  const id = uid("esc_"); escalations.set(p.id, id);
  for (const [ms, level, title, body] of steps) setTimeout(() => {
    if (escalations.get(p.id) !== id) return;
    toFamily(p.familyId, "feed", S.addFeed(p.familyId, "dose", level as "warn" | "info", title, body));
  }, ms);
  setTimeout(() => {
    if (escalations.get(p.id) !== id) return;
    escalations.delete(p.id);
    toFamily(p.familyId, "escalation", { stage: "resolved" });
    toFamily(p.familyId, "feed", S.addFeed(p.familyId, "dose", "ok", `Meena checked on ${p.nickname}`, "She was dizzy, sugar 62 mg/dL. Meena gave her juice; she's fine now. Logged for her doctor."));
  }, 22000);
  res.json({ ok: true });
}));
const escalations = new Map<string, string>();
api.post("/demo/escalation-answer", wrap((req, res) => {
  const p = needFamily(req); escalations.delete(p.id);
  toFamily(p.familyId, "escalation", { stage: "resolved" });
  for (const d of S.todayDoses(p.id).filter((x) => x.status !== "taken" && x.slot === "morning")) S.logDose(p.id, d.med.id, "morning", "taken", req.user.id);
  toFamily(p.familyId, "feed", S.addFeed(p.familyId, "dose", "ok", `${p.nickname} answered Saathi's call`, "She's fine and has taken her morning tablets now."));
  pushOverview(p.id, p.familyId); res.json({ ok: true });
}));

/* ------------------------------------------------------------------ Errors */

api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : (err as { status?: number })?.status && Number((err as { status?: number }).status) < 500 ? Number((err as { status?: number }).status) : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Something went wrong on the server" : (err as Error).message });
});

/* ------------------------------------------------------------------ Background: missed-dose watcher */

export function startWatchers() {
  setInterval(() => {
    for (const p of all("SELECT * FROM patients")) {
      const doses = S.todayDoses(p.id);
      for (const slot of ["morning", "afternoon", "night"] as Slot[]) {
        const missed = doses.filter((d) => d.slot === slot && d.status === "missed");
        if (!missed.length) continue;
        const title = `${SLOT_LABEL[slot].en} tablets not confirmed`;
        if (get("SELECT id FROM feed WHERE family_id = ? AND title = ? AND at >= ?", p.family_id, title, new Date(localDate() + "T00:00:00").toISOString())) continue;
        toFamily(p.family_id, "feed", S.addFeed(p.family_id, "dose", "warn", title, `${missed.map((d) => d.med.name).join(", ")} not confirmed. Saathi will remind ${p.nickname} on her next call.`));
      }
    }
  }, 5 * 60000);
}
