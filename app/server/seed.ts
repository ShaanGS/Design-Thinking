// Sample family, hospital network and medical history. All people and hospitals are fictional.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, run, get, uid, nowIso, localDate, UPLOAD_DIR, tx } from "./db.ts";
import type { DocExtraction, Insight } from "../shared/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SEED_DOC_DIR = path.join(here, "seed-docs");

/** Prepared readings of the six sample papers (used in demo mode, and to seed the record). */
export const SAMPLE_DOCS: { key: string; file: string; extraction: DocExtraction }[] = [
  { key: "D1", file: "D1.jpg", extraction: {
    docType: "discharge_summary", title: "Discharge summary: heart attack and stent", date: "2022-06-14", provider: "Saraswathi Multispeciality, Cardiology (Dr. S. Raman)",
    summary: "Admitted 11 Jun 2022 with NSTEMI. One drug-eluting stent placed in the proximal LAD on 12 Jun. LVEF 55%. Penicillin allergy noted.",
    conditions: ["NSTEMI", "Coronary artery disease (LAD 90%)", "Type 2 diabetes", "Hypertension"], allergies: ["Penicillin (skin rash)"],
    medications: [
      { name: "Aspirin 75 mg", generic: "aspirin", dose: "75 mg", frequency: "0-1-0 for 12 months" },
      { name: "Clopidogrel 75 mg", generic: "clopidogrel", dose: "75 mg", frequency: "1-0-0" },
      { name: "Atorvastatin 40 mg", generic: "atorvastatin", dose: "40 mg", frequency: "0-0-1" },
      { name: "Metoprolol 25 mg", generic: "metoprolol", dose: "25 mg", frequency: "1-0-1" },
      { name: "Metformin 500 mg", generic: "metformin", dose: "500 mg", frequency: "1-0-1" },
    ],
    labs: [],
    events: [
      { date: "2022-06-11", kind: "heart", title: "Heart attack (NSTEMI), admitted", detail: "Admitted to Saraswathi Multispeciality cardiology." },
      { date: "2022-06-12", kind: "heart", title: "Stent placed in LAD artery", detail: "PCI with one drug-eluting stent to the proximal LAD. LVEF 55%." },
      { date: "2022-06-14", kind: "rx", title: "Discharged on 5 medicines", detail: "Aspirin + clopidogrel for 12 months, atorvastatin 40, metoprolol, metformin." },
    ] } },
  { key: "D2", file: "D2.jpg", extraction: {
    docType: "lab_report", title: "Blood tests, Aug 2023", date: "2023-08-21", provider: "Annai Diagnostics, Tambaram",
    summary: "HbA1c 7.1%, eGFR 62, LDL 92 mg/dL. Haemoglobin normal.", conditions: [], allergies: [], medications: [],
    labs: [
      { test: "HbA1c", value: 7.1, unit: "%", date: "2023-08-21" }, { test: "Fasting glucose", value: 138, unit: "mg/dL", date: "2023-08-21" },
      { test: "Creatinine", value: 1.0, unit: "mg/dL", date: "2023-08-21" }, { test: "eGFR", value: 62, unit: "mL/min/1.73m2", date: "2023-08-21" },
      { test: "LDL", value: 92, unit: "mg/dL", date: "2023-08-21" }, { test: "Haemoglobin", value: 12.1, unit: "g/dL", date: "2023-08-21" },
    ],
    events: [{ date: "2023-08-21", kind: "lab", title: "Blood tests", detail: "HbA1c 7.1%, eGFR 62, LDL 92." }] } },
  { key: "D3", file: "D3.jpg", extraction: {
    docType: "lab_report", title: "Blood tests, Nov 2024", date: "2024-11-09", provider: "Annai Diagnostics, Tambaram",
    summary: "HbA1c 7.6%, eGFR 51, LDL 104 mg/dL.", conditions: [], allergies: [], medications: [],
    labs: [
      { test: "HbA1c", value: 7.6, unit: "%", date: "2024-11-09" }, { test: "Fasting glucose", value: 151, unit: "mg/dL", date: "2024-11-09" },
      { test: "Creatinine", value: 1.2, unit: "mg/dL", date: "2024-11-09" }, { test: "eGFR", value: 51, unit: "mL/min/1.73m2", date: "2024-11-09" },
      { test: "LDL", value: 104, unit: "mg/dL", date: "2024-11-09" }, { test: "Potassium", value: 4.8, unit: "mmol/L", date: "2024-11-09" },
    ],
    events: [{ date: "2024-11-09", kind: "lab", title: "Blood tests", detail: "HbA1c 7.6%, eGFR 51, LDL 104." }] } },
  { key: "D4", file: "D4.jpg", extraction: {
    docType: "scan_report", title: "Echo: heart pumping slightly weaker", date: "2025-01-20", provider: "Saraswathi Multispeciality (Dr. A. Fathima)",
    summary: "Mild LV systolic dysfunction, LVEF 48% (55% in 2022). Mild mitral regurgitation.", conditions: ["Ischaemic heart disease with mild LV dysfunction"], allergies: [], medications: [],
    labs: [],
    events: [{ date: "2025-01-20", kind: "scan", title: "Echo: LVEF down to 48%", detail: "Heart pumping slightly weaker than in 2022 (55%). Mild mitral regurgitation." }] } },
  { key: "D5", file: "D5.jpg", extraction: {
    docType: "prescription", title: "Cardiology review prescription", date: "2025-03-12", provider: "Dr. S. Raman, Cardiology",
    summary: "Clopidogrel continued, atorvastatin lowered to 20 mg, metoprolol stopped for dizziness, amlodipine started.", conditions: [], allergies: [],
    medications: [
      { name: "Clopidogrel 75 mg", generic: "clopidogrel", dose: "75 mg", frequency: "1-0-0" },
      { name: "Atorva 20 mg", generic: "atorvastatin", dose: "20 mg", frequency: "0-0-1" },
      { name: "Amlodipine 5 mg", generic: "amlodipine", dose: "5 mg", frequency: "1-0-0" },
    ],
    labs: [],
    events: [{ date: "2025-03-12", kind: "rx", title: "Cardiology review, medicines changed", detail: "Atorvastatin lowered to 20 mg, metoprolol stopped (dizziness), amlodipine started." }] } },
  { key: "D6", file: "D6.jpg", extraction: {
    docType: "lab_report", title: "Blood tests + GP prescription, 2026", date: "2026-08-28", provider: "Annai Diagnostics; Dr. P. Meenakshi (GP)",
    summary: "HbA1c 8.4%, eGFR 42, LDL 118, haemoglobin 10.9. GP prescribed Glycomet 500 twice daily and Omez 20 for a month.", conditions: [], allergies: [],
    medications: [
      { name: "Glycomet 500", generic: "metformin", dose: "500 mg", frequency: "1-0-1" },
      { name: "Omez 20 mg", generic: "omeprazole", dose: "20 mg", frequency: "1-0-0 for 1 month" },
    ],
    labs: [
      { test: "HbA1c", value: 8.4, unit: "%", date: "2026-08-28" }, { test: "Fasting glucose", value: 176, unit: "mg/dL", date: "2026-08-28" },
      { test: "Creatinine", value: 1.4, unit: "mg/dL", date: "2026-08-28" }, { test: "eGFR", value: 42, unit: "mL/min/1.73m2", date: "2026-08-28" },
      { test: "LDL", value: 118, unit: "mg/dL", date: "2026-08-28" }, { test: "Haemoglobin", value: 10.9, unit: "g/dL", date: "2026-08-28" },
    ],
    events: [
      { date: "2026-08-28", kind: "lab", title: "Blood tests", detail: "HbA1c 8.4%, eGFR 42, LDL 118, haemoglobin 10.9." },
      { date: "2026-09-02", kind: "rx", title: "GP prescription", detail: "Glycomet (metformin) 500 twice daily; Omez (omeprazole) for 1 month." },
    ] } },
];

