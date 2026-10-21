// Hospital console: incoming Saathi patients, routing explanation, network capacity and medicine relays.
import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConnected } from "../../lib/socket";
import { Logo, Spinner, useToast, cx } from "../../components/ui";
import { fmtTime } from "../../lib/format";
import type { Emergency, Hospital, HospitalCaps, InventoryItem, Relay } from "../../../shared/types";
import { isActive, useNetwork } from "./useNetwork";
import IncomingRow from "./IncomingCard";
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

  return (
    <div className="min-h-full bg-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-[500] border-b border-line bg-white safe-top">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Logo size={28} label={false} />
          <h1 className="min-w-0 flex-1 truncate text-[19px] font-semibold leading-tight">
            <span className="hidden sm:inline">{own ? own.name : "Saathi network"}</span><span className="sm:hidden">{own ? own.short : "Saathi"}</span>
            <span className="font-sans text-[15px] font-normal text-ink-2"> · Emergency</span>
          </h1>
          <span className={cx("inline-flex items-center gap-1.5 text-[13px] font-semibold", connected ? "text-teal" : "text-warn")}>
            <span className={cx("h-2 w-2 rounded-full", connected ? "bg-teal" : "bg-warn animate-blink")} />{connected ? "Live" : "Reconnecting"}
          </span>
          <span className="hidden h-5 w-px bg-line sm:block" />
          <div className="hidden text-right text-[13px] leading-tight sm:block"><div className="font-semibold">{user?.name}</div><div className="text-ink-3">{user?.relation || "Staff"}</div></div>
          <button className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[14px] font-semibold text-ink-2 hover:bg-paper hover:text-ink" onClick={async () => { await signOut(); nav("/"); }}>
            <LogOut className="h-4 w-4" strokeWidth={1.75} /><span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5">
        {!net.loaded ? <div className="grid h-60 place-items-center"><Spinner className="h-8 w-8" /></div> : <>
          {net.error && <p className="rounded-[10px] border border-line bg-white px-4 py-3 text-[14px]"><span className="font-semibold">Couldn't load the network.</span> <span className="text-ink-2">{net.error}</span></p>}

          {/* Summary strip */}
          <dl className="grid grid-cols-2 gap-y-3 rounded-xl border border-line bg-white px-4 py-3 sm:flex sm:flex-wrap sm:items-end sm:gap-x-0 sm:px-5">
            <Figure label="Coming to you" value={mine.length} sub={elsewhere.length ? `${elsewhere.length} elsewhere` : "none elsewhere"} alert={mine.length > 0} />
            <Figure label="Minutes saved today" value={savedToday} sub="by need-matched routing" />
            <Figure label="Free ICU beds" value={freeIcu} sub={own ? `${own.icuBeds} here, ${hospitals.length} hospitals` : `${hospitals.length} hospitals`} warn={freeIcu <= 3} />
            <Figure label="Items below minimum" value={lowItems.length} sub={own ? `${ownLow} here` : "across the network"} warn={ownLow > 0} href="#capacity" />
          </dl>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {/* Incoming queue */}
            <div className="flex min-w-0 flex-col gap-5">
              <div className="rounded-xl border border-line bg-white">
                <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                  <h2 className="text-[20px] font-semibold leading-tight">Incoming</h2>
                  <span className="text-[13px] text-ink-3">{mine.length ? `${mine.length} on the way · soonest first` : "Nothing on the way"}</span>
                </header>
                {mine.length ? (
                  <ul>
                    {[...mine].sort(byEta).map((e) => (
                      <IncomingRow key={e.id} e={e} file={files[e.patientId]} hospitals={hospitals} ownId={ownId} selected={selected?.id === e.id}
                        onSelect={() => setSelectedId(e.id)} onAction={(a) => act(e, a)} busy={busy} onOpenRecord={() => setRecordFor(e.patientId)} fresh={fresh.has(e.id)} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-5 text-[15px] text-ink-2 sm:px-5">No patients are on the way. When an SOS is routed to {own?.short || "this hospital"}, the patient appears here at once with their allergies, blood thinners, kidney function and a pre-arrival brief.</p>
                )}

                {elsewhere.length > 0 && <>
                  <h3 className="border-t border-line bg-paper px-4 py-2 text-[13px] font-semibold text-ink-2 sm:px-5">Elsewhere in the network</h3>
                  <ul>
                    {[...elsewhere].sort(byEta).map((e) => (
                      <IncomingRow key={e.id} e={e} file={undefined} hospitals={hospitals} ownId={ownId} selected={selected?.id === e.id}
                        onSelect={() => setSelectedId(e.id)} onAction={() => {}} busy={null} onOpenRecord={() => {}} />
                    ))}
                  </ul>
                </>}

                {closedToday.length > 0 && <>
                  <h3 className="border-t border-line bg-paper px-4 py-2 text-[13px] font-semibold text-ink-2 sm:px-5">Handled today</h3>
                  <ul className="text-[14px]">
                    {closedToday.map((e) => (
                      <li key={e.id} className="grid grid-cols-[5.5rem_1fr_auto] gap-x-4 border-t border-line px-4 py-2 first:border-t-0 sm:px-5">
                        <span className="font-mono text-[12px] leading-6 text-ink-3">{fmtTime(e.startedAt)}</span>
                        <span className="truncate">{e.triage?.label || "Emergency"}</span>
                        <span className="text-ink-2 tnum">{e.route?.savedMin ?? 0} min saved</span>
                      </li>
                    ))}
                  </ul>
                </>}
              </div>
            </div>

            {/* Route + relays */}
            <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[68px] lg:self-start">
              <div className={cx(!selected && "hidden lg:block")}><RoutePanel e={selected} file={selectedFile} hospitals={hospitals} /></div>
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

const etaKey = (e: Emergency) => (e.status === "admitted" ? 1e6 : e.status === "arrived" ? -1 : e.etaLeftMin ?? 1e5);
const byEta = (a: Emergency, b: Emergency) => etaKey(a) - etaKey(b);

function Figure({ label, value, sub, alert, warn, href }: { label: string; value: number; sub: string; alert?: boolean; warn?: boolean; href?: string }) {
  const body = (
    <>
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="flex items-baseline gap-2">
        <span className={cx("font-display text-[30px] font-semibold leading-none tnum", alert ? "text-sos" : warn ? "text-warn" : "text-ink")} style={{ fontStretch: "85%" }}>{value}</span>
        <span className="text-[13px] text-ink-3">{sub}</span>
      </dd>
    </>
  );
  return (
    <div className="min-w-0 pr-3 sm:border-r sm:border-line sm:px-5 sm:first:pl-0 sm:last:border-r-0">
      {href ? <a href={href} className="block hover:opacity-80">{body}</a> : body}
    </div>
  );
}
