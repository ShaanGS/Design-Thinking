// Live map (OpenStreetMap tiles via Leaflet): Paati's home, hospitals, the chosen road route and the ambulance.
// Markers use the 3D clay art so the map matches the rest of the app.
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Hospital } from "../../shared/types";

const VIOLET = "#6F5CF6", PEACH_INK = "#B54A12", INK = "#17142E";

const pin = (html: string, w: number, h = w, anchor: [number, number] = [w / 2, h / 2]) =>
  L.divIcon({ html, className: "", iconSize: [w, h], iconAnchor: anchor });

/** Paati's portrait in a white ring, with a soft violet halo. */
const homeIcon = pin(
  `<div style="position:relative;width:48px;height:48px">
     <span style="position:absolute;inset:-6px;border-radius:50%;background:rgba(111,92,246,.18)"></span>
     <div style="position:relative;width:48px;height:48px;border-radius:50%;background:#FFE3D1;border:3px solid #fff;overflow:hidden;box-shadow:0 8px 18px -6px rgba(73,54,196,.55)">
       <img src="/art/paati.webp" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top" draggable="false"/>
     </div>
   </div>`, 48);

/** Hospital clay icon with a label pill. Chosen is violet, the nearest (that can't treat) is peach, the rest white. */
const hospIcon = (state: "chosen" | "nearest" | "other", label: string) => {
  const pill = state === "chosen" ? `background:${VIOLET};color:#fff`
    : state === "nearest" ? `background:#FFE3D1;color:${PEACH_INK}` : `background:#fff;color:${INK}`;
  const size = state === "chosen" ? 42 : 34;
  return pin(
    `<div style="display:flex;align-items:center;gap:2px;white-space:nowrap;${state === "other" ? "opacity:.85" : ""}">
       <img src="/art/hospital.webp" alt="" width="${size}" height="${size}" style="width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(73,54,196,.3))" draggable="false"/>
       <span style="${pill};border-radius:999px;padding:3px 9px;font:700 11.5px 'Plus Jakarta Sans Variable',system-ui,sans-serif;box-shadow:0 4px 12px -4px rgba(23,20,46,.3)">${label}</span>
     </div>`, size, size, [size / 2, size / 2]);
};

/** The ambulance with a soft red pulse behind it. */
const ambIcon = pin(
  `<div style="position:relative;width:52px;height:52px;display:grid;place-items:center">
     <span class="animate-ripple" style="position:absolute;inset:4px;border-radius:50%;background:rgba(255,59,77,.35)"></span>
     <span style="position:absolute;inset:8px;border-radius:50%;background:#fff;box-shadow:0 0 0 3px rgba(255,59,77,.35),0 8px 18px -6px rgba(255,59,77,.7)"></span>
     <img src="/art/ambulance.webp" alt="" style="position:relative;width:44px;height:44px;object-fit:contain" draggable="false"/>
   </div>`, 52);

/** Fits the map to the route. `extra` (the ambulance) is included when fitting but doesn't trigger a refit as it moves. */
function Fit({ points, extra }: { points: [number, number][]; extra?: [number, number] | null }) {
  const map = useMap();
  const key = `${points.length}|${points[0]?.join(",")}|${points[points.length - 1]?.join(",")}|${extra ? 1 : 0}`;
  useEffect(() => { if (points.length) map.fitBounds(L.latLngBounds(extra ? [...points, extra] : points), { padding: [44, 44], maxZoom: 15 }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapView({ home, hospitals, chosenId, nearestId, ambulance, path, nearestPath, height = 320, className, onlyRelevant }: {
  home: { lat: number; lng: number; name?: string };
  hospitals: Hospital[];
  chosenId?: string | null;
  nearestId?: string | null;
  ambulance?: { lat: number; lng: number } | null;
  /** Real road route ([lat, lng] points) for the ambulance; drawn instead of a straight line */
  path?: [number, number][] | null;
  /** Road route from home to the nearest hospital, dashed for comparison */
  nearestPath?: [number, number][] | null;
  height?: number | string;
  className?: string;
  onlyRelevant?: boolean;
}) {
  const shown = onlyRelevant && chosenId ? hospitals.filter((h) => h.id === chosenId || h.id === nearestId) : hospitals;
  const chosen = hospitals.find((h) => h.id === chosenId);
  const nearest = hospitals.find((h) => h.id === nearestId);
  const hasPath = !!path && path.length > 1;
  const hasNearPath = !!nearestPath && nearestPath.length > 1;
  // Fit the whole road route, not just its ends, so no bend runs off the edge of the map
  const points = useMemo(() => [[home.lat, home.lng] as [number, number], ...shown.map((h) => [h.lat, h.lng] as [number, number]), ...(hasPath ? path! : []), ...(hasNearPath ? nearestPath! : [])], [home.lat, home.lng, shown, hasPath, path, hasNearPath, nearestPath]);
  const mainLine: [number, number][] | null = hasPath ? path! : chosen ? [[home.lat, home.lng], [chosen.lat, chosen.lng]] : null;
  return (
    <div className={className} style={{ height }}>
      <MapContainer center={[home.lat, home.lng]} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%", borderRadius: 10 }} attributionControl>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={points} extra={ambulance ? [ambulance.lat, ambulance.lng] : null} />
        {nearest && chosen && nearest.id !== chosen.id && (
          <Polyline positions={hasNearPath ? nearestPath! : [[home.lat, home.lng], [nearest.lat, nearest.lng]]} pathOptions={{ color: PEACH_INK, weight: 3.5, dashArray: "2 9", lineCap: "round", opacity: 0.9 }} />
        )}
        {mainLine && <Polyline positions={mainLine} pathOptions={{ color: "#FFFFFF", weight: 10, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />}
        {mainLine && <Polyline positions={mainLine} pathOptions={{ color: VIOLET, weight: 5.5, opacity: 1, lineCap: "round", lineJoin: "round" }} />}
        <Marker position={[home.lat, home.lng]} icon={homeIcon} zIndexOffset={500}><Tooltip direction="top" offset={[0, -26]}>{home.name || "Home"}</Tooltip></Marker>
        {shown.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]} zIndexOffset={h.id === chosenId ? 400 : h.id === nearestId ? 300 : 0}
            icon={hospIcon(h.id === chosenId ? "chosen" : h.id === nearestId ? "nearest" : "other", h.short)} />
        ))}
        {ambulance && <Marker position={[ambulance.lat, ambulance.lng]} icon={ambIcon} zIndexOffset={1000} />}
      </MapContainer>
    </div>
  );
}
