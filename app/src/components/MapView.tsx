// Live map (OpenStreetMap tiles via Leaflet): home, hospitals, chosen route and the ambulance.
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Hospital } from "../../shared/types";

const pin = (html: string, size = 34) => L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const homeIcon = pin(`<div style="width:34px;height:34px;border-radius:50%;background:#D98E04;border:4px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center;color:#fff;font:700 15px 'Baloo Thambi 2',sans-serif">அ</div>`);
const hospIcon = (state: "chosen" | "nearest" | "other", label: string) => pin(
  `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap"><div style="width:28px;height:28px;border-radius:9px;background:${state === "chosen" ? "#0F6E5A" : "#fff"};border:2px solid ${state === "chosen" ? "#0F6E5A" : state === "nearest" ? "#B4600A" : "#4B5D57"};display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.25)"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="${state === "chosen" ? "#fff" : "#D62839"}" stroke-width="4" stroke-linecap="round"/></svg></div><span style="background:rgba(255,255,255,.92);border-radius:6px;padding:1px 5px;font:600 11px 'IBM Plex Sans',sans-serif;color:#13221E">${label}</span></div>`, 28);
const ambIcon = pin(`<div style="width:38px;height:38px;border-radius:50%;background:#D62839;border:3px solid #fff;box-shadow:0 0 0 6px rgba(214,40,57,.25),0 2px 8px rgba(0,0,0,.35);display:grid;place-items:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M3 16V7h11v9M14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01M8 9.5v4M6 11.5h4"/></svg></div>`, 38);

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => { if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 15 }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function MapView({ home, hospitals, chosenId, nearestId, ambulance, height = 320, className, onlyRelevant }: {
  home: { lat: number; lng: number; name?: string };
  hospitals: Hospital[];
  chosenId?: string | null;
  nearestId?: string | null;
  ambulance?: { lat: number; lng: number } | null;
  height?: number | string;
  className?: string;
  onlyRelevant?: boolean;
}) {
  const shown = onlyRelevant && chosenId ? hospitals.filter((h) => h.id === chosenId || h.id === nearestId) : hospitals;
  const chosen = hospitals.find((h) => h.id === chosenId);
  const nearest = hospitals.find((h) => h.id === nearestId);
  const points = useMemo(() => [[home.lat, home.lng] as [number, number], ...shown.map((h) => [h.lat, h.lng] as [number, number])], [home.lat, home.lng, shown]);
  return (
    <div className={className} style={{ height }}>
      <MapContainer center={[home.lat, home.lng]} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%", borderRadius: 16 }} attributionControl>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={points} />
        {nearest && chosen && nearest.id !== chosen.id && <Polyline positions={[[home.lat, home.lng], [nearest.lat, nearest.lng]]} pathOptions={{ color: "#B4600A", weight: 3, dashArray: "6 8", opacity: 0.8 }} />}
        {chosen && <Polyline positions={[[home.lat, home.lng], [chosen.lat, chosen.lng]]} pathOptions={{ color: "#0F6E5A", weight: 6, opacity: 0.85 }} />}
        <Marker position={[home.lat, home.lng]} icon={homeIcon}><Tooltip direction="top" offset={[0, -14]}>{home.name || "Home"}</Tooltip></Marker>
        {shown.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={hospIcon(h.id === chosenId ? "chosen" : h.id === nearestId ? "nearest" : "other", h.short)} />
        ))}
        {ambulance && <Marker position={[ambulance.lat, ambulance.lng]} icon={ambIcon} zIndexOffset={1000} />}
      </MapContainer>
    </div>
  );
}
