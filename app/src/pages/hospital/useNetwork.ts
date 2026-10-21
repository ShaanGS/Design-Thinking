// Live network state for the hospital console: emergencies, hospitals, relays, and cached patient records.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import type { Emergency, HealthRecord, Hospital, Medication, Relay } from "../../../shared/types";

export interface PatientFile { record: HealthRecord; meds: Medication[]; emergencyId: string }
export const ACTIVE = ["triage", "dispatched", "arrived", "admitted"] as const;
export const isActive = (e: Emergency) => (ACTIVE as readonly string[]).includes(e.status);

export function useNetwork() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [relays, setRelays] = useState<Relay[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, PatientFile | "denied">>({});
  const fetching = useRef(new Set<string>());

  const reload = useCallback(async () => {
    try {
      const r = await api.get<{ emergencies: Emergency[]; hospitals: Hospital[]; relays: Relay[] }>("/api/network");
      setEmergencies(r.emergencies); setHospitals(r.hospitals); setRelays(r.relays); setError(null);
    } catch (e) { setError((e as Error).message); }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  useLive<Emergency>("emergency", (e) => setEmergencies((list) => {
    const i = list.findIndex((x) => x.id === e.id);
    if (i === -1) return [e, ...list];
    const next = list.slice(); next[i] = e; return next;
  }));
  useLive<Hospital[]>("hospitals", (h) => setHospitals(h));
  useLive<Relay>("relay", (r) => setRelays((list) => {
    const i = list.findIndex((x) => x.id === r.id);
    if (i === -1) return [r, ...list];
    const next = list.slice(); next[i] = r; return next;
  }));

  /** Break-glass read of a patient's record (only allowed during an active emergency). */
  const loadFile = useCallback(async (patientId: string, force = false) => {
    if (fetching.current.has(patientId)) return;
    if (!force && files[patientId] && files[patientId] !== "denied") return;
    fetching.current.add(patientId);
    try {
      const f = await api.get<PatientFile>(`/api/network/patient/${patientId}`);
      setFiles((m) => ({ ...m, [patientId]: f }));
    } catch {
      setFiles((m) => ({ ...m, [patientId]: "denied" }));
    } finally { fetching.current.delete(patientId); }
  }, [files]);

  return { emergencies, hospitals, relays, loaded, error, reload, files, loadFile, setHospitals, setEmergencies };
}

export const ANTICOAG = /clopidogrel|aspirin|warfarin|apixaban|rivaroxaban|dabigatran|ticagrelor|prasugrel|heparin/i;

export function redFlags(file: PatientFile | undefined) {
  if (!file) return { allergies: [] as string[], thinners: [] as string[], egfr: null as null | { value: number; date: string } };
  const allergies = file.record.patient.allergies;
  const thinners = file.meds.filter((m) => ANTICOAG.test(`${m.name} ${m.generic || ""}`)).map((m) => `${m.name} ${m.dose}`);
  const e = file.record.labs.filter((l) => /egfr/i.test(l.test)).sort((a, b) => a.date.localeCompare(b.date));
  return { allergies, thinners, egfr: e.length ? { value: e[e.length - 1].value, date: e[e.length - 1].date } : null };
}
