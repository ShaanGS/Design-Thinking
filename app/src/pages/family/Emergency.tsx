// Live emergency view: the moment Paati presses help, Karthik sees her condition, a huge ETA countdown,
// the ambulance moving on the map, a golden-hour timeline, who's going, why this hospital and the ER brief.
// With no emergency it is a calm page with the CPR coach and how Saathi handles one. "?cpr=1" opens the CPR coach.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Phone, Navigation, Check, Sparkles, X } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtTime, timeAgo } from "../../lib/format";
import MapView from "../../components/MapView";
import CprCoach from "../../components/CprCoach";
import { Avatar, Button, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Person, Pill, Section, Sheet, Tile, TopBar, VioletHeader, type ArtName } from "../../components/kit";
import { CONDITION_INFO, NEED_LABEL, type Emergency, type FeedItem, type Hospital } from "../../../shared/types";
import { ACTIVE_STATUSES, FEED_TONE, pronoun, useFamily } from "./ctx";
import { TRANSFER_PENALTY_MIN } from "./constants";

const GOLDEN = 60;

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export default function EmergencyPage() {
  const { data } = useFamily();
  const [params, setParams] = useSearchParams();
  const [cpr, setCpr] = useState(params.get("cpr") === "1");
  useEffect(() => { if (params.get("cpr") === "1") setCpr(true); }, [params]);
  const closeCpr = () => { setCpr(false); if (params.has("cpr")) setParams({}, { replace: true }); };

  const e = data.emergency && ACTIVE_STATUSES.includes(data.emergency.status) ? data.emergency : null;
  return (
    <>
      {e ? <Live e={e} onCpr={() => setCpr(true)} /> : <Calm onCpr={() => setCpr(true)} />}
      <CprCoach open={cpr} onClose={closeCpr} name={data.patient.nickname} etaMin={e?.status === "dispatched" ? e.etaLeftMin : null} />
    </>
  );
}

/* ================================================================= Live */

