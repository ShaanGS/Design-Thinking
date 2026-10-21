// Family home: status, today's doses, adherence, vitals, insights, visits, live feed and quick actions.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { HeartPulse, Phone, MessageCircleHeart, Plus, Camera, ChevronRight, Sparkles, CalendarClock, ShieldCheck, Siren, Clock, Droplet, Activity, FlaskConical } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtDateTime, fmtTime, timeAgo } from "../../lib/format";
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, ProgressRing, SectionTitle, Segmented, cx, useToast } from "../../components/ui";
import FacePulse from "../../components/FacePulse";
import { SLOT_LABEL, CONDITION_INFO, type Slot, type TodayDose, type Vital, type FeedItem } from "../../../shared/types";
import { FEED_TONE, useFamily, pronoun } from "./ctx";

export default function Home() {
  const { data } = useFamily();
  const { user } = useAuth();
  const toast = useToast();
  const p = data.patient;
  const pr = pronoun(p.sex);
  const [modal, setModal] = useState<"reading" | "pulse" | "call" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const elder = data.members.find((m) => m.role === "elder");

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast(ok, "ok"); } catch (e) { toast((e as Error).message, "sos"); } finally { setBusy(null); }
  };

  const taken = data.today.filter((d) => d.status === "taken").length;
  const total = data.today.length;
  const pendingCheckin = data.checkin && !data.checkin.answeredAt;
  const em = data.emergency;
  const lastActivity = data.feed[0];

  const status = em
    ? { tone: "sos" as const, label: "SOS active", title: `${p.nickname} needs help`, body: em.triage ? CONDITION_INFO[em.triage.condition]?.label : "Finding the right hospital…" }
    : pendingCheckin
      ? { tone: "warn" as const, label: "Checking in", title: `Waiting for ${p.nickname}'s reply`, body: `${data.checkin!.requestedBy} asked if ${pr.sub}'s OK ${timeAgo(data.checkin!.requestedAt)}.` }
      : { tone: "ok" as const, label: "Safe", title: `${p.nickname} is doing fine`, body: data.checkin?.answer === "ok" ? `Replied "I'm OK" ${timeAgo(data.checkin.answeredAt!)}.` : `${taken} of ${total} doses taken today. No alerts right now.` };

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden lg:block">
        <p className="text-sm font-semibold text-ink-3">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-3xl font-bold">Hi {user?.name?.split(" ")[0]}, here's {p.nickname} today</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Status hero */}
          <Card className={cx("overflow-hidden", status.tone === "sos" && "border-sos")}>
            <div className={cx("flex flex-col gap-5 p-5 sm:flex-row sm:items-center", status.tone === "sos" ? "bg-sos text-white" : status.tone === "warn" ? "bg-warn-50" : "bg-gradient-to-br from-teal-50 to-white")}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={p.nickname} size={64} className={status.tone === "sos" ? "!bg-white !text-sos" : ""} />
                  <span className={cx("absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-white", status.tone === "sos" ? "bg-ink animate-pulsering" : status.tone === "warn" ? "bg-warn" : "bg-teal")}>
                    {status.tone === "sos" ? <Siren className="h-3.5 w-3.5 text-white" /> : status.tone === "warn" ? <Clock className="h-3.5 w-3.5 text-white" /> : <ShieldCheck className="h-3.5 w-3.5 text-white" />}
                  </span>
                </div>
                <div className="min-w-0">
                  <Badge tone={status.tone === "sos" ? "dark" : status.tone === "warn" ? "warn" : "ok"} dot>{status.label}</Badge>
                  <h2 className="mt-1 text-2xl font-bold leading-tight">{status.title}</h2>
                  <p className={cx("text-sm", status.tone === "sos" ? "text-white/90" : "text-ink-2")}>{status.body}</p>
                </div>
              </div>
              {em ? (
                <Link to="/family/emergency" className="sm:ml-auto"><Button variant="outline" className="w-full !border-white !bg-white !text-sos sm:w-auto" icon={<Siren className="h-4 w-4" />}>Open live view</Button></Link>
              ) : (
                <div className="text-xs text-ink-2 sm:ml-auto sm:text-right">
                  Last activity<div className="font-semibold text-ink">{lastActivity ? timeAgo(lastActivity.at) : "—"}</div>
                  <div className="max-w-[220px] truncate">{lastActivity?.title}</div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
              <QuickAction icon={<MessageCircleHeart className="h-5 w-5" />} label={pendingCheckin ? "Waiting…" : `Check on ${p.nickname}`} loading={busy === "checkin"} disabled={!!pendingCheckin}
                onClick={() => run("checkin", () => api.post("/api/checkins"), `${p.nickname} will see your check-in on her phone`)} />
              <QuickAction icon={<Phone className="h-5 w-5" />} label={`Call ${p.nickname}`} onClick={() => setModal("call")} />
              <QuickAction icon={<Plus className="h-5 w-5" />} label="Add reading" onClick={() => setModal("reading")} />
              <QuickAction icon={<Camera className="h-5 w-5" />} label="Check pulse" onClick={() => setModal("pulse")} />
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <TodayCard doses={data.today} taken={taken} total={total} />
            <AdherenceCard />
          </div>

          <VitalsCard vitals={data.vitals} />

          <div className="grid gap-6 md:grid-cols-2">
            {data.insightsCount > 0 ? (
              <Link to="/family/vault" className="group">
                <Card className="h-full border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 transition group-hover:shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white"><Sparkles className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold uppercase tracking-wide text-brand-700">Health Vault</div>
                      <h3 className="text-lg font-bold leading-snug">Saathi found {data.insightsCount} question{data.insightsCount > 1 ? "s" : ""} for the doctor</h3>
                      <p className="mt-1 text-sm text-ink-2">By reading all of {p.nickname}'s papers together: things no single doctor could see.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            ) : (
              <Card className="p-5"><EmptyState icon={<FlaskConical className="h-6 w-6" />} title="No open questions">Add prescriptions and reports to the Health Vault and Saathi will check them together.</EmptyState></Card>
            )}
            <UpcomingVisit />
          </div>

          <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-ink-2">
            <span className="font-semibold text-ink">Demo:</span> see the silent check in action.{" "}
            <button className="font-semibold text-brand-700 underline underline-offset-2 disabled:opacity-50" disabled={busy === "missed"}
              onClick={() => run("missed", () => api.post("/api/demo/missed-dose"), "Simulating missed morning tablets. Watch the activity feed.")}>Simulate missed morning tablets</button>
          </div>
        </div>

        <FeedCard />
      </div>

      <Modal open={modal === "call"} onClose={() => setModal(null)} title={`Call ${p.nickname}`}>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <Avatar name={p.nickname} size={72} />
          <div className="font-display text-2xl font-bold tnum">{elder?.phone || "No number saved"}</div>
          <p className="text-sm text-ink-2">{p.address}</p>
          {elder?.phone && <a href={`tel:${elder.phone.replace(/\s/g, "")}`} className="w-full"><Button size="lg" variant="teal" className="w-full" icon={<Phone className="h-5 w-5" />}>Call now</Button></a>}
          <p className="text-xs text-ink-3">If {pr.sub} doesn't pick up, use "Check on {p.nickname}". Saathi escalates to the neighbour if there's no reply.</p>
        </div>
      </Modal>
      <ReadingModal open={modal === "reading"} onClose={() => setModal(null)} />
      <Modal open={modal === "pulse"} onClose={() => setModal(null)} title="Check pulse with the camera">
        <p className="mb-3 text-sm text-ink-2">Hold the phone in front of {p.nickname}'s face, or check your own. 20 seconds, no device needed.</p>
        <FacePulse onResult={(bpm) => run("pulse", () => api.post("/api/vitals", { type: "hr", value: bpm, source: `Face Pulse by ${user?.name ?? "family"}` }), `Saved: ${bpm} bpm`).then(() => setTimeout(() => setModal(null), 1200))} />
      </Modal>
    </div>
  );
}

