// Shared state for the hospital app (Dr. Priya's phone): the live network plus the ER's actions.
import { createContext, useContext } from "react";
import type { Emergency, Hospital, HospitalCaps, InventoryItem } from "../../../shared/types";
import type { PatientFile, useNetwork } from "./useNetwork";

export type Net = ReturnType<typeof useNetwork>;
export type CaseAction = "ready" | "admit" | "resolve";

export interface HospitalCtxT {
  net: Net;
  ownId: string | null;
  own: Hospital | null;
  /** Active cases routed to this hospital, soonest first */
  mine: Emergency[];
  /** Active cases going to other hospitals (no patient details) */
  elsewhere: Emergency[];
  closedToday: Emergency[];
  /** The case shown in the big card */
  lead: Emergency | null;
  select: (id: string) => void;
  fresh: Set<string>;
  busy: string | null;
  pending: string | null;
  demoSpeed: number;
  act: (e: Emergency, action: CaseAction) => Promise<void>;
  patchHospital: (body: Partial<Pick<Hospital, "icuBeds" | "erBeds">> & { caps?: Partial<HospitalCaps> }, key: string) => Promise<void>;
  setStock: (item: string, qty: number) => Promise<void>;
  relay: (inv: InventoryItem) => Promise<void>;
  openRecord: (patientId: string) => void;
  fileFor: (patientId: string) => PatientFile | undefined;
  stats: { savedToday: number; freeIcu: number; lowCount: number; ownLow: number };
  relayTargets: Set<string>;
}

export const HospitalCtx = createContext<HospitalCtxT>(null as unknown as HospitalCtxT);
export const useHospital = () => useContext(HospitalCtx);

const etaKey = (e: Emergency) => (e.status === "admitted" ? 1e6 : e.status === "arrived" ? -1 : e.etaLeftMin ?? 1e5);
export const byEta = (a: Emergency, b: Emergency) => etaKey(a) - etaKey(b);

export const STATUS_LABEL: Record<Emergency["status"], string> = {
  triage: "Finding a hospital", dispatched: "On the way", arrived: "At your door", admitted: "In your ER", resolved: "Closed", cancelled: "Cancelled",
};

/** Straight-line distance in km, used to say how far other hospitals are. */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Team label by condition: the button the ER doctor presses to get the right people waiting. */
export function teamLabel(e: Emergency) {
  switch (e.triage?.condition) {
    case "cardiac": return "Page cath lab team";
    case "stroke": return "Page stroke team";
    case "fall": return "Page trauma and CT";
    case "breath": return "Ready ICU and ventilator";
    case "snake": return "Ready anti-venom";
    default: return "Mark team ready";
  }
}
