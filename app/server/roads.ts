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

/** Road geometry through the given stops as [lat, lng] points (at most ~300), with per-leg drive minutes. */
export async function roadRoute(stops: LatLng[]): Promise<{ path: [number, number][]; legMin: number[]; legEnd: number[] } | null> {
  const url = `${OSRM}/route/v1/driving/${stops.map(fmt).join(";")}?overview=full&geometries=geojson&steps=false`;
  const d = await getJSON(url, 6000);
  const r = d?.routes?.[0];
  if (!r?.geometry?.coordinates?.length) return null;
  const coords: [number, number][] = r.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
  // Keep the path light enough to stream every second: thin to ~300 points but keep the leg endpoints
  const step = Math.max(1, Math.ceil(coords.length / 300));
  const legEnds = stops.slice(1).map((s) => nearestIndex(coords, s));
  const keep = new Set<number>([0, coords.length - 1, ...legEnds]);
  for (let i = 0; i < coords.length; i += step) keep.add(i);
  const idx = [...keep].sort((a, b) => a - b);
  const path = idx.map((i) => coords[i]);
  const legEnd = legEnds.map((e) => idx.indexOf(e));
  return { path, legMin: (r.legs || []).map((l: { duration: number }) => (l.duration / 60) * AMBULANCE_FACTOR), legEnd };
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
