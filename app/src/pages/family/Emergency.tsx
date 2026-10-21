// Live emergency view: map with ambulance, ETA, routing reasons, ER brief, responders, timeline.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Siren, Phone, Navigation, Check, Hospital as HospitalIcon, Users, FileText, ShieldCheck, Clock, Ambulance, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtTime, timeAgo } from "../../lib/format";
import MapView from "../../components/MapView";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, SectionTitle, cx, useToast } from "../../components/ui";
import { CONDITION_INFO, NEED_LABEL, type Emergency, type Hospital } from "../../../shared/types";
import { FEED_TONE, useFamily } from "./ctx";
import { TRANSFER_PENALTY_MIN } from "./constants";

const STEPS = ["Alert sent", "Hospital matched", "Ambulance on the way", "Arrived", "With doctors"];
function stepIndex(e: Emergency) {
  if (e.status === "triage") return 1;
  if (e.status === "dispatched") return 2;
  if (e.status === "arrived") return 3;
  return 5; // admitted / resolved
}

export default function EmergencyPage() {
  const { data } = useFamily();
  const { user } = useAuth();
  const toast = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get<Hospital[]>("/api/hospitals").then(setHospitals).catch(() => {}); }, [data.emergency?.route?.hospitalId]);

  const e = data.emergency;
  const p = data.patient;
  const emFeed = useMemo(() => data.feed.filter((f) => f.kind === "sos" || f.kind === "emergency"), [data.feed]);

  if (!e) {
    const last = emFeed[0];
    return (
      <div className="flex flex-col gap-6">
        <Link to="/family" className="inline-flex items-center gap-1 text-sm font-semibold text-ink-2"><ArrowLeft className="h-4 w-4" />Home</Link>
        <Card className="p-6">
          <EmptyState icon={<ShieldCheck className="h-6 w-6 text-teal" />} title={`No active emergency. ${p.nickname} is safe.`}>
            {last ? <>Last emergency update: <b>{last.title}</b> ({timeAgo(last.at)}).</> : `When ${p.nickname} presses SOS, gives a missed call or tells Saathi she's unwell, this page shows the ambulance live.`}
          </EmptyState>
        </Card>
        {emFeed.length > 0 && <Timeline items={emFeed.slice(0, 12)} />}
      </div>
    );
  }

  const route = e.route;
  const chosen = hospitals.find((h) => h.id === route?.hospitalId);
  const nearest = hospitals.find((h) => h.id === route?.nearestId);
  const step = stepIndex(e);
  const meResponding = e.responders.some((r) => r.name === user?.name);
  const triageLabel = e.triage ? CONDITION_INFO[e.triage.condition]?.label ?? e.triage.label : "Working out what happened…";

  async function respond() {
    setBusy(true);
    try { await api.post(`/api/sos/${e!.id}/respond`); toast("The family and hospital know you're coming", "ok"); }
    catch (err) { toast((err as Error).message, "sos"); } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <Card className="overflow-hidden border-sos">
        <div className="flex flex-col gap-4 bg-sos p-5 text-white sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15 animate-pulsering"><Siren className="h-7 w-7" /></span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-white/80">SOS · {e.source} · {fmtTime(e.startedAt)} ({timeAgo(e.startedAt)})</div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{p.nickname}: {triageLabel}</h1>
              {e.symptomText && <p className="text-sm text-white/90">“{e.symptomText}”{e.triage?.english && e.triage.english !== e.symptomText ? ` (${e.triage.english})` : ""}</p>}
            </div>
          </div>
          <div className="flex items-center gap-6 sm:ml-auto">
            {e.status === "dispatched" && e.etaLeftMin != null ? (
              <div className="text-right"><div className="font-display text-5xl font-bold leading-none tnum">{e.etaLeftMin}</div><div className="text-xs text-white/80">min to hospital</div></div>
            ) : (
              <Badge tone="dark" className="!bg-white !text-sos">{e.status === "triage" ? "Matching hospital" : e.status === "arrived" ? "Arrived" : "With doctors"}</Badge>
            )}
          </div>
        </div>
        <div className="h-2 bg-sos-50"><div className="h-full bg-sos transition-all duration-1000" style={{ width: `${Math.round((e.status === "triage" ? 0.03 : e.progress) * 100)}%` }} /></div>
        {/* Stepper */}
        <ol className="grid grid-cols-5 gap-1 px-3 py-4 sm:px-5">
          {STEPS.map((s, i) => {
            const done = i < step, now = i === step;
            return (
              <li key={s} className="flex flex-col items-center gap-1.5 text-center">
                <span className={cx("grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold", done ? "border-teal bg-teal text-white" : now ? "border-sos bg-sos text-white animate-pulsering" : "border-line bg-white text-ink-3")}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cx("text-[11px] font-semibold leading-tight sm:text-xs", done ? "text-ink" : now ? "text-sos" : "text-ink-3")}>{s}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="overflow-hidden p-2">
            <MapView home={{ lat: p.lat, lng: p.lng, name: `${p.nickname}'s home` }} hospitals={hospitals} chosenId={route?.hospitalId} nearestId={route?.nearestId} ambulance={e.ambulance} height={360} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand" />Home</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal" />Chosen hospital</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-warn" />Nearest (can't treat)</span>
              <span className="inline-flex items-center gap-1.5"><Ambulance className="h-3.5 w-3.5 text-sos" />Ambulance</span>
            </div>
          </Card>

          {route && (
            <Card>
              <CardHeader icon={<Navigation className="h-5 w-5" />} title="Why this hospital?" subtitle={`${p.nickname} needs ${route.needLabel}. Saathi ranks by time to treatment, not distance.`}
                action={route.savedMin > 0 ? <div className="shrink-0 whitespace-nowrap text-right"><div className="font-display text-2xl font-bold text-teal tnum">~{route.savedMin} min</div><div className="text-[11px] text-ink-3">saved</div></div> : undefined} />
              <ol className="flex flex-col gap-2 px-5 pb-5">
                {route.ranking.map((r, i) => {
                  const h = hospitals.find((x) => x.id === r.hospitalId);
                  const chosenRow = r.hospitalId === route.hospitalId;
                  return (
                    <li key={r.hospitalId} className={cx("flex items-center gap-3 rounded-xl border px-3 py-2.5", chosenRow ? "border-teal bg-teal-50" : "border-line")}>
                      <span className="w-5 text-center font-mono text-xs text-ink-3">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2"><span className="font-semibold">{h?.short ?? r.hospitalId}</span><span className="text-xs text-ink-3 tnum">{r.km} km · {r.etaMin} min drive</span>
                          {r.hospitalId === route.nearestId && <Badge tone="warn">Nearest</Badge>}</div>
                        <div className={cx("text-xs", r.missing.length ? "text-warn" : "text-teal")}>
                          {r.missing.length ? `No ${r.missing.map((m) => NEED_LABEL[m] ?? m).join(", ")} → transfer (+${TRANSFER_PENALTY_MIN} min)` : chosenRow ? "Has everything she needs · chosen" : "Can treat her"}
                        </div>
                      </div>
                      <div className="text-right font-mono text-sm tnum">{r.score}<span className="text-[10px] text-ink-3"> min</span></div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

          {e.brief && (
            <Card>
              <CardHeader icon={<FileText className="h-5 w-5" />} title="Sent to the ER before arrival" subtitle={chosen ? `${chosen.name} has ${p.nickname}'s records (access logged)` : "Pre-arrival brief"} />
              <p className="mx-5 mb-5 rounded-xl bg-info-50 p-4 text-[15px] leading-relaxed text-ink">{e.brief}</p>
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card className="p-5">
            <div className="flex flex-col gap-3">
              <Button variant="sos" size="xl" className="w-full" loading={busy} disabled={meResponding} icon={meResponding ? <Check className="h-5 w-5" /> : <Navigation className="h-5 w-5" />} onClick={respond}>
                {meResponding ? "You're on your way" : "I'm on my way"}
              </Button>
              {chosen ? (
                <a href={`tel:${chosen.phone.replace(/\s/g, "")}`}>
                  <span className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 transition hover:border-ink-3">
                    <Phone className="h-5 w-5 shrink-0 text-teal" />
                    <span className="min-w-0 flex-1"><span className="block font-semibold">Call {chosen.short} ER</span><span className="block font-mono text-sm text-ink-2 tnum">{chosen.phone}</span></span>
                  </span>
                </a>
              ) : <Button variant="outline" size="lg" disabled>Hospital not chosen yet</Button>}
              {e.teamReady && <div className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm font-semibold text-teal"><HospitalIcon className="h-4 w-4" />ER team is ready and waiting</div>}
              {chosen && nearest && chosen.id !== nearest.id && <p className="text-xs text-ink-2">Going to {chosen.short} ({chosen.kind.toLowerCase()}), not {nearest.short}.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader icon={<Users className="h-5 w-5" />} title="Family responding" subtitle={e.responders.length ? `${e.responders.length} on the way` : "Nobody has confirmed yet"} />
            <ul className="flex flex-col gap-2 px-5 pb-5">
              {e.responders.length === 0 && <li className="text-sm text-ink-2">Tap "I'm on my way" so everyone knows who's going.</li>}
              {e.responders.map((r) => (
                <li key={r.name + r.at} className="flex items-center gap-3">
                  <Avatar name={r.name} size={34} />
                  <div className="min-w-0 flex-1"><div className="font-semibold">{r.name}</div><div className="text-xs text-ink-2">{r.relation ?? "Family"}</div></div>
                  <span className="text-xs text-ink-3"><Clock className="mr-1 inline h-3 w-3" />{fmtTime(r.at)}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Timeline items={emFeed.filter((f) => new Date(f.at).getTime() >= new Date(e.startedAt).getTime() - 5000).reverse()} live />
        </div>
      </div>
    </div>
  );
}

function Timeline({ items, live }: { items: { id: string; title: string; body: string; at: string; level: "ok" | "info" | "warn" | "sos" }[]; live?: boolean }) {
  return (
    <div>
      <SectionTitle>{live ? "What's happened so far" : "Recent emergency updates"}</SectionTitle>
      <Card className="p-5">
        {items.length === 0 ? <p className="text-sm text-ink-2">Updates will appear here.</p> : (
          <ol className="relative flex flex-col gap-4 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-0.5 before:bg-line">
            {items.map((f) => (
              <li key={f.id} className="relative flex gap-3 pl-0 animate-slidein">
                <span className={cx("relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-white", FEED_TONE[f.level].dot)} />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2"><span className="text-sm font-semibold">{f.title}</span><time className="text-[11px] text-ink-3 tnum">{fmtTime(f.at)}</time></div>
                  <p className="text-[13px] text-ink-2">{f.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