function Live({ e, onCpr }: { e: Emergency; onCpr: () => void }) {
  const { data } = useFamily();
  const { user, info } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const now = useNow();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [busy, setBusy] = useState<"respond" | "cancel" | null>(null);
  const [sheet, setSheet] = useState<"call" | "cancel" | null>(null);
  useEffect(() => { api.get<Hospital[]>("/api/hospitals").then(setHospitals).catch(() => {}); }, [e.route?.hospitalId]);

  const p = data.patient;
  const pr = pronoun(p.sex);
  const elder = data.members.find((m) => m.role === "elder");
  const route = e.route;
  const chosen = hospitals.find((h) => h.id === route?.hospitalId);
  const nearest = hospitals.find((h) => h.id === route?.nearestId);
  const meResponding = e.responders.some((r) => r.name === user?.name);
  const condition = e.triage ? CONDITION_INFO[e.triage.condition]?.label ?? e.triage.label : "Working out what happened";
  const enRoute = e.status === "dispatched" && e.etaLeftMin != null;
  const canCancel = e.status === "triage" || e.status === "dispatched";

  // Golden-hour clock, in the same simulated minutes as the ETA
  const speed = info?.demoSpeed ?? 20;
  const sim = (from: string, to: number | string) => ((typeof to === "number" ? to : new Date(to).getTime()) - new Date(from).getTime()) / 60000 * speed;
  const elapsedReal = Math.max(0, Math.floor((now - new Date(e.startedAt).getTime()) / 1000));
  const elapsedSim = sim(e.startedAt, now);
  const triageSim = e.dispatchedAt ? sim(e.startedAt, e.dispatchedAt) : null;
  const careAt = e.arrivedAt ? sim(e.startedAt, e.arrivedAt) : triageSim != null && route ? triageSim + route.etaMin : null;
  const nearestAt = careAt != null && route && route.savedMin > 0 ? careAt + route.savedMin : null;
  const pickupShare = route ? route.pickupShare ?? Math.min(0.4, 4 / Math.max(1, route.etaMin)) : 0.3;

  async function respond() {
    setBusy("respond");
    try { await api.post(`/api/sos/${e.id}/respond`); toast("The family and the hospital know you're coming", "ok"); }
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(null); }
  }
  async function cancel() {
    setBusy("cancel");
    try { await api.post(`/api/sos/${e.id}/cancel`); toast(`Cancelled. Everyone has been told ${p.nickname} is OK.`, "ok"); setSheet(null); nav("/family"); }
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(null); }
  }

  const mm = String(Math.floor(elapsedReal / 60)).padStart(2, "0"), ss = String(elapsedReal % 60).padStart(2, "0");
  const symptom = e.symptomText ? `“${e.symptomText}”${e.triage?.english && e.triage.english !== e.symptomText ? ` · ${e.triage.english}` : ""}` : null;

  return (
    <div className="min-h-full bg-canvas">
      <VioletHeader sos className="overflow-hidden pb-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        {/* top row */}
        <div className="relative flex items-center gap-3">
          <button aria-label="Back" onClick={() => nav("/family")} className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full"><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex flex-1 items-center gap-2 text-[12px] font-extrabold tracking-[0.14em]"><span className="h-2 w-2 rounded-full bg-white animate-blink" />EMERGENCY · LIVE</div>
          <span className="glass rounded-full px-3 py-1.5 font-display text-[13px] font-bold tnum" title="Time since the SOS">{mm}:{ss}</span>
        </div>

        {/* who and what */}
        <div className="relative mt-5 flex items-center gap-4">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-white/40 animate-ripple" />
            <Person who="paati" size={76} className="relative ring-[3px] ring-white/70" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white/80">{p.nickname} · {p.name.split(" ")[0]}, {p.age}</div>
            <div className="mt-0.5 font-display text-[22px] font-extrabold leading-[1.1]">{condition}</div>
            {symptom && <div className="mt-1 truncate font-tamil text-[13px] text-white/85">{symptom}</div>}
          </div>
        </div>

        {/* the countdown */}
        <AnimatePresence mode="wait">
          <motion.div key={e.status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="relative mt-5">
            {enRoute ? (
              <div className="flex items-end gap-3">
                <div className="font-display text-[104px] font-extrabold leading-[0.8] tracking-tight tnum">{e.etaLeftMin}</div>
                <div className="pb-1.5 leading-tight">
                  <div className="text-[22px] font-extrabold">min</div>
                  <div className="text-[13px] text-white/85">{e.progress < pickupShare ? `Ambulance on the way to ${pr.obj}` : `${p.nickname} in the ambulance`}</div>
                  <div className="text-[13px] font-bold">to {chosen?.short ?? "the hospital"}</div>
                </div>
              </div>
            ) : e.status === "triage" ? (
              <div>
                <div className="font-display text-[30px] font-extrabold leading-tight">Finding the right hospital<Dots /></div>
                <div className="mt-1 text-[13px] text-white/85">Saathi is matching {pr.obj} to a hospital that can treat {pr.obj}, not just the nearest.</div>
              </div>
            ) : (
              <div>
                <div className="font-display text-[34px] font-extrabold leading-tight">{e.status === "arrived" ? `Reached ${chosen?.short ?? "the hospital"}` : "With the doctors"}</div>
                <div className="mt-1 text-[13px] text-white/85">{e.status === "arrived" ? `The ambulance is at ${chosen?.name ?? "the hospital"}.` : `Treatment has started at ${chosen?.name ?? "the hospital"}.`}{careAt != null && ` Care at ${Math.round(careAt)} min of the golden hour.`}</div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* trip progress */}
        {e.status !== "triage" && (
          <div className="relative mt-5 pb-1">
            <div className="relative h-2 rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${Math.round(e.progress * 100)}%` }} />
              <span className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sos-600" style={{ left: `${pickupShare * 100}%` }} title="Pickup" />
              <img src="/art/ambulance.webp" alt="" className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-[62%] object-contain drop-shadow transition-[left] duration-1000 ease-linear" style={{ left: `${Math.min(96, Math.max(4, e.progress * 100))}%` }} />
            </div>
            <div className="relative mt-2 h-4 text-[11.5px] font-semibold text-white/80">
              <span className="absolute left-0">108 base</span>
              {pickupShare > 0.2 && pickupShare < 0.72 && <span className="absolute -translate-x-1/2" style={{ left: `${pickupShare * 100}%` }}>Home</span>}
              <span className="absolute right-0">{chosen?.short ?? "Hospital"}</span>
            </div>
          </div>
        )}

        {/* actions */}
        <div className="relative mt-5 flex gap-2">
          <Pill variant="white" size="lg" icon={meResponding ? Check : Navigation} className="flex-1 !text-sos-600" disabled={meResponding || busy === "respond"} onClick={respond}>
            {meResponding ? "You're going" : "I'm going"}
          </Pill>
          <Pill variant="glass" size="lg" icon={Phone} onClick={() => setSheet("call")}>Call</Pill>
        </div>
      </VioletHeader>

      <Sheet>
        {/* CPR coach */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={onCpr} className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 pr-4 text-left shadow-card">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-rose"><Art name="cpr" size={56} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[16px] font-extrabold text-sos-600">Start CPR coach</div>
            <div className="mt-0.5 text-[12.5px] text-ink-2">If someone is with {pr.obj} and {pr.sub} isn't breathing. A beat to push to, step by step.</div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
        </motion.button>

        {/* Map */}
        <div className="isolate mt-4 overflow-hidden rounded-3xl bg-white shadow-card">
          <div className="relative">
            <MapView home={{ lat: p.lat, lng: p.lng, name: `${p.nickname}'s home` }} hospitals={hospitals} chosenId={route?.hospitalId} nearestId={route?.nearestId}
              ambulance={e.ambulance} path={route?.path} nearestPath={route?.nearestPath} height={300} />
            {route && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-[1001] flex gap-1.5">
                <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold shadow-card tnum">{route.ranking.find((r) => r.hospitalId === route.hospitalId)?.km ?? "–"} km · {route.etaMin} min trip</span>
                {route.roads === false && <span className="rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-ink-2 shadow-card">Estimated roads</span>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-3 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1.5"><Person who="paati" size={18} />Home</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-[5px] w-5 rounded-full bg-violet ring-2 ring-violet-100" />To {chosen?.short ?? "hospital"}</span>
            {nearest && chosen && nearest.id !== chosen.id && <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t-[3px] border-dotted border-peach-ink" />Nearest, can't treat</span>}
            <span className="inline-flex items-center gap-1.5"><img src="/art/ambulance.webp" alt="" className="h-5 w-5 object-contain" />Ambulance</span>
          </div>
        </div>

        {/* Golden hour */}
        <Section title="Golden hour" action={careAt != null ? <span className="rounded-full bg-mint px-2.5 py-1 text-[12px] font-bold text-mint-ink tnum">Care at {Math.round(careAt)} min</span> : undefined}>
          <div className="rounded-3xl bg-white p-4 shadow-card">
            <GoldenBar elapsed={elapsedSim} careAt={careAt} nearestAt={nearestAt} nearestName={nearest?.short} />
            <GoldenSteps e={e} chosen={chosen} nearest={nearest} triageSim={triageSim} careAt={careAt} pickupShare={pickupShare} speed={speed} />
          </div>
        </Section>

        {/* Why this hospital */}
        {route && (
          <Section title="Why this hospital">
            <div className="rounded-3xl bg-white p-4 shadow-card">
              <div className="flex items-start gap-3">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-lilac"><Art name="hospital" size={54} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-extrabold leading-tight">{chosen?.name ?? "Matching…"}</div>
                  <div className="mt-0.5 text-[12.5px] text-ink-2">{p.nickname} needs {route.needLabel}. Saathi ranks by time to treatment, not distance.</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {route.needs.map((n) => <span key={n} className="rounded-full bg-violet-50 px-2.5 py-1 text-[12px] font-bold text-violet-700">Needs {NEED_LABEL[n] ?? n}</span>)}
                {route.savedMin > 0 && nearest && <span className="rounded-full bg-mint px-2.5 py-1 text-[12px] font-bold text-mint-ink">Saves {route.savedMin} min vs {nearest.short}</span>}
              </div>
              <ol className="mt-4 flex flex-col gap-2">
                {route.ranking.map((r, i) => {
                  const h = hospitals.find((x) => x.id === r.hospitalId);
                  const isChosen = r.hospitalId === route.hospitalId;
                  return (
                    <li key={r.hospitalId} className={cx("flex items-center gap-3 rounded-2xl px-3 py-2.5", isChosen ? "bg-violet text-white" : "bg-canvas")}>
                      <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[13px] font-extrabold", isChosen ? "bg-white text-violet-700" : "bg-white text-ink-2")}>{i + 1}</span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="truncate text-[14px] font-bold">{h?.short ?? r.hospitalId}{r.hospitalId === route.nearestId && <span className={cx("ml-1.5 text-[11.5px] font-semibold", isChosen ? "text-white/75" : "text-ink-3")}>nearest</span>}</div>
                        <div className={cx("text-[12px] leading-snug", isChosen ? "text-white/80" : r.missing.length ? "text-peach-ink" : "text-ink-2")}>
                          {r.km} km · {r.etaMin} min drive{r.missing.length ? ` · no ${r.missing.map((m) => NEED_LABEL[m] ?? m).join(", ")} (+${TRANSFER_PENALTY_MIN} min)` : " · can treat"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right leading-none">
                        <div className="font-display text-[20px] font-extrabold tnum">{r.score}</div>
                        <div className={cx("text-[10.5px] font-semibold", isChosen ? "text-white/75" : "text-ink-3")}>min to care</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </Section>
        )}

        {/* Who's going */}
        <Section title="Family on the way">
          <div className="rounded-3xl bg-white p-4 shadow-card">
            {e.responders.length === 0 ? (
              <p className="text-[13.5px] text-ink-2">Nobody has said they're going yet. Tap "I'm going" so everyone knows, and the ER expects you.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {e.responders.map((r) => (
                  <li key={r.name + r.at} className="flex items-center gap-3">
                    <Avatar name={r.name} size={44} />
                    <div className="min-w-0 flex-1 leading-tight"><div className="text-[14.5px] font-bold">{r.name}{r.name === user?.name && <span className="font-medium text-ink-3"> (you)</span>}</div><div className="text-[12.5px] text-ink-2">{r.relation ?? "Family"} · going to {chosen?.short ?? "the hospital"}</div></div>
                    <span className="text-[12px] text-ink-3 tnum">{fmtTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            {!meResponding && <Button variant="sos" className="mt-3 w-full" loading={busy === "respond"} icon={<Navigation className="h-4 w-4" />} onClick={respond}>I'm going</Button>}
          </div>
        </Section>

        {/* ER brief */}
        {e.brief && (
          <Section title="Sent to the ER before arrival">
            <div className="relative overflow-hidden rounded-3xl bg-sky p-4">
              <Art name="stethoscope" size={64} className="absolute -right-1 -top-1" />
              <div className="flex items-center gap-1.5 text-[12px] font-bold text-sky-ink"><Sparkles className="h-3.5 w-3.5" />Written by Saathi from {pr.pos} records</div>
              <p className="mt-2 pr-12 text-[14px] leading-relaxed text-ink">{e.brief}</p>
              <p className="mt-2 text-[12px] text-sky-ink">{chosen ? `${chosen.short} has ${pr.pos} records. Every access is logged.` : "Pre-arrival brief"}</p>
            </div>
          </Section>
        )}

        {/* Live updates */}
        <Section title="Live updates">
          <FeedList items={data.feed.filter((f) => (f.kind === "sos" || f.kind === "emergency") && new Date(f.at).getTime() >= new Date(e.startedAt).getTime() - 1500)} />
        </Section>

        {canCancel && (
          <button onClick={() => setSheet("cancel")} className="mx-auto mt-6 flex h-11 items-center gap-1.5 rounded-full px-5 text-[13.5px] font-semibold text-ink-2">
            <X className="h-4 w-4" />False alarm? Cancel the SOS
          </button>
        )}
      </Sheet>

      <BottomSheet open={sheet === "call"} onClose={() => setSheet(null)} title="Call">
        <div className="flex flex-col gap-2">
          {elder?.phone && <CallRow href={elder.phone} title={`${p.nickname}`} sub={elder.phone} icon={<Person who="paati" size={44} />} />}
          {chosen && <CallRow href={chosen.phone} title={`${chosen.short} emergency`} sub={chosen.phone} icon={<span className="grid h-11 w-11 place-items-center rounded-full bg-lilac"><Art name="hospital" size={34} /></span>} />}
          <CallRow href="108" title="108 ambulance" sub="Government emergency line" icon={<span className="grid h-11 w-11 place-items-center rounded-full bg-rose"><Art name="ambulance" size={34} /></span>} />
          {data.members.filter((m) => m.role !== "elder" && m.phone && m.name !== user?.name).map((m) => (
            <CallRow key={m.id} href={m.phone!} title={m.name} sub={`${m.relation ?? "Family"} · ${m.phone}`} icon={<Avatar name={m.name} size={44} />} />
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "cancel"} onClose={() => setSheet(null)} title="Cancel the SOS?">
        <div className="flex flex-col items-center gap-3 text-center">
          <Person who="paati" size={88} />
          <p className="text-[15px]">Only if you've spoken to {p.nickname} and {pr.sub}'s fine. The ambulance is stood down and everyone is told it was a false alarm.</p>
          <Button variant="primary" size="lg" className="w-full" loading={busy === "cancel"} onClick={cancel}>Yes, {pr.sub}'s OK. Cancel it</Button>
          <Button variant="ghost" size="lg" className="w-full" onClick={() => setSheet(null)}>Keep the emergency going</Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function Dots() {
  return <span className="inline-flex w-8">{[0, 1, 2].map((i) => <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}>.</motion.span>)}</span>;
}

function CallRow({ href, title, sub, icon }: { href: string; title: string; sub: string; icon: React.ReactNode }) {
  return (
    <a href={`tel:${href.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5 pr-3">
      {icon}
      <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[15px] font-bold">{title}</div><div className="truncate text-[12.5px] text-ink-2 tnum">{sub}</div></div>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet text-white"><Phone className="h-[18px] w-[18px]" /></span>
    </a>
  );
}

/* ---------------------------------------------------------------- Golden hour bar */

function GoldenBar({ elapsed, careAt, nearestAt, nearestName }: { elapsed: number; careAt: number | null; nearestAt: number | null; nearestName?: string }) {
  const pct = (m: number) => `${Math.min(100, Math.max(0, (m / GOLDEN) * 100))}%`;
  const done = careAt != null && elapsed >= careAt;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="leading-none"><span className="font-display text-[28px] font-extrabold tnum">{Math.min(GOLDEN, Math.floor(done && careAt != null ? careAt : elapsed))}</span><span className="ml-1 text-[13px] font-semibold text-ink-2">of {GOLDEN} min</span></div>
        <span className="text-[12px] text-ink-3">since the SOS</span>
      </div>
      <div className="relative mt-3 h-3 rounded-full bg-canvas-2">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#FFC48A,#FF8A95)] transition-[width] duration-1000" style={{ width: pct(done && careAt != null ? careAt : elapsed) }} />
        {careAt != null && <span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-teal shadow-card" style={{ left: pct(careAt) }} />}
        {nearestAt != null && <span className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-dashed border-peach-ink bg-white" style={{ left: pct(nearestAt) }} />}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
        {careAt != null ? <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-teal" />Treatment at {Math.round(careAt)} min</span> : <span>Working out where to go…</span>}
        {nearestAt != null && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-peach-ink" />Via {nearestName ?? "nearest"}: {nearestAt > GOLDEN ? `${Math.round(nearestAt)} min, past the hour` : `${Math.round(nearestAt)} min`}</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Golden hour steps */

type Step = { key: string; art: ArtName; title: string; detail: string; state: "done" | "active" | "todo"; at?: number | null; clock?: string | null; progress?: number };

function GoldenSteps({ e, chosen, nearest, triageSim, careAt, pickupShare, speed }: {
  e: Emergency; chosen?: Hospital; nearest?: Hospital; triageSim: number | null; careAt: number | null; pickupShare: number; speed: number;
}) {
  const { data } = useFamily();
  const p = data.patient;
  const pr = pronoun(p.sex);
  const route = e.route;
  const family = data.members.filter((m) => m.role !== "elder" && !/neighbou?r/i.test(m.relation ?? "")).map((m) => m.name.split(" ")[0]);
  const neighbour = data.members.find((m) => /neighbou?r/i.test(m.relation ?? ""));
  const source = /^app$/i.test(e.source) ? `Help button on ${pr.pos} phone` : `${e.source[0].toUpperCase()}${e.source.slice(1)}`;
  const feedAt = (re: RegExp) => data.feed.find((f) => re.test(f.title) && new Date(f.at).getTime() >= new Date(e.startedAt).getTime() - 1500)?.at ?? null;
  const pickedUp = e.status !== "dispatched" || e.progress >= pickupShare;
  const after = ["arrived", "admitted"].includes(e.status);
  const readyAt = feedAt(/team is ready/i);

  const steps: Step[] = useMemo(() => [
    { key: "sos", art: "siren", title: "SOS raised", state: "done", at: 0, clock: e.startedAt,
      detail: `${source}${e.symptomText ? `: “${e.symptomText}”` : ""}` },
    { key: "family", art: "home", title: "Family alerted", state: "done", at: 0, clock: feedAt(/needs help/i) ?? e.startedAt,
      detail: `${family.length ? family.join(", ") : "The family"} and ${neighbour ? `${neighbour.name.split(" ")[0]}, the neighbour,` : "the neighbour"} were told at once. 108 called.` },
    { key: "triage", art: "brain", title: e.triage ? `Triage: ${CONDITION_INFO[e.triage.condition]?.label ?? e.triage.label}` : "Triage", state: e.triage ? "done" : "active", at: triageSim, clock: e.dispatchedAt,
      detail: e.triage ? `${Math.round(e.triage.confidence * 100)}% sure · ${e.triage.source}` : `Listening to ${pr.obj} and reading ${pr.pos} history` },
    { key: "dispatch", art: "ambulance", title: chosen ? `Ambulance sent to ${chosen.short}` : "Ambulance dispatched", state: e.dispatchedAt ? "done" : "todo", at: triageSim, clock: e.dispatchedAt,
      detail: route ? `Has ${route.needLabel}.${route.savedMin > 0 && nearest ? ` ${route.savedMin} min faster to treatment than ${nearest.short}, the nearest.` : " Also the nearest."}` : "The hospital that can treat her, not just the closest" },
    { key: "pickup", art: "home", title: pickedUp && e.dispatchedAt ? `${p.nickname} picked up` : "Ambulance reaching home", state: !e.dispatchedAt ? "todo" : pickedUp ? "done" : "active",
      at: triageSim != null && route ? triageSim + pickupShare * route.etaMin : null, progress: e.dispatchedAt && !pickedUp ? e.progress / pickupShare : undefined,
      detail: pickedUp && e.dispatchedAt ? "On the way to hospital, with the paramedics" : `To ${p.address.split(",").slice(0, 2).join(",")}` },
    { key: "ready", art: "stethoscope", title: e.teamReady ? `${chosen?.short ?? "ER"} team ready` : "ER team getting ready", state: e.teamReady ? "done" : e.dispatchedAt && !after ? "active" : "todo", clock: readyAt,
      at: readyAt ? Math.max(0, ((new Date(readyAt).getTime() - new Date(e.startedAt).getTime()) / 60000) * speed) : null,
      detail: e.teamReady ? `They have ${pr.pos} records and are waiting at the door` : e.brief ? `${pr.pos[0].toUpperCase()}${pr.pos.slice(1)} records and brief were sent ahead` : "Records go ahead of the ambulance" },
    { key: "arrive", art: "hospital", title: after ? `Reached ${chosen?.short ?? "hospital"}` : `Arrive at ${chosen?.short ?? "hospital"}`, state: after ? "done" : pickedUp && e.dispatchedAt ? "active" : "todo",
      at: careAt, clock: e.arrivedAt, progress: pickedUp && !after && e.dispatchedAt ? (e.progress - pickupShare) / (1 - pickupShare) : undefined,
      detail: after ? "Inside the golden hour" : e.etaLeftMin != null && e.dispatchedAt ? `About ${e.etaLeftMin} min to go` : "" },
    { key: "admit", art: "bed", title: "With the doctors", state: e.status === "admitted" ? "done" : e.status === "arrived" ? "active" : "todo", clock: e.status === "admitted" ? feedAt(/with the doctors/i) : null,
      detail: e.status === "admitted" ? "Treatment has started" : "Handover from the ambulance team" },
  ], [e, chosen, nearest, triageSim, careAt, pickupShare, speed, data.feed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ol className="mt-5">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className={cx("absolute left-[21px] top-11 bottom-0 w-[2px]", s.state === "done" ? "bg-teal/40" : "bg-line-2")} />}
          <span className={cx("relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl", s.state === "done" ? "bg-mint" : s.state === "active" ? "bg-rose" : "bg-canvas")}>
            {s.state === "active" && <span className="absolute inset-0 rounded-2xl bg-sos/25 animate-ripple" />}
            <Art name={s.art} size={34} className={cx("relative", s.state === "todo" && "opacity-40 grayscale")} />
            {s.state === "done" && <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-teal text-white ring-2 ring-white"><Check className="h-3 w-3" strokeWidth={3.5} /></span>}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className={cx("text-[14.5px] font-bold leading-snug", s.state === "todo" && "text-ink-3", s.state === "active" && "text-sos-600")}>{s.title}</div>
              {s.at != null && s.state !== "todo" && (
                <div className="shrink-0 text-right leading-none">
                  <div className={cx("font-display text-[13px] font-extrabold tnum", s.state === "done" ? "text-ink" : "text-ink-3")}>{s.state === "done" ? "" : "~"}{Math.round(s.at)} min</div>
                  {s.clock && s.state === "done" && <div className="mt-0.5 text-[10.5px] text-ink-3 tnum">{fmtTime(s.clock)}</div>}
                </div>
              )}
            </div>
            {s.detail && <div className={cx("mt-0.5 text-[12.5px] leading-snug", s.state === "todo" ? "text-ink-3" : "text-ink-2")}>{s.detail}</div>}
            {s.progress != null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-2">
                <div className="h-full rounded-full bg-sos transition-[width] duration-1000 ease-linear" style={{ width: `${Math.round(Math.min(1, Math.max(0.03, s.progress)) * 100)}%` }} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- Feed */

function FeedList({ items }: { items: FeedItem[] }) {
  if (!items.length) return <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">Updates will appear here as they happen.</p>;
  return (
    <ol className="rounded-3xl bg-white px-4 shadow-card">
      {items.map((f) => (
        <li key={f.id} className="flex gap-3 border-b border-line py-3.5 last:border-b-0 animate-slidein">
          <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", FEED_TONE[f.level].dot)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[14px] font-bold leading-snug">{f.title}</p>
              <time className="shrink-0 text-[11.5px] text-ink-3 tnum">{fmtTime(f.at)}</time>
            </div>
            <p className="text-[13px] leading-snug text-ink-2">{f.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ================================================================= Calm */

const HOW: { art: ArtName; tone: string; title: string; text: (n: string, pr: ReturnType<typeof pronoun>) => string }[] = [
  { art: "siren", tone: "bg-rose", title: "Help in one press", text: (n, pr) => `${n} holds the big button, gives a missed call or tells Saathi ${pr.sub}'s unwell.` },
  { art: "brain", tone: "bg-lilac", title: "Saathi works out what's wrong", text: (_n, pr) => `From what ${pr.sub} says and ${pr.pos} records: heart, stroke, a fall, breathing.` },
  { art: "hospital", tone: "bg-sky", title: "The right hospital, not the nearest", text: () => "Ranked by time to treatment: cath lab, CT, free ICU beds, anti-venom." },
  { art: "ambulance", tone: "bg-peach", title: "You watch it live, here", text: () => "The ambulance on the map, a countdown, and the golden hour ticking." },
  { art: "stethoscope", tone: "bg-mint", title: "The ER is ready before arrival", text: (_n, pr) => `They get ${pr.pos} allergies, medicines and history first.` },
];

function Calm({ onCpr }: { onCpr: () => void }) {
  const { data } = useFamily();
  const p = data.patient;
  const pr = pronoun(p.sex);
  const elder = data.members.find((m) => m.role === "elder");
  const past = data.feed.filter((f) => f.kind === "sos" || f.kind === "emergency");
  return (
    <div>
      <TopBar title="Emergency" sub="Nothing happening right now" />
      <div className="px-4 pb-32">
        <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card">
          <Person who="paati" size={68} online={elder?.online} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-mint-ink">All calm</div>
            <div className="font-display text-[19px] font-extrabold leading-tight">No emergency for {p.nickname}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{past[0] ? `Last: ${past[0].title}, ${timeAgo(past[0].at)}` : `If ${pr.sub} needs help, this page opens by itself.`}</div>
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.98 }} onClick={onCpr} className="relative mt-3 flex min-h-[176px] w-full flex-col overflow-hidden rounded-3xl bg-rose p-5 text-left">
          <div className="relative z-[1] max-w-[62%]">
            <div className="text-[12px] font-extrabold tracking-[0.12em] text-rose-ink">CPR COACH</div>
            <div className="mt-1 font-display text-[21px] font-extrabold leading-tight">Hands-only CPR, step by step</div>
            <div className="mt-1 text-[12.5px] leading-snug text-rose-ink">A beat at 110 a minute to push to. Practise once so you're ready.</div>
          </div>
          <span className="relative z-[1] mt-auto inline-flex h-11 w-max items-center gap-2 rounded-full bg-ink px-5 pt-0 text-[14px] font-bold text-white">Start CPR coach<ChevronRight className="h-4 w-4" /></span>
          <Art name="cpr" size={132} className="absolute -bottom-2 -right-3" float />
        </motion.button>

        <Section title="What happens in an emergency">
          <ol className="rounded-3xl bg-white p-4 shadow-card">
            {HOW.map((h, i) => (
              <li key={h.title} className="relative flex gap-3 pb-4 last:pb-0">
                {i < HOW.length - 1 && <span className="absolute bottom-0 left-[27px] top-14 w-[2px] bg-line" />}
                <span className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", h.tone)}><Art name={h.art} size={44} /></span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="text-[14.5px] font-bold leading-snug"><span className="mr-1 text-ink-3 tnum">{i + 1}.</span>{h.title}</div>
                  <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{h.text(p.nickname, pr)}</div>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile tone="sky" art="qr" artSize={62} title="Emergency card" sub="For paramedics" to="/family/family?card=1" />
          <Tile tone="butter" art="folder" artSize={62} title="Records ready" sub="Sent to the ER" to="/family/vault" />
        </div>

        {past.length > 0 && (
          <Section title="Earlier emergency updates">
            <FeedList items={past.slice(0, 8)} />
          </Section>
        )}
      </div>
    </div>
  );
}
