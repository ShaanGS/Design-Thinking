// Need-matched routing: rank hospitals by time to definitive treatment, not by distance.
import type { Condition, Hospital, RouteDecision, RouteOption } from "../shared/types.ts";
import { CONDITION_INFO } from "../shared/types.ts";

const AVG_KMH = 26;          // city ambulance average
const DISPATCH_MIN = 4;      // time for the ambulance to reach the patient
const ROAD_FACTOR = 1.3;     // straight line → road distance
export const TRANSFER_PENALTY = 45; // stabilise, refer and re-transport if the first hospital can't treat
const NO_ICU_PENALTY = 15;

export function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s)) * ROAD_FACTOR;
}

export function hasNeed(h: Hospital, need: string): boolean {
  if (need === "asv") return (h.inventory.find((i) => i.item === "asv")?.qty ?? 0) >= 10;
  if (need === "icu") return h.icuBeds > 0;
  if (need === "vent") return h.caps.vent;
  if (need === "cath") return h.caps.cath;
  if (need === "ct") return h.caps.ct;
  if (need === "neuro") return h.caps.neuro;
  return true;
}

export function needsFor(condition: Condition, onAntiplatelet: boolean): string[] {
  const base = [...CONDITION_INFO[condition].needs];
  if (condition === "fall" && !onAntiplatelet) return ["ct"];
  return base;
}

/** `roads[i]` (optional) gives real road km and drive minutes from the patient to `list[i]`. */
export function decideRoute(condition: Condition, lat: number, lng: number, list: Hospital[], onAntiplatelet = true, roads?: { km: number; min: number }[] | null): RouteDecision {
  const needs = needsFor(condition, onAntiplatelet);
  const ranking: RouteOption[] = list.map((h, i) => {
    const road = roads?.[i];
    const useRoad = !!road && Number.isFinite(road.km) && Number.isFinite(road.min);
    const d = useRoad ? road!.km : km(lat, lng, h.lat, h.lng);
    const etaMin = Math.round((useRoad ? road!.min : (d / AVG_KMH) * 60) + DISPATCH_MIN);
    const missing = needs.filter((n) => !hasNeed(h, n));
    let score = etaMin + (missing.length ? TRANSFER_PENALTY : 0);
    if (!missing.length && h.icuBeds === 0 && condition !== "unknown") score += NO_ICU_PENALTY;
    return { hospitalId: h.id, km: Math.round(d * 10) / 10, etaMin, score, missing };
  }).sort((a, b) => a.score - b.score);
  const nearest = [...ranking].sort((a, b) => a.km - b.km)[0];
  const pick = ranking[0];
  return {
    hospitalId: pick.hospitalId, nearestId: nearest.hospitalId, etaMin: pick.etaMin, savedMin: Math.max(0, nearest.score - pick.score),
    needs, needLabel: CONDITION_INFO[condition].needLabel, ranking, roads: !!roads?.some((r) => Number.isFinite(r.km)),
  };
}
