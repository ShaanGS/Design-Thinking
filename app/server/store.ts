// Read/write helpers that map database rows to the shared API types.
import { all, get, run, uid, nowIso, parse, localDate } from "./db.ts";
import type {
  Patient, Medication, Slot, TodayDose, Vital, FeedItem, Member, Family, MedDocument, Insight, HealthRecord,
  RecordEvent, LabPoint, Hospital, InventoryItem, Emergency, Relay, Visit, ChatTurn, Checkin, User, DocExtraction,
} from "../shared/types.ts";
import { SLOT_LABEL } from "../shared/types.ts";

export const toUser = (r: any): User => ({ id: r.id, name: r.name, role: r.role, relation: r.relation, familyId: r.family_id, hospitalId: r.hospital_id, lang: r.lang });

export const toPatient = (r: any): Patient => ({
  id: r.id, familyId: r.family_id, name: r.name, nickname: r.nickname, age: r.age, sex: r.sex, blood: r.blood, address: r.address,
  lat: r.lat, lng: r.lng, conditions: parse(r.conditions, []), allergies: parse(r.allergies, []), abha: r.abha, doctor: r.doctor,
  photoInitial: (r.nickname || r.name || "?").trim()[0] || "?",
});
export const patientOfFamily = (familyId: string) => { const r = get("SELECT * FROM patients WHERE family_id = ? LIMIT 1", familyId); return r ? toPatient(r) : null; };
export const patientById = (id: string) => { const r = get("SELECT * FROM patients WHERE id = ?", id); return r ? toPatient(r) : null; };
export const patientMemory = (id: string) => String(get("SELECT memory FROM patients WHERE id = ?", id)?.memory || "");

export const familyById = (id: string): Family | null => { const r = get("SELECT * FROM families WHERE id = ?", id); return r ? { id: r.id, code: r.code, name: r.name } : null; };
export const members = (familyId: string): Member[] =>
  all("SELECT * FROM users WHERE family_id = ? ORDER BY created_at", familyId).map((r) => ({ id: r.id, name: r.name, role: r.role, relation: r.relation, phone: r.phone }));

export const toMed = (r: any): Medication => ({
  id: r.id, patientId: r.patient_id, name: r.name, generic: r.generic, dose: r.dose, purpose: r.purpose, slots: parse(r.slots, []),
  stock: r.stock, color: r.color, active: !!r.active, prescribedBy: r.prescribed_by,
});
export const meds = (patientId: string, includeInactive = false) =>
  all(`SELECT * FROM medications WHERE patient_id = ? ${includeInactive ? "" : "AND active = 1"} ORDER BY created_at`, patientId).map(toMed);

/** Which dose slot is current, by local hour. */
export function slotStatus(slot: Slot, hour = new Date().getHours()): "due" | "upcoming" | "late" {
  const h = SLOT_LABEL[slot].hour;
  if (hour < h - 1) return "upcoming";
  if (hour <= h + 3) return "due";
  return "late";
}

export function todayDoses(patientId: string): TodayDose[] {
  const date = localDate();
  const logs = all("SELECT * FROM dose_logs WHERE patient_id = ? AND date = ?", patientId, date);
  const out: TodayDose[] = [];
  for (const m of meds(patientId)) {
    for (const slot of m.slots) {
      const l = logs.find((x) => x.med_id === m.id && x.slot === slot);
      const st = slotStatus(slot);
      out.push({ med: m, slot, status: l ? l.status : st === "late" ? "missed" : st === "due" ? "due" : "upcoming", at: l ? l.at : null });
    }
  }
  const order: Slot[] = ["morning", "afternoon", "night"];
  return out.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
}

export function adherence(patientId: string, days = 14) {
  const ms = meds(patientId);
  const perDay = ms.reduce((n, m) => n + m.slots.length, 0);
  const out: { date: string; taken: number; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = localDate(new Date(Date.now() - i * 86400000));
    const taken = Number(get("SELECT COUNT(*) AS n FROM dose_logs WHERE patient_id = ? AND date = ? AND status = 'taken'", patientId, d)?.n || 0);
    out.push({ date: d, taken, total: perDay });
  }
  return out;
}

