// Hospital and clinic visits: plan them, check in (notifies the family), close with notes.
import { useState } from "react";
import { CalendarPlus, MapPin, LogIn, CheckCircle2, Stethoscope, FlaskConical, BedDouble, Repeat, BellRing } from "lucide-react";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Select, Textarea, cx, useToast } from "../../components/ui";
import type { Visit } from "../../../shared/types";
import { useFamily } from "./ctx";

const KIND: Record<Visit["kind"], { label: string; icon: typeof Stethoscope; tone: string }> = {
  opd: { label: "OPD", icon: Stethoscope, tone: "bg-info-50 text-info" },
  lab: { label: "Lab test", icon: FlaskConical, tone: "bg-brand-100 text-brand-700" },
  followup: { label: "Follow-up", icon: Repeat, tone: "bg-teal-50 text-teal" },
  admission: { label: "Admission", icon: BedDouble, tone: "bg-sos-50 text-sos" },
};

export default function Visits() {
  const { data } = useFamily();
  const [adding, setAdding] = useState(false);
  const upcoming = data.visits.filter((v) => v.status !== "done").sort((a, b) => a.at.localeCompare(b.at));
  const past = data.visits.filter((v) => v.status === "done").sort((a, b) => b.at.localeCompare(a.at));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Visits</h1>
          <p className="text-ink-2">Doctor visits, lab tests and admissions for {data.patient.nickname}.</p>
        </div>
        <Button icon={<CalendarPlus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add visit</Button>
      </div>

      <Card className="flex items-start gap-3 bg-info-50/60 p-4">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-info" />
        <p className="text-sm text-ink-2"><b className="text-ink">Checking in notifies the whole family</b>, so nobody has to ask "did Amma reach the hospital?". Saathi also shares her doctor brief with the clinic at check-in.</p>
      </Card>

      <section>
        <SectionTitle>Upcoming</SectionTitle>
        {upcoming.length === 0 ? <EmptyState icon={<CalendarPlus className="h-6 w-6" />} title="Nothing planned" action={<Button variant="outline" onClick={() => setAdding(true)}>Plan a visit</Button>}>Add the next doctor visit so Saathi can remind her the day before.</EmptyState>
          : <div className="flex flex-col gap-3">{upcoming.map((v) => <VisitCard key={v.id} v={v} />)}</div>}
      </section>
      <section>
        <SectionTitle>Past</SectionTitle>
        {past.length === 0 ? <p className="text-sm text-ink-2">No past visits recorded.</p> : <div className="flex flex-col gap-3">{past.map((v) => <VisitCard key={v.id} v={v} />)}</div>}
      </section>

      <AddVisitModal open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}

function VisitCard({ v }: { v: Visit }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "done">("view");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const k = KIND[v.kind] ?? KIND.opd;
  const d = new Date(v.at);
  async function setStatus(status: Visit["status"], n?: string) {
    setBusy(true);
    try { await api.patch(`/api/visits/${v.id}`, { status, notes: n }); toast(status === "checked_in" ? "Checked in. The family has been told." : "Visit marked done", "ok"); setMode("view"); }
    catch (e) { toast((e as Error).message, "sos"); } finally { setBusy(false); }
  }
  return (
    <Card className={cx("p-4 sm:p-5", v.status === "done" && "opacity-80")}>
      <div className="flex gap-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl bg-paper py-2 text-center">
          <span className="text-[11px] font-bold uppercase text-ink-3">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
          <span className="font-display text-2xl font-bold leading-none tnum">{d.getDate()}</span>
          <span className="text-[11px] text-ink-3">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", k.tone)}><k.icon className="h-3.5 w-3.5" />{k.label}</span>
            {v.status === "checked_in" && <Badge tone="ok" dot>Checked in</Badge>}
            {v.status === "done" && <Badge>Done</Badge>}
          </div>
          <h3 className="mt-1 text-lg font-bold leading-snug">{v.reason}</h3>
          <p className="flex items-center gap-1 text-sm text-ink-2"><MapPin className="h-3.5 w-3.5 shrink-0" />{v.place} · {d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</p>
          {v.notes && <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm">{v.notes}</p>}
          {v.status !== "done" && mode === "view" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {v.status === "scheduled" && <Button size="sm" variant="teal" loading={busy} icon={<LogIn className="h-4 w-4" />} onClick={() => setStatus("checked_in")}>Checked in</Button>}
              <Button size="sm" variant="outline" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setMode("done")}>Done</Button>
            </div>
          )}
          {mode === "done" && (
            <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void setStatus("done", notes); }}>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did the doctor say? New medicines, next visit…" autoFocus />
              <div className="flex gap-2"><Button size="sm" type="submit" loading={busy}>Save and close visit</Button><Button size="sm" type="button" variant="ghost" onClick={() => setMode("view")}>Cancel</Button></div>
            </form>
          )}
        </div>
      </div>
      {v.status === "done" && <p className="mt-2 text-right text-[11px] text-ink-3">{fmtDate(v.at)}</p>}
    </Card>
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
    catch (err) { toast((err as Error).message, "sos"); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Plan a visit">
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Reason"><Input value={f.reason} onChange={set("reason")} required placeholder="Cardiology follow-up" /></Field>
        <Field label="Hospital or clinic"><Input value={f.place} onChange={set("place")} required placeholder="Saraswathi Multispeciality, OPD 3" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type"><Select value={f.kind} onChange={set("kind")}><option value="opd">OPD</option><option value="followup">Follow-up</option><option value="lab">Lab test</option><option value="admission">Admission</option></Select></Field>
          <Field label="When"><Input type="datetime-local" value={f.at} onChange={set("at")} required /></Field>
        </div>
        <Field label="Notes (optional)"><Textarea value={f.notes} onChange={set("notes")} placeholder="Fasting needed, take last reports…" /></Field>
        <Button type="submit" size="lg" loading={busy}>Add visit</Button>
      </form>
    </Modal>
  );
}
