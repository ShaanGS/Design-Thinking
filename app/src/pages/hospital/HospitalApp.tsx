// Hospital console: incoming Saathi patients, routing explanation, network capacity and medicine relays.
import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Activity, BedDouble, Clock3, LogOut, PackageX, Radio, Siren } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConnected } from "../../lib/socket";
import { Badge, Button, Card, EmptyState, Logo, Spinner, useToast, cx } from "../../components/ui";
import { fmtTime } from "../../lib/format";
import type { Emergency, Hospital, HospitalCaps, InventoryItem, Relay } from "../../../shared/types";
import { isActive, useNetwork } from "./useNetwork";
import IncomingCard from "./IncomingCard";
import RoutePanel from "./RoutePanel";
import RecordModal from "./RecordModal";
import CapacityBoard from "./CapacityBoard";
import RelaysList from "./RelaysList";

export default function HospitalApp() {
  return <Routes><Route path="*" element={<Console />} /></Routes>;
}

/* Short attention tone for new incoming cases (browsers allow audio only after a user gesture). */
let audioCtx: AudioContext | null = null;
function unlockAudio() { try { audioCtx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)(); void audioCtx.resume(); } catch { /* no audio */ } }
function chime() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const t = audioCtx.currentTime;
  [[880, 0], [660, 0.18], [880, 0.36]].forEach(([f, d]) => {
    const o = audioCtx!.createOscillator(), g = audioCtx!.createGain();
    o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.2, t + d); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.16);
    o.connect(g).connect(audioCtx!.destination); o.start(t + d); o.stop(t + d + 0.17);
  });
}