export function logDose(patientId: string, medId: string, slot: Slot, status: "taken" | "missed", by: string | null, date = localDate()) {
  const at = nowIso();
  run(`INSERT INTO dose_logs (id, med_id, patient_id, date, slot, status, at, by_user) VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(med_id, date, slot) DO UPDATE SET status = excluded.status, at = excluded.at, by_user = excluded.by_user`,
    uid("d_"), medId, patientId, date, slot, status, at, by);
  if (status === "taken") run("UPDATE medications SET stock = MAX(stock - 1, 0) WHERE id = ?", medId);
}

export const toVital = (r: any): Vital => ({ id: r.id, type: r.type, value: r.value, value2: r.value2, at: r.at, source: r.source });
export const vitals = (patientId: string, limit = 60) => all("SELECT * FROM vitals WHERE patient_id = ? ORDER BY at DESC LIMIT ?", patientId, limit).map(toVital);
export function addVital(patientId: string, type: Vital["type"], value: number, value2: number | null, source: string): Vital {
  const v = { id: uid("v_"), type, value, value2, at: nowIso(), source };
  run("INSERT INTO vitals (id, patient_id, type, value, value2, at, source) VALUES (?,?,?,?,?,?,?)", v.id, patientId, type, value, value2, v.at, source);
  return v;
}

export const toFeed = (r: any): FeedItem => ({ id: r.id, familyId: r.family_id, kind: r.kind, level: r.level, title: r.title, body: r.body, at: r.at });
export const feed = (familyId: string, limit = 40) => all("SELECT * FROM feed WHERE family_id = ? ORDER BY at DESC LIMIT ?", familyId, limit).map(toFeed);
export function addFeed(familyId: string, kind: FeedItem["kind"], level: FeedItem["level"], title: string, body: string): FeedItem {
  const f: FeedItem = { id: uid("f_"), familyId, kind, level, title, body, at: nowIso() };
  run("INSERT INTO feed (id, family_id, kind, level, title, body, at) VALUES (?,?,?,?,?,?,?)", f.id, familyId, kind, level, title, body, f.at);
  return f;
}

export const toDoc = (r: any): MedDocument => ({
  id: r.id, patientId: r.patient_id, filename: r.filename, url: `/uploads/${encodeURIComponent(r.path)}`, mime: r.mime, status: r.status,
  error: r.error, extraction: parse<DocExtraction | null>(r.extraction, null), uploadedBy: r.uploaded_by, createdAt: r.created_at,
});
export const documents = (patientId: string) => all("SELECT * FROM documents WHERE patient_id = ? ORDER BY created_at", patientId).map(toDoc);
export const docById = (id: string) => { const r = get("SELECT * FROM documents WHERE id = ?", id); return r ? toDoc(r) : null; };

export const toInsight = (r: any): Insight => ({ id: r.id, level: r.level, title: r.title, detail: r.detail, ask: r.ask, sources: parse(r.sources, []), createdAt: r.created_at });
export const insights = (patientId: string) =>
  all("SELECT * FROM insights WHERE patient_id = ? ORDER BY CASE level WHEN 'high' THEN 0 WHEN 'med' THEN 1 ELSE 2 END, created_at", patientId).map(toInsight);
export function replaceInsights(patientId: string, list: Omit<Insight, "id" | "createdAt">[]) {
  run("DELETE FROM insights WHERE patient_id = ?", patientId);
  const at = nowIso();
  for (const i of list) run("INSERT INTO insights (id, patient_id, level, title, detail, ask, sources, created_at) VALUES (?,?,?,?,?,?,?,?)",
    uid("i_"), patientId, i.level, i.title, i.detail, i.ask, JSON.stringify(i.sources || []), at);
}

