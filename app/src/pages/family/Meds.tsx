// Medicines: schedule, today's doses, stock and refills, adding with live safety checks.
import { useEffect, useRef, useState } from "react";
import { Pill, Plus, AlertTriangle, CheckCircle2, ShoppingCart, PencilLine, Ban, Check } from "lucide-react";
import { api } from "../../lib/api";
import { fmtTime } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, SectionTitle, Spinner, cx, useToast } from "../../components/ui";
import { SLOT_LABEL, type Medication, type Slot } from "../../../shared/types";
import { useFamily } from "./ctx";
import { PILL_COLORS } from "./constants";

type Warning = { level: "ok" | "warn"; message: string };
const SLOTS: Slot[] = ["morning", "afternoon", "night"];

export default function Meds() {
  const { data } = useFamily();
  const toast = useToast();
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const p = data.patient;

  const load = () => api.get<Medication[]>("/api/meds").then(setMeds).catch((e) => toast(e.message, "sos"));
  useEffect(() => { void load(); }, [data.today]); // overview pushes arrive after every medicine change

  async function dose(medId: string, slot: Slot, status: "taken" | "missed") {
    setBusy(medId + slot + status);
    try { await api.post("/api/doses", { medId, slot, status }); } catch (e) { toast((e as Error).message, "sos"); } finally { setBusy(null); }
  }

  const perDay = (meds ?? []).reduce((n, m) => n + m.slots.length, 0);
  const low = (meds ?? []).filter((m) => daysLeft(m) <= 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Medicines</h1>
          <p className="text-ink-2">{meds ? `${meds.length} medicines · ${perDay} doses a day` : "Loading…"} · Saathi reminds {p.nickname} on her daily call.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add medicine</Button>
      </div>

      {low.length > 0 && (
        <Card className="flex flex-col gap-3 border-warn/40 bg-warn-50 p-4 sm:flex-row sm:items-center">
          <ShoppingCart className="h-6 w-6 shrink-0 text-warn" />
          <div className="min-w-0 flex-1"><div className="font-semibold">Running low: {low.map((m) => m.name).join(", ")}</div><div className="text-sm text-ink-2">Order before {p.nickname} misses a dose.</div></div>
          <Button variant="outline" onClick={() => toast(`Refill request for ${low.map((m) => m.name).join(", ")} sent to Sri Balaji Medicals (demo)`, "ok")}>Reorder all</Button>
        </Card>
      )}

      <section>
        <SectionTitle>Today</SectionTitle>
        <Card className="divide-y divide-line">
          {data.today.length === 0 && <div className="p-5"><EmptyState icon={<Pill className="h-6 w-6" />} title="No doses scheduled today" /></div>}
          {SLOTS.map((slot) => {
            const items = data.today.filter((d) => d.slot === slot);
            if (!items.length) return null;
            return (
              <div key={slot} className="px-4 py-3 sm:px-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-3">{SLOT_LABEL[slot].en}<span className="font-tamil normal-case tracking-normal">{SLOT_LABEL[slot].ta}</span><span className="font-normal normal-case tracking-normal">· around {SLOT_LABEL[slot].hour > 12 ? SLOT_LABEL[slot].hour - 12 + " PM" : SLOT_LABEL[slot].hour + " AM"}</span></div>
                <ul className="flex flex-col gap-2">
                  {items.map((d) => (
                    <li key={d.med.id + slot} className="flex items-center gap-3">
                      <span className="h-4 w-7 shrink-0 rounded-full border border-ink/15" style={{ background: d.med.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate"><span className="font-semibold">{d.med.name}</span> <span className="text-sm text-ink-3">{d.med.dose}</span></div>
                        <div className="mt-0.5">
                          {d.status === "taken" ? <Badge tone="ok"><Check className="h-3 w-3" />Taken {d.at ? fmtTime(d.at) : ""}</Badge>
                            : d.status === "missed" ? <Badge tone="sos">Missed</Badge>
                            : d.status === "due" ? <Badge tone="warn">Due now</Badge> : <Badge>Later today</Badge>}
                        </div>
                      </div>
                      {d.status !== "taken" && (
                        <div className="flex shrink-0 gap-1.5">
                          <Button size="sm" variant="teal" loading={busy === d.med.id + slot + "taken"} onClick={() => dose(d.med.id, slot, "taken")}>Taken</Button>
                          {d.status !== "missed" && <Button size="sm" variant="outline" className="hidden sm:inline-flex" loading={busy === d.med.id + slot + "missed"} onClick={() => dose(d.med.id, slot, "missed")}>Missed</Button>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </Card>
      </section>

      <section>
        <SectionTitle>All medicines</SectionTitle>
        {!meds ? <div className="grid place-items-center py-10"><Spinner /></div> : meds.length === 0 ? (
          <EmptyState icon={<Pill className="h-6 w-6" />} title="No medicines yet" action={<Button onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>Add the first one</Button>}>
            Add them here, or photograph prescriptions in the Health Vault.
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {meds.map((m) => <MedCard key={m.id} med={m} onChanged={load} />)}
          </div>
        )}
      </section>

      <AddMedModal open={adding} onClose={() => setAdding(false)} onAdded={load} />
    </div>
  );
}

const daysLeft = (m: Medication) => Math.floor(m.stock / Math.max(1, m.slots.length));

function MedCard({ med, onChanged }: { med: Medication; onChanged: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "stock" | "stop">("view");
  const [stock, setStock] = useState(String(med.stock));
  const [busy, setBusy] = useState(false);
  const days = daysLeft(med);
  async function patch(body: object, ok: string) {
    setBusy(true);
    try { await api.patch(`/api/meds/${med.id}`, body); toast(ok, "ok"); setMode("view"); onChanged(); }
    catch (e) { toast((e as Error).message, "sos"); } finally { setBusy(false); }
  }
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper">
          <span className="h-5 w-9 rounded-full border border-ink/15 shadow-inner" style={{ background: med.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2"><h3 className="text-lg font-bold">{med.name}</h3><span className="text-ink-2">{med.dose}</span></div>
          <p className="text-sm text-ink-2">{[med.generic && med.generic.toLowerCase() !== med.name.toLowerCase() ? med.generic : null, med.purpose].filter(Boolean).join(" · ") || "—"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{med.slots.map((s) => <Badge key={s} tone="info">{SLOT_LABEL[s].en}</Badge>)}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-paper px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-3">Stock</div>
          <div className="font-semibold tnum">{med.stock} tablets · {days} day{days === 1 ? "" : "s"} left</div>
        </div>
        {days <= 5 && <Badge tone={days <= 2 ? "sos" : "warn"}>Running low</Badge>}
      </div>
      {med.prescribedBy && <p className="mt-2 text-xs text-ink-3">Prescribed by {med.prescribedBy}</p>}

      {mode === "view" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="soft" icon={<ShoppingCart className="h-4 w-4" />} onClick={() => toast(`Refill for ${med.name} sent to the pharmacy (demo)`, "ok")}>Reorder</Button>
          <Button size="sm" variant="ghost" icon={<PencilLine className="h-4 w-4" />} onClick={() => setMode("stock")}>Update stock</Button>
          <Button size="sm" variant="ghost" className="text-sos" icon={<Ban className="h-4 w-4" />} onClick={() => setMode("stop")}>Stop</Button>
        </div>
      )}
      {mode === "stock" && (
        <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void patch({ stock: Number(stock) }, "Stock updated"); }}>
          <Field label="Tablets in hand"><Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="w-32 font-mono" autoFocus /></Field>
          <Button type="submit" loading={busy}>Save</Button>
          <Button type="button" variant="ghost" onClick={() => setMode("view")}>Cancel</Button>
        </form>
      )}
      {mode === "stop" && (
        <div className="mt-4 rounded-xl border border-sos/30 bg-sos-50 p-3">
          <p className="text-sm font-semibold">Stop {med.name}?</p>
          <p className="text-xs text-ink-2">Only do this if the doctor stopped it. Saathi will stop reminding her.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="sos" loading={busy} onClick={() => patch({ active: false }, `${med.name} stopped`)}>Yes, stop it</Button>
            <Button size="sm" variant="outline" onClick={() => setMode("view")}>Keep it</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function AddMedModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const empty = { name: "", generic: "", dose: "", purpose: "", stock: "30", color: PILL_COLORS[0], prescribedBy: "" };
  const [f, setF] = useState(empty);
  const [slots, setSlots] = useState<Slot[]>(["morning"]);
  const [warnings, setWarnings] = useState<Warning[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ name: string; warnings: Warning[] } | null>(null);
  const timer = useRef<number>();
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));

  // Live safety check while typing (debounced)
  useEffect(() => {
    if (!open) return;
    window.clearTimeout(timer.current);
    if (f.name.trim().length < 3) { setWarnings(null); return; }
    timer.current = window.setTimeout(async () => {
      setChecking(true);
      try { setWarnings(await api.post<Warning[]>("/api/meds/check", { name: f.name, generic: f.generic })); } catch { setWarnings(null); } finally { setChecking(false); }
    }, 600);
    return () => window.clearTimeout(timer.current);
  }, [f.name, f.generic, open]);

  function close() { setF(empty); setSlots(["morning"]); setWarnings(null); setResult(null); onClose(); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!slots.length) { toast("Pick at least one time of day", "sos"); return; }
    setBusy(true);
    try {
      const r = await api.post<{ med: Medication; warnings: Warning[] }>("/api/meds", { ...f, stock: Number(f.stock), slots });
      onAdded();
      setResult({ name: r.med?.name ?? f.name, warnings: r.warnings });
    } catch (err) { toast((err as Error).message, "sos"); } finally { setBusy(false); }
  }

  const hasWarn = warnings?.some((w) => w.level === "warn");
  return (
    <Modal open={open} onClose={close} title={result ? "Medicine added" : "Add a medicine"}>
      {result ? (
        <div className="flex flex-col gap-4">
          <p><b>{result.name}</b> is on the schedule and the family has been notified.</p>
          <WarningList warnings={result.warnings} />
          <Button size="lg" onClick={close}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name on the strip"><Input value={f.name} onChange={set("name")} required placeholder="e.g. Glycomet 500" autoFocus /></Field>
            <Field label="Generic (if known)"><Input value={f.generic} onChange={set("generic")} placeholder="e.g. metformin" /></Field>
            <Field label="Dose"><Input value={f.dose} onChange={set("dose")} placeholder="500 mg" /></Field>
            <Field label="What it's for"><Input value={f.purpose} onChange={set("purpose")} placeholder="Diabetes" /></Field>
          </div>

          {(checking || warnings) && (
            <div aria-live="polite">
              {checking && !warnings ? <p className="flex items-center gap-2 text-sm text-ink-2"><Spinner className="h-4 w-4" />Checking against her medicines and allergies…</p> : warnings && <WarningList warnings={warnings} />}
            </div>
          )}

          <div>
            <span className="mb-1 block text-sm font-semibold text-ink-2">When</span>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => {
                const on = slots.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => setSlots((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                    className={cx("rounded-xl border px-4 py-2 text-sm font-semibold transition", on ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2 hover:border-ink-3")}>
                    {SLOT_LABEL[s].en}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tablets in hand"><Input type="number" min={0} value={f.stock} onChange={set("stock")} className="font-mono" /></Field>
            <Field label="Prescribed by"><Input value={f.prescribedBy} onChange={set("prescribedBy")} placeholder="Dr. Raman" /></Field>
          </div>
          <div>
            <span className="mb-1 block text-sm font-semibold text-ink-2">Tablet colour (helps her recognise it)</span>
            <div className="flex flex-wrap gap-2">
              {PILL_COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={f.color === c} onClick={() => setF((x) => ({ ...x, color: c }))}
                  className={cx("h-9 w-12 rounded-full border-2 transition", f.color === c ? "border-ink scale-110" : "border-line")} style={{ background: c }} />
              ))}
            </div>
          </div>
          <Button type="submit" size="lg" loading={busy} variant={hasWarn ? "outline" : "primary"}>{hasWarn ? "Add anyway (doctor approved)" : "Add medicine"}</Button>
        </form>
      )}
    </Modal>
  );
}

function WarningList({ warnings }: { warnings: Warning[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {warnings.map((w, i) => (
        <li key={i} className={cx("flex gap-2 rounded-xl px-3 py-2.5 text-sm", w.level === "warn" ? "bg-sos-50 text-ink" : "bg-teal-50 text-teal")}>
          {w.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sos" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}

