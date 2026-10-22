// Family home: "Is Paati okay?" in the violet header, quick actions, then a bento of everything Saathi does for her.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, ReferenceArea, Tooltip, YAxis } from "recharts";
import { Bell, MessageCircle, Phone, ChevronRight, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConnected } from "../../lib/socket";
import { fmtDateTime, timeAgo } from "../../lib/format";
import { Badge, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Person, Pill, QuickTile, Section, Sheet, StatCard, Tile, VioletHeader, whoFor } from "../../components/kit";
import Blister from "../../components/Blister";
import { SLOT_LABEL, CONDITION_INFO, type TodayDose, type FeedItem } from "../../../shared/types";
import { FEED_TONE, SLOTS, clock, pronoun, slotTime, toBlister, useFamily } from "./ctx";

export default function Home({ onAdd }: { onAdd: () => void }) {
  const { data } = useFamily();
  const { user } = useAuth();
  const connected = useConnected();
  const toast = useToast();
  const nav = useNavigate();
  const p = data.patient;
  const pr = pronoun(p.sex);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"call" | "activity" | null>(null);
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

  const lastHeard = useMemo(() => {
    const times = [...data.today.map((d) => d.at), data.checkin?.answeredAt].filter(Boolean) as string[];
    const best = times.sort().pop() ?? data.feed[0]?.at;
    return best ? clock(best) : null;
  }, [data]);

  let mood: "ok" | "warn" | "sos" = "ok", title: string, sub: string;
  if (em) {
    mood = "sos"; title = `${p.nickname} pressed help`;
    sub = [em.triage ? CONDITION_INFO[em.triage.condition]?.label : "Finding the right hospital", em.etaLeftMin != null && em.status === "dispatched" ? `ambulance in ${em.etaLeftMin} min` : null].filter(Boolean).join(" · ");
  } else if (pendingCheckin) {
    mood = "warn"; title = `Waiting for ${p.nickname}`;
    sub = `${pendingCheckin.requestedBy} asked if ${pr.sub}'s OK ${timeAgo(pendingCheckin.requestedAt)}`;
  } else if (missed.length) {
    mood = "warn";
    const slots = [...new Set(missed.map((d) => SLOT_LABEL[d.slot].en.toLowerCase()))].join(" and ");
    title = `${slots[0].toUpperCase()}${slots.slice(1)} tablets not confirmed`;
    sub = `${missed.map((d) => d.med.name).filter((n, i, a) => a.indexOf(n) === i).join(", ")}${lastHeard ? ` · last heard ${lastHeard}` : ""}`;
  } else {
    title = `${p.nickname} is doing well`;
    sub = [`${taken} of ${total} doses today`, data.checkin?.answer === "ok" ? `said "I'm OK" ${timeAgo(data.checkin.answeredAt!)}` : lastHeard ? `last heard ${lastHeard}` : null].filter(Boolean).join(" · ");
  }
  const me = whoFor(user?.name);
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <VioletHeader>
        <div className="flex items-center gap-3">
          {me ? <Person who={me} size={44} className="ring-2 ring-white/40" /> : <span className="h-11 w-11 rounded-full bg-white/20" />}
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[17px] font-bold">Hi {firstName}</div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-white/75"><span className={cx("h-1.5 w-1.5 rounded-full", connected ? "bg-[#5BE39A]" : "bg-butter animate-blink")} />{connected ? "Live" : "Reconnecting"} · {data.family.name}</div>
          </div>
          <button aria-label="Activity" onClick={() => setSheet("activity")} className="glass relative grid h-11 w-11 place-items-center rounded-full">
            <Bell className="h-5 w-5" />
            {data.feed.some((f) => f.level === "warn" || f.level === "sos") && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-butter" />}
          </button>
        </div>

        {/* Status of Paati */}
        <motion.div layout className={cx("mt-5 rounded-[26px] p-4", mood === "sos" ? "bg-sos shadow-sos" : "bg-white text-ink shadow-lift")}>
          <div className="flex items-start gap-3">
            <Person who="paati" size={58} online={elder?.online} />
            <div className="min-w-0 flex-1">
              <div className={cx("text-[12px] font-semibold", mood === "sos" ? "text-white/80" : mood === "warn" ? "text-peach-ink" : "text-mint-ink")}>
                {mood === "sos" ? "EMERGENCY" : mood === "warn" ? "Needs a look" : "All good"} · {p.name.split(" ")[0]}, {p.age}
              </div>
              <div className="mt-0.5 font-display text-[19px] font-extrabold leading-tight">{title}</div>
              <div className={cx("mt-1 text-[13px] leading-snug", mood === "sos" ? "text-white/85" : "text-ink-2")}>{sub}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {em ? <Pill variant="white" className="flex-1" onClick={() => nav("/family/emergency")}>Open live view</Pill> : (
              <>
                <Pill variant="violet" icon={MessageCircle} size="sm" className="flex-1" disabled={!!pendingCheckin || busy === "checkin"}
                  onClick={() => run("checkin", () => api.post("/api/checkins"), `${p.nickname} will see your check-in`)}>{pendingCheckin ? "Check-in sent" : `Check on ${p.nickname}`}</Pill>
                <Pill variant="soft" icon={Phone} size="sm" onClick={() => setSheet("call")}>Call</Pill>
              </>
            )}
          </div>
        </motion.div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <QuickTile art="pills" label="Medicines" to="/family/meds" />
          <QuickTile art="folder" label="Records" to="/family/vault" dot={data.insightsCount > 0} />
          <QuickTile art="calendar" label="Visits" to="/family/visits" />
          <QuickTile art="heart" label="Add reading" onClick={onAdd} />
        </div>
      </VioletHeader>

      <Sheet>
        {/* Bento of the big features */}
        <div className="grid grid-cols-2 gap-3">
          <Tile big tone="lilac" art="chat" artSize={92} title="Ask Saathi" to="/family/vault?ask=1"
            sub={`Anything about ${pr.pos} ${data.insightsCount ? "papers" : "health"}, answered from ${pr.pos} records`}>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11.5px] font-bold text-violet-700"><Sparkles className="h-3 w-3" />AI</span>
          </Tile>
          <div className="grid gap-3">
            <Tile tone="butter" art="stethoscope" artSize={62} title={data.insightsCount ? `${data.insightsCount} questions` : "Doctor brief"} sub="for the doctor" to="/family/vault" />
            <Tile tone="sky" art="qr" artSize={60} title="Emergency card" sub="Scan to help" to="/family/family?card=1" />
          </div>
        </div>

        <TodayTablets />
        <Vitals />
        <UpNext />

        <Section title="Try the demo">
          <div className="grid grid-cols-2 gap-3">
            <Tile tone="peach" art="pills" artSize={58} title="Missed tablets" sub="See the silent check" onClick={() => run("missed", () => api.post("/api/demo/missed-dose"), "Simulating missed morning tablets")} />
            <Tile tone="rose" art="cpr" artSize={60} title="CPR coach" sub="Hands-only rhythm" to="/family/emergency?cpr=1" />
          </div>
        </Section>

        <Section title="Activity" action={<button onClick={() => setSheet("activity")} className="text-[13px] font-bold text-violet-600">See all</button>}>
          <ActivityList limit={5} />
        </Section>
      </Sheet>

      <BottomSheet open={sheet === "call"} onClose={() => setSheet(null)} title={`Call ${p.nickname}`}>
        <div className="flex flex-col items-center gap-3 text-center">
          <Person who="paati" size={96} />
          <div className="font-display text-[26px] font-extrabold tnum">{elder?.phone || "No number saved"}</div>
          <p className="text-[14px] text-ink-2">{p.address}</p>
          {elder?.phone && <a className="w-full" href={`tel:${elder.phone.replace(/\s/g, "")}`}><Pill variant="violet" size="lg" icon={Phone} className="w-full">Call now</Pill></a>}
          <p className="text-[13px] text-ink-2">No answer? Use "Check on {p.nickname}". Saathi asks the neighbour if she doesn't reply.</p>
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === "activity"} onClose={() => setSheet(null)} title="Activity" tall>
        <ActivityList limit={40} />
      </BottomSheet>
    </div>
  );
}

