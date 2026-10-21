// Live map (OpenStreetMap tiles via Leaflet): home, hospitals, chosen route and the ambulance.
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Hospital } from "../../shared/types";

const pin = (html: string, size = 34) => L.divIcon({ html, className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
const homeIcon = pin(`<div style="width:30px;height:30px;border-radius:8px;background:#F5B800;border:3px solid #14172B;box-shadow:0 2px 6px rgba(20,23,43,.3);display:grid;place-items:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="#14172B"><path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"/></svg></div>`, 30);
const hospIcon = (state: "chosen" | "nearest" | "other", label: string) => pin(
  `<div style="display:flex;align-items:center;gap:6px;white-space:nowrap"><div style="width:26px;height:26px;border-radius:6px;background:${state === "chosen" ? "#14172B" : "#fff"};border:2px solid ${state === "chosen" ? "#14172B" : state === "nearest" ? "#B25E00" : "#858AA0"};display:grid;place-items:center;box-shadow:0 1px 4px rgba(20,23,43,.25)"><svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 4v16M4 12h16" stroke="${state === "chosen" ? "#F5B800" : "#14172B"}" stroke-width="4" stroke-linecap="round"/></svg></div><span style="background:#fff;border:1px solid #E1E3E9;border-radius:5px;padding:0 5px;font:600 11.5px 'Hind Madurai',sans-serif;color:#14172B">${label}</span></div>`, 26);
const ambIcon = pin(`<div style="width:36px;height:36px;border-radius:50%;background:#E0262F;border:3px solid #fff;box-shadow:0 0 0 6px rgba(224,38,47,.22),0 2px 6px rgba(20,23,43,.35);display:grid;place-items:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M3 16V7h11v9M14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01M8 9.5v4M6 11.5h4"/></svg></div>`, 38);

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
      <MapContainer center={[home.lat, home.lng]} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%", borderRadius: 10 }} attributionControl>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit points={points} />
        {nearest && chosen && nearest.id !== chosen.id && <Polyline positions={[[home.lat, home.lng], [nearest.lat, nearest.lng]]} pathOptions={{ color: "#B25E00", weight: 3, dashArray: "4 7", opacity: 0.9 }} />}
        {chosen && <Polyline positions={[[home.lat, home.lng], [chosen.lat, chosen.lng]]} pathOptions={{ color: "#14172B", weight: 5, opacity: 0.9 }} />}
        <Marker position={[home.lat, home.lng]} icon={homeIcon}><Tooltip direction="top" offset={[0, -14]}>{home.name || "Home"}</Tooltip></Marker>
        {shown.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={hospIcon(h.id === chosenId ? "chosen" : h.id === nearestId ? "nearest" : "other", h.short)} />
        ))}
        {ambulance && <Marker position={[ambulance.lat, ambulance.lng]} icon={ambIcon} zIndexOffset={1000} />}
      </MapContainer>
    </div>
  );
}