export function healthRecord(patientId: string): HealthRecord {
  const patient = patientById(patientId)!;
  const docs = documents(patientId);
  const events: RecordEvent[] = [];
  const labs: LabPoint[] = [];
  for (const d of docs) {
    const x = d.extraction;
    if (!x) continue;
    for (const e of x.events || []) events.push({ ...e, docId: d.id });
    for (const l of x.labs || []) if (Number.isFinite(+l.value)) labs.push({ ...l, value: +l.value, docId: d.id });
  }
  events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  labs.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { patient, documents: docs, events, labs, insights: insights(patientId) };
}

export const toHospital = (r: any): Hospital => ({
  id: r.id, name: r.name, short: r.short, kind: r.kind, lat: r.lat, lng: r.lng, phone: r.phone, caps: parse(r.caps, {} as any),
  icuBeds: r.icu_beds, erBeds: r.er_beds, updatedAt: r.updated_at,
  inventory: all("SELECT * FROM inventory WHERE hospital_id = ? ORDER BY item", r.id).map((i): InventoryItem => ({ item: i.item, label: i.label, qty: i.qty, unit: i.unit, min: i.min, updatedAt: i.updated_at })),
});
export const hospitals = () => all("SELECT * FROM hospitals ORDER BY name").map(toHospital);
export const hospitalById = (id: string) => { const r = get("SELECT * FROM hospitals WHERE id = ?", id); return r ? toHospital(r) : null; };

export const toRelay = (r: any): Relay => ({ id: r.id, item: r.item, label: r.label, qty: r.qty, fromId: r.from_id, toId: r.to_id, status: r.status, etaMin: r.eta_min, createdAt: r.created_at });
export const relays = () => all("SELECT * FROM relays ORDER BY created_at DESC LIMIT 30").map(toRelay);

export const toVisit = (r: any): Visit => ({ id: r.id, patientId: r.patient_id, place: r.place, reason: r.reason, kind: r.kind, status: r.status, at: r.at, notes: r.notes });
export const visits = (patientId: string) => all("SELECT * FROM visits WHERE patient_id = ? ORDER BY at DESC LIMIT 30", patientId).map(toVisit);

export const toChat = (r: any): ChatTurn => ({ id: r.id, role: r.role, text: r.text, english: r.english, at: r.at, redFlag: !!r.red_flag });
export const chats = (patientId: string, limit = 40) => all("SELECT * FROM (SELECT * FROM chats WHERE patient_id = ? ORDER BY at DESC LIMIT ?) ORDER BY at", patientId, limit).map(toChat);
export function addChat(patientId: string, role: ChatTurn["role"], text: string, english: string | null, redFlag = false): ChatTurn {
  const c: ChatTurn = { id: uid("c_"), role, text, english, at: nowIso(), redFlag };
  run("INSERT INTO chats (id, patient_id, role, text, english, red_flag, at) VALUES (?,?,?,?,?,?,?)", c.id, patientId, role, text, english, redFlag ? 1 : 0, c.at);
  return c;
}

export const toCheckin = (r: any): Checkin => ({ id: r.id, requestedBy: r.requested_by, requestedAt: r.requested_at, answeredAt: r.answered_at, answer: r.answer });
export const latestCheckin = (patientId: string) => { const r = get("SELECT * FROM checkins WHERE patient_id = ? ORDER BY requested_at DESC LIMIT 1", patientId); return r ? toCheckin(r) : null; };

export const rowToEmergencyBase = (r: any) => ({
  id: r.id, patientId: r.patient_id, familyId: r.family_id, status: r.status, source: r.source, symptomText: r.symptom_text,
  triage: parse(r.triage, null), route: parse(r.route, null), hospitalId: r.hospital_id, brief: r.brief, responders: parse(r.responders, []),
  teamReady: !!r.team_ready, startedAt: r.started_at, dispatchedAt: r.dispatched_at, arrivedAt: r.arrived_at,
}) as Omit<Emergency, "progress" | "ambulance" | "etaLeftMin">;
