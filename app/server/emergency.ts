// Emergency lifecycle: SOS → triage → need-matched routing → ambulance (simulated) → ER handoff.
import { all, get, run, uid, nowIso, parse } from "./db.ts";
import { addFeed, hospitals, hospitalById, meds, patientById, healthRecord, rowToEmergencyBase, relays as listRelays, toRelay } from "./store.ts";
import { decideRoute, km } from "./routing.ts";
import { roadTable, roadRoute, along } from "./roads.ts";
import { triage as aiTriage, erBrief, ruleTriage } from "./ai.ts";
import { toFamily, toNetwork, emergencyToNetwork, canSeeEmergency, redactForOtherHospital } from "./realtime.ts";
import type { Condition, Emergency, Triage, User } from "../shared/types.ts";
import { CONDITION_INFO } from "../shared/types.ts";

export const DEMO_SPEED = Math.max(1, Number(process.env.DEMO_SPEED || 20));
const SYMPTOM_WAIT_MS = 12000;
const AMBULANCE_BASE = { lat: 12.9105, lng: 80.1410 }; // 108 base at the district hospital

function simMinutesSince(iso: string | null) { return iso ? ((Date.now() - new Date(iso).getTime()) / 60000) * DEMO_SPEED : 0; }

export function hydrate(r: any): Emergency {
  const e = rowToEmergencyBase(r);
  let progress = 0, ambulance: Emergency["ambulance"] = null, etaLeftMin: number | null = null;
  const p = patientById(e.patientId);
  if (e.route && e.dispatchedAt && p) {
    const h = hospitalById(e.route.hospitalId);
    const total = e.route.etaMin;
    const elapsed = simMinutesSince(e.dispatchedAt);
    progress = ["arrived", "admitted", "resolved"].includes(e.status) ? 1 : Math.min(1, elapsed / total);
    etaLeftMin = Math.max(0, Math.ceil(total - elapsed));
    const r = e.route;
    if (r.path && r.path.length > 1 && r.pickupIndex != null && r.pickupShare != null) {
      // follow the real road: 108 base → her home, then her home → the hospital
      const toHome = r.path.slice(0, r.pickupIndex + 1), toHosp = r.path.slice(r.pickupIndex);
      ambulance = progress < r.pickupShare ? along(toHome, progress / r.pickupShare) : along(toHosp, (progress - r.pickupShare) / (1 - r.pickupShare));
    } else if (h) {
      const pickupShare = Math.min(0.4, 4 / total);
      const lerp = (a: { lat: number; lng: number }, b: { lat: number; lng: number }, t: number) => ({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
      ambulance = progress < pickupShare ? lerp(AMBULANCE_BASE, p, progress / pickupShare) : lerp(p, h, (progress - pickupShare) / (1 - pickupShare));
    }
  }
  return { ...e, progress, ambulance, etaLeftMin };
}

export const emergencyById = (id: string) => { const r = get("SELECT * FROM emergencies WHERE id = ?", id); return r ? hydrate(r) : null; };
export const activeForFamily = (familyId: string) => {
  const r = get("SELECT * FROM emergencies WHERE family_id = ? AND status IN ('triage','dispatched','arrived','admitted') ORDER BY started_at DESC LIMIT 1", familyId);
  return r ? hydrate(r) : null;
};
/** Recent cases for a hospital console: only its own sandbox, and the full brief only for cases coming to it. */
export const networkEmergencies = (viewer: User) =>
  all("SELECT * FROM emergencies WHERE status != 'cancelled' AND started_at > ? ORDER BY started_at DESC LIMIT 50", new Date(Date.now() - 12 * 3600000).toISOString())
    .map(hydrate).filter((e) => canSeeEmergency(viewer, e)).slice(0, 20)
    .map((e) => (e.hospitalId === viewer.hospitalId ? e : redactForOtherHospital(e)));

function broadcast(e: Emergency) {
  toFamily(e.familyId, "emergency", e);
  emergencyToNetwork(e);
}

const pending = new Map<string, NodeJS.Timeout>();

export async function startSOS(patientId: string, source: string, text: string | null, condition: Condition | null, byName: string) {
  const p = patientById(patientId)!;
  const existing = activeForFamily(p.familyId);
  if (existing) return existing;
  const id = uid("sos_");
  run("INSERT INTO emergencies (id, patient_id, family_id, status, source, symptom_text, started_at) VALUES (?,?,?,?,?,?,?)", id, patientId, p.familyId, "triage", source, text, nowIso());
  const f = addFeed(p.familyId, "sos", "sos", `${p.nickname} needs help`, `SOS from ${source}${byName !== p.name ? ` (raised by ${byName})` : ""}. Calling 108 and the neighbour now.`);
  toFamily(p.familyId, "feed", f);
  broadcast(emergencyById(id)!);
  if (text || condition) void dispatch(id, text, condition);
  else pending.set(id, setTimeout(() => void dispatch(id, null, null), SYMPTOM_WAIT_MS)); // wait for the elder to say what's wrong
  return emergencyById(id)!;
}

export async function addSymptom(id: string, text: string | null, condition: Condition | null) {
  const t = pending.get(id); if (t) { clearTimeout(t); pending.delete(id); }
  const e = emergencyById(id);
  if (!e || e.status !== "triage") return e;
  if (text) run("UPDATE emergencies SET symptom_text = ? WHERE id = ?", text, id);
  return dispatch(id, text, condition);
}

async function dispatch(id: string, text: string | null, condition: Condition | null) {
  pending.delete(id);
  const e = emergencyById(id);
  if (!e || e.status !== "triage") return e;
  const p = patientById(e.patientId)!;
  const tri: Triage = condition
    ? { condition, label: CONDITION_INFO[condition].label, confidence: 0.85, source: "symptom chosen by patient", english: CONDITION_INFO[condition].en }
    : text ? await aiTriage(text, p) : { ...ruleTriage(null), source: "no answer: routed on medical history" };
  const current = meds(p.id);
  const onAntiplatelet = current.some((m) => /clopidogrel|aspirin|warfarin|apixaban|rivaroxaban|dabigatran/i.test(`${m.name} ${m.generic}`));
  const list = hospitals();
  const roads = await roadTable(p, list);
  const route = decideRoute(tri.condition, p.lat, p.lng, list, onAntiplatelet, roads);
  const dest = list.find((h) => h.id === route.hospitalId)!;
  const geo = await roadRoute([AMBULANCE_BASE, p, dest]);
  if (geo && geo.legEnd.length === 2) {
    const pickup = geo.legMin[0] + 2; // drive to her, plus about 2 minutes to load her in
    const total = Math.max(3, Math.round(pickup + geo.legMin[1]));
    Object.assign(route, { path: geo.path, pickupIndex: geo.legEnd[0], pickupShare: Math.min(0.6, pickup / total), etaMin: total });
  }
  if (route.nearestId !== route.hospitalId) {
    const near = list.find((h) => h.id === route.nearestId)!;
    const alt = await roadRoute([p, near]);
    if (alt) route.nearestPath = alt.path;
  }
  const rec = healthRecord(p.id);
  const brief = await erBrief(p, tri, current, rec);
  const fresh = emergencyById(id);
  if (!fresh || fresh.status !== "triage") return fresh;
  run("UPDATE emergencies SET status = 'dispatched', triage = ?, route = ?, hospital_id = ?, brief = ?, dispatched_at = ? WHERE id = ?",
    JSON.stringify(tri), JSON.stringify(route), route.hospitalId, brief, nowIso(), id);
  const h = hospitalById(route.hospitalId)!, near = hospitalById(route.nearestId)!;
  const why = route.nearestId !== route.hospitalId ? ` The nearest (${near.short}) has no ${route.ranking.find((r) => r.hospitalId === near.id)?.missing.join(" or ")}. About ${route.savedMin} min saved.` : "";
  const f = addFeed(p.familyId, "emergency", "sos", `Ambulance going to ${h.short}`, `${tri.label}. ${h.short} has ${route.needLabel}. ETA ${route.etaMin} min.${why} Her records were sent to the ER.`);
  toFamily(p.familyId, "feed", f);
  const out = emergencyById(id)!;
  broadcast(out);
  return out;
}

export function cancelSOS(id: string, by: string) {
  const e = emergencyById(id);
  if (!e || !["triage", "dispatched"].includes(e.status)) return e;
  const t = pending.get(id); if (t) { clearTimeout(t); pending.delete(id); }
  run("UPDATE emergencies SET status = 'cancelled' WHERE id = ?", id);
  const p = patientById(e.patientId)!;
  const f = addFeed(e.familyId, "sos", "ok", "False alarm cancelled", `${by} cancelled the SOS. ${p.nickname} is OK.`);
  toFamily(e.familyId, "feed", f);
  const out = emergencyById(id)!;
  broadcast(out);
  return out;
}

export function respond(id: string, name: string, relation: string | null) {
  const r = get("SELECT * FROM emergencies WHERE id = ?", id); if (!r) return null;
  const list = parse<{ name: string; relation: string | null; at: string }[]>(r.responders, []);
  if (!list.some((x) => x.name === name)) list.push({ name, relation, at: nowIso() });
  run("UPDATE emergencies SET responders = ? WHERE id = ?", JSON.stringify(list), id);
  const f = addFeed(r.family_id, "emergency", "info", `${name} is on the way`, `${relation ? relation + ", " : ""}heading to the hospital.`);
  toFamily(r.family_id, "feed", f);
  const out = emergencyById(id)!; broadcast(out); return out;
}

export function hospitalAction(id: string, action: "ready" | "admit" | "resolve") {
  const e = emergencyById(id); if (!e) return null;
  const h = e.hospitalId ? hospitalById(e.hospitalId) : null;
  const p = patientById(e.patientId)!;
  if (action === "ready") {
    run("UPDATE emergencies SET team_ready = 1 WHERE id = ?", id);
    toFamily(e.familyId, "feed", addFeed(e.familyId, "emergency", "ok", `${h?.short || "Hospital"} team is ready`, `The ER has ${p.nickname}'s records and the team is waiting.`));
  } else if (action === "admit") {
    run("UPDATE emergencies SET status = 'admitted', arrived_at = COALESCE(arrived_at, ?) WHERE id = ?", nowIso(), id);
    toFamily(e.familyId, "feed", addFeed(e.familyId, "emergency", "ok", `${p.nickname} is with the doctors`, `Received at ${h?.name || "the hospital"}. Treatment has started.`));
  } else {
    run("UPDATE emergencies SET status = 'resolved' WHERE id = ?", id);
    toFamily(e.familyId, "feed", addFeed(e.familyId, "emergency", "ok", "Emergency closed", `${h?.short || "The hospital"} marked the case as stable.`));
  }
  const out = emergencyById(id)!; broadcast(out); return out;
}

/** Medicine relay between hospitals: pick the nearest hospital that can spare the stock. */
export function requestRelay(item: string, qty: number, toId: string) {
  const to = hospitalById(toId); if (!to) throw new Error("Unknown hospital");
  const donors = hospitals().filter((h) => h.id !== toId).map((h) => ({ h, have: h.inventory.find((i) => i.item === item) }))
    .filter((x) => x.have && x.have.qty - qty >= x.have.min)
    .sort((a, b) => km(to.lat, to.lng, a.h.lat, a.h.lng) - km(to.lat, to.lng, b.h.lat, b.h.lng));
  if (!donors.length) throw new Error("No hospital in the network can spare that much right now");
  const from = donors[0];
  const eta = Math.round((km(to.lat, to.lng, from.h.lat, from.h.lng) / 30) * 60 + 6);
  const id = uid("rel_");
  run("UPDATE inventory SET qty = qty - ?, updated_at = ? WHERE hospital_id = ? AND item = ?", qty, nowIso(), from.h.id, item);
  run("INSERT INTO relays (id, item, label, qty, from_id, to_id, status, eta_min, created_at) VALUES (?,?,?,?,?,?,?,?,?)", id, item, from.have!.label, qty, from.h.id, toId, "dispatched", eta, nowIso());
  toNetwork("relay", toRelay(get("SELECT * FROM relays WHERE id = ?", id)));
  toNetwork("hospitals", hospitals());
  return toRelay(get("SELECT * FROM relays WHERE id = ?", id));
}

/** Simulation clock: moves ambulances, marks arrivals, delivers relays. */
export function startClock() {
  setInterval(() => {
    for (const r of all("SELECT * FROM emergencies WHERE status = 'dispatched'")) {
      const e = hydrate(r);
      if (e.progress >= 1) {
        run("UPDATE emergencies SET status = 'arrived', arrived_at = ? WHERE id = ?", nowIso(), e.id);
        const h = hospitalById(e.hospitalId!);
        const p = patientById(e.patientId)!;
        toFamily(e.familyId, "feed", addFeed(e.familyId, "emergency", "info", `Reached ${h?.short}`, `The ambulance with ${p.nickname} has arrived at ${h?.name}.`));
        broadcast(emergencyById(e.id)!);
      } else broadcast(e);
    }
    for (const r of all("SELECT * FROM relays WHERE status = 'dispatched'")) {
      if (simMinutesSince(r.created_at) >= r.eta_min) {
        run("UPDATE relays SET status = 'delivered' WHERE id = ?", r.id);
        run("UPDATE inventory SET qty = qty + ?, updated_at = ? WHERE hospital_id = ? AND item = ?", r.qty, nowIso(), r.to_id, r.item);
        toNetwork("relay", toRelay(get("SELECT * FROM relays WHERE id = ?", r.id)));
        toNetwork("hospitals", hospitals());
      }
    }
  }, 1000);
}
export { listRelays };