function Console() {
  const { user, info, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const connected = useConnected();
  const net = useNetwork();
  const { emergencies, hospitals, relays, files, loadFile } = net;
  const ownId = user?.hospitalId || null;
  const own = hospitals.find((h) => h.id === ownId) || null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [recordFor, setRecordFor] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(Date.now());
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const f = () => unlockAudio(); window.addEventListener("pointerdown", f, { once: true }); return () => window.removeEventListener("pointerdown", f); }, []);

  const active = useMemo(() => emergencies.filter(isActive), [emergencies]);
  const mine = useMemo(() => active.filter((e) => ownId && e.hospitalId === ownId), [active, ownId]);
  const elsewhere = useMemo(() => active.filter((e) => !(ownId && e.hospitalId === ownId)), [active, ownId]);
  const closedToday = useMemo(() => emergencies.filter((e) => e.status === "resolved" && e.hospitalId === ownId && new Date(e.startedAt).toDateString() === new Date().toDateString()), [emergencies, ownId]);

  // Announce new incoming cases routed here (not the ones already present on first load)
  useEffect(() => {
    if (!net.loaded) return;
    if (!seen.current) { seen.current = new Set(mine.map((e) => e.id)); return; }
    for (const e of mine) {
      if (seen.current.has(e.id)) continue;
      seen.current.add(e.id);
      setFresh((s) => new Set(s).add(e.id));
      setSelectedId(e.id);
      chime();
      toast(`Incoming: ${e.triage?.label || "emergency"} · ETA ${e.route?.etaMin ?? "?"} min`, "sos");
    }
  }, [mine, net.loaded, toast]);

  // Load the record for every case routed here
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

  const selected = active.find((e) => e.id === selectedId) || mine[0] || elsewhere[0] || null;
  const selectedFile = selected && files[selected.patientId] && files[selected.patientId] !== "denied" ? (files[selected.patientId] as Exclude<(typeof files)[string], "denied">) : undefined;
  const recordFile = recordFor && files[recordFor] && files[recordFor] !== "denied" ? (files[recordFor] as Exclude<(typeof files)[string], "denied">) : undefined;

  const today = new Date().toDateString();
  const savedToday = emergencies.filter((e) => e.status !== "cancelled" && new Date(e.startedAt).toDateString() === today).reduce((n, e) => n + (e.route?.savedMin || 0), 0);
  const freeIcu = hospitals.reduce((n, h) => n + h.icuBeds, 0);
  const lowItems = hospitals.flatMap((h) => h.inventory.filter((i) => i.qty < i.min).map((i) => ({ h, i })));
  const ownLow = lowItems.filter((x) => x.h.id === ownId).length;
  const relayTargets = new Set(relays.filter((r) => r.toId === ownId && r.status !== "delivered").map((r) => r.item));

  async function act(e: Emergency, action: "ready" | "admit" | "resolve") {
    setBusy(`${e.id}:${action}`);
    try {
      const out = await api.post<Emergency>(`/api/emergencies/${e.id}/${action}`);
      net.setEmergencies((l) => l.map((x) => (x.id === out.id ? out : x)));
      toast(action === "ready" ? "Team marked ready. The family can see it." : action === "admit" ? "Patient received. Family notified." : "Case closed.", "ok");
    } catch (err) { toast((err as Error).message, "sos"); }
    finally { setBusy(null); }
  }

  async function patchHospital(body: Partial<Pick<Hospital, "icuBeds" | "erBeds">> & { caps?: Partial<HospitalCaps> }, key: string) {
    if (!own) return;
    setPending(key);
    net.setHospitals((hs) => hs.map((h) => (h.id === own.id ? { ...h, ...("icuBeds" in body ? { icuBeds: body.icuBeds! } : {}), ...("erBeds" in body ? { erBeds: body.erBeds! } : {}), caps: { ...h.caps, ...(body.caps || {}) } } : h)));
    try { await api.patch(`/api/hospitals/${own.id}`, body); }
    catch (err) { toast((err as Error).message, "sos"); void net.reload(); }
    finally { setPending(null); }
  }
  async function setStock(item: string, qty: number) {
    if (!own) return;
    setPending(item);
    net.setHospitals((hs) => hs.map((h) => (h.id === own.id ? { ...h, inventory: h.inventory.map((i) => (i.item === item ? { ...i, qty, updatedAt: new Date().toISOString() } : i)) } : h)));
    try { await api.patch(`/api/hospitals/${own.id}/inventory/${item}`, { qty }); }
    catch (err) { toast((err as Error).message, "sos"); void net.reload(); }
    finally { setPending(null); }
  }
  async function relay(inv: InventoryItem) {
    if (!own) return;
    setPending(`relay:${inv.item}`);
    try {
      const r = await api.post<Relay>("/api/relays", { item: inv.item, qty: Math.max(inv.min - inv.qty, 5), toId: own.id });
      const from = hospitals.find((h) => h.id === r.fromId)?.short || "a nearby hospital";
      toast(`${r.qty} × ${r.label} coming from ${from} · ~${r.etaMin} min`, "ok");
    } catch (err) { toast((err as Error).message, "sos"); }
    finally { setPending(null); }
  }

  return (
    <div className="min-h-full bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-[500] border-b border-line bg-white/95 backdrop-blur safe-top">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Logo size={32} label={false} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{own ? own.name : "Saathi network"} <span className="font-sans text-base font-medium text-ink-3">· Emergency</span></h1>
            <p className="truncate text-xs text-ink-2">Saathi hospital network · Chennai South{own ? ` · ${own.kind}` : ""}</p>
          </div>
          <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", connected ? "bg-teal-50 text-teal" : "bg-warn-50 text-warn")}>
            <span className={cx("h-2 w-2 rounded-full", connected ? "bg-teal animate-pulse" : "bg-warn")} />{connected ? "Live" : "Reconnecting"}
          </span>
          <div className="hidden text-right text-sm sm:block"><div className="font-semibold leading-tight">{user?.name}</div><div className="text-xs text-ink-3">{user?.relation || "Staff"}</div></div>
          <Button variant="ghost" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await signOut(); nav("/"); }}>Sign out</Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6">
        {!net.loaded ? <div className="grid h-60 place-items-center"><Spinner className="h-8 w-8" /></div> : <>
          {net.error && <div className="rounded-xl bg-sos-50 px-4 py-3 text-sm font-semibold text-sos">{net.error}</div>}

          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<Siren className="h-5 w-5" />} label="Incoming to you" value={mine.length} tone={mine.length ? "sos" : undefined} sub={`${elsewhere.length} elsewhere in the network`} />
            <Kpi icon={<Clock3 className="h-5 w-5" />} label="Minutes saved today" value={savedToday} tone={savedToday ? "ok" : undefined} sub="by need-matched routing" />
            <Kpi icon={<BedDouble className="h-5 w-5" />} label="Free ICU beds" value={freeIcu} tone={freeIcu <= 3 ? "warn" : undefined} sub={own ? `${own.icuBeds} here · ${hospitals.length} hospitals` : `${hospitals.length} hospitals`} />
            <Kpi icon={<PackageX className="h-5 w-5" />} label="Low-stock alerts" value={lowItems.length} tone={lowItems.length ? "warn" : "ok"} sub={own ? `${ownLow} at ${own.short}` : "across the network"} />
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* Incoming */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold"><Radio className="h-5 w-5 text-sos" />Incoming patients</h2>
                {mine.length > 0 && <Badge tone="sos" dot>{mine.length} active</Badge>}
              </div>
              {mine.length ? mine.map((e) => (
                <IncomingCard key={e.id} e={e} file={files[e.patientId]} hospitals={hospitals} ownId={ownId} selected={selected?.id === e.id}
                  onSelect={() => setSelectedId(e.id)} onAction={(a) => act(e, a)} busy={busy} onOpenRecord={() => setRecordFor(e.patientId)} fresh={fresh.has(e.id)} />
              )) : (
                <Card className="p-4"><EmptyState icon={<Activity className="h-6 w-6" />} title="No patients on the way">When a Saathi member raises an SOS and is routed here, the case appears instantly with a pre-arrival brief, allergies, blood thinners and kidney function, before the ambulance arrives.</EmptyState></Card>
              )}

              {elsewhere.length > 0 && <>
                <h3 className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-ink-3">Elsewhere in the network</h3>
                {elsewhere.map((e) => (
                  <IncomingCard key={e.id} e={e} file={undefined} hospitals={hospitals} ownId={ownId} selected={selected?.id === e.id}
                    onSelect={() => setSelectedId(e.id)} onAction={() => {}} busy={null} onOpenRecord={() => {}} />
                ))}
              </>}

              {closedToday.length > 0 && (
                <div className="rounded-2xl border border-line bg-white px-4 py-3">
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-ink-3">Handled today</h3>
                  <ul className="flex flex-col gap-1 text-sm">
                    {closedToday.map((e) => <li key={e.id} className="flex justify-between gap-2"><span className="truncate">{e.triage?.label || "Emergency"}</span><span className="shrink-0 font-mono text-xs text-ink-3">{fmtTime(e.startedAt)} · saved {e.route?.savedMin ?? 0}′</span></li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Map + relays */}
            <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[84px] lg:self-start">
              <RoutePanel e={selected} file={selectedFile} hospitals={hospitals} />
              <RelaysList relays={relays} hospitals={hospitals} ownId={ownId} demoSpeed={info?.demoSpeed || 1} now={now} />
            </div>
          </section>

          <CapacityBoard hospitals={hospitals} ownId={ownId} pending={pending} relayTargets={relayTargets}
            onBeds={(f, v) => patchHospital({ [f]: v }, f)} onStock={setStock} onCap={(k, v) => patchHospital({ caps: { [k]: v } }, `cap:${k}`)} onRelay={relay} />
        </>}
      </main>

      <RecordModal file={recordFile} open={!!recordFile} onClose={() => setRecordFor(null)} />
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: number; sub: string; tone?: "ok" | "warn" | "sos" }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tone === "sos" ? "bg-sos-50 text-sos" : tone === "warn" ? "bg-warn-50 text-warn" : tone === "ok" ? "bg-teal-50 text-teal" : "bg-paper-2 text-ink-2")}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{label}</div>
        <div className={cx("font-display text-3xl font-bold leading-tight tnum", tone === "sos" && "text-sos", tone === "warn" && "text-warn", tone === "ok" && "text-teal")}>{value}</div>
        <div className="text-xs leading-snug text-ink-2">{sub}</div>
      </div>
    </Card>
  );
}
