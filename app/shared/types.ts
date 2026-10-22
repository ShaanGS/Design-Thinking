// Types shared by the API server and the web app.

export type Role = "elder" | "guardian" | "hospital";
export type Slot = "morning" | "afternoon" | "night";
export type Condition = "cardiac" | "stroke" | "breath" | "fall" | "snake" | "unknown";
export type Level = "high" | "med" | "info";

export interface User {
  id: string;
  name: string;
  role: Role;
  relation: string | null;
  familyId: string | null;
  hospitalId: string | null;
  lang: "en" | "ta";
}

export interface Patient {
  id: string;
  familyId: string;
  name: string;
  nickname: string;
  age: number;
  sex: "F" | "M";
  blood: string;
  address: string;
  lat: number;
  lng: number;
  conditions: string[];
  allergies: string[];
  abha: string | null;
  doctor: string | null;
  photoInitial: string;
}

export interface Family {
  id: string;
  code: string;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  role: Role;
  relation: string | null;
  phone: string | null;
  online?: boolean;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  generic: string | null;
  dose: string;
  purpose: string | null;
  slots: Slot[];
  stock: number;
  color: string;
  active: boolean;
  prescribedBy: string | null;
}

export interface DoseLog {
  id: string;
  medId: string;
  date: string; // YYYY-MM-DD
  slot: Slot;
  status: "taken" | "missed";
  at: string;
  by: string | null;
}

export interface Vital {
  id: string;
  type: "hr" | "bp" | "sugar" | "spo2";
  value: number;
  value2: number | null;
  at: string;
  source: string;
}

export interface FeedItem {
  id: string;
  familyId: string;
  kind: "dose" | "sos" | "emergency" | "checkin" | "vital" | "doc" | "visit" | "insight" | "chat" | "info";
  level: "ok" | "info" | "warn" | "sos";
  title: string;
  body: string;
  at: string;
}

export interface DocLab {
  test: string;
  value: number;
  unit: string | null;
  date: string;
}

export interface DocExtraction {
  docType: string;
  title: string;
  date: string | null;
  provider: string | null;
  summary: string;
  conditions: string[];
  allergies: string[];
  medications: { name: string; generic: string | null; dose: string | null; frequency: string | null }[];
  labs: DocLab[];
  events: { date: string; kind: "heart" | "lab" | "scan" | "rx" | "admission" | "other"; title: string; detail: string }[];
}

