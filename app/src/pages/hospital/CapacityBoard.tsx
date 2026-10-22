// Network tab: every hospital as a card with what it can treat, free beds and critical stock.
// The staff member's own hospital is editable (beds, capabilities, stock) and can request a relay when stock runs low.
import { motion } from "framer-motion";
import { Check, Minus, Plus, Truck } from "lucide-react";
import type { Hospital, HospitalCaps, InventoryItem } from "../../../shared/types";
import { cx } from "../../components/ui";
import { Art, Section, Sheet, VioletHeader, type ArtName } from "../../components/kit";
import { timeAgo } from "../../lib/format";
import { kmBetween, useHospital } from "./ctx";

export const ITEMS: { item: string; short: string; art: ArtName }[] = [
  { item: "asv", short: "Anti-venom", art: "pills" },
  { item: "tenecteplase", short: "Tenecteplase", art: "pills" },
  { item: "rabies_ig", short: "Rabies IG", art: "pills" },
  { item: "o_neg_blood", short: "Blood O−", art: "blood" },
  { item: "b_pos_blood", short: "Blood B+", art: "blood" },
  { item: "oxygen", short: "Oxygen", art: "heart" },
];
const CAPS: { key: keyof HospitalCaps; label: string; on: string }[] = [
  { key: "cath", label: "Cath lab", on: "bg-rose text-rose-ink" },
  { key: "ct", label: "CT", on: "bg-sky text-sky-ink" },
  { key: "neuro", label: "Neuro", on: "bg-lilac text-lilac-ink" },
  { key: "vent", label: "Ventilator", on: "bg-mint text-mint-ink" },
  { key: "dialysis", label: "Dialysis", on: "bg-butter text-butter-ink" },
];
const relayQty = (inv: InventoryItem) => Math.max(inv.min - inv.qty, 5);

export default function NetworkPage() {
  const { net, own, ownId, stats } = useHospital();
  const hospitals = net.hospitals;
  const others = hospitals.filter((h) => h.id !== ownId)
    .sort((a, b) => (own ? kmBetween(own, a) - kmBetween(own, b) : a.short.localeCompare(b.short)));
  const erFree = hospitals.reduce((n, h) => n + h.erBeds, 0);

  return (
    <div>
      <VioletHeader>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-extrabold leading-tight">Network</h1>
            <p className="mt-0.5 text-[13px] leading-snug text-white/80">{hospitals.length} hospitals around Tambaram. Every change reaches each ER at once.</p>
          </div>
          <Art name="hospital" size={76} float className="-my-2 shrink-0" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <GlassStat art="bed" value={stats.freeIcu} label="ICU beds free" />
          <GlassStat art="bed" value={erFree} label="ER beds free" />
          <GlassStat art="pills" value={stats.lowCount} label="Items low" dot={stats.ownLow > 0} />
        </div>
      </VioletHeader>

      <Sheet>
        {own && <OwnHospital h={own} />}
        <Section title="Nearby hospitals" className={own ? undefined : "!mt-0"}>
          <div className="flex flex-col gap-3">
            {others.map((h) => <HospitalCard key={h.id} h={h} km={own ? kmBetween(own, h) : null} />)}
          </div>
        </Section>
        <p className="mt-4 px-1 text-[12px] leading-snug text-ink-3">Amber marks stock below that hospital's own minimum. A relay picks the nearest hospital that can spare the item and still stay above its minimum.</p>
      </Sheet>
    </div>
  );
}