/* ---------------------------------------------------------------- Today */

function slotStatus(items: TodayDose[]) {
  const done = items.filter((d) => d.status === "taken");
  if (done.length === items.length) {
    const last = done.map((d) => d.at).filter(Boolean).sort().pop();
    return <Badge tone="ok">Taken{last ? ` · ${clock(last)}` : ""}</Badge>;
  }
  if (items.some((d) => d.status === "missed")) return <Badge tone="warn">Missed</Badge>;
  if (items.some((d) => d.status === "due")) return <Badge tone="brand">Due now</Badge>;
  if (done.length) return <Badge tone="mute">{done.length} of {items.length}</Badge>;
  return <Badge tone="mute">Later</Badge>;
}

function TodayTablets() {
  const { data } = useFamily();
  const rows = SLOTS.map((s) => ({ s, items: data.today.filter((d) => d.slot === s) })).filter((x) => x.items.length);
  return (
    <Section title="Today's tablets" action={<Link to="/family/meds" className="text-[13px] font-bold text-violet-600">All medicines</Link>}>
      {rows.length === 0 ? <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">No medicines scheduled yet.</p> : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {rows.map(({ s, items }) => (
            <div key={s} className="w-[220px] shrink-0 rounded-3xl bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-bold">{SLOT_LABEL[s].en}</div><div className="text-[12px] text-ink-3">{slotTime(s)}</div></div>
                {slotStatus(items)}
              </div>
              <Blister doses={toBlister(items)} size="sm" className="mt-3 w-max" />
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{items.map((d) => d.med.name).join(", ")}</p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------- Vitals */

function Vitals() {
  const { data } = useFamily();
  const vitals = data.vitals;
  const hr = useMemo(() => vitals.filter((v) => v.type === "hr").sort((a, b) => a.at.localeCompare(b.at)).slice(-14).map((v) => ({ v: v.value, at: v.at, src: v.source })), [vitals]);
  const latest = (t: string) => vitals.filter((v) => v.type === t).sort((a, b) => b.at.localeCompare(a.at))[0];
  const bp = latest("bp"), sugar = latest("sugar"), lastHr = hr[hr.length - 1];
  const base = hr.length > 3 ? hr.slice(0, -3) : hr;
  const usual = base.length ? Math.round(base.reduce((n, x) => n + x.v, 0) / base.length) : null;
  const high = usual != null && lastHr && lastHr.v > usual + 6;
  const days = data.adherence.slice(0, -1);
  const avg = days.length ? Math.round((days.reduce((n, r) => n + (r.total ? r.taken / r.total : 0), 0) / days.length) * 100) : 0;
  return (
    <Section title="Vitals">
      <div className="grid grid-cols-2 gap-3">
        <StatCard tone={high ? "peach" : "mint"} label="Pulse" value={lastHr?.v ?? "—"} unit="bpm" note={usual ? `usual ${usual - 6}–${usual + 6}` : "no readings"}>
          {hr.length > 1 && (
            <div className="-mx-1 mt-2 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hr} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
                  <defs><linearGradient id="hrfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={high ? "#B54A12" : "#0F7A47"} stopOpacity={0.35} /><stop offset="1" stopColor={high ? "#B54A12" : "#0F7A47"} stopOpacity={0} /></linearGradient></defs>
                  <YAxis hide domain={["dataMin - 4", "dataMax + 4"]} />
                  {usual && <ReferenceArea y1={usual - 6} y2={usual + 6} fill="#fff" fillOpacity={0.45} />}
                  <Tooltip cursor={false} contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 24px -8px rgba(23,20,46,.25)", fontSize: 12 }}
                    formatter={(v: number) => [`${v} bpm`, "Pulse"]} labelFormatter={(_l, pl) => (pl?.[0] ? fmtDateTime((pl[0].payload as { at: string }).at) : "")} />
                  <Area type="monotone" dataKey="v" stroke={high ? "#B54A12" : "#0F7A47"} strokeWidth={2.2} fill="url(#hrfill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </StatCard>
        <StatCard tone={bp && bp.value >= 140 ? "rose" : "sky"} label="Blood pressure" value={bp ? `${bp.value}/${bp.value2}` : "—"} note={bp ? `${bp.value >= 140 ? "above 140 · " : ""}${timeAgo(bp.at)}` : "no readings"} />
        <StatCard tone={sugar && sugar.value > 140 ? "butter" : "lilac"} label="Fasting sugar" value={sugar?.value ?? "—"} unit="mg/dL" note={sugar ? `${sugar.value > 140 ? "above 140 · " : ""}${timeAgo(sugar.at)}` : "no readings"} />
        <StatCard tone="white" label="Tablets, 14 days" value={`${avg}%`}>
          <div className="mt-2 flex h-8 items-end gap-[3px]">
            {data.adherence.map((a, i) => {
              const pct = a.total ? a.taken / a.total : 0, today = i === data.adherence.length - 1;
              return <span key={a.date} title={`${a.date}: ${a.taken}/${a.total}`} className={cx("flex-1 rounded-full", today ? "bg-line-2" : pct >= 1 ? "bg-violet" : pct >= 0.5 ? "bg-violet-300" : "bg-peach-ink/70")} style={{ height: `${Math.max(18, (today ? 0.3 : pct) * 100)}%` }} />;
            })}
          </div>
        </StatCard>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------- Up next */

function UpNext() {
  const { data } = useFamily();
  const next = data.visits.filter((v) => v.status !== "done" && new Date(v.at).getTime() > Date.now() - 6 * 3600000).sort((a, b) => a.at.localeCompare(b.at))[0];
  if (!next) return null;
  return (
    <Section title="Coming up">
      <Link to="/family/visits" className="flex items-center gap-3 rounded-3xl bg-white p-3 pr-4 shadow-card">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-butter"><Art name="calendar" size={44} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{next.reason}</div>
          <div className="truncate text-[12.5px] text-ink-2">{new Date(next.at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {next.place}</div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
      </Link>
    </Section>
  );
}

/* ---------------------------------------------------------------- Activity */

export function ActivityList({ limit }: { limit: number }) {
  const { data } = useFamily();
  const items = useMemo(() => {
    const out: (FeedItem & { n: number })[] = [];
    for (const f of data.feed) {
      const prev = out[out.length - 1];
      if (prev && prev.title === f.title && prev.body === f.body) prev.n++;
      else out.push({ ...f, n: 1 });
    }
    return out.slice(0, limit);
  }, [data.feed, limit]);
  if (!items.length) return <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">Doses, check-ins, papers and alerts appear here as they happen.</p>;
  return (
    <ol className="rounded-3xl bg-white px-4 shadow-card">
      {items.map((f) => (
        <li key={f.id} className="flex gap-3 border-b border-line py-3.5 last:border-b-0 animate-slidein">
          <span className={cx("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", f.level === "info" ? "bg-violet-200" : FEED_TONE[f.level].dot)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[14px] font-bold leading-snug">{f.title}{f.n > 1 && <span className="ml-1 text-[12px] font-medium text-ink-3">×{f.n}</span>}</p>
              <time className="shrink-0 text-[11.5px] text-ink-3 tnum">{clock(f.at)}</time>
            </div>
            <p className="line-clamp-2 text-[13px] leading-snug text-ink-2">{f.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