export const sampleHash = (buf: Buffer) => crypto.createHash("sha256").update(buf).digest("hex");
export const SAMPLE_BY_HASH = new Map(SAMPLE_DOCS.map((d) => [sampleHash(fs.readFileSync(path.join(SEED_DOC_DIR, d.file))), d]));

const SEED_INSIGHTS = (ids: Record<string, string>): Omit<Insight, "id" | "createdAt">[] => [
  { level: "high", title: "Kidney function has fallen by a third in 3 years", detail: "eGFR went 62 → 51 → 42. At this level the metformin dose usually needs a doctor's review, but the 2026 prescription continued the full dose. Neither the GP nor the cardiologist has seen all three reports.", ask: "Should her metformin dose change now that her eGFR is 42?", sources: [ids.D2, ids.D3, ids.D6] },
  { level: "high", title: "Cholesterol is rising while the statin was halved", detail: "After her heart attack, LDL should stay well below 70. It went 92 → 104 → 118, and atorvastatin was lowered from 40 mg to 20 mg in 2025.", ask: "Should her atorvastatin go back up, or should another medicine be added?", sources: [ids.D1, ids.D5, ids.D6] },
  { level: "high", title: "Omeprazole may weaken her stent protection", detail: "The GP added omeprazole (Omez). It can reduce how well clopidogrel works. The cardiologist hasn't seen that prescription.", ask: "Is there a better acidity medicine to take with clopidogrel?", sources: [ids.D5, ids.D6] },
  { level: "med", title: "Sugar control is getting steadily worse", detail: "HbA1c went 7.1% → 7.6% → 8.4%. With the kidney trend, her diabetes plan needs a fresh look.", ask: "What's the plan to bring her HbA1c down safely?", sources: [ids.D2, ids.D3, ids.D6] },
  { level: "med", title: "Heart pumping is weaker and she's more breathless", detail: "LVEF fell from 55% (2022) to 48% (2025). Her daily calls mention breathlessness on stairs. No cardiology review since March 2025.", ask: "Does she need a repeat echo and a cardiology review?", sources: [ids.D1, ids.D4] },
  { level: "info", title: "New mild anaemia", detail: "Haemoglobin dropped from 12.1 to 10.9. Worth checking, especially on a blood thinner.", ask: "Should we test for the cause of the low haemoglobin?", sources: [ids.D2, ids.D6] },
];

