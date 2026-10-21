// Network beds, capabilities and critical-medicine stock as one table. The staff member's own hospital is editable.
import { Check, Minus, Plus } from "lucide-react";
import type { Hospital, HospitalCaps, InventoryItem } from "../../../shared/types";
import { cx } from "../../components/ui";
import { timeAgo } from "../../lib/format";

export const ITEMS: { item: string; short: string }[] = [
  { item: "asv", short: "Anti-venom" },
  { item: "tenecteplase", short: "TNK" },
  { item: "rabies_ig", short: "Rabies IG" },
  { item: "o_neg_blood", short: "Blood O−" },
  { item: "b_pos_blood", short: "Blood B+" },
  { item: "oxygen", short: "Oxygen" },
];
const CAPS: { key: keyof HospitalCaps; label: string; short: string }[] = [
  { key: "cath", label: "Cath lab", short: "Cath" }, { key: "ct", label: "CT", short: "CT" }, { key: "neuro", label: "Neuro", short: "Neuro" },
  { key: "vent", label: "Ventilator", short: "Vent" }, { key: "dialysis", label: "Dialysis", short: "Dialysis" },
];

type Props = {
  hospitals: Hospital[];
  ownId: string | null;
  onBeds: (field: "icuBeds" | "erBeds", value: number) => void;
  onStock: (item: string, qty: number) => void;
  onCap: (key: keyof HospitalCaps, value: boolean) => void;
  onRelay: (inv: InventoryItem) => void;
  pending: string | null;
  relayTargets: Set<string>;
};

