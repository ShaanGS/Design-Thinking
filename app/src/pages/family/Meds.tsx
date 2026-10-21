// Medicines: today's strip, the full list with stock, and adding with a live safety check.
import { useEffect, useRef, useState } from "react";
import { Plus, AlertTriangle, Check } from "lucide-react";
import { api } from "../../lib/api";
import { fmtTime } from "../../lib/format";
import { Badge, Button, Field, Input, Modal, SectionTitle, Spinner, cx, useToast } from "../../components/ui";
import Blister from "../../components/Blister";
import { SLOT_LABEL, type Medication, type Slot } from "../../../shared/types";
import { SLOTS, slotTime, toBlister, useFamily } from "./ctx";
import { PILL_COLORS } from "./constants";

type Warning = { level: "ok" | "warn"; message: string };
const daysLeft = (m: Medication) => Math.floor(m.stock / Math.max(1, m.slots.length));

export default function Meds() {
  const { data } = useFamily();
  const toast = useToast();
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const p = data.patient;

  const load = () => api.get<Medication[]>("/api/meds").then(setMeds).catch((e) => toast(e.message, "warn"));
  useEffect(() => { void load(); }, [data.today]); // overview pushes arrive after every medicine change

  async function dose(medId: string, slot: Slot, status: "taken" | "missed") {
    setBusy(medId + slot + status);
    try { await api.post("/api/doses", { medId, slot, status }); } catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(null); }
  }

  const perDay = (meds ?? []).reduce((n, m) => n + m.slots.length, 0);
  const low = (meds ?? []).filter((m) => daysLeft(m) <= 5);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-semibold leading-tight sm:text-[40px]" style={{ fontStretch: "85%" }}>Medicines</h1>
          <p className="text-[16px] text-ink-2">{meds ? `${meds.length} medicines, ${perDay} doses a day.` : "Loading…"} Saathi reminds {p.nickname} on {p.sex === "M" ? "his" : "her"} daily call.</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Add medicine</Button>
      </header>

      {low.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-l-[3px] border-warn bg-white py-3 pl-4 pr-3">
          <p className="min-w-0 flex-1 text-[15px]"><b>Running low:</b> {low.map((m) => `${m.name} (${daysLeft(m)} day${daysLeft(m) === 1 ? "" : "s"} left)`).join(", ")}</p>
          <Button size="sm" variant="outline" onClick={() => toast(`Refill request for ${low.map((m) => m.name).join(", ")} sent to Sri Balaji Medicals (demo)`, "ok")}>Reorder</Button>
        </div>
      )}

      <section>
        <SectionTitle>Today</SectionTitle>
        {data.today.length === 0 ? <p className="text-[15px] text-ink-2">No doses scheduled today.</p> : (
          <div className="divide-y divide-line rounded-xl border border-line bg-white">
            {SLOTS.map((slot) => {
              const items = data.today.filter((d) => d.slot === slot);
              if (!items.length) return null;
              return (
                <div key={slot} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><span className="font-semibold">{SLOT_LABEL[slot].en}</span> <span className="font-tamil text-[14px] text-ink-3">{SLOT_LABEL[slot].ta}</span> <span className="text-[14px] text-ink-3">· {slotTime(slot)}</span></div>
                    <Blister doses={toBlister(items)} size="sm" />
                  </div>
                  <ul className="mt-3">
                    {items.map((d) => (
                      <li key={d.med.id + slot} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line py-2.5 first:border-t-0">
                        <span className="h-3 w-5 shrink-0 rounded-full border border-black/15" style={{ background: d.med.color }} />
                        <span className="min-w-0 flex-1"><span className="font-medium">{d.med.name}</span> <span className="text-[14px] text-ink-3">{d.med.dose}</span></span>
                        {d.status === "taken" ? <span className="flex items-center gap-1 text-[14px] font-semibold text-teal"><Check className="h-4 w-4" strokeWidth={2.5} />Taken {d.at ? fmtTime(d.at) : ""}</span> : (
                          <span className="flex items-center gap-2">
                            {d.status === "missed" ? <Badge tone="warn">Missed</Badge> : d.status === "due" ? <Badge tone="brand">Due now</Badge> : <span className="text-[14px] text-ink-3">Later</span>}
                            <Button size="sm" variant="outline" loading={busy === d.med.id + slot + "taken"} onClick={() => dose(d.med.id, slot, "taken")}>Mark taken</Button>
                            {d.status === "due" && <Button size="sm" variant="ghost" className="hidden sm:inline-flex" loading={busy === d.med.id + slot + "missed"} onClick={() => dose(d.med.id, slot, "missed")}>Missed</Button>}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>All medicines</SectionTitle>
        {!meds ? <div className="grid place-items-center py-10"><Spinner /></div> : meds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-2 px-6 py-10 text-center">
            <p className="font-semibold">No medicines yet</p>
            <p className="mt-1 text-[15px] text-ink-2">Add them here, or photograph prescriptions in Records.</p>
            <Button className="mt-4" onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>Add the first one</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="hidden grid-cols-[2rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-line px-5 py-2.5 text-[13px] text-ink-2 md:grid">
              <span /><span>Medicine</span><span>When</span><span>Stock</span><span className="w-[12rem]" />
            </div>
            <ul className="divide-y divide-line">{meds.map((m) => <MedRow key={m.id} med={m} onChanged={load} />)}</ul>
          </div>
        )}
      </section>

      <AddMedModal open={adding} onClose={() => setAdding(false)} onAdded={load} />
    </div>
  );
}

function MedRow({ med, onChanged }: { med: Medication; onChanged: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "stock" | "stop">("view");
  const [stock, setStock] = useState(String(med.stock));
  const [busy, setBusy] = useState(false);
  const days = daysLeft(med);
  async function patch(body: object, ok: string) {
    setBusy(true);
    try { await api.patch(`/api/meds/${med.id}`, body); toast(ok, "ok"); setMode("view"); onChanged(); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(false); }
  }
  const sub = [med.generic && med.generic.toLowerCase() !== med.name.toLowerCase() ? med.generic : null, med.purpose].filter(Boolean).join(" · ");
  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 gap-y-2 md:grid-cols-[2rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-x-4">
        <span className="mt-1 h-4 w-7 rounded-full border border-black/15 md:mt-0" style={{ background: med.color }} />
        <div className="min-w-0">
          <div><span className="font-semibold">{med.name}</span> <span className="text-ink-2">{med.dose}</span></div>
          <div className="text-[14px] text-ink-2">{sub || "—"}{med.prescribedBy && <span className="text-ink-3"> · {med.prescribedBy}</span>}</div>
        </div>
        <div className="col-start-2 text-[14px] md:col-start-auto">{med.slots.map((s) => SLOT_LABEL[s].en).join(" · ")}</div>
        <div className="col-start-2 flex items-center gap-2 text-[14px] md:col-start-auto">
          <span className="tnum"><span className="font-display text-[17px] font-semibold">{days}</span> day{days === 1 ? "" : "s"} left</span>
          <span className="text-ink-3 tnum">({med.stock} tablets)</span>
          {days <= 5 && <Badge tone="warn">Low</Badge>}
        </div>
        {mode === "view" && (
          <div className="col-start-2 flex flex-wrap gap-1 md:col-start-auto md:w-[12rem] md:justify-end">
            <Button size="sm" variant="ghost" onClick={() => toast(`Refill for ${med.name} sent to the pharmacy (demo)`, "ok")}>Reorder</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("stock")}>Stock</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("stop")}>Stop</Button>
          </div>
        )}
      </div>
      {mode === "stock" && (
        <form className="ml-[2.75rem] mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void patch({ stock: Number(stock) }, "Stock updated"); }}>
          <Field label="Tablets in hand"><Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="w-32 tnum" autoFocus /></Field>
          <Button type="submit" loading={busy}>Save</Button>
          <Button type="button" variant="ghost" onClick={() => setMode("view")}>Cancel</Button>
        </form>
      )}
      {mode === "stop" && (
        <div className="ml-[2.75rem] mt-3 border-l-[3px] border-warn pl-3">
          <p className="text-[15px] font-semibold">Stop {med.name}?</p>
          <p className="text-[14px] text-ink-2">Only if the doctor stopped it. Saathi will stop reminding {"her"} and the family is told.</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" loading={busy} onClick={() => patch({ active: false }, `${med.name} stopped`)}>Yes, stop it</Button>
            <Button size="sm" variant="outline" onClick={() => setMode("view")}>Keep it</Button>
          </div>
        </div>
      )}
    </li>
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
    if (!slots.length) { toast("Pick at least one time of day", "info"); return; }
    setBusy(true);
    try {
      const r = await api.post<{ med: Medication; warnings: Warning[] }>("/api/meds", { ...f, stock: Number(f.stock), slots });
      onAdded();
      setResult({ name: r.med?.name ?? f.name, warnings: r.warnings });
    } catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }

  const hasWarn = warnings?.some((w) => w.level === "warn");
  return (
    <Modal open={open} onClose={close} title={result ? "Medicine added" : "Add a medicine"}>
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="text-[16px]"><b>{result.name}</b> is on the schedule and the family has been told.</p>
          <WarningList warnings={result.warnings} />
          <Button size="lg" onClick={close}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name on the strip"><Input value={f.name} onChange={set("name")} required placeholder="e.g. Glycomet 500" autoFocus /></Field>
            <Field label="Generic, if known"><Input value={f.generic} onChange={set("generic")} placeholder="e.g. metformin" /></Field>
            <Field label="Dose"><Input value={f.dose} onChange={set("dose")} placeholder="500 mg" /></Field>
            <Field label="What it's for"><Input value={f.purpose} onChange={set("purpose")} placeholder="Diabetes" /></Field>
          </div>

          {(checking || warnings) && (
            <div aria-live="polite">
              {checking && !warnings ? <p className="flex items-center gap-2 text-[14px] text-ink-2"><Spinner className="h-4 w-4" />Checking against her medicines and allergies…</p> : warnings && <WarningList warnings={warnings} />}
            </div>
          )}

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">When</legend>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => {
                const on = slots.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => setSlots((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                    className={cx("rounded-lg border px-3.5 py-2 text-[15px] font-semibold transition-colors", on ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink-2 hover:border-ink-3")}>
                    {SLOT_LABEL[s].en} <span className={cx("text-[13px] font-normal", on ? "text-white/70" : "text-ink-3")}>{slotTime(s)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tablets in hand"><Input type="number" min={0} value={f.stock} onChange={set("stock")} className="tnum" /></Field>
            <Field label="Prescribed by"><Input value={f.prescribedBy} onChange={set("prescribedBy")} placeholder="Dr. Raman" /></Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Tablet colour <span className="font-normal text-ink-2">(helps her recognise it)</span></legend>
            <div className="flex flex-wrap gap-2">
              {PILL_COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={f.color === c} onClick={() => setF((x) => ({ ...x, color: c }))}
                  className={cx("h-8 w-12 rounded-full border-2 transition", f.color === c ? "border-ink" : "border-line-2")} style={{ background: c }} />
              ))}
            </div>
          </fieldset>
          <Button type="submit" size="lg" loading={busy} variant={hasWarn ? "outline" : "primary"}>{hasWarn ? "Add anyway (the doctor approved it)" : "Add medicine"}</Button>
        </form>
      )}
    </Modal>
  );
}

function WarningList({ warnings }: { warnings: Warning[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {warnings.map((w, i) => (
        <li key={i} className={cx("flex gap-2 text-[15px]", w.level === "warn" ? "border-l-[3px] border-warn bg-warn-50 py-2.5 pl-3 pr-3 text-ink" : "text-teal")}>
          {w.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />}
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}
