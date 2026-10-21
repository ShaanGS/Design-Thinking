// Hospital and clinic visits: plan them, check in (notifies the family), close with notes.
import { useState } from "react";
import { CalendarPlus, MapPin } from "lucide-react";
import { api } from "../../lib/api";
import { Badge, Button, Field, Input, Modal, SectionTitle, Select, Textarea, cx, useToast } from "../../components/ui";
import type { Visit } from "../../../shared/types";
import { useFamily } from "./ctx";

const KIND: Record<Visit["kind"], string> = { opd: "OPD", lab: "Lab test", followup: "Follow-up", admission: "Admission" };

export default function Visits() {
  const { data } = useFamily();
  const [adding, setAdding] = useState(false);
  const upcoming = data.visits.filter((v) => v.status !== "done").sort((a, b) => a.at.localeCompare(b.at));
  const past = data.visits.filter((v) => v.status === "done").sort((a, b) => b.at.localeCompare(a.at));
  const next = upcoming[0];
  const p = data.patient;
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[40rem]">
          <h1 className="text-[34px] font-semibold leading-tight sm:text-[40px]" style={{ fontStretch: "85%" }}>Visits</h1>
          <p className="text-[16px] text-ink-2">
            {next ? <>Next: <b className="text-ink">{next.reason}</b>, {new Date(next.at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}.</> : `Nothing planned for ${p.nickname}.`}
          </p>
          <p className="mt-1 text-[14px] text-ink-3">Checking in tells the whole family {p.sex === "M" ? "he" : "she"} reached, and shares {p.sex === "M" ? "his" : "her"} doctor brief with the clinic.</p>
        </div>
        <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add visit</Button>
      </header>

      <section>
        <SectionTitle>Upcoming</SectionTitle>
        {upcoming.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-5">
            <p className="text-[15px] text-ink-2">Add the next doctor visit so Saathi can remind {p.nickname} the day before.</p>
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>Plan a visit</Button>
          </div>
        ) : <ul className="divide-y divide-line rounded-xl border border-line bg-white">{upcoming.map((v) => <VisitRow key={v.id} v={v} />)}</ul>}
      </section>
      <section>
        <SectionTitle>Past</SectionTitle>
        {past.length === 0 ? <p className="text-[15px] text-ink-2">No past visits recorded.</p>
          : <ul className="divide-y divide-line rounded-xl border border-line bg-white">{past.map((v) => <VisitRow key={v.id} v={v} />)}</ul>}
      </section>

      <AddVisitModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function VisitRow({ v }: { v: Visit }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "done">("view");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const d = new Date(v.at);
  const done = v.status === "done";
  async function setStatus(status: Visit["status"], n?: string) {
    setBusy(true);
    try { await api.patch(`/api/visits/${v.id}`, { status, notes: n }); toast(status === "checked_in" ? "Checked in. The family has been told." : "Visit marked done", "ok"); setMode("view"); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <li className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 px-4 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:px-5">
      <div className={cx("leading-none", done && "text-ink-2")}>
        <div className="font-display text-[30px] font-semibold tnum">{d.getDate()}</div>
        <div className="mt-1 text-[13px] text-ink-2">{d.toLocaleDateString("en-IN", { month: "short" })}{d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}</div>
        <div className="text-[13px] text-ink-3">{d.toLocaleDateString("en-IN", { weekday: "short" })}</div>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className={cx("text-[17px] font-semibold leading-snug", done && "text-ink-2")}>{v.reason}</h3>
          {v.status === "checked_in" && <Badge tone="ok" dot>Checked in</Badge>}
        </div>
        <p className="mt-0.5 text-[14px] text-ink-2">{KIND[v.kind] ?? "OPD"} · <span className="tnum">{d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span></p>
        <p className="flex items-start gap-1.5 text-[14px] text-ink-2"><MapPin className="mt-[3px] h-3.5 w-3.5 shrink-0 text-ink-3" />{v.place}</p>
        {v.notes && <p className="mt-2 border-l-2 border-line-2 pl-3 text-[15px] text-ink">{v.notes}</p>}
        {!done && mode === "view" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {v.status === "scheduled" && <Button size="sm" variant="outline" loading={busy} onClick={() => setStatus("checked_in")}>Mark checked in</Button>}
            <Button size="sm" variant="ghost" onClick={() => setMode("done")}>Close visit</Button>
          </div>
        )}
        {mode === "done" && (
          <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void setStatus("done", notes); }}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the doctor say? New medicines, next visit…" autoFocus />
            <div className="flex gap-2"><Button size="sm" type="submit" loading={busy}>Save and close</Button><Button size="sm" type="button" variant="ghost" onClick={() => setMode("view")}>Cancel</Button></div>
          </form>
        )}
      </div>
    </li>
  );
}

function AddVisitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const tomorrow = new Date(Date.now() + 86400000); tomorrow.setHours(10, 0, 0, 0);
  const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [f, setF] = useState({ place: "", reason: "", kind: "opd", at: local, notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await api.post("/api/visits", { ...f, at: new Date(f.at).toISOString() }); toast("Visit added. The family can see it.", "ok"); setF({ ...f, place: "", reason: "", notes: "" }); onClose(); }
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Plan a visit">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Reason"><Input value={f.reason} onChange={set("reason")} required placeholder="Cardiology follow-up" /></Field>
        <Field label="Hospital or clinic"><Input value={f.place} onChange={set("place")} required placeholder="Saraswathi Multispeciality, OPD 3" /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type"><Select value={f.kind} onChange={set("kind")}><option value="opd">OPD</option><option value="followup">Follow-up</option><option value="lab">Lab test</option><option value="admission">Admission</option></Select></Field>
          <Field label="When"><Input type="datetime-local" value={f.at} onChange={set("at")} required /></Field>
        </div>
        <Field label="Notes (optional)"><Textarea value={f.notes} onChange={set("notes")} placeholder="Fasting needed, take last reports…" /></Field>
        <Button type="submit" size="lg" loading={busy}>Add visit</Button>
      </form>
    </Modal>
  );
}