export interface MedDocument {
  id: string;
  patientId: string;
  filename: string;
  url: string;
  mime: string;
  status: "processing" | "done" | "error";
  error: string | null;
  extraction: DocExtraction | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface Insight {
  id: string;
  level: Level;
  title: string;
  detail: string;
  ask: string | null;
  sources: string[]; // document ids
  createdAt: string;
}

export interface RecordEvent {
  date: string;
  kind: string;
  title: string;
  detail: string;
  docId: string;
}

export interface LabPoint extends DocLab {
  docId: string;
}

export interface HealthRecord {
  patient: Patient;
  documents: MedDocument[];
  events: RecordEvent[];
  labs: LabPoint[];
  insights: Insight[];
}

export interface HospitalCaps {
  cath: boolean;
  ct: boolean;
  neuro: boolean;
  vent: boolean;
  dialysis: boolean;
}

export interface InventoryItem {
  item: string;
  label: string;
  qty: number;
  unit: string;
  min: number;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  short: string;
  kind: string;
  lat: number;
  lng: number;
  phone: string;
  caps: HospitalCaps;
  icuBeds: number;
  erBeds: number;
  inventory: InventoryItem[];
  updatedAt: string;
}

export interface RouteOption {
  hospitalId: string;
  km: number;
  etaMin: number;
  score: number;
  missing: string[];
}

export interface RouteDecision {
  hospitalId: string;
  nearestId: string;
  etaMin: number;
  savedMin: number;
  needs: string[];
  needLabel: string;
  ranking: RouteOption[];
  /** true when distances and times come from real roads (OSRM), false for straight-line estimates */
  roads?: boolean;
  /** Ambulance path as [lat, lng] points: 108 base → home → hospital */
  path?: [number, number][];
  /** Index in `path` of the patient's home, and the share of the trip spent reaching her */
  pickupIndex?: number;
  pickupShare?: number;
  /** Road path from home to the nearest hospital, drawn for comparison when it is not the one chosen */
  nearestPath?: [number, number][];
}

export interface Triage {
  condition: Condition;
  label: string;
  confidence: number;
  source: string;
  english: string | null;
}

export interface Emergency {
  id: string;
  patientId: string;
  familyId: string;
  status: "triage" | "dispatched" | "arrived" | "admitted" | "resolved" | "cancelled";
  source: string;
  symptomText: string | null;
  triage: Triage | null;
  route: RouteDecision | null;
  hospitalId: string | null;
  brief: string | null;
  responders: { name: string; relation: string | null; at: string }[];
  teamReady: boolean;
  startedAt: string;
  dispatchedAt: string | null;
  arrivedAt: string | null;
  progress: number; // 0..1 ambulance progress
  ambulance: { lat: number; lng: number } | null;
  etaLeftMin: number | null;
}

export interface Relay {
  id: string;
  item: string;
  label: string;
  qty: number;
  fromId: string;
  toId: string;
  status: "requested" | "dispatched" | "delivered";
  etaMin: number;
  createdAt: string;
}

export interface Visit {
  id: string;
  patientId: string;
  place: string;
  reason: string;
  kind: "opd" | "lab" | "admission" | "followup";
  status: "scheduled" | "checked_in" | "done";
  at: string;
  notes: string | null;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  english: string | null;
  at: string;
  redFlag?: boolean;
}

export interface Checkin {
  id: string;
  requestedBy: string;
  requestedAt: string;
  answeredAt: string | null;
  answer: string | null;
}

export interface TodayDose {
  med: Medication;
  slot: Slot;
  status: "taken" | "missed" | "due" | "upcoming";
  at: string | null;
}

export interface Overview {
  patient: Patient;
  today: TodayDose[];
  adherence: { date: string; taken: number; total: number }[];
  vitals: Vital[];
  feed: FeedItem[];
  emergency: Emergency | null;
  checkin: Checkin | null;
  visits: Visit[];
  members: Member[];
  family: Family;
  insightsCount: number;
}

export interface ServerInfo {
  ai: "claude" | "demo";
  model: string;
  demoSpeed: number;
}

export const SLOT_LABEL: Record<Slot, { en: string; ta: string; hour: number }> = {
  morning: { en: "Morning", ta: "காலை", hour: 8 },
  afternoon: { en: "Afternoon", ta: "மதியம்", hour: 13 },
  night: { en: "Night", ta: "இரவு", hour: 21 },
};

export const CONDITION_INFO: Record<Condition, { label: string; ta: string; en: string; needs: string[]; needLabel: string }> = {
  cardiac: { label: "Suspected heart attack", ta: "நெஞ்சு வலி", en: "Chest pain", needs: ["cath"], needLabel: "cath lab for angioplasty" },
  stroke: { label: "Suspected stroke", ta: "பேச்சு குழறல்", en: "Face droop / slurred speech", needs: ["ct", "neuro"], needLabel: "CT scan + neurologist" },
  breath: { label: "Acute breathlessness", ta: "மூச்சுத் திணறல்", en: "Can't breathe", needs: ["icu", "vent"], needLabel: "ICU bed with ventilator" },
  fall: { label: "Fall with head injury (on blood thinner)", ta: "கீழே விழுந்தேன்", en: "I fell down", needs: ["ct", "neuro"], needLabel: "CT scan + neurosurgeon" },
  snake: { label: "Snakebite", ta: "பாம்பு கடி", en: "Snake bite", needs: ["asv"], needLabel: "10+ vials of anti-snake venom" },
  unknown: { label: "Emergency, cause not yet known", ta: "தெரியவில்லை", en: "Not sure", needs: ["icu"], needLabel: "an ICU bed" },
};

export const NEED_LABEL: Record<string, string> = {
  cath: "cath lab",
  ct: "CT scanner",
  neuro: "neuro team",
  icu: "free ICU bed",
  vent: "ventilator",
  asv: "enough anti-venom",
};
