// Live emergency view: ETA and hospital first, then map, why this hospital, ER brief, responders, timeline.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Navigation, Check, ArrowLeft } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtTime, timeAgo } from "../../lib/format";
import MapView from "../../components/MapView";
import { Button, SectionTitle, cx, useToast } from "../../components/ui";
import { CONDITION_INFO, NEED_LABEL, type Emergency, type FeedItem, type Hospital } from "../../../shared/types";
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
      <div className="flex flex-col gap-8">
        <Link to="/family" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink"><ArrowLeft className="h-4 w-4" />Today</Link>
        <header>
          <h1 className="text-[34px] font-semibold leading-tight sm:text-[44px]" style={{ fontStretch: "85%" }}>No emergency right now.</h1>
          <p className="mt-2 max-w-xl text-[17px] text-ink-2">
            {last ? <>Last update: {last.title} ({timeAgo(last.at)}).</> : `When ${p.nickname} holds the help button, gives a missed call or tells Saathi ${p.sex === "M" ? "he" : "she"}'s unwell, this page shows the ambulance live.`}
          </p>
        </header>
        {emFeed.length > 0 && <Timeline title="Earlier emergency updates" items={emFeed.slice(0, 12)} />}
      </div>
    );
  }

  const route = e.route;
  const chosen = hospitals.find((h) => h.id === route?.hospitalId);
  const nearest = hospitals.find((h) => h.id === route?.nearestId);
  const step = stepIndex(e);
  const meResponding = e.responders.some((r) => r.name === user?.name);
  const triageLabel = e.triage ? CONDITION_INFO[e.triage.condition]?.label ?? e.triage.label : "Working out what happened";
  const enRoute = e.status === "dispatched" && e.etaLeftMin != null;

  async function respond() {
    setBusy(true);
    try { await api.post(`/api/sos/${e!.id}/respond`); toast("The family and the hospital know you're coming", "ok"); }
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }

  const headline = e.status === "triage" ? "Finding the right hospital" : e.status === "dispatched" ? `Ambulance to ${chosen?.short ?? "hospital"}` : e.status === "arrived" ? `At ${chosen?.short ?? "the hospital"}` : `With the doctors at ${chosen?.short ?? "the hospital"}`;

  return (
    <div className="flex flex-col gap-10">
      {/* Lead: what's happening, how long */}
      <header className="border-b border-line pb-6">
        <p className="text-[13px] font-semibold tracking-[0.08em] text-sos">EMERGENCY</p>
        <p className="mt-1 text-[15px] text-ink-2">
          {p.nickname} · {triageLabel} · help button ({e.source}) at {fmtTime(e.startedAt)}
          {e.symptomText && <> · “{e.symptomText}”{e.triage?.english && e.triage.english !== e.symptomText ? ` (${e.triage.english})` : ""}</>}
        </p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[36px] font-semibold leading-[1.02] sm:text-[52px]" style={{ fontStretch: "80%" }}>{headline}</h1>
            {chosen && <p className="mt-1 text-[16px] text-ink-2">{chosen.name}{route ? ` · has ${route.needLabel}` : ""}</p>}
          </div>
          {enRoute && (
            <div className="shrink-0 sm:text-right">
              <div className="font-display text-[64px] font-semibold leading-[0.85] tnum sm:text-[80px]">{e.etaLeftMin}<span className="ml-1 text-[22px] font-medium text-ink-2">min</span></div>
              <div className="mt-1 text-[14px] text-ink-2">to the hospital</div>
            </div>
          )}
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-paper-2">
          <div className="h-full bg-sos transition-all duration-1000" style={{ width: `${Math.round((e.status === "triage" ? 0.03 : e.progress) * 100)}%` }} />
        </div>
        <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
          {STEPS.map((s, i) => (
            <li key={s} className={cx("flex items-center gap-1.5", i < step ? "text-ink" : i === step ? "font-semibold text-sos" : "text-ink-3")}>
              {i < step ? <Check className="h-4 w-4 text-teal" strokeWidth={2.5} /> : <span className={cx("h-1.5 w-1.5 rounded-full", i === step ? "bg-sos animate-blink" : "bg-line-2")} />}
              {s}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="sos" size="lg" className="sm:min-w-[14rem]" loading={busy} disabled={meResponding} icon={meResponding ? <Check className="h-5 w-5" /> : <Navigation className="h-5 w-5" />} onClick={respond}>
            {meResponding ? "You're on your way" : "I'm on my way"}
          </Button>
          {chosen && (
            <a href={`tel:${chosen.phone.replace(/\s/g, "")}`} className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-line-2 bg-white px-4 hover:border-ink-3">
              <Phone className="h-[18px] w-[18px] text-ink-2" strokeWidth={1.75} />
              <span className="font-semibold">Call {chosen.short} ER</span>
              <span className="font-mono text-[14px] text-ink-2 tnum">{chosen.phone}</span>
            </a>
          )}
        </div>
        {e.teamReady && <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-teal"><Check className="h-4 w-4" strokeWidth={2.5} />The ER team at {chosen?.short ?? "the hospital"} is ready and waiting.</p>}
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <MapView home={{ lat: p.lat, lng: p.lng, name: `${p.nickname}'s home` }} hospitals={hospitals} chosenId={route?.hospitalId} nearestId={route?.nearestId} ambulance={e.ambulance} path={route?.path} height={340} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] border-2 border-ink bg-brand" />Home</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-[3px] w-5 rounded bg-ink" />Route to {chosen?.short ?? "chosen hospital"}</span>
              {nearest && chosen && nearest.id !== chosen.id && <span className="inline-flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-warn" />Nearest, can't treat</span>}
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-sos" />Ambulance</span>
            </div>
          </section>

          {route && (
            <section>
              <SectionTitle>Why this hospital</SectionTitle>
              <p className="-mt-1 mb-3 text-[15px] text-ink-2">
                {p.nickname} needs {route.needLabel}. Saathi ranks hospitals by time to treatment, not distance.
                {route.savedMin > 0 && <> Going straight to {chosen?.short ?? "the chosen hospital"} saves <b className="text-ink">about {route.savedMin} minutes</b> over the nearest.</>}
              </p>
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                <table className="w-full text-[14px]">
                  <thead>
                    <tr className="border-b border-line text-left text-[13px] text-ink-2">
                      <th className="w-8 py-2.5 pl-4 font-medium">#</th>
                      <th className="py-2.5 pr-3 font-medium">Hospital</th>
                      <th className="py-2.5 pr-3 font-medium">Can treat {p.sex === "M" ? "him" : "her"}?</th>
                      <th className="py-2.5 pr-4 text-right font-medium">Minutes to care</th>
                    </tr>
                  </thead>
                  <tbody>
                    {route.ranking.map((r, i) => {
                      const h = hospitals.find((x) => x.id === r.hospitalId);
                      const isChosen = r.hospitalId === route.hospitalId;
                      return (
                        <tr key={r.hospitalId} className={cx("border-b border-line last:border-b-0", isChosen && "bg-brand-50")}>
                          <td className="py-3 pl-4 align-top font-display text-[16px] text-ink-3 tnum">{i + 1}</td>
                          <td className="py-3 pr-3 align-top">
                            <div className={cx(isChosen ? "font-semibold" : "font-medium")}>{h?.short ?? r.hospitalId}{r.hospitalId === route.nearestId && <span className="ml-1.5 text-[13px] font-normal text-ink-3">nearest</span>}</div>
                            <div className="text-[13px] text-ink-3 tnum">{r.km} km · {r.etaMin} min drive</div>
                          </td>
                          <td className="py-3 pr-3 align-top">
                            {r.missing.length
                              ? <span className="text-warn">No {r.missing.map((m) => NEED_LABEL[m] ?? m).join(", ")}<span className="block text-[13px] text-ink-3">+{TRANSFER_PENALTY_MIN} min to transfer</span></span>
                              : <span className="text-teal">Yes</span>}
                          </td>
                          <td className={cx("py-3 pr-4 text-right align-top font-display text-[18px] tnum", isChosen ? "font-semibold" : "text-ink-2")}>{r.score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {e.brief && (
            <section>
              <SectionTitle>Sent to the ER before arrival</SectionTitle>
              <blockquote className="border-l-[3px] border-ink pl-4 text-[16px] leading-relaxed text-ink">{e.brief}</blockquote>
              <p className="mt-2 text-[13px] text-ink-3">{chosen ? `${chosen.name} has ${p.nickname}'s records. Every access is logged.` : "Pre-arrival brief"}</p>
            </section>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-10">
          <section>
            <SectionTitle>Family on the way</SectionTitle>
            {e.responders.length === 0 ? <p className="text-[15px] text-ink-2">Nobody has confirmed yet. Tap "I'm on my way" so everyone knows who's going.</p> : (
              <ul className="border-t border-line">
                {e.responders.map((r) => (
                  <li key={r.name + r.at} className="flex items-baseline justify-between gap-3 border-b border-line py-3">
                    <span><span className="font-semibold">{r.name}</span> <span className="text-[14px] text-ink-2">{r.relation ?? "Family"}</span></span>
                    <span className="font-mono text-[12px] text-ink-3 tnum">{fmtTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Timeline title="What's happened so far" items={emFeed.filter((f) => new Date(f.at).getTime() >= new Date(e.startedAt).getTime() - 1500).sort((a, b) => a.at.localeCompare(b.at))} />
        </div>
      </div>
    </div>
  );
}

function Timeline({ title, items }: { title: string; items: FeedItem[] }) {
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {items.length === 0 ? <p className="text-[15px] text-ink-2">Updates will appear here.</p> : (
        <ol className="border-t border-line">
          {items.map((f) => (
            <li key={f.id} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3 animate-slidein">
              <time className="pt-0.5 font-mono text-[12px] text-ink-3 tnum">{fmtTime(f.at)}</time>
              <div className="min-w-0">
                <p className={cx("text-[15px] font-semibold leading-snug", FEED_TONE[f.level].text)}>{f.title}</p>
                <p className="text-[14px] leading-snug text-ink-2">{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
