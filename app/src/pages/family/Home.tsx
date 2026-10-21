// Family home: answers "Is Paati okay?" first, then today's doses, activity, vitals and what's next.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MessageCircle, Phone, Plus, ScanFace, ChevronRight, CalendarDays, FileText } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { fmtDateTime, timeAgo } from "../../lib/format";
import { Badge, Button, Field, Input, Modal, SectionTitle, Segmented, cx, useToast } from "../../components/ui";
import Blister from "../../components/Blister";
import FacePulse from "../../components/FacePulse";
import { SLOT_LABEL, CONDITION_INFO, type TodayDose, type Vital, type FeedItem } from "../../../shared/types";
import { FEED_TONE, SLOTS, clock, pronoun, slotTime, toBlister, useFamily } from "./ctx";

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
    try { await fn(); if (ok) toast(ok, "ok"); } catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(null); }
  };

  const taken = data.today.filter((d) => d.status === "taken").length;
  const total = data.today.length;
  const missed = data.today.filter((d) => d.status === "missed");
  const pendingCheckin = data.checkin && !data.checkin.answeredAt ? data.checkin : null;
  const em = data.emergency;

  // When did we last hear from her? Latest confirmed dose or check-in reply, else latest activity.
  const lastHeard = useMemo(() => {
    const times = [...data.today.map((d) => d.at), data.checkin?.answeredAt].filter(Boolean) as string[];
    const best = times.sort().pop() ?? data.feed[0]?.at;
    return best ? clock(best) : null;
  }, [data]);

  let title: string, sub: string;
  if (em) {
    title = `${p.nickname} pressed the help button.`;
    sub = [em.triage ? CONDITION_INFO[em.triage.condition]?.label : "Finding the right hospital", em.etaLeftMin != null && em.status === "dispatched" ? `ambulance in ${em.etaLeftMin} min` : null].filter(Boolean).join(" · ");
  } else if (pendingCheckin) {
    title = `Waiting for ${p.nickname} to reply.`;
    sub = `${pendingCheckin.requestedBy} asked if ${pr.sub}'s OK ${timeAgo(pendingCheckin.requestedAt)}.`;
  } else if (missed.length) {
    const slots = [...new Set(missed.map((d) => SLOT_LABEL[d.slot].en.toLowerCase()))].join(" and ");
    title = `${p.nickname} hasn't confirmed ${pr.pos} ${slots} tablets.`;
    sub = `${missed.map((d) => d.med.name).filter((n, i, a) => a.indexOf(n) === i).join(", ")} not confirmed${lastHeard ? ` · last heard from ${lastHeard}` : ""}`;
  } else {
    title = `${p.nickname} is fine.`;
    sub = [`${taken} of ${total} doses taken today`, data.checkin?.answer === "ok" ? `replied "I'm OK" ${timeAgo(data.checkin.answeredAt!)}` : lastHeard ? `last heard from ${lastHeard}` : null].filter(Boolean).join(" · ");
  }

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="text-[14px] text-ink-2">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className={cx("mt-1 text-[34px] font-semibold leading-[1.05] sm:text-[44px]", em && "text-sos")} style={{ fontStretch: "85%" }}>{title}</h1>
        <p className="mt-2 text-[17px] text-ink-2">{sub}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {em && <Link to="/family/emergency"><Button variant="sos" icon={<ChevronRight className="h-4 w-4" />}>Open live view</Button></Link>}
          <Button variant="outline" icon={<MessageCircle className="h-4 w-4" strokeWidth={1.75} />} loading={busy === "checkin"} disabled={!!pendingCheckin}
            onClick={() => run("checkin", () => api.post("/api/checkins"), `${p.nickname} will see your check-in on ${pr.pos} phone`)}>{pendingCheckin ? "Check-in sent" : `Check on ${p.nickname}`}</Button>
          <Button variant="outline" icon={<Phone className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setModal("call")}>Call</Button>
          <Button variant="outline" icon={<Plus className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setModal("reading")}>Add reading</Button>
          <Button variant="outline" icon={<ScanFace className="h-4 w-4" strokeWidth={1.75} />} onClick={() => setModal("pulse")}>Check pulse</Button>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-10">
          <TodaySection doses={data.today} />
          <VitalsSection vitals={data.vitals} />
          <UpNext />
          <p className="text-[14px] text-ink-2">
            Demo: show the silent check.{" "}
            <button className="font-semibold text-info underline-offset-2 hover:underline disabled:opacity-50" disabled={busy === "missed"}
              onClick={() => run("missed", () => api.post("/api/demo/missed-dose"), "Simulating missed morning tablets. Watch the activity list.")}>Simulate missed morning tablets</button>
          </p>
        </div>
        <Activity />
      </div>

      <Modal open={modal === "call"} onClose={() => setModal(null)} title={`Call ${p.nickname}`}>
        <div className="flex flex-col gap-4">
          <div>
            <div className="font-mono text-[28px] tnum">{elder?.phone || "No number saved"}</div>
            <p className="text-[15px] text-ink-2">{p.address}</p>
          </div>
          {elder?.phone && <a href={`tel:${elder.phone.replace(/\s/g, "")}`}><Button size="lg" className="w-full" icon={<Phone className="h-5 w-5" />}>Call now</Button></a>}
          <p className="text-[14px] text-ink-2">If {pr.sub} doesn't pick up, use "Check on {p.nickname}". Saathi asks the neighbour if there's no reply.</p>
        </div>
      </Modal>
      <ReadingModal open={modal === "reading"} onClose={() => setModal(null)} />
      <Modal open={modal === "pulse"} onClose={() => setModal(null)} title="Check pulse with the camera">
        <p className="mb-3 text-[15px] text-ink-2">Hold the phone in front of {p.nickname}'s face, or check your own. Takes 20 seconds.</p>
        <FacePulse onResult={(bpm) => run("pulse", () => api.post("/api/vitals", { type: "hr", value: bpm, source: `Face Pulse by ${user?.name ?? "family"}` }), `Saved: ${bpm} bpm`).then(() => setTimeout(() => setModal(null), 1200))} />
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------- Today */

