// AI features. With ANTHROPIC_API_KEY set, Claude does the work; otherwise a rules engine gives
// deterministic answers so the app still runs end to end (demo mode).
import Anthropic from "@anthropic-ai/sdk";
import type { Condition, DocExtraction, HealthRecord, Insight, Medication, Patient, Triage, ChatTurn } from "../shared/types.ts";
import { CONDITION_INFO } from "../shared/types.ts";

export const MODEL = process.env.SAATHI_MODEL || "claude-opus-5-5";
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = hasKey ? new Anthropic() : null;
export const aiMode = (): "claude" | "demo" => (client ? "claude" : "demo");

type Effort = "low" | "medium" | "high";
type UserContent = Anthropic.Beta.BetaContentBlockParam[] | string;

/** One structured-output call. Safety-classifier refusals fall back server-side to the recommended model. */
async function callJSON<T>(system: string, content: UserContent, schema: Record<string, unknown>, effort: Effort, maxTokens = 8000): Promise<T> {
  if (!client) throw new Error("AI is in demo mode");
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    output_config: { effort, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined this request");
  const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text;
  if (!text) throw new Error("Empty AI response");
  return JSON.parse(text) as T;
}

const str = { type: "string" } as const;
const nstr = { type: ["string", "null"] } as const;
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const arr = (items: unknown) => ({ type: "array", items });

/* ---------------------------------------------------------------- Documents */

const EXTRACTION_SCHEMA = obj({
  docType: { type: "string", enum: ["prescription", "lab_report", "discharge_summary", "scan_report", "bill", "other"] },
  title: str, date: nstr, provider: nstr, summary: str,
  conditions: arr(str), allergies: arr(str),
  medications: arr(obj({ name: str, generic: nstr, dose: nstr, frequency: nstr })),
  labs: arr(obj({ test: { type: "string", description: "Use HbA1c, eGFR, LDL, Creatinine, Haemoglobin, Fasting glucose, Potassium when they apply" }, value: { type: "number" }, unit: nstr, date: str })),
  events: arr(obj({ date: str, kind: { type: "string", enum: ["heart", "lab", "scan", "rx", "admission", "other"] }, title: str, detail: str })),
});

export async function extractDocument(data: Buffer, mime: string): Promise<DocExtraction> {
  const b64 = data.toString("base64");
  const block: Anthropic.Beta.BetaContentBlockParam = mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
    : { type: "image", source: { type: "base64", media_type: mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: b64 } };
  const x = await callJSON<DocExtraction>(
    "You read Indian medical paperwork (handwritten prescriptions, lab reports, discharge summaries, scan reports, pharmacy bills) for a family health record. Use only what is written. Dates as YYYY-MM-DD (Indian documents write DD/MM/YY). Map Indian brand names to generics (e.g. Glycomet → metformin, Omez → omeprazole, Atorva → atorvastatin). Every lab value becomes one labs entry dated with the report date. Events are the clinically meaningful moments a family timeline should show. Keep titles under 8 words and details to one plain-English sentence.",
    [block, { type: "text", text: "Extract this document into the health record." }],
    EXTRACTION_SCHEMA, "medium",
  );
  return { ...x, labs: (x.labs || []).filter((l) => Number.isFinite(+l.value)) };
}

/* ---------------------------------------------------------------- Insights */

const INSIGHTS_SCHEMA = obj({
  insights: arr(obj({ level: { type: "string", enum: ["high", "med", "info"] }, title: str, detail: str, ask: str, sources: arr(str) })),
});

/** Cross-document findings: deterministic clinical rules first, then Claude adds anything else it sees. */
export async function buildInsights(rec: HealthRecord, currentMeds: Medication[]): Promise<Omit<Insight, "id" | "createdAt">[]> {
  const rules = ruleInsights(rec, currentMeds);
  if (!client || !rec.documents.length) return rules;
  const docIndex = rec.documents.map((d) => ({ id: d.id, title: d.extraction?.title, date: d.extraction?.date, provider: d.extraction?.provider, summary: d.extraction?.summary, medications: d.extraction?.medications }));
  try {
    const r = await callJSON<{ insights: Omit<Insight, "id" | "createdAt">[] }>(
      "You review an elderly patient's whole medical record, assembled from documents written by different doctors over several years, and find what a single doctor would miss: lab trends, medicine doses that no longer fit (e.g. kidney function vs metformin), interactions between prescriptions from different doctors, duplicate brands of one drug, overdue follow-ups. Write for the family in plain English. Never tell them to stop or change a medicine: each finding ends in a question for the doctor (`ask`). Cite the document ids each finding rests on. Return at most 6 findings, most important first, and do not repeat the findings already listed.",
      JSON.stringify({ patient: rec.patient, currentMedicines: currentMeds.map((m) => `${m.name} ${m.dose} (${m.slots.join("+")})`), documents: docIndex, labs: rec.labs, events: rec.events, alreadyFound: rules.map((x) => x.title) }),
      INSIGHTS_SCHEMA, "high", 12000,
    );
    const known = new Set(rec.documents.map((d) => d.id));
    const extra = (r.insights || []).map((i) => ({ ...i, sources: (i.sources || []).filter((s) => known.has(s)) }));
    return [...rules, ...extra].slice(0, 8);
  } catch (e) {
    console.warn("[ai] insights fell back to rules:", (e as Error).message);
    return rules;
  }
}

const norm = (s: string | null | undefined) => (s || "").toLowerCase();
function series(rec: HealthRecord, test: RegExp) {
  return rec.labs.filter((l) => test.test(l.test)).sort((a, b) => a.date.localeCompare(b.date));
}

export function ruleInsights(rec: HealthRecord, currentMeds: Medication[]): Omit<Insight, "id" | "createdAt">[] {
  const out: Omit<Insight, "id" | "createdAt">[] = [];
  const allMeds = [
    ...currentMeds.map((m) => ({ name: m.name, generic: norm(m.generic || m.name), doc: null as string | null })),
    ...rec.documents.flatMap((d) => (d.extraction?.medications || []).map((m) => ({ name: m.name, generic: norm(m.generic || m.name), doc: d.id }))),
  ];
  const onMed = (g: string) => allMeds.some((m) => m.generic.includes(g) || norm(m.name).includes(g));
  const docsWith = (g: string) => [...new Set(allMeds.filter((m) => m.doc && (m.generic.includes(g) || norm(m.name).includes(g))).map((m) => m.doc!))];

  const egfr = series(rec, /egfr/i);
  if (egfr.length >= 2) {
    const first = egfr[0], last = egfr[egfr.length - 1];
    if (last.value < first.value * 0.8) {
      const metformin = onMed("metformin");
      out.push({
        level: metformin && last.value < 45 ? "high" : "med",
        title: `Kidney function has fallen from ${first.value} to ${last.value}`,
        detail: `eGFR went ${egfr.map((e) => e.value).join(" → ")} between ${first.date.slice(0, 4)} and ${last.date.slice(0, 4)}.${metformin && last.value < 45 ? " At this level the metformin dose usually needs a doctor's review." : ""}`,
        ask: metformin ? `Should her metformin dose change now that her eGFR is ${last.value}?` : "What is causing her kidney function to fall, and does any medicine need adjusting?",
        sources: [...new Set(egfr.map((e) => e.docId))],
      });
    }
  }
  const ldl = series(rec, /ldl/i);
  if (ldl.length >= 2 && ldl[ldl.length - 1].value > ldl[0].value && ldl[ldl.length - 1].value > 70 && rec.patient.conditions.some((c) => /coronary|cad|heart|stent|mi\b|nstemi/i.test(c))) {
    out.push({
      level: "high", title: "Cholesterol is rising after her heart attack",
      detail: `LDL went ${ldl.map((e) => e.value).join(" → ")}. After a heart attack it is usually kept well below 70.`,
      ask: "Is her statin dose right, or should another cholesterol medicine be added?",
      sources: [...new Set([...ldl.map((e) => e.docId), ...docsWith("atorvastatin")])],
    });
  }
  const a1c = series(rec, /hba1c|a1c/i);
  if (a1c.length >= 2 && a1c[a1c.length - 1].value - a1c[0].value >= 0.5) {
    out.push({
      level: "med", title: "Sugar control is getting worse",
      detail: `HbA1c went ${a1c.map((e) => e.value + "%").join(" → ")}.`,
      ask: "What's the plan to bring her HbA1c down safely?",
      sources: [...new Set(a1c.map((e) => e.docId))],
    });
  }
  if (onMed("clopidogrel") && (onMed("omeprazole") || onMed("esomeprazole"))) {
    out.push({
      level: "high", title: "Omeprazole may weaken clopidogrel",
      detail: "Omeprazole can reduce how well clopidogrel protects her heart stent. These were prescribed by different doctors.",
      ask: "Is there a better acidity medicine to take with clopidogrel?",
      sources: [...new Set([...docsWith("clopidogrel"), ...docsWith("omeprazole")])],
    });
  }
  const current = currentMeds.map((m) => ({ m, g: norm(m.generic || m.name).split(/\s/)[0] }));
  const seen = new Map<string, string>();
  for (const { m, g } of current) {
    if (!g) continue;
    if (seen.has(g)) out.push({ level: "high", title: `Possible double dose of ${g}`, detail: `${seen.get(g)} and ${m.name} are the same medicine.`, ask: `Should she take only one of ${seen.get(g)} and ${m.name}?`, sources: docsWith(g) });
    else seen.set(g, m.name);
  }
  const hb = series(rec, /haemoglobin|hemoglobin|^hb$/i);
  if (hb.length && hb[hb.length - 1].value < 11.5) {
    out.push({ level: "info", title: "Mild anaemia in the latest report", detail: `Haemoglobin is ${hb[hb.length - 1].value} g/dL${hb.length > 1 ? ` (was ${hb[0].value})` : ""}. Worth checking, especially on a blood thinner.`, ask: "Should we test for the cause of the low haemoglobin?", sources: [hb[hb.length - 1].docId] });
  }
  const ef = rec.events.filter((e) => /lvef|ef\s*\d|ejection/i.test(e.title + " " + e.detail));
  if (ef.length) out.push({ level: "med", title: "Heart pumping strength has dropped", detail: ef[ef.length - 1].detail, ask: "Does she need a repeat echo and a cardiology review?", sources: ef.map((e) => e.docId) });
  return out;
}

/* ---------------------------------------------------------------- Ask the record */

export async function askRecord(rec: HealthRecord, question: string): Promise<{ answer: string; sources: string[] }> {
  if (client) {
    try {
      const r = await callJSON<{ answer: string; sources: string[] }>(
        "You answer a family's questions about their elderly relative's medical record. Use only the record. Answer in the language of the question (Tamil script for Tamil), in 1-3 short sentences. Never diagnose or tell them to change a medicine; suggest asking the doctor where it matters. If the record doesn't say, say so. Cite the document ids you used.",
        JSON.stringify({ record: { patient: rec.patient, documents: rec.documents.map((d) => ({ id: d.id, extraction: d.extraction })), insights: rec.insights }, question }),
        obj({ answer: str, sources: arr(str) }), "low", 4000,
      );
      return { answer: r.answer, sources: (r.sources || []).filter((s) => rec.documents.some((d) => d.id === s)) };
    } catch (e) { console.warn("[ai] ask fell back:", (e as Error).message); }
  }
  return demoAnswer(rec, question);
}

function demoAnswer(rec: HealthRecord, q: string): { answer: string; sources: string[] } {
  const t = q.toLowerCase();
  const tamil = /[஀-௿]/.test(q);
  const find = (re: RegExp) => rec.events.filter((e) => re.test(`${e.title} ${e.detail}`));
  if (/அலர்ஜி|allerg/.test(t)) {
    const a = rec.patient.allergies.join(", ") || "none recorded";
    return { answer: tamil ? `பாட்டிக்கு ${a} அலர்ஜி இருக்கு. அவசர நேரத்தில் டாக்டருக்கு இது தெரியணும்.` : `Allergies on record: ${a}.`, sources: rec.documents.filter((d) => d.extraction?.allergies?.length).map((d) => d.id).slice(0, 2) };
  }
  if (/stent|angioplast|heart attack|pci/.test(t)) {
    const e = find(/stent|pci|heart attack|nstemi/i)[0];
    if (e) return { answer: `${e.title} on ${e.date}. ${e.detail}`, sources: [e.docId] };
  }
  for (const [re, test, label] of [[/sugar|hba1c|diabet/, /hba1c/i, "HbA1c"], [/kidney|egfr|creatinine/, /egfr/i, "eGFR"], [/cholesterol|ldl/, /ldl/i, "LDL"]] as const) {
    if (re.test(t)) {
      const s = series(rec, test);
      if (s.length) return { answer: `${label} over time: ${s.map((p) => `${p.value} (${p.date.slice(0, 7)})`).join(" → ")}. ${s.length > 1 && s[s.length - 1].value !== s[0].value ? "Worth discussing at the next visit." : ""}`.trim(), sources: [...new Set(s.map((p) => p.docId))] };
    }
  }
  if (/ask|doctor|question|கேள்வி/.test(t) && rec.insights.length) {
    return { answer: rec.insights.filter((i) => i.ask).slice(0, 4).map((i, n) => `${n + 1}) ${i.ask}`).join(" "), sources: [...new Set(rec.insights.flatMap((i) => i.sources))].slice(0, 4) };
  }
  if (/medicine|tablet|drug|மாத்திரை/.test(t)) {
    const last = [...rec.documents].reverse().find((d) => d.extraction?.medications?.length);
    if (last) return { answer: `Latest prescription (${last.extraction!.date}): ${last.extraction!.medications.map((m) => m.name).join(", ")}.`, sources: [last.id] };
  }
  return { answer: "Demo mode can answer questions about allergies, the stent, sugar, kidney function, cholesterol, medicines, and what to ask the doctor. Add an ANTHROPIC_API_KEY for any question.", sources: [] };
}

/* ---------------------------------------------------------------- Triage */

const TRIAGE_WORDS: [Condition, string[]][] = [
  ["snake", ["snake", "பாம்பு", "pambu", "saanp", "सांप"]],
  ["stroke", ["slur", "face droop", "can't speak", "numb", "weak arm", "குழற", "மரத்து", "paralys"]],
  ["fall", ["fell", "fall", "slip", "விழு", "vizhu", "வழுக்", "head hurt", "gir "]],
  ["breath", ["breath", "மூச்சு", "moochu", "saans", "सांस", "gasp", "chok", "திணற"]],
  ["cardiac", ["chest", "heart", "நெஞ்சு", "nenju", "இதய", "सीने", "dil", "left arm", "sweat", "வியர்"]],
];
export function ruleTriage(text: string | null): Triage {
  const t = (text || "").toLowerCase();
  for (const [c, words] of TRIAGE_WORDS) if (words.some((w) => t.includes(w))) return { condition: c, label: CONDITION_INFO[c].label, confidence: 0.75, source: "keyword rules", english: null };
  return { condition: "unknown", label: CONDITION_INFO.unknown.label, confidence: 0.3, source: "no symptom given", english: null };
}

export async function triage(text: string | null, p: Patient): Promise<Triage> {
  const rule = ruleTriage(text);
  if (!client || !text) return rule;
  try {
    const r = await callJSON<{ condition: Condition; confidence: number; english: string }>(
      "You triage an elderly patient's emergency call for ambulance routing only (not diagnosis). Pick the category whose hospital requirements fit best. The patient may speak Tamil, Hindi, English or a mix.",
      JSON.stringify({ patient: { age: p.age, sex: p.sex, conditions: p.conditions }, said: text }),
      obj({ condition: { type: "string", enum: Object.keys(CONDITION_INFO) }, confidence: { type: "number" }, english: str }), "low", 2000,
    );
    // Rules win when they found a red-flag category the model did not
    const condition = rule.condition !== "unknown" && r.condition === "unknown" ? rule.condition : r.condition;
    return { condition, label: CONDITION_INFO[condition].label, confidence: Math.max(0, Math.min(1, r.confidence)), source: "AI triage (Claude)", english: r.english };
  } catch (e) { console.warn("[ai] triage fell back:", (e as Error).message); return rule; }
}

/* ---------------------------------------------------------------- ER pre-arrival brief */

export async function erBrief(p: Patient, t: Triage, currentMeds: Medication[], rec: HealthRecord): Promise<string> {
  const template = () => {
    const onClop = currentMeds.some((m) => /clopidogrel|aspirin|warfarin|apixaban|rivaroxaban/i.test(`${m.name} ${m.generic}`));
    const latest = (re: RegExp) => { const s = series(rec, re); return s.length ? `${s[s.length - 1].value}` : null; };
    return [
      `${p.age}${p.sex}, ${t.label.toLowerCase()}${t.english ? ` ("${t.english}")` : ""}.`,
      `Background: ${p.conditions.join("; ")}.`,
      onClop ? "ON ANTIPLATELET/ANTICOAGULANT: factor into bleeding risk and loading doses." : "",
      p.allergies.length ? `ALLERGY: ${p.allergies.join(", ")}.` : "No known allergies.",
      `Current meds: ${currentMeds.map((m) => `${m.name} ${m.dose}`).join(", ")}.`,
      [latest(/egfr/i) && `eGFR ${latest(/egfr/i)}`, latest(/hba1c/i) && `HbA1c ${latest(/hba1c/i)}%`].filter(Boolean).length
        ? `Latest labs: ${[latest(/egfr/i) && `eGFR ${latest(/egfr/i)}`, latest(/hba1c/i) && `HbA1c ${latest(/hba1c/i)}%`, latest(/haemoglobin/i) && `Hb ${latest(/haemoglobin/i)}`].filter(Boolean).join(", ")}.` : "",
    ].filter(Boolean).join(" ");
  };
  if (!client) return template();
  try {
    const r = await callJSON<{ brief: string }>(
      "Write an emergency-department pre-arrival brief for an incoming elderly patient, for doctors. Max 90 words, plain clinical shorthand, the dangerous facts first (allergies, anticoagulants/antiplatelets, kidney function, relevant history).",
      JSON.stringify({ patient: p, triage: t, currentMedicines: currentMeds.map((m) => `${m.name} ${m.dose} ${m.slots.join("+")}`), labs: rec.labs.slice(-12), events: rec.events.slice(-8) }),
      obj({ brief: str }), "low", 3000,
    );
    return r.brief;
  } catch (e) { console.warn("[ai] brief fell back:", (e as Error).message); return template(); }
}

/* ---------------------------------------------------------------- Daily companion call */

export interface CompanionResult {
  say: string; english: string;
  signals: { meds: "taken" | "missed" | "unknown"; mood: "good" | "ok" | "low" | "unknown"; sleep: "good" | "poor" | "unknown"; pain: string | null };
  redFlag: boolean; reason: string | null;
  action: "none" | "emergency" | "connect_family" | "suggest_doctor" | "log_meds";
}

const RED_WORDS = ["நெஞ்சு", "nenju", "chest", "வியர்", "sweat", "மூச்சு வாங்", "மூச்சு விட", "breathless", "can't breathe", "மயக்க", "faint", "விழுந்", "vizhun", "fell", "numb", "மரத்து", "slur", "குழப்ப", "confus"];
export const isRedFlag = (t: string) => RED_WORDS.some((w) => t.toLowerCase().includes(w));

export async function companionReply(p: Patient, memory: string, history: ChatTurn[], text: string, todayMeds: string[]): Promise<CompanionResult> {
  const ruleRed = isRedFlag(text);
  if (client) {
    try {
      const r = await callJSON<CompanionResult>(
        `You are "Saathi", a warm AI companion who talks with ${p.nickname} (${p.age}, ${p.address}) every day, like a caring grandchild. Speak simple, warm Indian English and call her "${p.nickname}". Put the same reply in both "say" and "english". At most 2 short sentences, under 30 words. Use the memory naturally.
Gently cover over the conversation: today's tablets, sleep and food, any pain. Never diagnose and never suggest a medicine.
If she mentions chest pain or heaviness, sweating with discomfort, breathlessness, fainting, a fall, sudden weakness or numbness, slurred speech or confusion: red_flag true, action "emergency", calmly say you are calling her son and the ambulance now, ask her to sit down and unlock the door.
If she asks for her son or family, action "connect_family". If she reports poor sleep several times or new symptoms that are not emergencies, action "suggest_doctor". If she confirms taking tablets, action "log_meds".`,
        JSON.stringify({ conditions: p.conditions, todayMedicines: todayMeds, memory, recent: history.slice(-10).map((h) => ({ who: h.role === "user" ? p.nickname : "Saathi", text: h.text })), she_says_now: text }),
        obj({
          say: str, english: str,
          signals: obj({ meds: { type: "string", enum: ["taken", "missed", "unknown"] }, mood: { type: "string", enum: ["good", "ok", "low", "unknown"] }, sleep: { type: "string", enum: ["good", "poor", "unknown"] }, pain: nstr }),
          redFlag: { type: "boolean" }, reason: nstr, action: { type: "string", enum: ["none", "emergency", "connect_family", "suggest_doctor", "log_meds"] },
        }), "low", 3000,
      );
      if (ruleRed && !r.redFlag) return { ...demoCompanion(p, text), english: demoCompanion(p, text).english };
      return r;
    } catch (e) { console.warn("[ai] companion fell back:", (e as Error).message); }
  }
  return demoCompanion(p, text);
}

function demoCompanion(p: Patient, text: string): CompanionResult {
  const x = text.toLowerCase();
  const has = (...w: string[]) => w.some((k) => x.includes(k));
  const base = { signals: { meds: "unknown", mood: "unknown", sleep: "unknown", pain: null }, redFlag: false, reason: null, action: "none" } as CompanionResult;
  const n = p.nickname;
  if (isRedFlag(text)) return { ...base, say: `${n}, don't be scared. I'm calling your son and the ambulance right now. Please sit down and unlock the door.`, english: `${n}, don't be scared. I'm calling your son and the ambulance right now. Please sit down and unlock the door.`, redFlag: true, reason: "chest discomfort or another warning sign", action: "emergency", signals: { ...base.signals, pain: "warning symptoms" } };
  if (has("கார்த்திக்", "karthik", "son", "மகன்")) return { ...base, say: "Okay, I'm asking Karthik to call you right now. He'll be happy.", english: "Okay, I'm asking Karthik to call you right now. He'll be happy.", action: "connect_family" };
  if (has("தூக்கம்", "தூங்க", "sleep", "thookam")) return { ...base, say: "Oh no. That's the third time this week. Shall I book a check-up with the doctor?", english: "Oh no. That's the third time this week. Shall I book a check-up with the doctor?", action: "suggest_doctor", signals: { ...base.signals, sleep: "poor" } };
  if (has("மாத்திரை", "tablet", "medicine", "maathirai", "pill")) return { ...base, say: "Super! Tablets done, I've noted it. How did you sleep last night?", english: "Super! Tablets done, I've noted it. How did you sleep last night?", action: "log_meds", signals: { ...base.signals, meds: "taken" } };
  if (has("நல்லா", "nalla", "fine", "good", "கோவில்", "temple", "ok")) return { ...base, say: "So happy to hear that! Did you take your morning tablets?", english: "So happy to hear that! Did you take your morning tablets?", signals: { ...base.signals, mood: "good" } };
  return { ...base, say: "Okay, I understand. Any pain anywhere? Have you eaten?", english: "Okay, I understand. Any pain anywhere? Have you eaten?" };
}

/* ---------------------------------------------------------------- Medicine safety check */

export async function medicineCheck(newMed: { name: string; generic?: string | null }, current: Medication[], p: Patient): Promise<{ level: "ok" | "warn"; message: string }[]> {
  const g = norm(newMed.generic || newMed.name);
  const out: { level: "ok" | "warn"; message: string }[] = [];
  const dup = current.find((m) => norm(m.generic || m.name).split(/\s/)[0] === g.split(/\s/)[0]);
  if (dup) out.push({ level: "warn", message: `${newMed.name} looks like the same medicine as ${dup.name}. Ask the doctor before taking both.` });
  if (/omeprazole|esomeprazole/.test(g) && current.some((m) => /clopidogrel/i.test(`${m.name} ${m.generic}`))) out.push({ level: "warn", message: "Omeprazole can weaken clopidogrel. Ask whether pantoprazole is a better choice." });
  if (/amoxicillin|penicillin|ampicillin|augmentin|cloxacillin/.test(g) && p.allergies.some((a) => /penicillin/i.test(a))) out.push({ level: "warn", message: `${newMed.name} is a penicillin and she is allergic to penicillin.` });
  if (client) {
    try {
      const r = await callJSON<{ warnings: string[] }>(
        "A family is adding a medicine to an elderly patient's list. List clinically important problems only (duplicates incl. brand vs generic, interactions with current medicines, allergy conflicts, kidney dosing). Phrase each as a short plain-English point that ends by suggesting they ask the doctor or pharmacist. Return an empty list if nothing important.",
        JSON.stringify({ newMedicine: newMed, current: current.map((m) => `${m.name} (${m.generic || ""}) ${m.dose}`), allergies: p.allergies, conditions: p.conditions }),
        obj({ warnings: arr(str) }), "low", 3000,
      );
      for (const w of r.warnings || []) if (!out.some((o) => o.message === w)) out.push({ level: "warn", message: w });
    } catch (e) { console.warn("[ai] medicine check fell back:", (e as Error).message); }
  }
  return out.length ? out : [{ level: "ok", message: "No duplicates, allergy conflicts or common interactions found." }];
}
