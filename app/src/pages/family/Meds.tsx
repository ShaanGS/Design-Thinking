// Medicines: today's strip, every medicine as a card with its tablet colour and today's blister,
// and adding a medicine with Saathi's live interaction check. "?add=1" opens the add sheet.
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Check, AlertTriangle, ShoppingBag, PackageOpen, Ban, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { fmtTime } from "../../lib/format";
import { Badge, Button, Field, Input, Spinner, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Pill, Section, StatCard, TopBar } from "../../components/kit";
import Blister from "../../components/Blister";
import Capsule from "../../components/Capsule";
import { SLOT_LABEL, type Medication, type Slot } from "../../../shared/types";
import { SLOTS, pronoun, slotTime, toBlister, useFamily } from "./ctx";
import { PILL_COLORS } from "./constants";

type Warning = { level: "ok" | "warn"; message: string };
const daysLeft = (m: Medication) => Math.floor(m.stock / Math.max(1, m.slots.length));

export default function Meds() {
  const { data } = useFamily();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [adding, setAdding] = useState(params.get("add") === "1");
  const [busy, setBusy] = useState<string | null>(null);
  const p = data.patient;
  const pr = pronoun(p.sex);

  const load = () => api.get<Medication[]>("/api/meds").then(setMeds).catch((e) => toast(e.message, "warn"));
  useEffect(() => { void load(); }, [data.today]); // overview pushes arrive after every medicine change
  useEffect(() => { if (params.get("add") === "1") setAdding(true); }, [params]);
  const closeAdd = () => { setAdding(false); if (params.has("add")) setParams({}, { replace: true }); };

  async function dose(medId: string, slot: Slot, status: "taken" | "missed") {
    setBusy(medId + slot + status);
    try { await api.post("/api/doses", { medId, slot, status }); } catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(null); }
  }

  const perDay = (meds ?? []).reduce((n, m) => n + m.slots.length, 0);
  const low = (meds ?? []).filter((m) => daysLeft(m) <= 5);
  const taken = data.today.filter((d) => d.status === "taken").length;
  const missed = data.today.filter((d) => d.status === "missed").length;
  const reorder = (names: string[]) => toast(`Refill request for ${names.join(", ")} sent to Sri Balaji Medicals (demo)`, "ok");

  return (
    <div>
      <TopBar back={false} title="Medicines" sub={meds ? `${meds.length} medicines · ${perDay} doses a day` : "Loading…"}
        right={<Pill variant="violet" size="sm" icon={Plus} onClick={() => setAdding(true)}>Add</Pill>} />

      <div className="px-4 pb-32">
        <div className="grid grid-cols-2 gap-3">
          <StatCard tone={missed ? "peach" : "mint"} label="Today" value={`${taken}/${data.today.length}`} note={missed ? `${missed} not confirmed` : "doses taken"} art="pills" />
          <StatCard tone={low.length ? "butter" : "sky"} label="Stock" value={low.length || "OK"} unit={low.length ? "running low" : undefined}
            note={low.length ? low.map((m) => m.name).join(", ") : "Over 5 days of everything"} />
        </div>

        {low.length > 0 && (
          <div className="mt-3 flex items-center gap-3 rounded-3xl bg-white p-3 pr-4 shadow-card">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-butter"><Art name="pills" size={44} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-bold leading-snug">Running low</div>
              <div className="text-[12.5px] leading-snug text-ink-2">{low.map((m) => `${m.name}: ${daysLeft(m)} day${daysLeft(m) === 1 ? "" : "s"}`).join(" · ")}</div>
            </div>
            <Pill variant="soft" size="sm" onClick={() => reorder(low.map((m) => m.name))}>Reorder</Pill>
          </div>
        )}

        <Section title="Today">
          {data.today.length === 0 ? <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">No doses scheduled today.</p> : (
            <div className="flex flex-col gap-3">
              {SLOTS.map((slot) => {
                const items = data.today.filter((d) => d.slot === slot);
                if (!items.length) return null;
                return (
                  <div key={slot} className="rounded-3xl bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-3">
                      <div className="leading-tight">
                        <div className="font-bold">{SLOT_LABEL[slot].en} <span className="font-tamil text-[13px] font-medium text-ink-3">{SLOT_LABEL[slot].ta}</span></div>
                        <div className="text-[12px] text-ink-3">{slotTime(slot)}</div>
                      </div>
                      <Blister doses={toBlister(items)} size="sm" />
                    </div>
                    <ul className="mt-3 flex flex-col gap-2">
                      {items.map((d) => (
                        <li key={d.med.id + slot} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2.5">
                          <Capsule color={d.med.color} size={30} />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate text-[14px] font-bold">{d.med.name}</div>
                            <div className="truncate text-[12px] text-ink-2">{d.med.dose}</div>
                          </div>
                          {d.status === "taken" ? (
                            <span className="flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[12px] font-bold text-mint-ink"><Check className="h-3.5 w-3.5" strokeWidth={3} />{d.at ? fmtTime(d.at) : "Taken"}</span>
                          ) : (
                            <div className="flex shrink-0 items-center gap-1.5">
                              {d.status === "missed" && <Badge tone="warn">Missed</Badge>}
                              {d.status === "due" && (
                                <button aria-label={`${d.med.name} missed`} disabled={!!busy} onClick={() => dose(d.med.id, slot, "missed")}
                                  className="h-9 rounded-full px-2.5 text-[12.5px] font-semibold text-ink-2 disabled:opacity-50">Missed</button>
                              )}
                              <Button size="sm" variant={d.status === "due" || d.status === "missed" ? "brand" : "outline"} className="h-9 px-3"
                                loading={busy === d.med.id + slot + "taken"} onClick={() => dose(d.med.id, slot, "taken")}>Taken</Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="All medicines">
          {!meds ? <div className="grid place-items-center py-10"><Spinner /></div> : meds.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-8 text-center shadow-card">
              <Art name="pills" size={88} float />
              <p className="mt-2 font-bold">No medicines yet</p>
              <p className="mt-1 text-[14px] text-ink-2">Add them here, or photograph prescriptions in Records.</p>
              <Pill variant="violet" icon={Plus} className="mt-4" onClick={() => setAdding(true)}>Add the first one</Pill>
            </div>
          ) : (
            <div className="flex flex-col gap-3">{meds.map((m) => <MedCard key={m.id} med={m} onChanged={load} onReorder={() => reorder([m.name])} />)}</div>
          )}
        </Section>

        <p className="mt-6 px-1 text-center text-[12.5px] text-ink-3">Saathi reminds {p.nickname} on {pr.pos} daily call and tells you if a dose isn't confirmed.</p>
      </div>

      <AddMedSheet open={adding} onClose={closeAdd} onAdded={load} />
    </div>
  );
}

/* ---------------------------------------------------------------- One medicine */

function MedCard({ med, onChanged, onReorder }: { med: Medication; onChanged: () => void; onReorder: () => void }) {
  const { data } = useFamily();
  const toast = useToast();
  const [mode, setMode] = useState<"view" | "stock" | "stop">("view");
  const [stock, setStock] = useState(String(med.stock));
  const [busy, setBusy] = useState(false);
  const days = daysLeft(med);
  const today = data.today.filter((d) => d.med.id === med.id);
  async function patch(body: object, ok: string) {
    setBusy(true);
    try { await api.patch(`/api/meds/${med.id}`, body); toast(ok, "ok"); setMode("view"); onChanged(); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(false); }
  }
  const sub = [med.generic && med.generic.toLowerCase() !== med.name.toLowerCase() ? med.generic : null, med.purpose].filter(Boolean).join(" · ");
  const low = days <= 5;
  return (
    <motion.div layout className="rounded-3xl bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", low ? "bg-butter" : "bg-lilac")}><Capsule color={med.color} size={38} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5"><span className="truncate text-[16px] font-bold">{med.name}</span><span className="shrink-0 text-[13px] text-ink-2">{med.dose}</span></div>
          <div className="truncate text-[12.5px] text-ink-2">{sub || "Purpose not added"}</div>
          {med.prescribedBy && <div className="truncate text-[12px] text-ink-3">{med.prescribedBy}</div>}
        </div>
        {today.length > 0 && <Blister doses={toBlister(today)} size="sm" className="shrink-0" />}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SLOTS.map((s) => (
          <span key={s} className={cx("rounded-full px-2.5 py-1 text-[12px] font-semibold", med.slots.includes(s) ? "bg-violet-50 text-violet-700" : "bg-canvas text-ink-3 line-through decoration-ink-3/40")}>
            {SLOT_LABEL[s].en} {med.slots.includes(s) && <span className="font-medium opacity-70">{slotTime(s)}</span>}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[12.5px]">
          <span className={cx("font-bold", low ? "text-peach-ink" : "text-ink")}><span className="font-display text-[17px] font-extrabold tnum">{days}</span> day{days === 1 ? "" : "s"} left</span>
          <span className="text-ink-3 tnum">{med.stock} tablets</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas-2">
          <div className={cx("h-full rounded-full", low ? "bg-peach-ink/70" : "bg-violet")} style={{ width: `${Math.min(100, (days / 30) * 100)}%` }} />
        </div>
      </div>

      {mode === "view" && (
        <div className="mt-3 flex gap-2">
          <Pill variant={low ? "violet" : "soft"} size="sm" icon={ShoppingBag} className="flex-1" onClick={onReorder}>Reorder</Pill>
          <Pill variant="soft" size="sm" icon={PackageOpen} onClick={() => setMode("stock")}>Stock</Pill>
          <Pill variant="soft" size="sm" icon={Ban} onClick={() => setMode("stop")}>Stop</Pill>
        </div>
      )}
      {mode === "stock" && (
        <form className="mt-3 flex items-end gap-2 rounded-2xl bg-canvas p-3" onSubmit={(e) => { e.preventDefault(); void patch({ stock: Number(stock) }, "Stock updated"); }}>
          <div className="min-w-0 flex-1"><Field label="Tablets in hand"><Input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className="bg-white tnum" autoFocus /></Field></div>
          <Button type="submit" variant="brand" loading={busy}>Save</Button>
          <Button type="button" variant="ghost" onClick={() => setMode("view")}>Cancel</Button>
        </form>
      )}
      {mode === "stop" && (
        <div className="mt-3 rounded-2xl bg-peach p-3">
          <p className="text-[14.5px] font-bold">Stop {med.name}?</p>
          <p className="text-[13px] text-peach-ink">Only if the doctor stopped it. Saathi stops the reminders and tells the family.</p>
          <div className="mt-2.5 flex gap-2">
            <Button size="sm" loading={busy} onClick={() => patch({ active: false }, `${med.name} stopped`)}>Yes, stop it</Button>
            <Button size="sm" variant="outline" onClick={() => setMode("view")}>Keep it</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Add a medicine */

function AddMedSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const { data } = useFamily();
  const pr = pronoun(data.patient.sex);
  const empty = { name: "", generic: "", dose: "", purpose: "", stock: "30", color: PILL_COLORS[1], prescribedBy: "" };
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

  function close() { onClose(); setTimeout(() => { setF(empty); setSlots(["morning"]); setWarnings(null); setResult(null); }, 300); }

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
    <BottomSheet open={open} onClose={close} title={result ? "Medicine added" : "Add a medicine"} tall>
      {result ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center text-center">
            <Art name="pills" size={96} float />
            <p className="mt-2 text-[16px]"><b>{result.name}</b> is on the schedule and the family has been told.</p>
          </div>
          <WarningList warnings={result.warnings} />
          <Pill variant="violet" size="lg" onClick={close}>Done</Pill>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Name on the strip"><Input value={f.name} onChange={set("name")} required placeholder="e.g. Glycomet 500" autoFocus /></Field></div>
            <Field label="Generic, if known"><Input value={f.generic} onChange={set("generic")} placeholder="metformin" /></Field>
            <Field label="Dose"><Input value={f.dose} onChange={set("dose")} placeholder="500 mg" /></Field>
            <div className="col-span-2"><Field label="What it's for"><Input value={f.purpose} onChange={set("purpose")} placeholder="Diabetes" /></Field></div>
          </div>

          {/* Saathi's live interaction check */}
          <div aria-live="polite" className={cx("rounded-3xl p-4 transition-colors", hasWarn ? "bg-peach" : warnings ? "bg-mint" : "bg-lilac")}>
            <div className="flex items-center gap-3">
              <Art name={hasWarn ? "shield" : "brain"} size={44} className="shrink-0" />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1.5 text-[14px] font-bold"><Sparkles className="h-3.5 w-3.5" />Safety check</div>
                <div className="text-[12.5px] text-ink-2">
                  {checking ? `Checking against ${pr.pos} medicines and allergies…` : warnings ? (hasWarn ? "Please ask the doctor before adding" : "No clashes found") : `Type the name. Saathi checks it against ${pr.pos} ${data.today.length ? "current medicines" : "record"} and allergies.`}
                </div>
              </div>
              {checking && <Spinner className="h-4 w-4 text-violet" />}
            </div>
            {warnings && warnings.length > 0 && <div className="mt-3"><WarningList warnings={warnings} /></div>}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">When</legend>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((s) => {
                const on = slots.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => setSlots((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                    className={cx("flex h-14 flex-col items-center justify-center rounded-2xl text-[14px] font-bold leading-tight transition-colors", on ? "bg-violet text-white" : "bg-canvas text-ink-2")}>
                    {SLOT_LABEL[s].en}<span className={cx("text-[11.5px] font-medium", on ? "text-white/75" : "text-ink-3")}>{slotTime(s)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tablets in hand"><Input type="number" min={0} value={f.stock} onChange={set("stock")} className="tnum" /></Field>
            <Field label="Prescribed by"><Input value={f.prescribedBy} onChange={set("prescribedBy")} placeholder="Dr. Raman" /></Field>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">Tablet colour <span className="font-normal text-ink-2">(helps {pr.obj} recognise it)</span></legend>
            <div className="grid grid-cols-4 gap-2">
              {PILL_COLORS.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={f.color === c} onClick={() => setF((x) => ({ ...x, color: c }))}
                  className={cx("grid h-12 place-items-center rounded-2xl transition", f.color === c ? "bg-violet-100 ring-2 ring-violet" : "bg-canvas")}>
                  <Capsule color={c} size={30} />
                </button>
              ))}
            </div>
          </fieldset>
          <Button type="submit" size="lg" loading={busy} variant={hasWarn ? "outline" : "brand"}>{hasWarn ? "Add anyway (the doctor approved it)" : "Add medicine"}</Button>
        </form>
      )}
    </BottomSheet>
  );
}

function WarningList({ warnings }: { warnings: Warning[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {warnings.map((w, i) => (
        <li key={i} className={cx("flex gap-2 rounded-2xl px-3 py-2.5 text-[13.5px] leading-snug", w.level === "warn" ? "bg-white text-ink" : "bg-white/70 text-mint-ink")}>
          {w.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-peach-ink" /> : <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />}
          <span>{w.message}</span>
        </li>
      ))}
    </ul>
  );
}