function slotStatus(items: TodayDose[]) {
  const done = items.filter((d) => d.status === "taken");
  if (done.length === items.length) {
    const last = done.map((d) => d.at).filter(Boolean).sort().pop();
    return <span className="text-[14px] font-semibold text-teal">All taken{last ? ` · ${clock(last)}` : ""}</span>;
  }
  if (items.some((d) => d.status === "missed")) return <Badge tone="warn">Missed</Badge>;
  if (items.some((d) => d.status === "due")) return <Badge tone="brand">Due now</Badge>;
  if (done.length) return <span className="text-[14px] text-ink-2">{done.length} of {items.length} taken</span>;
  return <span className="text-[14px] text-ink-3">Later</span>;
}

function TodaySection({ doses }: { doses: TodayDose[] }) {
  const { data } = useFamily();
  const rows = SLOTS.map((s) => ({ s, items: doses.filter((d) => d.slot === s) })).filter((x) => x.items.length);
  const days = data.adherence.map((a, i) => ({ ...a, pct: a.total ? a.taken / a.total : 0, today: i === data.adherence.length - 1 }));
  const past = days.slice(0, -1);
  const avg = past.length ? Math.round((past.reduce((n, r) => n + r.pct, 0) / past.length) * 100) : 0;
  const full = past.filter((r) => r.pct >= 1).length;
  return (
    <section>
      <SectionTitle action={<Link to="/family/meds" className="text-[14px] font-semibold text-info hover:underline">Medicines</Link>}>Today's tablets</SectionTitle>
      {rows.length === 0 ? <p className="text-[15px] text-ink-2">No medicines scheduled. Add them under Medicines.</p> : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map(({ s, items }) => (
            <li key={s} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-4 py-4 sm:grid-cols-[7.5rem_auto_minmax(0,1fr)_auto] sm:px-5">
              <div className="min-w-0">
                <div className="font-semibold">{SLOT_LABEL[s].en}</div>
                <div className="text-[13px] text-ink-3">{slotTime(s)}</div>
              </div>
              <div className="justify-self-end sm:order-last">{slotStatus(items)}</div>
              <Blister doses={toBlister(items)} size="sm" className="col-span-2 w-max justify-self-start sm:col-span-1" />
              <p className="col-span-2 min-w-0 text-[14px] leading-snug text-ink-2 sm:col-span-1">
                {items.map((d) => d.med.name).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-[14px] font-semibold">Last 14 days</span>
          <span className="text-[14px] text-ink-2"><span className="font-display font-semibold text-ink tnum">{avg}%</span> of doses taken · {full} complete days</span>
        </div>
        <div className="mt-2 flex gap-1" role="list" aria-label="Doses taken per day, last 14 days">
          {days.map((d) => (
            <div key={d.date} role="listitem" className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}: ${d.taken} of ${d.total}`}>
              <span className={cx("h-6 w-full rounded-[4px]", d.today ? "border border-dashed border-ink-3 bg-white" : d.pct >= 1 ? "bg-teal" : d.pct >= 0.5 ? "bg-warn/70" : "bg-warn")} />
              <span className="text-[10px] text-ink-3">{new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "narrow" })}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Vitals */

function VitalsSection({ vitals }: { vitals: Vital[] }) {
  const pos = pronoun(useFamily().data.patient.sex).pos;
  const hr = useMemo(() => vitals.filter((v) => v.type === "hr").sort((a, b) => a.at.localeCompare(b.at)).slice(-14)
    .map((v) => ({ v: v.value, d: new Date(v.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), at: v.at, src: v.source })), [vitals]);
  const latest = (t: Vital["type"]) => vitals.filter((v) => v.type === t).sort((a, b) => b.at.localeCompare(a.at))[0];
  const bp = latest("bp"), sugar = latest("sugar"), spo2 = latest("spo2"), lastHr = hr[hr.length - 1];
  const base = hr.length > 3 ? hr.slice(0, -3) : hr;
  const usual = base.length ? Math.round(base.reduce((n, x) => n + x.v, 0) / base.length) : null;
  const high = usual != null && lastHr && lastHr.v > usual + 6;
  const yVals = hr.map((x) => x.v).concat(usual != null ? [usual - 6, usual + 6] : []);
  const yLo = Math.floor((Math.min(...yVals) - 4) / 10) * 10, yHi = Math.ceil((Math.max(...yVals) + 4) / 10) * 10;
  const yTicks = Array.from({ length: (yHi - yLo) / 10 + 1 }, (_, i) => yLo + i * 10);
  const rows: { label: string; value: string; unit: string; at?: string; note?: string; warn?: boolean }[] = [
    { label: "Pulse", value: lastHr ? `${lastHr.v}` : "—", unit: "bpm", at: lastHr?.at, warn: !!high, note: usual ? `usual ${usual - 6}–${usual + 6}` : undefined },
    { label: "Blood pressure", value: bp ? `${bp.value}/${bp.value2}` : "—", unit: "mmHg", at: bp?.at, warn: !!bp && bp.value >= 140, note: bp && bp.value >= 140 ? "above 140" : undefined },
    { label: "Fasting sugar", value: sugar ? `${sugar.value}` : "—", unit: "mg/dL", at: sugar?.at, warn: !!sugar && sugar.value > 140, note: sugar && sugar.value > 140 ? "above 140" : undefined },
    ...(spo2 ? [{ label: "Oxygen", value: `${spo2.value}`, unit: "%", at: spo2.at, warn: spo2.value < 94 }] : []),
  ];
  return (
    <section>
      <SectionTitle>Vitals</SectionTitle>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] font-semibold">Resting pulse, last 14 readings</span>
            {usual && <span className="text-[13px] text-ink-3">Shaded: {pos} usual range</span>}
          </div>
          <div className="mt-2 h-44">
            {hr.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hr} margin={{ top: 18, right: 28, left: -24, bottom: 0 }}>
                  <XAxis dataKey="d" tick={{ fontSize: 11, fill: "#858AA0" }} axisLine={{ stroke: "#E1E3E9" }} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis domain={[yLo, yHi]} ticks={yTicks} tick={{ fontSize: 11, fill: "#858AA0" }} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                  {usual && <ReferenceArea y1={usual - 6} y2={usual + 6} fill="#E8EAEE" fillOpacity={1} />}
                  <Tooltip cursor={{ stroke: "#CDD1DA" }} contentStyle={{ borderRadius: 8, borderColor: "#E1E3E9", fontSize: 13 }}
                    formatter={(v: number) => [`${v} bpm`, "Pulse"]} labelFormatter={(_l, pl) => (pl?.[0] ? `${fmtDateTime((pl[0].payload as { at: string }).at)} · ${(pl[0].payload as { src: string }).src}` : "")} />
                  <Line type="monotone" dataKey="v" stroke="#14172B" strokeWidth={2} isAnimationActive={false}
                    dot={(pr: { cx?: number; cy?: number; index?: number }) => {
                      const last = pr.index === hr.length - 1;
                      return (
                        <g key={pr.index}>
                          <circle cx={pr.cx} cy={pr.cy} r={last ? 4.5 : 2} fill={last && high ? "#B25E00" : "#14172B"} stroke="#fff" strokeWidth={last ? 2 : 0} />
                          {last && <text x={(pr.cx ?? 0) + 8} y={(pr.cy ?? 0) - 8} fontSize={13} fontWeight={600} fill={high ? "#B25E00" : "#14172B"}>{hr[hr.length - 1].v}</text>}
                        </g>
                      );
                    }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <p className="pt-6 text-[15px] text-ink-2">No pulse readings yet. "Check pulse" takes a 20-second camera reading.</p>}
          </div>
        </div>
        <table className="w-full self-start text-[14px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line last:border-b-0">
                <td className="py-2.5 pr-2 align-top text-ink-2">{r.label}{r.at && <span className="block text-[12px] text-ink-3">{timeAgo(r.at)}</span>}</td>
                <td className="py-2.5 text-right align-top">
                  <span className={cx("font-display text-[22px] font-semibold leading-none tnum", r.warn && "text-warn")}>{r.value}</span>
                  <span className="ml-1 text-[12px] text-ink-3">{r.unit}</span>
                  {r.note && <span className={cx("block text-[12px]", r.warn ? "text-warn" : "text-ink-3")}>{r.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Up next */

function UpNext() {
  const { data } = useFamily();
  const next = data.visits.filter((v) => v.status !== "done" && new Date(v.at).getTime() > Date.now() - 6 * 3600000).sort((a, b) => a.at.localeCompare(b.at))[0];
  const rows: { to: string; icon: typeof CalendarDays; title: string; detail: string }[] = [];
  if (next) rows.push({ to: "/family/visits", icon: CalendarDays, title: next.reason, detail: `${new Date(next.at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · ${next.place}` });
  if (data.insightsCount > 0) rows.push({ to: "/family/vault", icon: FileText, title: `${data.insightsCount} question${data.insightsCount > 1 ? "s" : ""} to take to the doctor`, detail: `Found by reading all of ${data.patient.nickname}'s papers together` });
  if (!rows.length) return null;
  return (
    <section>
      <SectionTitle>Coming up</SectionTitle>
      <ul className="divide-y divide-line rounded-xl border border-line bg-white">
        {rows.map((r) => (
          <li key={r.to}>
            <Link to={r.to} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-paper sm:px-5">
              <r.icon className="h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold leading-snug">{r.title}</div>
                <div className="truncate text-[14px] text-ink-2">{r.detail}</div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink-3 group-hover:text-ink" strokeWidth={1.75} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- Activity */

function Activity() {
  const { data } = useFamily();
  const [all, setAll] = useState(false);
  // Collapse back-to-back repeats into one row with a count
  const items = useMemo(() => {
    const out: (FeedItem & { n: number })[] = [];
    for (const f of data.feed) {
      const prev = out[out.length - 1];
      if (prev && prev.title === f.title && prev.body === f.body) prev.n++;
      else out.push({ ...f, n: 1 });
    }
    return out;
  }, [data.feed]);
  const shown = all ? items.slice(0, 40) : items.slice(0, 9);
  return (
    <section className="min-w-0 lg:sticky lg:top-10 lg:self-start">
      <SectionTitle>Activity</SectionTitle>
      {items.length === 0 ? <p className="text-[15px] text-ink-2">Doses, check-ins, papers and alerts appear here as they happen.</p> : (
        <>
          <ol className="border-t border-line lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
            {shown.map((f) => (
              <li key={f.id} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3 animate-slidein">
                <time className="pt-0.5 font-mono text-[12px] text-ink-3 tnum">{clock(f.at)}</time>
                <div className="min-w-0">
                  <p className={cx("flex items-start gap-2 text-[15px] font-semibold leading-snug", FEED_TONE[f.level].text)}>
                    {f.level !== "info" && <span className={cx("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", FEED_TONE[f.level].dot)} />}
                    <span>{f.title}{f.n > 1 && <span className="ml-1.5 text-[13px] font-normal text-ink-3">×{f.n}</span>}</span>
                  </p>
                  <p className="line-clamp-2 text-[14px] leading-snug text-ink-2">{f.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {items.length > 9 && (
            <button onClick={() => setAll((x) => !x)} className="mt-3 text-[14px] font-semibold text-info hover:underline">
              {all ? "Show less" : `Show ${Math.min(items.length, 40) - 9} earlier`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Add a reading */

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
    } catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add a reading">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Segmented value={type} onChange={(v) => { setType(v); setA(""); setB(""); }} options={[{ value: "bp", label: "Blood pressure" }, { value: "sugar", label: "Sugar" }, { value: "hr", label: "Pulse" }, { value: "spo2", label: "Oxygen" }]} />
        <div className={cx("grid gap-3", type === "bp" && "grid-cols-2")}>
          <Field label={`${meta.label} (${meta.unit})`}><Input type="number" inputMode="numeric" required min={1} value={a} onChange={(e) => setA(e.target.value)} placeholder={meta.ph} className="font-display text-lg tnum" /></Field>
          {type === "bp" && <Field label="Diastolic (mmHg)"><Input type="number" inputMode="numeric" required min={1} value={b} onChange={(e) => setB(e.target.value)} placeholder="84" className="font-display text-lg tnum" /></Field>}
        </div>
        <p className="text-[14px] text-ink-2">Readings outside the usual range are flagged to the whole family.</p>
        <Button type="submit" size="lg" loading={busy}>Save reading</Button>
      </form>
    </Modal>
  );
}
