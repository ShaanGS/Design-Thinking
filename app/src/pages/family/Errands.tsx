// Saathi's errands, as the family sees them: what Saathi is doing for Paati right now in its sandboxed browser
// (a live picture and every step), choices that are waiting for her, and payments waiting for a family member.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Lock, PhoneCall, Plus, X } from "lucide-react";
import { api, getToken } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { fmtTime } from "../../lib/format";
import { Button, Field, Input, Spinner, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Pill, Section, type ArtName } from "../../components/kit";
import { ERRAND_TITLE, type Errand, type ErrandKind } from "../../../shared/types";
import { useFamily } from "./ctx";

const ART: Record<ErrandKind, ArtName> = { book_doctor: "stethoscope", order_medicines: "pills", book_gas: "home", electricity_bill: "folder", web_lookup: "chat" };
const ACTIVE = ["running", "needs_choice", "awaiting_approval"];
const STATUS: Record<string, { label: string; cls: string }> = {
  running: { label: "Working", cls: "bg-violet-50 text-violet-700" },
  needs_choice: { label: "Waiting for Paati", cls: "bg-butter text-butter-ink" },
  awaiting_approval: { label: "Needs your approval", cls: "bg-peach text-peach-ink" },
  done: { label: "Done", cls: "bg-mint text-mint-ink" },
  declined: { label: "Declined", cls: "bg-canvas text-ink-2" },
  failed: { label: "Couldn't finish", cls: "bg-peach text-peach-ink" },
  cancelled: { label: "Stopped", cls: "bg-canvas text-ink-2" },
};

