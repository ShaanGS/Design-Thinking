// Hospital app: Dr. Priya's phone in the ER. Incoming Saathi patients, the network's capacity and medicine relays.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Siren, Building2, Truck, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Button, Spinner, useToast } from "../../components/ui";
import { PhoneFrame, TabBar } from "../../components/kit";
import type { Emergency, Hospital, HospitalCaps, InventoryItem, Relay } from "../../../shared/types";
import { StageLabel } from "../Landing";
import { isActive, useNetwork, type PatientFile } from "./useNetwork";
import { HospitalCtx, byEta, type CaseAction, type HospitalCtxT } from "./ctx";
import { alertTone, buzz, unlockAudio } from "./alert";
import ErHome from "./ErHome";
import NetworkPage from "./CapacityBoard";
import RelaysPage from "./RelaysList";
import RecordModal from "./RecordModal";

export default function HospitalApp() {
  const { user, info } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const net = useNetwork();
  const { emergencies, hospitals, relays, files, loadFile } = net;
  const ownId = user?.hospitalId || null;
  const own = hospitals.find((h) => h.id === ownId) || null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [recordFor, setRecordFor] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);

  // Audio may only start after a tap; try at once (the sign-in tap often counts) and again on the first tap here.
  useEffect(() => {
    unlockAudio();
    const f = () => unlockAudio();
    window.addEventListener("pointerdown", f, { once: true });
    return () => window.removeEventListener("pointerdown", f);
  }, []);

  const active = useMemo(() => emergencies.filter(isActive), [emergencies]);
  const mine = useMemo(() => active.filter((e) => ownId && e.hospitalId === ownId).sort(byEta), [active, ownId]);
  const elsewhere = useMemo(() => active.filter((e) => !(ownId && e.hospitalId === ownId)).sort(byEta), [active, ownId]);
  const closedToday = useMemo(() => emergencies.filter((e) => e.status === "resolved" && e.hospitalId === ownId && new Date(e.startedAt).toDateString() === new Date().toDateString()), [emergencies, ownId]);
  const lead = mine.find((e) => e.id === selectedId) || mine[0] || null;

  // Page the doctor for every new case routed here (not the ones already present on first load).
  useEffect(() => {
    if (!net.loaded) return;
    if (!seen.current) { seen.current = new Set(mine.map((e) => e.id)); return; }
    for (const e of mine) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      setFresh((s) => new Set(s).add(e.id));
      setSelectedId(e.id);
      alertTone();
      buzz();
      toast(`Incoming: ${e.triage?.label || "emergency"} · ETA ${e.route?.etaMin ?? "?"} min`, "sos");
      if (loc.pathname.replace(/\/$/, "") !== "/hospital") nav("/hospital");
      document.querySelector(".phone-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [mine, net.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the record for every case routed here (break-glass: logged on the server, the family is told).
  const tried = useRef(new Set<string>());
  useEffect(() => {
    for (const e of mine) {
      const key = `${e.patientId}:${e.status}`; // retry a refused read at most once per status change
      if (files[e.patientId] && files[e.patientId] !== "denied") continue;
      if (tried.current.has(key)) continue;
      tried.current.add(key);
      void loadFile(e.patientId, files[e.patientId] === "denied");
    }
  }, [mine, files, loadFile]);

  // Each tab starts at the top
  useEffect(() => { document.querySelector(".phone-scroll")?.scrollTo(0, 0); window.scrollTo(0, 0); }, [loc.pathname]);

  const fileFor = useCallback((patientId: string) => {
    const f = files[patientId];
    return f && f !== "denied" ? (f as PatientFile) : undefined;
  }, [files]);

  const today = new Date().toDateString();
  const savedToday = emergencies.filter((e) => e.status !== "cancelled" && new Date(e.startedAt).toDateString() === today).reduce((n, e) => n + (e.route?.savedMin || 0), 0);
  const freeIcu = hospitals.reduce((n, h) => n + h.icuBeds, 0);
  const low = hospitals.flatMap((h) => h.inventory.filter((i) => i.qty < i.min).map((i) => ({ h, i })));
  const ownLow = low.filter((x) => x.h.id === ownId).length;
  const relayTargets = new Set(relays.filter((r) => r.toId === ownId && r.status !== "delivered").map((r) => r.item));

  async function act(e: Emergency, action: CaseAction) {
    setBusy(`${e.id}:${action}`);
    try {
      const out = await api.post<Emergency>(`/api/emergencies/${e.id}/${action}`);
      net.setEmergencies((l) => l.map((x) => (x.id === out.id ? out : x)));
      toast(action === "ready" ? "Team marked ready. The family can see it." : action === "admit" ? "Patient received. Family notified." : "Case closed.", "ok");
    } catch (err) { toast((err as Error).message, "warn"); }
    finally { setBusy(null); }
  }

  async function patchHospital(body: Partial<Pick<Hospital, "icuBeds" | "erBeds">> & { caps?: Partial<HospitalCaps> }, key: string) {
    if (!own) return;
    setPending(key);
    net.setHospitals((hs) => hs.map((h) => (h.id === own.id ? { ...h, ...("icuBeds" in body ? { icuBeds: body.icuBeds! } : {}), ...("erBeds" in body ? { erBeds: body.erBeds! } : {}), caps: { ...h.caps, ...(body.caps || {}) } } : h)));
    try { await api.patch(`/api/hospitals/${own.id}`, body); }
    catch (err) { toast((err as Error).message, "warn"); void net.reload(); }
    finally { setPending(null); }
  }
  async function setStock(item: string, qty: number) {
    if (!own) return;
    setPending(item);
    net.setHospitals((hs) => hs.map((h) => (h.id === own.id ? { ...h, inventory: h.inventory.map((i) => (i.item === item ? { ...i, qty, updatedAt: new Date().toISOString() } : i)) } : h)));
    try { await api.patch(`/api/hospitals/${own.id}/inventory/${item}`, { qty }); }
    catch (err) { toast((err as Error).message, "warn"); void net.reload(); }
    finally { setPending(null); }
  }
  async function relay(inv: InventoryItem) {
    if (!own) return;
    setPending(`relay:${inv.item}`);
    try {
      const r = await api.post<Relay>("/api/relays", { item: inv.item, qty: Math.max(inv.min - inv.qty, 5), toId: own.id });
      const from = hospitals.find((h) => h.id === r.fromId)?.short || "a nearby hospital";
      toast(`${r.qty} × ${r.label} coming from ${from} · ~${r.etaMin} min`, "ok");
    } catch (err) { toast((err as Error).message, "warn"); }
    finally { setPending(null); }
  }

  const ctx: HospitalCtxT = {
    net, ownId, own, mine, elsewhere, closedToday, lead, select: setSelectedId, fresh, busy, pending,
    demoSpeed: info?.demoSpeed || 1, act, patchHospital, setStock, relay, openRecord: setRecordFor, fileFor,
    stats: { savedToday, freeIcu, lowCount: low.length, ownLow }, relayTargets,
  };

  const label = <StageLabel who="priya" title="Hospital ER" text="Dr. Priya in the Saraswathi ER is paged the moment Saathi routes a patient to her, with the records, red flags and a live ETA before the ambulance arrives." />;
  const recordFile = recordFor ? fileFor(recordFor) : undefined;

  if (!net.loaded || (net.error && !hospitals.length)) {
    return (
      <PhoneFrame label={label}>
        <div className="grid h-full min-h-[60vh] place-items-center p-6 text-center">
          {net.error ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-bold">Couldn't load the hospital network</p>
              <p className="text-sm text-ink-2">{net.error}</p>
              <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => void net.reload()}>Try again</Button>
            </div>
          ) : <Spinner className="h-8 w-8 text-violet" />}
        </div>
      </PhoneFrame>
    );
  }

  return (
    <HospitalCtx.Provider value={ctx}>
      <PhoneFrame label={label}>
        <div className="relative min-h-full">
          <Routes>
            <Route index element={<ErHome />} />
            <Route path="network" element={<NetworkPage />} />
            <Route path="relays" element={<RelaysPage />} />
            <Route path="*" element={<ErHome />} />
          </Routes>
          <TabBar items={[
            { to: "/hospital", label: "ER", icon: Siren, end: true, dot: mine.some((e) => e.status !== "admitted") },
            { to: "/hospital/network", label: "Network", icon: Building2 },
            { to: "/hospital/relays", label: "Relays", icon: Truck },
          ]} />
          <RecordModal file={recordFile} open={!!recordFile} onClose={() => setRecordFor(null)} />
        </div>
      </PhoneFrame>
    </HospitalCtx.Provider>
  );
}