function GlassStat({ art, value, label, dot }: { art: ArtName; value: number; label: string; dot?: boolean }) {
  return (
    <div className="glass relative h-[92px] overflow-hidden rounded-[22px] p-3 text-white">
      <div className="font-display text-[26px] font-extrabold leading-none tnum">{value}</div>
      <div className="mt-1 max-w-[70%] text-[12px] font-semibold leading-tight text-white/85">{label}</div>
      <Art name={art} size={44} className="absolute -bottom-1 -right-1" />
      {dot && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-butter ring-2 ring-violet-500" />}
    </div>
  );
}

/* ---------------------------------------------------------------- Your hospital (editable) */

function OwnHospital({ h }: { h: Hospital }) {
  const { patchHospital, setStock, relay, pending, relayTargets, net } = useHospital();
  const donorFor = (inv: InventoryItem) => {
    const qty = relayQty(inv);
    return net.hospitals.filter((x) => x.id !== h.id)
      .map((x) => ({ x, have: x.inventory.find((i) => i.item === inv.item) }))
      .filter((d) => d.have && d.have.qty - qty >= d.have.min)
      .sort((a, b) => kmBetween(h, a.x) - kmBetween(h, b.x))[0]?.x ?? null;
  };
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lilac"><Art name="hospital" size={48} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-2"><span className="truncate text-[16px] font-extrabold">{h.short}</span><span className="shrink-0 rounded-full bg-violet px-2 py-0.5 text-[11px] font-bold text-white">You</span></div>
          <div className="mt-0.5 truncate text-[12.5px] text-ink-2">{h.kind}</div>
          <div className="text-[11.5px] text-ink-3">Updated {timeAgo(h.updatedAt)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {(["icuBeds", "erBeds"] as const).map((f) => (
          <div key={f} className={cx("relative overflow-hidden rounded-3xl p-3", f === "icuBeds" ? "bg-sky" : "bg-lilac")}>
            <div className="text-[12.5px] font-semibold">{f === "icuBeds" ? "ICU beds free" : "ER beds free"}</div>
            <Art name="bed" size={46} className="absolute -right-1 -top-1" />
            <Stepper className="mt-3" value={h[f]} onChange={(v) => patchHospital({ [f]: v }, f)} busy={pending === f} label={f === "icuBeds" ? "ICU beds" : "ER beds"} big />
          </div>
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-[14px] font-bold text-ink-2">What you can treat</h3>
      <div className="flex flex-wrap gap-2">
        {CAPS.map((c) => {
          const on = !!h.caps[c.key];
          return (
            <motion.button key={c.key} whileTap={{ scale: 0.95 }} onClick={() => patchHospital({ caps: { [c.key]: !on } }, `cap:${c.key}`)} aria-pressed={on}
              className={cx("inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-bold transition-colors", on ? c.on : "bg-canvas text-ink-3 line-through decoration-ink-3/50")}>
              {on ? <Check className="h-4 w-4" strokeWidth={2.8} /> : <Plus className="h-4 w-4" />}{c.label}
            </motion.button>
          );
        })}
      </div>

      <h3 className="mb-2 mt-5 text-[14px] font-bold text-ink-2">Critical stock</h3>
      <ul className="flex flex-col gap-2">
        {ITEMS.map(({ item, short, art }) => {
          const it = h.inventory.find((x) => x.item === item);
          if (!it) return null;
          const low = it.qty < it.min;
          const coming = relayTargets.has(item);
          const donor = low && !coming ? donorFor(it) : null;
          return (
            <li key={item} className={cx("rounded-[22px] p-2.5", low ? "bg-peach" : "bg-canvas")}>
              <div className="flex items-center gap-2.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/80"><Art name={art} size={36} /></span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[14px] font-bold">{short}</div>
                  <div className={cx("text-[11.5px]", low ? "font-semibold text-peach-ink" : "text-ink-3")}>{low ? (it.qty === 0 ? "Out · " : "Low · ") : ""}min {it.min} {it.unit}</div>
                </div>
                <Stepper value={it.qty} onChange={(v) => setStock(item, v)} busy={pending === item} low={low} label={short} />
              </div>
              {low && (
                <div className="mt-2 flex items-center gap-2 pl-[54px]">
                  {coming ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-[12.5px] font-bold text-mint-ink"><Truck className="h-3.5 w-3.5" />Relay on the way</span>
                  ) : (
                    <motion.button whileTap={{ scale: 0.96 }} disabled={pending === `relay:${item}` || !donor} onClick={() => relay(it)}
                      className="inline-flex h-11 items-center gap-1.5 rounded-full bg-violet px-4 text-[13px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(91,71,230,.8)] disabled:opacity-50">
                      <Truck className="h-4 w-4" />{donor ? `Relay ${relayQty(it)} from ${donor.short}` : "No one can spare it"}
                    </motion.button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- Other hospitals (read-only) */

function HospitalCard({ h, km }: { h: Hospital; km: number | null }) {
  const caps = CAPS.filter((c) => h.caps[c.key]);
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas"><Art name="hospital" size={40} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15.5px] font-extrabold">{h.short}</div>
          <div className="truncate text-[12.5px] text-ink-2">{h.kind}</div>
          <div className="text-[11.5px] text-ink-3">{km != null ? `${km.toFixed(1)} km from you · ` : ""}updated {timeAgo(h.updatedAt)}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {caps.length ? caps.map((c) => <span key={c.key} className={cx("rounded-full px-2.5 py-1 text-[12px] font-bold", c.on)}>{c.label}</span>)
          : <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-semibold text-ink-3">No specialist care</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <BedChip label="ICU free" value={h.icuBeds} />
        <BedChip label="ER free" value={h.erBeds} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {ITEMS.map(({ item, short }) => {
          const it = h.inventory.find((x) => x.item === item);
          if (!it) return null;
          const low = it.qty < it.min;
          return (
            <div key={item} className={cx("rounded-2xl px-2.5 py-2 leading-tight", low ? "bg-peach" : "bg-canvas")}>
              <div className={cx("truncate text-[11px] font-semibold", low ? "text-peach-ink" : "text-ink-3")}>{short}</div>
              <div className={cx("font-display text-[16px] font-extrabold tnum", low && "text-peach-ink")}>{it.qty}<span className="ml-1 font-sans text-[10.5px] font-semibold opacity-70">{low ? (it.qty === 0 ? "out" : "low") : it.unit}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BedChip({ label, value }: { label: string; value: number }) {
  return (
    <div className={cx("flex items-center gap-2 rounded-2xl px-2.5 py-1.5", value === 0 ? "bg-peach" : "bg-sky")}>
      <Art name="bed" size={30} />
      <span className={cx("text-[12.5px] font-semibold", value === 0 ? "text-peach-ink" : "text-sky-ink")}>{label}</span>
      <span className={cx("ml-auto font-display text-[18px] font-extrabold tnum", value === 0 && "text-peach-ink")}>{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- +/− stepper */

function Stepper({ value, onChange, busy, low, label, big, className }: { value: number; onChange: (v: number) => void; busy?: boolean; low?: boolean; label: string; big?: boolean; className?: string }) {
  const btn = "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white shadow-card text-ink active:scale-95 transition-transform disabled:opacity-40";
  return (
    <div className={cx("flex items-center gap-1", big && "justify-between", busy && "opacity-60", className)}>
      <button aria-label={`Decrease ${label}`} disabled={busy || value <= 0} onClick={() => onChange(value - 1)} className={btn}><Minus className="h-4 w-4" strokeWidth={2.5} /></button>
      <span className={cx("min-w-[34px] text-center font-display font-extrabold tnum", big ? "text-[26px]" : "text-[18px]", low && "text-peach-ink")}>{value}</span>
      <button aria-label={`Increase ${label}`} disabled={busy} onClick={() => onChange(value + 1)} className={btn}><Plus className="h-4 w-4" strokeWidth={2.5} /></button>
    </div>
  );
}
