// Shared state and helpers for the family app screens.
import { createContext, useContext } from "react";
import type { Overview, FeedItem, Slot, TodayDose } from "../../../shared/types";
import { SLOT_LABEL } from "../../../shared/types";
import type { BlisterDose } from "../../components/Blister";

export interface FamilyState {
  data: Overview;
  reload: () => Promise<unknown> | void;
}
export const FamilyCtx = createContext<FamilyState>(null as unknown as FamilyState);
export const useFamily = () => useContext(FamilyCtx);

// Red marks emergency events with a dot only; amber for things that need attention; green for done.
export const FEED_TONE: Record<FeedItem["level"], { dot: string; text: string }> = {
  ok: { dot: "bg-teal", text: "text-ink" },
  info: { dot: "bg-line-2", text: "text-ink" },
  warn: { dot: "bg-warn", text: "text-ink" },
  sos: { dot: "bg-sos", text: "text-ink" },
};

export const ACTIVE_STATUSES = ["triage", "dispatched", "arrived", "admitted"];
export const SLOTS: Slot[] = ["morning", "afternoon", "night"];

export const pronoun = (sex: "F" | "M") => (sex === "M" ? { sub: "he", obj: "him", pos: "his" } : { sub: "she", obj: "her", pos: "her" });

/** "8 am", "1 pm", "9 pm" */
export const slotTime = (s: Slot) => { const h = SLOT_LABEL[s].hour; return h === 12 ? "12 pm" : h > 12 ? `${h - 12} pm` : `${h} am`; };

export const toBlister = (doses: TodayDose[]): BlisterDose[] =>
  doses.map((d) => ({ id: d.med.id + d.slot, color: d.med.color, name: d.med.name, status: d.status }));

/** Same-day times as "9:12 am", older ones as "Tue" or "12 Oct". */
export function clock(iso: string) {
  const d = new Date(iso), now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (days < 6) return d.toLocaleDateString("en-IN", { weekday: "short" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
