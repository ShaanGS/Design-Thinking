// Real road distances, drive times and route shapes from OSRM (OpenStreetMap routing).
// Every call has a short timeout and a straight-line fallback, so routing never blocks an emergency.
type LatLng = { lat: number; lng: number };
const OSRM = process.env.OSRM_URL || "https://router.project-osrm.org";
const AMBULANCE_FACTOR = 0.85; // an ambulance with a siren beats car drive time a little
const cache = new Map<string, unknown>();

async function getJSON(url: string, ms = 4500): Promise<any | null> {
  if (cache.has(url)) return cache.get(url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { "User-Agent": "Saathi-demo (college project)" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== "Ok") return null;
    if (cache.size > 500) cache.delete(cache.keys().next().value!); // keep memory bounded
    cache.set(url, data);
    return data;
  } catch { return null; }
}
const fmt = (p: LatLng) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;

/** Road distance (km) and ambulance drive time (min) from one point to many. null if OSRM is unreachable. */
export async function roadTable(from: LatLng, to: LatLng[]): Promise<{ km: number; min: number }[] | null> {
  if (!to.length) return [];
  const url = `${OSRM}/table/v1/driving/${[from, ...to].map(fmt).join(";")}?sources=0&annotations=duration,distance`;
  const d = await getJSON(url);
  if (!d?.durations?.[0] || !d?.distances?.[0]) return null;
  return to.map((_, i) => {
    const s = d.durations[0][i + 1], m = d.distances[0][i + 1];
    return s == null || m == null ? { km: NaN, min: NaN } : { km: Math.round((m / 1000) * 10) / 10, min: (s / 60) * AMBULANCE_FACTOR };
  });
}

/** Road geometry through the given stops as [lat, lng] points, with per-leg drive minutes and the path index where each leg ends.
 *  The shape is simplified (Douglas-Peucker, ~2 m) rather than sampled, so every bend in the road survives. */
export async function roadRoute(stops: LatLng[]): Promise<{ path: [number, number][]; legMin: number[]; legEnd: number[] } | null> {
  const url = `${OSRM}/route/v1/driving/${stops.map(fmt).join(";")}?overview=full&geometries=geojson&steps=false&annotations=distance`;
  const d = await getJSON(url, 6000);
  const r = d?.routes?.[0];
  if (!r?.geometry?.coordinates?.length) return null;
  const coords: [number, number][] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  const legs: { duration: number; annotation?: { distance?: number[] } }[] = r.legs || [];
  // Leg boundaries: the overview geometry is the legs' segments end to end, so cumulative segment counts give exact indices
  let ends: number[] = [], acc = 0;
  for (const l of legs) { acc += l.annotation?.distance?.length ?? NaN; ends.push(acc); }
  if (ends.some((e) => !Number.isFinite(e)) || ends[ends.length - 1] !== coords.length - 1) ends = stops.slice(1).map((s) => nearestIndex(coords, s));
  const path: [number, number][] = [coords[0]];
  const legEnd: number[] = [];
  let from = 0;
  for (const e of ends) {
    const to = Math.max(from, e);
    if (to > from) path.push(...simplify(coords.slice(from, to + 1), 2).slice(1));
    legEnd.push(path.length - 1);
    from = to;
  }
  return { path, legMin: legs.map((l) => (l.duration / 60) * AMBULANCE_FACTOR), legEnd };
}

/** Douglas-Peucker on [lat, lng] points with a tolerance in metres; always keeps both ends. */
function simplify(pts: [number, number][], tolM: number): [number, number][] {
  if (pts.length < 3) return pts;
  const k = Math.cos((pts[0][0] * Math.PI) / 180), M = 111_320;
  const xy = pts.map(([lat, lng]) => [lng * k * M, lat * M]);
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a], [bx, by] = xy[b], dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    let best = -1, bd = 0;
    for (let i = a + 1; i < b; i++) {
      const t = len2 ? Math.max(0, Math.min(1, ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / len2)) : 0;
      const dd = Math.hypot(xy[i][0] - (ax + t * dx), xy[i][1] - (ay + t * dy));
      if (dd > bd) { bd = dd; best = i; }
    }
    if (best > 0 && bd > tolM) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function nearestIndex(coords: [number, number][], p: LatLng) {
  let best = 0, bd = Infinity;
  coords.forEach(([lat, lng], i) => { const d = (lat - p.lat) ** 2 + (lng - p.lng) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}

/** Point a fraction t (0..1) of the way along a path, measured by distance. */
export function along(path: [number, number][], t: number): { lat: number; lng: number } {
  if (path.length === 1 || t <= 0) return { lat: path[0][0], lng: path[0][1] };
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], (path[i][1] - path[i - 1][1]) * Math.cos((path[i][0] * Math.PI) / 180)); seg.push(d); total += d; }
  let target = Math.min(1, t) * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, target / seg[i]) : 1;
      return { lat: path[i][0] + (path[i + 1][0] - path[i][0]) * f, lng: path[i][1] + (path[i + 1][1] - path[i][1]) * f };
    }
    target -= seg[i];
  }
  const last = path[path.length - 1];
  return { lat: last[0], lng: last[1] };
}