function QuickAction({ icon, label, onClick, loading, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 bg-white px-2 py-3 text-center text-sm font-semibold text-ink transition hover:bg-paper disabled:text-ink-3">
      <span className={cx("text-brand-600", loading && "animate-pulse")}>{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

const DOSE_CHIP: Record<TodayDose["status"], { tone: "ok" | "sos" | "warn" | "mute"; label: string }> = {
  taken: { tone: "ok", label: "Taken" }, missed: { tone: "sos", label: "Missed" }, due: { tone: "warn", label: "Due now" }, upcoming: { tone: "mute", label: "Later" },
};

function TodayCard({ doses, taken, total }: { doses: TodayDose[]; taken: number; total: number }) {
  const bySlot = (["morning", "afternoon", "night"] as Slot[]).map((s) => ({ s, items: doses.filter((d) => d.slot === s) })).filter((x) => x.items.length);
  return (
    <Card>
      <CardHeader title="Today's medicines" subtitle={`${taken} of ${total} doses confirmed`} action={<Link to="/family/meds" className="text-sm font-semibold text-brand-700">Manage</Link>} />
      <div className="flex gap-5 px-5 pb-5">
        <ProgressRing value={total ? taken / total : 0} size={84} stroke={9}>
          <div className="text-center leading-none"><div className="font-display text-xl font-bold tnum">{total ? Math.round((taken / total) * 100) : 0}%</div></div>
        </ProgressRing>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {bySlot.length === 0 && <p className="text-sm text-ink-2">No medicines scheduled.</p>}
          {bySlot.map(({ s, items }) => (
            <div key={s}>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-3">{SLOT_LABEL[s].en}</div>
              <ul className="flex flex-col gap-1">
                {items.map((d) => (
                  <li key={d.med.id + s} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-5 shrink-0 rounded-full border border-ink/15" style={{ background: d.med.color }} />
                    <span className="min-w-0 flex-1 truncate" title={`${d.med.name} ${d.med.dose}`}>{d.med.name}</span>
                    <Badge tone={DOSE_CHIP[d.status].tone}>{DOSE_CHIP[d.status].label}{d.status === "taken" && d.at ? ` ${fmtTime(d.at)}` : ""}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AdherenceCard() {
  const { data } = useFamily();
  const rows = data.adherence.map((a, i) => ({ ...a, pct: a.total ? Math.round((a.taken / a.total) * 100) : 0, day: new Date(a.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "narrow" }), today: i === data.adherence.length - 1 }));
  const past = rows.slice(0, -1);
  const avg = past.length ? Math.round(past.reduce((n, r) => n + r.pct, 0) / past.length) : 0;
  const fullDays = past.filter((r) => r.pct === 100).length;
  return (
    <Card>
      <CardHeader title="Last 14 days" subtitle={`${avg}% of doses taken · ${fullDays} perfect days`} />
      <div className="h-40 px-3 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 6, left: -26, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#7D8F89" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: "#7D8F89" }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "rgba(19,34,30,.05)" }} formatter={(v: number) => [`${v}%`, "Taken"]}
              labelFormatter={(_l, pl) => (pl?.[0] ? new Date((pl[0].payload as { date: string }).date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "")} />
            <Bar dataKey="pct" radius={[6, 6, 2, 2]}>
              {rows.map((r) => <Cell key={r.date} fill={r.today ? "#D98E04" : r.pct === 100 ? "#0F6E5A" : r.pct >= 60 ? "#B4600A" : "#D62839"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function VitalsCard({ vitals }: { vitals: Vital[] }) {
  const hr = useMemo(() => vitals.filter((v) => v.type === "hr").sort((a, b) => a.at.localeCompare(b.at)).slice(-14)
    .map((v) => ({ v: v.value, d: new Date(v.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), at: v.at, src: v.source })), [vitals]);
  const latest = (t: Vital["type"]) => vitals.filter((v) => v.type === t).sort((a, b) => b.at.localeCompare(a.at))[0];
  const bp = latest("bp"), sugar = latest("sugar"), spo2 = latest("spo2"), lastHr = hr[hr.length - 1];
  const usual = hr.length > 3 ? Math.round(hr.slice(0, -3).reduce((n, x) => n + x.v, 0) / (hr.length - 3)) : null;
  return (
    <Card>
      <CardHeader icon={<HeartPulse className="h-5 w-5 text-sos" />} title="Vitals" subtitle={usual ? `Usual resting pulse ~${usual} bpm` : "From Face Pulse checks and home devices"} />
      <div className="grid gap-5 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <div className="h-44 min-w-0">
          {hr.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hr} margin={{ top: 10, right: 10, left: -26, bottom: 0 }}>
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#7D8F89" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis domain={["dataMin - 6", "dataMax + 6"]} tick={{ fontSize: 11, fill: "#7D8F89" }} axisLine={false} tickLine={false} allowDecimals={false} />
                {usual && <ReferenceLine y={usual} stroke="#7D8F89" strokeDasharray="4 4" />}
                <Tooltip formatter={(v: number) => [`${v} bpm`, "Pulse"]} labelFormatter={(_l, pl) => (pl?.[0] ? `${fmtDateTime((pl[0].payload as { at: string }).at)} · ${(pl[0].payload as { src: string }).src}` : "")} />
                <Line type="monotone" dataKey="v" stroke="#D62839" strokeWidth={3} dot={{ r: 2.5, fill: "#D62839" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={<HeartPulse className="h-6 w-6" />} title="No pulse readings yet">Use "Check pulse" for a 20-second camera reading.</EmptyState>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <VitalTile icon={<HeartPulse className="h-4 w-4" />} label="Pulse" value={lastHr ? `${lastHr.v}` : "—"} unit="bpm" when={lastHr?.at} />
          <VitalTile icon={<Activity className="h-4 w-4" />} label="Blood pressure" value={bp ? `${bp.value}/${bp.value2}` : "—"} unit="mmHg" when={bp?.at} warn={!!bp && bp.value >= 140} />
          <VitalTile icon={<Droplet className="h-4 w-4" />} label="Sugar" value={sugar ? `${sugar.value}` : "—"} unit="mg/dL" when={sugar?.at} warn={!!sugar && sugar.value > 140} />
          {spo2 && <VitalTile icon={<Activity className="h-4 w-4" />} label="SpO₂" value={`${spo2.value}`} unit="%" when={spo2.at} warn={spo2.value < 94} />}
        </div>
      </div>
    </Card>
  );
}

function VitalTile({ icon, label, value, unit, when, warn }: { icon: React.ReactNode; label: string; value: string; unit: string; when?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-2">{icon}{label}</div>
      <div className="flex items-baseline gap-1"><span className={cx("font-display text-2xl font-bold tnum", warn && "text-warn")}>{value}</span><span className="text-xs text-ink-3">{unit}</span></div>
      <div className="text-[11px] text-ink-3">{when ? timeAgo(when) : "No reading"}</div>
    </div>
  );
}

function UpcomingVisit() {
  const { data } = useFamily();
  const next = data.visits.filter((v) => v.status !== "done" && new Date(v.at).getTime() > Date.now() - 6 * 3600000).sort((a, b) => a.at.localeCompare(b.at))[0];
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-info-50 text-info"><CalendarClock className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-3">Next visit</div>
          {next ? (<>
            <h3 className="text-lg font-bold leading-snug">{next.reason}</h3>
            <p className="text-sm text-ink-2">{next.place}</p>
            <p className="mt-1 text-sm font-semibold">{new Date(next.at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
          </>) : <p className="mt-1 text-sm text-ink-2">Nothing scheduled.</p>}
        </div>
        <Link to="/family/visits" className="text-sm font-semibold text-brand-700">All</Link>
      </div>
    </Card>
  );
}

function FeedCard() {
  const { data } = useFamily();
  const [all, setAll] = useState(false);
  // Collapse back-to-back repeats (e.g. several re-analyses) into one row with a count
  const items = useMemo(() => {
    const out: (FeedItem & { n: number })[] = [];
    for (const f of data.feed) {
      const prev = out[out.length - 1];
      if (prev && prev.title === f.title && prev.body === f.body) prev.n++;
      else out.push({ ...f, n: 1 });
    }
    return out;
  }, [data.feed]);
  const shown = all ? items.slice(0, 40) : items.slice(0, 8);
  return (
    <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
      <SectionTitle>Live activity</SectionTitle>
      <Card className="overflow-hidden lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
        {items.length === 0 ? <div className="p-5"><EmptyState title="Nothing yet">Doses, check-ins, documents and alerts appear here live.</EmptyState></div> : (
          <>
            <ol className="divide-y divide-line">
              {shown.map((f) => (
                <li key={f.id} className="flex gap-3 px-4 py-3 animate-slidein">
                  <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", FEED_TONE[f.level].dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cx("text-sm font-semibold leading-snug", f.level === "sos" && "text-sos")}>{f.title}{f.n > 1 && <span className="ml-1.5 rounded-full bg-paper-2 px-1.5 text-[11px] text-ink-2">×{f.n}</span>}</p>
                      <time className="shrink-0 text-[11px] text-ink-3 tnum">{timeAgo(f.at)}</time>
                    </div>
                    <p className="text-[13px] leading-snug text-ink-2">{f.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            {items.length > 8 && (
              <button onClick={() => setAll((x) => !x)} className="w-full border-t border-line py-3 text-sm font-semibold text-brand-700 hover:bg-paper">
                {all ? "Show less" : `Show ${Math.min(items.length, 40) - 8} more`}
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function ReadingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [type, setType] = useState<Vital["type"]>("bp");
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = { hr: { label: "Pulse", unit: "bpm", ph: "76" }, bp: { label: "Systolic", unit: "mmHg", ph: "138" }, sugar: { label: "Blood sugar", unit: "mg/dL", ph: "148" }, spo2: { label: "Oxygen (SpO₂)", unit: "%", ph: "97" } }[type];
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/api/vitals", { type, value: Number(a), value2: type === "bp" ? Number(b) : null, source: `Added by ${user?.name ?? "family"}` });
      toast("Reading saved", "ok"); setA(""); setB(""); onClose();
    } catch (err) { toast((err as Error).message, "sos"); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a reading">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Segmented value={type} onChange={(v) => { setType(v); setA(""); setB(""); }} options={[{ value: "bp", label: "BP" }, { value: "sugar", label: "Sugar" }, { value: "hr", label: "Pulse" }, { value: "spo2", label: "SpO₂" }]} />
        <div className={cx("grid gap-3", type === "bp" && "grid-cols-2")}>
          <Field label={`${meta.label} (${meta.unit})`}><Input type="number" inputMode="numeric" required min={1} value={a} onChange={(e) => setA(e.target.value)} placeholder={meta.ph} className="font-mono text-lg" /></Field>
          {type === "bp" && <Field label="Diastolic (mmHg)"><Input type="number" inputMode="numeric" required min={1} value={b} onChange={(e) => setB(e.target.value)} placeholder="84" className="font-mono text-lg" /></Field>}
        </div>
        <p className="text-xs text-ink-3">Readings outside the usual range are flagged to the whole family.</p>
        <Button type="submit" size="lg" loading={busy}>Save reading</Button>
      </form>
    </Modal>
  );
}
