// Hospital and clinic visits: the next one up front, a timeline of the rest, check in (tells the family) and close with notes.
// "?add=1" opens the add sheet.
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarPlus, MapPin, Clock, Check, NotebookPen } from "lucide-react";
import { api } from "../../lib/api";
import { Button, Field, Input, Textarea, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Pill, Section, TopBar, type ArtName, type Tone, TONE_BG } from "../../components/kit";
import type { Visit } from "../../../shared/types";
import { pronoun, useFamily } from "./ctx";

const KIND: Record<Visit["kind"], { label: string; art: ArtName; tone: Tone }> = {
  opd: { label: "OPD", art: "stethoscope", tone: "sky" },
  lab: { label: "Lab test", art: "blood", tone: "rose" },
  followup: { label: "Follow-up", art: "heart", tone: "lilac" },
  admission: { label: "Admission", art: "bed", tone: "peach" },
};
const kindOf = (k: Visit["kind"]) => KIND[k] ?? KIND.opd;

function until(iso: string) {
  const d = new Date(iso), now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(d) - day(now)) / 86400000);
  if (days === 0) return d.getTime() < now.getTime() ? "Today, now" : "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days} days`;
  return `${-days} days ago`;
}
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function Visits() {
  const { data } = useFamily();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(params.get("add") === "1");
  useEffect(() => { if (params.get("add") === "1") setAdding(true); }, [params]);
  const closeAdd = () => { setAdding(false); if (params.has("add")) setParams({}, { replace: true }); };

  const upcoming = data.visits.filter((v) => v.status !== "done").sort((a, b) => a.at.localeCompare(b.at));
  const past = data.visits.filter((v) => v.status === "done").sort((a, b) => b.at.localeCompare(a.at));
  const [next, ...later] = upcoming;
  const p = data.patient;
  const pr = pronoun(p.sex);

  return (
    <div>
      <TopBar title="Visits" sub={`${upcoming.length} coming up · ${past.length} done`}
        right={<Pill variant="violet" size="sm" icon={CalendarPlus} onClick={() => setAdding(true)}>Add</Pill>} />

      <div className="px-4 pb-32">
        {next ? <NextVisit v={next} /> : (
          <div className="relative overflow-hidden rounded-3xl bg-butter p-5">
            <div className="max-w-[62%]">
              <div className="font-display text-[19px] font-extrabold leading-tight">Nothing planned</div>
              <p className="mt-1 text-[13px] text-butter-ink">Add {p.nickname}'s next doctor visit so Saathi can remind {pr.obj} the day before.</p>
              <Pill variant="ink" size="sm" icon={CalendarPlus} className="mt-3" onClick={() => setAdding(true)}>Plan a visit</Pill>
            </div>
            <Art name="calendar" size={120} className="absolute -bottom-3 -right-2" />
          </div>
        )}

        <p className="mt-3 flex items-start gap-2 px-1 text-[12.5px] leading-snug text-ink-2">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint-ink" strokeWidth={3} />
          Checking in tells the whole family {pr.sub} reached, and shares {pr.pos} doctor brief with the clinic.
        </p>

        {later.length > 0 && (
          <Section title="Later">
            <ol className="relative ml-1 flex flex-col gap-3 border-l-2 border-dashed border-violet-200 pl-5">
              {later.map((v) => <li key={v.id} className="relative"><span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full bg-violet ring-4 ring-canvas" /><VisitCard v={v} /></li>)}
            </ol>
          </Section>
        )}

        <Section title="Past visits">
          {past.length === 0 ? <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">No past visits recorded.</p> : (
            <ol className="relative ml-1 flex flex-col gap-3 border-l-2 border-line-2 pl-5">
              {past.map((v) => <li key={v.id} className="relative"><span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full bg-line-2 ring-4 ring-canvas" /><VisitCard v={v} /></li>)}
            </ol>
          )}
        </Section>
      </div>

      <AddVisitSheet open={adding} onClose={closeAdd} />
    </div>
  );
}

/* ---------------------------------------------------------------- Actions shared by the hero and the cards */

function useVisitActions(v: Visit) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function setStatus(status: Visit["status"], notes?: string) {
    setBusy(true);
    try { await api.patch(`/api/visits/${v.id}`, { status, notes }); toast(status === "checked_in" ? "Checked in. The family has been told." : "Visit marked done", "ok"); return true; }
    catch (e) { toast((e as Error).message, "warn"); return false; } finally { setBusy(false); }
  }
  return { busy, setStatus };
}

function CloseForm({ v, onCancel, onDone }: { v: Visit; onCancel: () => void; onDone: () => void }) {
  const { busy, setStatus } = useVisitActions(v);
  const [notes, setNotes] = useState("");
  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={async (e) => { e.preventDefault(); if (await setStatus("done", notes)) onDone(); }}>
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the doctor say? New medicines, next visit…" autoFocus className="bg-white" />
      <div className="flex gap-2"><Button size="sm" variant="brand" type="submit" loading={busy}>Save and close</Button><Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>
    </form>
  );
}

/* ---------------------------------------------------------------- Next visit hero */

function NextVisit({ v }: { v: Visit }) {
  const { busy, setStatus } = useVisitActions(v);
  const [closing, setClosing] = useState(false);
  const k = kindOf(v.kind);
  const d = new Date(v.at);
  const checked = v.status === "checked_in";
  return (
    <motion.div layout className="hero-violet relative overflow-hidden rounded-[28px] p-5 text-white shadow-lift">
      <Art name="calendar" size={112} className="absolute -right-3 -top-3" float />
      <div className="relative max-w-[66%]">
        <span className="glass inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-bold">{checked ? "Checked in" : `Next · ${until(v.at)}`}</span>
        <div className="mt-2 font-display text-[21px] font-extrabold leading-tight">{v.reason}</div>
      </div>
      <div className="relative mt-4 flex items-stretch gap-3">
        <div className="grid w-16 shrink-0 place-items-center rounded-2xl bg-white py-2 text-ink">
          <div className="text-center leading-none">
            <div className="font-display text-[26px] font-extrabold tnum">{d.getDate()}</div>
            <div className="mt-0.5 text-[11.5px] font-bold uppercase text-violet-700">{d.toLocaleDateString("en-IN", { month: "short" })}</div>
          </div>
        </div>
        <div className="min-w-0 flex-1 text-[13px] leading-snug">
          <div className="flex items-center gap-1.5 font-semibold"><Clock className="h-3.5 w-3.5 shrink-0" />{d.toLocaleDateString("en-IN", { weekday: "long" })}, {timeOf(v.at)}</div>
          <div className="mt-1 flex items-start gap-1.5 text-white/85"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{v.place}</span></div>
          <div className="mt-1 text-white/70">{k.label}</div>
        </div>
      </div>
      {v.notes && <p className="relative mt-3 rounded-2xl bg-white/15 px-3 py-2 text-[13px] leading-snug">{v.notes}</p>}
      {closing ? (
        <div className="relative rounded-2xl bg-white/95 p-3 pt-0 text-ink"><CloseForm v={v} onCancel={() => setClosing(false)} onDone={() => setClosing(false)} /></div>
      ) : (
        <div className="relative mt-4 flex gap-2">
          {!checked && <Pill variant="white" size="md" icon={Check} className="flex-1" disabled={busy} onClick={() => void setStatus("checked_in")}>Check in</Pill>}
          <Pill variant="glass" size="md" icon={NotebookPen} className={cx(checked && "flex-1")} onClick={() => setClosing(true)}>{checked ? "Close visit with notes" : "Done"}</Pill>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Visit card */

function VisitCard({ v }: { v: Visit }) {
  const { busy, setStatus } = useVisitActions(v);
  const [closing, setClosing] = useState(false);
  const k = kindOf(v.kind);
  const d = new Date(v.at);
  const done = v.status === "done";
  return (
    <motion.div layout className={cx("rounded-3xl bg-white p-4 shadow-card", done && "bg-white/70")}>
      <div className="flex items-start gap-3">
        <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", done ? "bg-canvas" : TONE_BG[k.tone])}><Art name={k.art} size={38} className={done ? "opacity-70 grayscale-[.4]" : undefined} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cx("text-[15px] font-bold leading-snug", done && "text-ink-2")}>{v.reason}</h3>
            {v.status === "checked_in" && <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[11.5px] font-bold text-mint-ink">Checked in</span>}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-2 tnum">
            {d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined })} · {timeOf(v.at)} · {k.label}
          </p>
          <p className="mt-0.5 flex items-start gap-1 text-[12.5px] text-ink-3"><MapPin className="mt-[2px] h-3 w-3 shrink-0" />{v.place}</p>
        </div>
      </div>
      {v.notes && <p className={cx("mt-3 rounded-2xl px-3 py-2 text-[13px] leading-snug", done ? "bg-canvas text-ink" : "bg-butter text-ink")}>{v.notes}</p>}
      {!done && !closing && (
        <div className="mt-3 flex gap-2">
          {v.status === "scheduled" && <Pill variant="soft" size="sm" icon={Check} disabled={busy} onClick={() => void setStatus("checked_in")}>Check in</Pill>}
          <Pill variant="soft" size="sm" icon={NotebookPen} onClick={() => setClosing(true)}>Done</Pill>
        </div>
      )}
      {closing && <CloseForm v={v} onCancel={() => setClosing(false)} onDone={() => setClosing(false)} />}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Add a visit */

function AddVisitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { data } = useFamily();
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(10, 0, 0, 0);
  const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [f, setF] = useState<{ place: string; reason: string; kind: Visit["kind"]; at: string; notes: string }>({ place: "", reason: "", kind: "opd", at: local, notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: "place" | "reason" | "at" | "notes") => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await api.post("/api/visits", { ...f, at: new Date(f.at).toISOString() }); toast("Visit added. The family can see it.", "ok"); setF({ ...f, place: "", reason: "", notes: "" }); onClose(); }
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Plan a visit" tall>
      <form onSubmit={save} className="flex flex-col gap-4">
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold">Type</legend>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(KIND) as Visit["kind"][]).map((k) => (
              <button key={k} type="button" aria-pressed={f.kind === k} onClick={() => setF((x) => ({ ...x, kind: k }))}
                className={cx("flex flex-col items-center gap-1 rounded-2xl py-2 text-[11.5px] font-bold transition", f.kind === k ? cx(TONE_BG[KIND[k].tone], "ring-2 ring-violet") : "bg-canvas text-ink-2")}>
                <Art name={KIND[k].art} size={34} />{KIND[k].label}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Reason"><Input value={f.reason} onChange={set("reason")} required placeholder="Cardiology follow-up" /></Field>
        <Field label="Hospital or clinic"><Input value={f.place} onChange={set("place")} required placeholder="Saraswathi Multispeciality, OPD 3" /></Field>
        <Field label="When"><Input type="datetime-local" value={f.at} onChange={set("at")} required /></Field>
        <Field label="Notes (optional)"><Textarea value={f.notes} onChange={set("notes")} placeholder="Fasting needed, take last reports…" /></Field>
        <p className="text-[12.5px] text-ink-2">Saathi reminds {data.patient.nickname} the day before, in Tamil.</p>
        <Button type="submit" variant="brand" size="lg" loading={busy}>Add visit</Button>
      </form>
    </BottomSheet>
  );
}