export const HOSPITAL_SEED = [
  { id: "h1", name: "Anbu Nagar Primary Health Centre", short: "Anbu Nagar PHC", kind: "Primary health centre", lat: 12.9318, lng: 80.1342, phone: "+91 44 0000 1001", caps: { cath: false, ct: false, neuro: false, vent: false, dialysis: false }, icu: 0, er: 2,
    inv: { asv: 4, tenecteplase: 0, rabies_ig: 6, o_neg_blood: 0, b_pos_blood: 0, oxygen: 6 } },
  { id: "h2", name: "Kovil Street Government Hospital", short: "Kovil St GH", kind: "Government district hospital", lat: 12.9105, lng: 80.1410, phone: "+91 44 0000 1002", caps: { cath: false, ct: true, neuro: false, vent: true, dialysis: true }, icu: 2, er: 8,
    inv: { asv: 22, tenecteplase: 0, rabies_ig: 14, o_neg_blood: 3, b_pos_blood: 6, oxygen: 20 } },
  { id: "h5", name: "Lotus General Hospital", short: "Lotus General", kind: "Private general hospital", lat: 12.9490, lng: 80.1370, phone: "+91 44 0000 1005", caps: { cath: false, ct: true, neuro: false, vent: true, dialysis: false }, icu: 3, er: 5,
    inv: { asv: 2, tenecteplase: 1, rabies_ig: 4, o_neg_blood: 1, b_pos_blood: 4, oxygen: 12 } },
  { id: "h3", name: "Saraswathi Multispeciality Hospital", short: "Saraswathi", kind: "Multispeciality, 24x7 cath lab", lat: 12.8990, lng: 80.1020, phone: "+91 44 0000 1003", caps: { cath: true, ct: true, neuro: false, vent: true, dialysis: true }, icu: 1, er: 6,
    inv: { asv: 0, tenecteplase: 3, rabies_ig: 2, o_neg_blood: 2, b_pos_blood: 5, oxygen: 18 } },
  { id: "h4", name: "Cauvery Heart & Trauma Centre", short: "Cauvery H&T", kind: "Tertiary heart and trauma centre", lat: 12.9620, lng: 80.1820, phone: "+91 44 0000 1004", caps: { cath: true, ct: true, neuro: true, vent: true, dialysis: true }, icu: 4, er: 10,
    inv: { asv: 8, tenecteplase: 6, rabies_ig: 10, o_neg_blood: 6, b_pos_blood: 9, oxygen: 30 } },
];
export const INVENTORY_LABEL: Record<string, { label: string; unit: string; min: number }> = {
  asv: { label: "Anti-snake venom", unit: "vials", min: 10 },
  tenecteplase: { label: "Tenecteplase (clot-buster)", unit: "vials", min: 2 },
  rabies_ig: { label: "Rabies immunoglobulin", unit: "vials", min: 5 },
  o_neg_blood: { label: "Blood O−", unit: "units", min: 2 },
  b_pos_blood: { label: "Blood B+", unit: "units", min: 3 },
  oxygen: { label: "Oxygen cylinders", unit: "cyl", min: 8 },
};

