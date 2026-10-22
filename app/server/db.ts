// SQLite storage (Node's built-in driver). JSON-shaped columns are stored as TEXT.
process.env.TZ ||= "Asia/Kolkata"; // the app's day boundaries (medicine slots) follow Indian time
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "saathi.db"));
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS families (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, family_id TEXT, hospital_id TEXT, name TEXT NOT NULL, role TEXT NOT NULL,
  relation TEXT, phone TEXT, lang TEXT NOT NULL DEFAULT 'en', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, family_id TEXT NOT NULL, user_id TEXT, name TEXT NOT NULL, nickname TEXT NOT NULL, age INTEGER, sex TEXT,
  blood TEXT, address TEXT, lat REAL, lng REAL, conditions TEXT NOT NULL DEFAULT '[]', allergies TEXT NOT NULL DEFAULT '[]',
  abha TEXT, doctor TEXT, memory TEXT NOT NULL DEFAULT '', card_token TEXT);
CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, name TEXT NOT NULL, generic TEXT, dose TEXT NOT NULL, purpose TEXT,
  slots TEXT NOT NULL, stock INTEGER NOT NULL DEFAULT 0, color TEXT NOT NULL DEFAULT '#FFFFFF', active INTEGER NOT NULL DEFAULT 1,
  prescribed_by TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS dose_logs (
  id TEXT PRIMARY KEY, med_id TEXT NOT NULL, patient_id TEXT NOT NULL, date TEXT NOT NULL, slot TEXT NOT NULL,
  status TEXT NOT NULL, at TEXT NOT NULL, by_user TEXT, UNIQUE(med_id, date, slot));
CREATE TABLE IF NOT EXISTS vitals (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, type TEXT NOT NULL, value REAL NOT NULL, value2 REAL, at TEXT NOT NULL, source TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feed (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, kind TEXT NOT NULL, level TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, filename TEXT NOT NULL, path TEXT NOT NULL, mime TEXT NOT NULL,
  status TEXT NOT NULL, error TEXT, extraction TEXT, uploaded_by TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, level TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL, ask TEXT,
  sources TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hospitals (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, short TEXT NOT NULL, kind TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
  phone TEXT NOT NULL, caps TEXT NOT NULL, icu_beds INTEGER NOT NULL, er_beds INTEGER NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inventory (
  hospital_id TEXT NOT NULL, item TEXT NOT NULL, label TEXT NOT NULL, qty INTEGER NOT NULL, unit TEXT NOT NULL, min INTEGER NOT NULL,
  updated_at TEXT NOT NULL, PRIMARY KEY (hospital_id, item));
CREATE TABLE IF NOT EXISTS emergencies (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, family_id TEXT NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL,
  symptom_text TEXT, triage TEXT, route TEXT, hospital_id TEXT, brief TEXT, responders TEXT NOT NULL DEFAULT '[]',
  team_ready INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, dispatched_at TEXT, arrived_at TEXT);
CREATE TABLE IF NOT EXISTS relays (
  id TEXT PRIMARY KEY, item TEXT NOT NULL, label TEXT NOT NULL, qty INTEGER NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL,
  status TEXT NOT NULL, eta_min INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS visits (
  id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, place TEXT NOT NULL, reason TEXT NOT NULL, kind TEXT NOT NULL,
  status TEXT NOT NULL, at TEXT NOT NULL, notes TEXT);
CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL, english TEXT, red_flag INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checkins (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, requested_by TEXT NOT NULL, requested_at TEXT NOT NULL, answered_at TEXT, answer TEXT);
`);

/** Random, unguessable token printed (as a QR) on the elder's emergency card. Separate from the family code. */
export const newCardToken = () => crypto.randomBytes(9).toString("base64url");

// Migration: databases created before the emergency card QR have no card_token column.
if (!(db.prepare("PRAGMA table_info(patients)").all() as { name: string }[]).some((c) => c.name === "card_token")) {
  db.exec("ALTER TABLE patients ADD COLUMN card_token TEXT");
}
for (const r of db.prepare("SELECT id FROM patients WHERE card_token IS NULL OR card_token = ''").all() as { id: string }[]) {
  db.prepare("UPDATE patients SET card_token = ? WHERE id = ?").run(newCardToken(), r.id);
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS patients_card_token ON patients(card_token)");

export const uid = (prefix = "") => prefix + crypto.randomBytes(8).toString("hex");
export const nowIso = () => new Date().toISOString();
export const parse = <T>(v: unknown, fallback: T): T => {
  if (typeof v !== "string") return fallback;
  try { return JSON.parse(v) as T; } catch { return fallback; }
};

type Row = Record<string, any>;
export const all = (sql: string, ...params: any[]): Row[] => db.prepare(sql).all(...params) as Row[];
export const get = (sql: string, ...params: any[]): Row | undefined => db.prepare(sql).get(...params) as Row | undefined;
export const run = (sql: string, ...params: any[]) => db.prepare(sql).run(...params);

export function tx<T>(fn: () => T): T {
  db.exec("BEGIN");
  try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; }
}

/** Local calendar date (server time zone) as YYYY-MM-DD. */
export function localDate(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