export default function CapacityBoard(props: Props) {
  const { hospitals, ownId } = props;
  const sorted = [...hospitals].sort((a, b) => (a.id === ownId ? -1 : b.id === ownId ? 1 : a.short.localeCompare(b.short)));
  const th = "px-2.5 py-2 text-[12px] font-medium text-ink-3 whitespace-nowrap";
  return (
    <section id="capacity" className="rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[20px] font-semibold leading-tight">Network capacity</h2>
          <p className="text-[14px] text-ink-2">Beds, capabilities and critical medicines at {hospitals.length} hospitals. Each pharmacy keeps its own row current.</p>
        </div>
        <p className="text-[13px] text-ink-3">Changes reach every console instantly</p>
      </header>

      <MobileList {...props} hospitals={sorted} />

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="text-left">
              <th className="sticky left-0 z-10 bg-white" />
              <th colSpan={2} className="border-b border-line px-2.5 pb-1 pt-2.5 text-center text-[12px] font-semibold text-ink-2">Beds free</th>
              <th className="w-3" />
              <th colSpan={CAPS.length} className="border-b border-line px-2.5 pb-1 pt-2.5 text-center text-[12px] font-semibold text-ink-2">Can treat</th>
              <th className="w-3" />
              <th colSpan={ITEMS.length} className="border-b border-line px-2.5 pb-1 pt-2.5 text-center text-[12px] font-semibold text-ink-2">Critical stock</th>
            </tr>
            <tr className="text-left">
              <th className={cx(th, "sticky left-0 z-10 bg-white pl-5")}>Hospital</th>
              <th className={cx(th, "text-right")}>ICU</th>
              <th className={cx(th, "text-right")}>ER</th>
              <th />
              {CAPS.map((c) => <th key={c.key} className={cx(th, "px-1.5 text-center")}>{c.short}</th>)}
              <th />
              {ITEMS.map((i) => <th key={i.item} className={cx(th, "text-right")}>{i.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => <Row key={h.id} h={h} {...props} />)}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line px-4 py-2.5 text-[13px] text-ink-3 sm:px-5">TNK is tenecteplase. Amber marks stock below the hospital's own minimum. A relay request picks the nearest hospital that can spare the item.</p>
    </section>
  );
}

function Row({ h, ownId, onBeds, onStock, onCap, onRelay, pending, relayTargets }: Props & { h: Hospital }) {
  const own = h.id === ownId;
  const td = cx("border-t border-line px-2.5 py-2.5 align-middle", own && "bg-brand-50/60");
  return (
    <tr>
      <td className={cx(td, "sticky left-0 z-10 min-w-[11rem] max-w-[12.5rem] pl-5", own ? "bg-[#FFFBEC]" : "bg-white")}>
        <div className="truncate font-semibold">{h.short}</div>
        <div className={cx("truncate text-[12px]", own ? "font-semibold text-brand-700" : "text-ink-3")} title={h.kind}>{own ? "Your hospital" : h.kind}</div>
        <div className="text-[12px] text-ink-3">Updated {timeAgo(h.updatedAt)}</div>
      </td>
      <td className={cx(td, "text-right")}>{own ? <Stepper value={h.icuBeds} onChange={(v) => onBeds("icuBeds", v)} busy={pending === "icuBeds"} label="ICU beds" /> : <Num v={h.icuBeds} low={h.icuBeds === 0} />}</td>
      <td className={cx(td, "text-right")}>{own ? <Stepper value={h.erBeds} onChange={(v) => onBeds("erBeds", v)} busy={pending === "erBeds"} label="ER beds" /> : <Num v={h.erBeds} low={h.erBeds === 0} />}</td>
      <td className={td} />
      {CAPS.map((c) => {
        const on = !!h.caps[c.key];
        return (
          <td key={c.key} className={cx(td, "px-1.5 text-center")}>
            {own ? (
              <button onClick={() => onCap(c.key, !on)} aria-pressed={on} aria-label={`${c.label}: ${on ? "available" : "not available"}`}
                className={cx("inline-grid h-7 w-7 place-items-center rounded-md border transition-colors", on ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink-3 hover:border-ink-3")}>
                {on ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Minus className="h-3.5 w-3.5" />}
              </button>
            ) : on ? <Check className="mx-auto h-4 w-4 text-ink" strokeWidth={2.25} aria-label="Available" /> : <span className="text-ink-3" aria-label="Not available">–</span>}
          </td>
        );
      })}
      <td className={td} />
      {ITEMS.map(({ item, short }) => {
        const it = h.inventory.find((x) => x.item === item);
        if (!it) return <td key={item} className={cx(td, "text-right text-ink-3")}>–</td>;
        const low = it.qty < it.min;
        return (
          <td key={item} className={cx(td, "text-right last:pr-5")}>
            {own ? (
              <div className="flex flex-col items-end gap-1">
                <Stepper value={it.qty} onChange={(v) => onStock(item, v)} busy={pending === item} low={low} label={short} />
                {low && (relayTargets.has(item)
                  ? <span className="text-[12px] text-ink-2">Relay coming</span>
                  : <button onClick={() => onRelay(it)} disabled={pending === `relay:${item}`} className="text-[12px] font-semibold text-info hover:underline disabled:text-ink-3">Request relay</button>)}
              </div>
            ) : <Num v={it.qty} low={low} />}
          </td>
        );
      })}
    </tr>
  );
}

/** Phones: one block per hospital, values as label/number rows. */
function MobileList({ hospitals, ownId, onBeds, onStock, onCap, onRelay, pending, relayTargets }: Props) {
  return (
    <ul className="md:hidden">
      {hospitals.map((h) => {
        const own = h.id === ownId;
        return (
          <li key={h.id} className={cx("border-b border-line px-4 py-3 last:border-b-0", own && "bg-[#FFFBEC]")}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold">{h.short}{own && <span className="ml-1.5 text-[12px] font-semibold text-brand-700">Your hospital</span>}</div>
              <span className="text-[12px] text-ink-3">{timeAgo(h.updatedAt)}</span>
            </div>
            <p className="text-[13px] text-ink-2">
              {CAPS.filter((c) => own || h.caps[c.key]).map((c, i) => (
                own ? (
                  <button key={c.key} onClick={() => onCap(c.key, !h.caps[c.key])} aria-pressed={!!h.caps[c.key]}
                    className={cx("mb-1 mr-1.5 rounded-md border px-2 py-0.5 text-[12px] font-semibold", h.caps[c.key] ? "border-ink bg-ink text-white" : "border-line-2 text-ink-3")}>{c.label}</button>
                ) : <span key={c.key}>{i > 0 && " · "}{c.label}</span>
              ))}
              {!own && !CAPS.some((c) => h.caps[c.key]) && "No specialist capabilities"}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px]">
              <MRow label="ICU beds">{own ? <Stepper value={h.icuBeds} onChange={(v) => onBeds("icuBeds", v)} busy={pending === "icuBeds"} label="ICU beds" /> : <Num v={h.icuBeds} low={h.icuBeds === 0} />}</MRow>
              <MRow label="ER beds">{own ? <Stepper value={h.erBeds} onChange={(v) => onBeds("erBeds", v)} busy={pending === "erBeds"} label="ER beds" /> : <Num v={h.erBeds} low={h.erBeds === 0} />}</MRow>
              {ITEMS.map(({ item, short: abbr }) => {
                const short = abbr === "TNK" ? "Tenecteplase" : abbr;
                const it = h.inventory.find((x) => x.item === item);
                if (!it) return null;
                const low = it.qty < it.min;
                return (
                  <MRow key={item} label={short} wide={own}>
                    {own ? (
                      <span className="flex items-center gap-2">
                        {low && !relayTargets.has(item) && <button onClick={() => onRelay(it)} className="text-[12px] font-semibold text-info">Relay</button>}
                        {low && relayTargets.has(item) && <span className="text-[12px] text-ink-2">Coming</span>}
                        <Stepper value={it.qty} onChange={(v) => onStock(item, v)} busy={pending === item} low={low} label={short} />
                      </span>
                    ) : <Num v={it.qty} low={low} />}
                  </MRow>
                );
              })}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

function MRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cx("flex items-center justify-between gap-2 border-b border-line/70 pb-1.5", wide && "col-span-2")}><dt className="text-ink-2">{label}</dt><dd>{children}</dd></div>;
}

function Num({ v, low }: { v: number; low?: boolean }) {
  return (
    <span className={cx("inline-flex items-baseline gap-1.5 font-display text-[16px] font-semibold tnum", low ? "text-warn" : "text-ink")}>
      {low && <span className="font-sans text-[11px] font-bold">{v === 0 ? "Out" : "Low"}</span>}{v}
    </span>
  );
}

function Stepper({ value, onChange, busy, low, label }: { value: number; onChange: (v: number) => void; busy?: boolean; low?: boolean; label: string }) {
  return (
    <div className={cx("inline-flex items-center rounded-lg border bg-white", low ? "border-warn" : "border-line-2", busy && "opacity-60")}>
      <button aria-label={`Decrease ${label}`} disabled={busy || value <= 0} onClick={() => onChange(value - 1)} className="grid h-7 w-6 place-items-center text-ink-2 hover:text-ink disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
      <span className={cx("min-w-[26px] text-center font-display text-[15px] font-semibold tnum", low ? "text-warn" : "text-ink")}>{value}</span>
      <button aria-label={`Increase ${label}`} disabled={busy} onClick={() => onChange(value + 1)} className="grid h-7 w-6 place-items-center text-ink-2 hover:text-ink disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}
