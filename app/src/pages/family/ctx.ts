// Shared state for the family app screens: the live overview and the signed-in guardian.
import { createContext, useContext } from "react";
import type { Overview, FeedItem } from "../../../shared/types";

export interface FamilyState {
  data: Overview;
  reload: () => Promise<unknown> | void;
}
export const FamilyCtx = createContext<FamilyState>(null as unknown as FamilyState);
export const useFamily = () => useContext(FamilyCtx);

export const FEED_TONE: Record<FeedItem["level"], { dot: string; text: string; bg: string }> = {
  ok: { dot: "bg-teal", text: "text-teal", bg: "bg-teal-50" },
  info: { dot: "bg-info", text: "text-info", bg: "bg-info-50" },
  warn: { dot: "bg-warn", text: "text-warn", bg: "bg-warn-50" },
  sos: { dot: "bg-sos", text: "text-sos", bg: "bg-sos-50" },
};

export const ACTIVE_STATUSES = ["triage", "dispatched", "arrived", "admitted"];

export const pronoun = (sex: "F" | "M") => (sex === "M" ? { sub: "he", obj: "him", pos: "his" } : { sub: "she", obj: "her", pos: "her" });