export function addSampleDocument(patientId: string, key: string, by: string | null, withExtraction: boolean) {
  const d = SAMPLE_DOCS.find((x) => x.key === key)!;
  const id = uid("doc_");
  const stored = `${id}.jpg`;
  fs.copyFileSync(path.join(SEED_DOC_DIR, d.file), path.join(UPLOAD_DIR, stored));
  run("INSERT INTO documents (id, patient_id, filename, path, mime, status, error, extraction, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
    id, patientId, `${d.extraction.title}.jpg`, stored, "image/jpeg", withExtraction ? "done" : "processing", null, withExtraction ? JSON.stringify(d.extraction) : null, by,
    new Date(Date.now() - (10 - SAMPLE_DOCS.indexOf(d)) * 60000).toISOString());
  return id;
}

export function seed() {
  const tables = ["families", "users", "sessions", "patients", "medications", "dose_logs", "vitals", "feed", "documents", "insights", "hospitals", "inventory", "emergencies", "relays", "visits", "chats", "checkins"];
  tx(() => {
    for (const t of tables) db.exec(`DELETE FROM ${t}`);
    for (const f of fs.readdirSync(UPLOAD_DIR)) fs.rmSync(path.join(UPLOAD_DIR, f), { force: true });

    const now = nowIso();
    for (const h of HOSPITAL_SEED) {
      run("INSERT INTO hospitals (id, name, short, kind, lat, lng, phone, caps, icu_beds, er_beds, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        h.id, h.name, h.short, h.kind, h.lat, h.lng, h.phone, JSON.stringify(h.caps), h.icu, h.er, now);
      for (const [item, qty] of Object.entries(h.inv)) {
        const meta = INVENTORY_LABEL[item];
        run("INSERT INTO inventory (hospital_id, item, label, qty, unit, min, updated_at) VALUES (?,?,?,?,?,?,?)", h.id, item, meta.label, qty, meta.unit, meta.min, new Date(Date.now() - Math.random() * 6 * 3600000).toISOString());
      }
    }

    const fam = "fam_ramasamy";
    run("INSERT INTO families (id, code, name, created_at) VALUES (?,?,?,?)", fam, "KAMALA", "Ramasamy family", now);
    const u = (id: string, name: string, role: string, relation: string | null, phone: string | null, lang = "en", hospital: string | null = null) =>
      run("INSERT INTO users (id, family_id, hospital_id, name, role, relation, phone, lang, created_at) VALUES (?,?,?,?,?,?,?,?,?)", id, role === "hospital" ? null : fam, hospital, name, role, relation, phone, lang, now);
    u("u_kamala", "Kamala Ramasamy", "elder", "Paati", "+91 90000 00000", "ta");
    u("u_karthik", "Karthik", "guardian", "Son", "+91 90000 00001");
    u("u_divya", "Divya", "guardian", "Granddaughter", "+91 90000 00003");
    u("u_meena", "Meena", "guardian", "Neighbour", "+91 90000 00002");
    u("u_priya", "Dr. Priya Natarajan", "hospital", "ER physician", "+91 44 0000 1003", "en", "h3");
    u("u_raghu", "Raghu (Pharmacy)", "hospital", "Store manager", "+91 44 0000 1002", "en", "h2");

    const pid = "pat_kamala";
    run(`INSERT INTO patients (id, family_id, user_id, name, nickname, age, sex, blood, address, lat, lng, conditions, allergies, abha, doctor, memory)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, pid, fam, "u_kamala", "Kamala Ramasamy", "Paati", 72, "F", "B+", "12, Kamaraj Street, East Tambaram, Chennai", 12.9235, 80.1290,
      JSON.stringify(["Type 2 diabetes", "Hypertension", "Coronary artery disease, LAD stent (2022)", "Mild heart pumping weakness (LVEF 48%)"]),
      JSON.stringify(["Penicillin (skin rash)"]), "91-1234-5678-9012 (sample)", "Dr. S. Raman (cardiology), Dr. P. Meenakshi (GP)",
      "Yesterday she went to Kapaleeshwarar temple with neighbour Meena. Granddaughter Divya has an exam on Friday. She slept badly on 2 of the last 4 nights and mentioned breathlessness on the stairs once. Husband Ramasamy (78) is hard of hearing.");

    const med = (id: string, name: string, generic: string, dose: string, purpose: string, slots: string[], stock: number, color: string, by: string) =>
      run("INSERT INTO medications (id, patient_id, name, generic, dose, purpose, slots, stock, color, active, prescribed_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?,?)",
        id, pid, name, generic, dose, purpose, JSON.stringify(slots), stock, color, by, now);
    med("m_clop", "Clopidogrel", "clopidogrel", "75 mg", "Blood thinner (heart stent)", ["morning"], 24, "#F2D16B", "Dr. S. Raman");
    med("m_aml", "Amlodipine", "amlodipine", "5 mg", "Blood pressure", ["morning"], 18, "#F4B6C2", "Dr. S. Raman");
    med("m_glyc", "Glycomet", "metformin", "500 mg", "Diabetes", ["morning", "night"], 7, "#FFFFFF", "Dr. P. Meenakshi");
    med("m_omez", "Omez", "omeprazole", "20 mg", "Acidity (1 month)", ["morning"], 11, "#C9B6F2", "Dr. P. Meenakshi");
    med("m_ator", "Atorvastatin", "atorvastatin", "20 mg", "Cholesterol", ["night"], 26, "#B7D3F2", "Dr. S. Raman");

    // 13 past days of dose history: mostly taken, a few missed night doses
    const missedNights = new Set([2, 5, 6, 9]);
    for (let d = 13; d >= 1; d--) {
      const date = localDate(new Date(Date.now() - d * 86400000));
      for (const [mid, slots] of [["m_clop", ["morning"]], ["m_aml", ["morning"]], ["m_glyc", ["morning", "night"]], ["m_omez", ["morning"]], ["m_ator", ["night"]]] as const) {
        for (const slot of slots) {
          const missed = slot === "night" && missedNights.has(d);
          const hour = slot === "morning" ? 8 : 21;
          run("INSERT INTO dose_logs (id, med_id, patient_id, date, slot, status, at, by_user) VALUES (?,?,?,?,?,?,?,?)", uid("d_"), mid, pid, date, slot, missed ? "missed" : "taken",
            new Date(new Date(date + "T00:00:00").getTime() + hour * 3600000 + Math.random() * 1800000).toISOString(), "u_kamala");
        }
      }
    }
    // Vitals: 14 days of face-pulse readings drifting up, a few BP and sugar readings
    for (let d = 14; d >= 1; d--) {
      const at = new Date(Date.now() - d * 86400000 + 9 * 3600000).toISOString();
      run("INSERT INTO vitals (id, patient_id, type, value, value2, at, source) VALUES (?,?,?,?,?,?,?)", uid("v_"), pid, "hr", Math.round(72 + (14 - d) * 0.8 + (Math.random() * 4 - 2)), null, at, "Face Pulse");
      if (d % 3 === 0) run("INSERT INTO vitals (id, patient_id, type, value, value2, at, source) VALUES (?,?,?,?,?,?,?)", uid("v_"), pid, "bp", 138 + Math.round(Math.random() * 14), 82 + Math.round(Math.random() * 8), at, "Home BP monitor");
      if (d % 4 === 0) run("INSERT INTO vitals (id, patient_id, type, value, value2, at, source) VALUES (?,?,?,?,?,?,?)", uid("v_"), pid, "sugar", 150 + Math.round(Math.random() * 30), null, at, "Glucometer (fasting)");
    }

    const ids: Record<string, string> = {};
    for (const d of SAMPLE_DOCS) ids[d.key] = addSampleDocument(pid, d.key, "u_karthik", true);
    for (const i of SEED_INSIGHTS(ids)) run("INSERT INTO insights (id, patient_id, level, title, detail, ask, sources, created_at) VALUES (?,?,?,?,?,?,?,?)", uid("i_"), pid, i.level, i.title, i.detail, i.ask, JSON.stringify(i.sources), now);

    const inDays = (n: number, h: number, m = 0) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(h, m, 0, 0); return x.toISOString(); };
    run("INSERT INTO visits (id, patient_id, place, reason, kind, status, at, notes) VALUES (?,?,?,?,?,?,?,?)", uid("vis_"), pid, "Saraswathi Multispeciality, Cardiology OPD", "Cardiology follow-up with Dr. Raman", "followup", "scheduled", inDays(2, 11, 30), "Take the doctor brief from the Health Vault.");
    run("INSERT INTO visits (id, patient_id, place, reason, kind, status, at, notes) VALUES (?,?,?,?,?,?,?,?)", uid("vis_"), pid, "Annai Diagnostics, Tambaram", "Fasting blood tests", "lab", "done", inDays(-54, 7, 30), "HbA1c, kidney function, lipids");

    const f = (kind: string, level: string, title: string, body: string, minsAgo: number) => run("INSERT INTO feed (id, family_id, kind, level, title, body, at) VALUES (?,?,?,?,?,?,?)", uid("f_"), fam, kind, level, title, body, new Date(Date.now() - minsAgo * 60000).toISOString());
    f("insight", "warn", "Saathi found 3 urgent questions for the doctor", "Reading all 6 papers together: kidney function vs metformin, rising cholesterol, omeprazole with clopidogrel.", 60 * 20);
    f("dose", "warn", "Night tablets missed", "Glycomet and atorvastatin were not confirmed last night.", 60 * 13);
    f("vital", "info", "Pulse 82 bpm", "Face Pulse check during the morning call. A little higher than her usual 74.", 60 * 24);
  });
}

if (process.argv.includes("--reset")) { seed(); console.log("Seeded Saathi demo data."); }
export const isEmpty = () => !get("SELECT id FROM families LIMIT 1");