/** All errands, kept live from the server. */
function useErrands() {
  const [list, setList] = useState<Errand[] | null>(null);
  const [frames, setFrames] = useState<Record<string, string>>({});
  useEffect(() => { api.get<{ errands: Errand[] }>("/api/errands").then((r) => setList(r.errands)).catch(() => setList([])); }, []);
  useLive<Errand>("errand", (e) => setList((l) => [e, ...(l ?? []).filter((x) => x.id !== e.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
  useLive<{ id: string; jpeg: string }>("errand_frame", (f) => setFrames((m) => ({ ...m, [f.id]: `data:image/jpeg;base64,${f.jpeg}` })));
  // Pictures taken before this page opened
  useEffect(() => {
    for (const e of list ?? []) {
      if (frames[e.id] || !ACTIVE.includes(e.status) && e.steps.length === 0) continue;
      fetch(`/api/errands/${e.id}/frame`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then((r) => (r.ok ? r.blob() : null)).then((b) => { if (b) setFrames((m) => (m[e.id] ? m : { ...m, [e.id]: URL.createObjectURL(b) })); }).catch(() => undefined);
    }
  }, [list?.map((e) => e.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  return { list, frames };
}

export function ErrandsPanel() {
  const { data } = useFamily();
  const toast = useToast();
  const { list, frames } = useErrands();
  const [adding, setAdding] = useState(false);
  const [ringing, setRinging] = useState(false);
  const shown = useMemo(() => {
    const l = list ?? [];
    const active = l.filter((e) => ACTIVE.includes(e.status));
    const recent = l.filter((e) => !ACTIVE.includes(e.status) && Date.now() - new Date(e.updatedAt).getTime() < 24 * 3600000);
    return [...active, ...recent].slice(0, 3);
  }, [list]);
  const nick = data.patient.nickname;

  async function ring() {
    setRinging(true);
    try { await api.post("/api/voice/ring", { lang: "ta" }); toast(`Saathi is calling ${nick} now`, "ok"); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setTimeout(() => setRinging(false), 4000); }
  }

  return (
    <Section className="!mt-0" title="Saathi on the phone" action={<button onClick={() => setAdding(true)} className="flex items-center gap-1 text-[13px] font-bold text-violet-600"><Plus className="h-4 w-4" />New errand</button>}>
      <div className="flex items-center gap-3 rounded-3xl bg-lilac p-4">
        <Art name="chat" size={56} className="shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-bold">{nick} just talks. Saathi does the rest.</p>
          <p className="mt-0.5 text-[12.5px] text-lilac-ink">On a normal phone call: bookings, medicines, gas, bills. Payments wait for you.</p>
        </div>
        <Pill variant="violet" size="sm" icon={PhoneCall} disabled={ringing} onClick={() => void ring()}>{ringing ? "Ringing" : `Ring ${nick}`}</Pill>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        {list === null && <div className="grid place-items-center py-6"><Spinner className="h-6 w-6 text-violet" /></div>}
        {list && shown.length === 0 && <p className="px-1 text-[13.5px] text-ink-2">No errands today. When {nick} asks Saathi on a call, it shows up here live.</p>}
        {shown.map((e) => <ErrandCard key={e.id} e={e} frame={frames[e.id]} nick={nick} elderName={data.patient.name} />)}
      </div>
      <NewErrandSheet open={adding} onClose={() => setAdding(false)} nick={nick} />
    </Section>
  );
}

function ErrandCard({ e, frame, nick, elderName }: { e: Errand; frame?: string; nick: string; elderName: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const active = ACTIVE.includes(e.status);
  const st = STATUS[e.status] ?? STATUS.running;
  const act = async (key: string, path: string, body: unknown, msg?: string) => {
    setBusy(key);
    try { await api.post(`/api/errands/${e.id}/${path}`, body); if (msg) toast(msg, "ok"); }
    catch (err) { toast((err as Error).message, "warn"); }
    finally { setBusy(null); }
  };
  return (
    <motion.article layout className="overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas"><Art name={ART[e.kind]} size={40} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15.5px] font-bold">{e.title}</div>
          <div className="truncate text-[12.5px] text-ink-2">“{e.request}”</div>
        </div>
        <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold", st.cls)}>{st.label}</span>
      </div>

      {(frame || active) && (
        <div className="mx-4 overflow-hidden rounded-2xl border border-line bg-canvas">
          <div className="flex items-center gap-2 border-b border-line bg-white px-3 py-1.5 text-[11.5px] text-ink-2">
            <Lock className="h-3 w-3 shrink-0" /><span className="truncate font-semibold">{e.site ?? "Saathi's browser"}</span>
            <span className="ml-auto shrink-0 rounded-full bg-violet-50 px-2 py-0.5 font-bold text-violet-700">Sandboxed</span>
          </div>
          {frame ? <img src={frame} alt={`What Saathi's browser shows: ${e.site ?? e.title}`} className="block aspect-[860/720] w-full object-cover object-top" />
            : <div className="grid aspect-[860/720] w-full place-items-center"><Spinner className="h-6 w-6 text-violet" /></div>}
        </div>
      )}

      <ol className="flex flex-col gap-1.5 px-4 pt-3">
        {e.steps.slice(-3).map((s, i, a) => (
          <li key={s.at + i} className="flex items-start gap-2 text-[13px] leading-snug">
            {i === a.length - 1 && e.status === "running" ? <Spinner className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-ink" strokeWidth={3} />}
            <span className="min-w-0 flex-1">{s.text}</span><span className="shrink-0 text-[11px] text-ink-3 tnum">{fmtTime(s.at)}</span>
          </li>
        ))}
      </ol>

      <div className="p-4 pt-3">
        {e.status === "needs_choice" && e.question && (
          <div className="rounded-2xl bg-butter p-3">
            <p className="text-[13.5px] font-bold text-butter-ink">Saathi is asking {nick}: {e.question.prompt}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.question.options.map((o) => (
                <button key={o} disabled={!!busy} onClick={() => void act(o, "answer", { answer: o }, `Answered for ${nick}`)}
                  className="rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold disabled:opacity-50">{o}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-butter-ink">She'll usually answer on the call. You can answer for her.</p>
          </div>
        )}
        {e.status === "awaiting_approval" && e.approval && (
          <div className="rounded-2xl bg-peach p-3">
            <p className="text-[13.5px] font-bold text-peach-ink">Approve ₹{e.approval.amount.toLocaleString("en-IN")}?</p>
            <p className="mt-0.5 text-[12.5px] text-peach-ink">{e.approval.what}</p>
            <div className="mt-2.5 flex gap-2">
              <Button variant="brand" size="sm" className="flex-1" loading={busy === "yes"} disabled={!!busy} onClick={() => void act("yes", "approve", { approve: true }, "Approved. Saathi is paying now.")}>Approve and pay</Button>
              <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void act("no", "approve", { approve: false }, "Declined. Nothing was paid.")}>Decline</Button>
            </div>
          </div>
        )}
        {e.result && !active && <p className={cx("rounded-2xl p-3 text-[13.5px] leading-snug", e.status === "done" ? "bg-mint text-mint-ink" : "bg-canvas text-ink-2")}>{e.result}</p>}
        {active && (
          <button disabled={!!busy} onClick={() => void act("cancel", "cancel", {}, "Stopped. Nothing was paid.")} className="mt-2 flex items-center gap-1 text-[12.5px] font-semibold text-ink-3">
            <X className="h-3.5 w-3.5" />Stop this errand
          </button>
        )}
        <p className="mt-2 text-[11px] text-ink-3">{e.driver === "claude" ? "Claude is operating the browser" : "Saathi's standard steps for this site"} · started by {e.startedBy === elderName ? `${nick} on her call` : e.startedBy}</p>
      </div>
    </motion.article>
  );
}

const KINDS: { kind: ErrandKind; hint: string }[] = [
  { kind: "book_doctor", hint: "Dr Raman, the heart doctor, this week" },
  { kind: "order_medicines", hint: "Her tablets that are running out" },
  { kind: "book_gas", hint: "A gas cylinder refill" },
  { kind: "electricity_bill", hint: "Check this month's bill" },
  { kind: "web_lookup", hint: "Kapaleeshwarar temple timings tomorrow" },
];

function NewErrandSheet({ open, onClose, nick }: { open: boolean; onClose: () => void; nick: string }) {
  const toast = useToast();
  const [kind, setKind] = useState<ErrandKind>("book_gas");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const hint = KINDS.find((k) => k.kind === kind)!.hint;
  async function start() {
    setBusy(true);
    try { await api.post("/api/errands", { kind, request: text.trim() || hint }); toast("Saathi is on it", "ok"); setText(""); onClose(); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(false); }
  }
  return (
    <BottomSheet open={open} onClose={onClose} title={`An errand for ${nick}`}>
      <div className="grid grid-cols-2 gap-2">
        {KINDS.map((k) => (
          <button key={k.kind} onClick={() => setKind(k.kind)} className={cx("flex items-center gap-2 rounded-2xl border-2 p-2.5 text-left text-[13px] font-bold", kind === k.kind ? "border-violet bg-violet-50 text-violet-700" : "border-line bg-white")}>
            <Art name={ART[k.kind]} size={32} className="shrink-0" />{ERRAND_TITLE[k.kind]}
          </button>
        ))}
      </div>
      <div className="mt-4"><Field label="What exactly?"><Input value={text} onChange={(e) => setText(e.target.value)} placeholder={hint} /></Field></div>
      <p className="mt-2 text-[12.5px] text-ink-2">Saathi asks {nick} on her call if there's a choice to make. Anything that costs money waits for your approval.</p>
      <Button variant="brand" size="lg" className="mt-4 w-full" loading={busy} onClick={() => void start()}>Start</Button>
    </BottomSheet>
  );
}
