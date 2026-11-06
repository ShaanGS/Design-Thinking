// The "+" sheet: add a reading, upload a paper, add a medicine, book a visit.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Button, Field, Input, Segmented, cx, useToast } from "../../components/ui";
import { BottomSheet, Tile } from "../../components/kit";
import type { Vital } from "../../../shared/types";
import { useFamily } from "./ctx";

type View = "menu" | "reading";

export default function AddSheet({ open, onClose, start = "menu" }: { open: boolean; onClose: () => void; start?: View }) {
  const [view, setView] = useState<View>(start);
  const nav = useNavigate();
  const { data } = useFamily();
  const close = () => { onClose(); setTimeout(() => setView(start), 300); };
  const go = (to: string) => { close(); nav(to); };
  const title = view === "reading" ? "Add a reading" : "Add";
  return (
    <BottomSheet open={open} onClose={close} title={title}>
      {view === "menu" && (
        <div className="grid grid-cols-2 gap-3">
          <Tile tone="mint" art="heart" title="Add a reading" sub="BP, sugar, pulse, oxygen" onClick={() => setView("reading")} />
          <Tile tone="lilac" art="chat" title="Ask Saathi" sub="About her papers" onClick={() => go("/family/vault?ask=1")} />
          <Tile tone="sky" art="folder" title="Upload a paper" sub="Prescription, lab, scan" onClick={() => go("/family/vault?upload=1")} />
          <Tile tone="peach" art="pills" title="Add a medicine" sub="Checked against her list" onClick={() => go("/family/meds?add=1")} />
          <Tile tone="butter" art="calendar" title="Book a visit" sub={`For ${data.patient.nickname}`} onClick={() => go("/family/visits?add=1")} />
          <Tile tone="rose" art="cpr" title="CPR coach" sub="Practice the rhythm" onClick={() => go("/family/emergency?cpr=1")} />
        </div>
      )}
      {view === "reading" && <ReadingForm onDone={close} />}
    </BottomSheet>
  );
}

function ReadingForm({ onDone }: { onDone: () => void }) {
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
      toast("Reading saved", "ok"); setA(""); setB(""); onDone();
    } catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Segmented value={type} onChange={(v) => { setType(v); setA(""); setB(""); }} options={[{ value: "bp", label: "BP" }, { value: "sugar", label: "Sugar" }, { value: "hr", label: "Pulse" }, { value: "spo2", label: "Oxygen" }]} />
      <div className={cx("grid gap-3", type === "bp" && "grid-cols-2")}>
        <Field label={`${meta.label} (${meta.unit})`}><Input type="number" inputMode="numeric" required min={1} value={a} onChange={(e) => setA(e.target.value)} placeholder={meta.ph} className="font-display text-xl font-bold tnum" /></Field>
        {type === "bp" && <Field label="Diastolic (mmHg)"><Input type="number" inputMode="numeric" required min={1} value={b} onChange={(e) => setB(e.target.value)} placeholder="84" className="font-display text-xl font-bold tnum" /></Field>}
      </div>
      <p className="text-[13.5px] text-ink-2">Readings outside the usual range are flagged to the whole family.</p>
      <Button type="submit" variant="brand" size="lg" loading={busy}>Save reading</Button>
    </form>
  );
}
