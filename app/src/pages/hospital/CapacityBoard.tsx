// Network beds, capabilities and critical-medicine stock. Own hospital is editable.
import { Minus, Plus, Send } from "lucide-react";
import type { Hospital, HospitalCaps, InventoryItem } from "../../../shared/types";
import { Badge, Card, CardHeader, cx } from "../../components/ui";
import { timeAgo } from "../../lib/format";

export const ITEMS: { item: string; short: string }[] = [
  { item: "asv", short: "Anti-venom" },
  { item: "tenecteplase", short: "Tenecteplase" },
  { item: "rabies_ig", short: "Rabies IG" },
  { item: "o_neg_blood", short: "Blood O−" },
  { item: "b_pos_blood", short: "Blood B+" },
  { item: "oxygen", short: "Oxygen" },
];
const CAPS: { key: keyof HospitalCaps; label: string }[] = [
  { key: "cath", label: "Cath lab" }, { key: "ct", label: "CT" }, { key: "neuro", label: "Neuro" }, { key: "vent", label: "Ventilator" }, { key: "dialysis", label: "Dialysis" },
];

export default function CapacityBoard({ hospitals, ownId, onBeds, onStock, onCap, onRelay, pending, relayTargets }: {
  hospitals: Hospital[];
  ownId: string | null;
  onBeds: (field: "icuBeds" | "erBeds", value: number) => void;
  onStock: (item: string, qty: number) => void;
  onCap: (key: keyof HospitalCaps, value: boolean) => void;
  onRelay: (inv: InventoryItem) => void;
  pending: string | null;
  relayTargets: Set<string>;
}) {
  const sorted = [...hospitals].sort((a, b) => (a.id === ownId ? -1 : b.id === ownId ? 1 : a.short.localeCompare(b.short)));
  return (
    <Card>
      <CardHeader title="Network capacity" subtitle="Beds, capabilities and critical medicines across 5 hospitals · live" />
      <MobileList hospitals={sorted} ownId={ownId} onBeds={onBeds} onStock={onStock} onCap={onCap} onRelay={onRelay} pending={pending} relayTargets={relayTargets} />
      <div className="hidden overflow-x-auto px-2 pb-3 md:block">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink-3">
              <th className="sticky left-0 z-10 bg-white px-3 py-2">Hospital</th>
              <th className="px-2 py-2 text-center">ICU beds</th>
              <th className="px-2 py-2 text-center">ER beds</th>
              <th className="px-2 py-2">Capabilities</th>
              {ITEMS.map((i) => <th key={i.item} className="px-2 py-2 text-center">{i.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              const own = h.id === ownId;
              const inv = (item: string) => h.inventory.find((x) => x.item === item);
              return (
                <tr key={h.id} className={cx(own && "bg-brand-50")}>
                  <td className={cx("sticky left-0 z-10 border-t border-line px-3 py-2.5 align-top", own ? "bg-brand-50" : "bg-white")}>
                    <div className="flex items-center gap-1.5 font-semibold">{h.short}{own && <Badge tone="brand">You</Badge>}</div>
                    <div className="text-xs text-ink-3">{h.kind}</div>
                    <div className="text-[11px] text-ink-3">updated {timeAgo(h.updatedAt)}</div>
                  </td>
                  <td className="border-t border-line px-2 py-2.5 text-center align-top">
                    {own ? <Stepper value={h.icuBeds} onChange={(v) => onBeds("icuBeds", v)} busy={pending === "icuBeds"} /> : <Count v={h.icuBeds} low={h.icuBeds === 0} warnAt={1} />}
                  </td>
                  <td className="border-t border-line px-2 py-2.5 text-center align-top">
                    {own ? <Stepper value={h.erBeds} onChange={(v) => onBeds("erBeds", v)} busy={pending === "erBeds"} /> : <Count v={h.erBeds} low={h.erBeds === 0} warnAt={1} />}
                  </td>
                  <td className="border-t border-line px-2 py-2.5 align-top">
                    <div className="flex max-w-[230px] flex-wrap gap-1">
                      {CAPS.map((c) => {
                        const on = !!h.caps[c.key];
                        return own ? (
                          <button key={c.key} onClick={() => onCap(c.key, !on)} aria-pressed={on}
                            className={cx("rounded-full border px-2 py-0.5 text-xs font-semibold transition", on ? "border-teal bg-teal text-white" : "border-line bg-white text-ink-3 line-through")}>{c.label}</button>
                        ) : (
                          <span key={c.key} className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", on ? "bg-teal-50 text-teal" : "bg-paper-2 text-ink-3 line-through")}>{on ? "✓ " : ""}{c.label}</span>
                        );
                      })}
                    </div>
                  </td>
                  {ITEMS.map(({ item }) => {
                    const it = inv(item);
                    if (!it) return <td key={item} className="border-t border-line px-2 py-2.5 text-center text-ink-3">—</td>;
                    const low = it.qty < it.min, zero = it.qty === 0;
                    return (
                      <td key={item} className="border-t border-line px-2 py-2.5 text-center align-top">
                        {own ? (
                          <div className="flex flex-col items-center gap-1">
                            <Stepper value={it.qty} onChange={(v) => onStock(item, v)} busy={pending === item} tone={zero ? "sos" : low ? "warn" : undefined} />
                            {low && (relayTargets.has(item)
                              ? <span className="text-[11px] font-semibold text-brand-700">relay on the way</span>
                              : <button onClick={() => onRelay(it)} disabled={pending === `relay:${item}`} className="inline-flex items-center gap-1 rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white disabled:opacity-50"><Send className="h-3 w-3" />Relay</button>)}
                          </div>
                        ) : <Count v={it.qty} low={low} zero={zero} unit={it.unit} />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-3 px-5 pb-4 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1"><b className="text-sos">0 ✕</b> out of stock</span>
        <span className="inline-flex items-center gap-1"><b className="text-warn">▼</b> below minimum</span>
        <span>Steppers and toggles update every console in the network instantly.</span>
      </div>
    </Card>
  );
}

/** Phone layout: one card per hospital instead of a wide table. */
function MobileList({ hospitals, ownId, onBeds, onStock, onCap, onRelay, pending, relayTargets }: {
  hospitals: Hospital[]; ownId: string | null; onBeds: (f: "icuBeds" | "erBeds", v: number) => void; onStock: (item: string, qty: number) => void;
  onCap: (k: keyof HospitalCaps, v: boolean) => void; onRelay: (inv: InventoryItem) => void; pending: string | null; relayTargets: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 pb-4 md:hidden">
      {hospitals.map((h) => {
        const own = h.id === ownId;
        return (
          <div key={h.id} className={cx("rounded-xl border p-3", own ? "border-brand bg-brand-50" : "border-line bg-white")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><div className="flex items-center gap-1.5 font-semibold">{h.short}{own && <Badge tone="brand">You</Badge>}</div><div className="text-xs text-ink-3">{h.kind} · updated {timeAgo(h.updatedAt)}</div></div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2 py-1.5"><span className="text-xs font-semibold text-ink-3">ICU beds</span>{own ? <Stepper value={h.icuBeds} onChange={(v) => onBeds("icuBeds", v)} busy={pending === "icuBeds"} /> : <Count v={h.icuBeds} low={h.icuBeds === 0} warnAt={1} />}</div>
              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/70 px-2 py-1.5"><span className="text-xs font-semibold text-ink-3">ER beds</span>{own ? <Stepper value={h.erBeds} onChange={(v) => onBeds("erBeds", v)} busy={pending === "erBeds"} /> : <Count v={h.erBeds} low={h.erBeds === 0} warnAt={1} />}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {CAPS.map((c) => {
                const on = !!h.caps[c.key];
                return own
                  ? <button key={c.key} onClick={() => onCap(c.key, !on)} aria-pressed={on} className={cx("rounded-full border px-2 py-0.5 text-xs font-semibold", on ? "border-teal bg-teal text-white" : "border-line bg-white text-ink-3 line-through")}>{c.label}</button>
                  : <span key={c.key} className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", on ? "bg-teal-50 text-teal" : "bg-paper-2 text-ink-3 line-through")}>{on ? "✓ " : ""}{c.label}</span>;
              })}
            </div>
            <div className={cx("mt-2 grid gap-1.5", own ? "grid-cols-1" : "grid-cols-2")}>
              {ITEMS.map(({ item, short }) => {
                const it = h.inventory.find((x) => x.item === item);
                if (!it) return null;
                const low = it.qty < it.min, zero = it.qty === 0;
                return (
                  <div key={item} className={cx("flex items-center justify-between gap-1 rounded-lg px-2 py-1.5", zero ? "bg-sos-50" : low ? "bg-warn-50" : "bg-paper")}>
                    <span className="min-w-0 truncate text-xs font-semibold text-ink-2">{short}</span>
                    {own ? (
                      <span className="flex items-center gap-1">
                        <Stepper value={it.qty} onChange={(v) => onStock(item, v)} busy={pending === item} tone={zero ? "sos" : low ? "warn" : undefined} />
                        {low && !relayTargets.has(item) && <button aria-label={`Request relay of ${short}`} onClick={() => onRelay(it)} className="grid h-7 w-7 place-items-center rounded-md bg-ink text-white"><Send className="h-3.5 w-3.5" /></button>}
                      </span>
                    ) : <span className={cx("font-mono text-sm font-semibold tnum", zero ? "text-sos" : low ? "text-warn" : "text-ink")}>{it.qty}{zero ? " ✕" : low ? " ▼" : ""}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Count({ v, low, zero, unit, warnAt }: { v: number; low?: boolean; zero?: boolean; unit?: string; warnAt?: number }) {
  const z = zero ?? v === 0;
  return (
    <div className={cx("inline-flex flex-col items-center font-mono tnum", z ? "text-sos" : low || (warnAt != null && v <= warnAt) ? "text-warn" : "text-ink")}>
      <span className="text-base font-semibold">{v}{z ? " ✕" : low ? " ▼" : ""}</span>
      {unit && <span className="text-[10px] text-ink-3">{unit}</span>}
    </div>
  );
}

function Stepper({ value, onChange, busy, tone }: { value: number; onChange: (v: number) => void; busy?: boolean; tone?: "sos" | "warn" }) {
  return (
    <div className={cx("inline-flex items-center rounded-lg border bg-white", tone === "sos" ? "border-sos" : tone === "warn" ? "border-warn" : "border-line", busy && "opacity-60")}>
      <button aria-label="Decrease" disabled={busy || value <= 0} onClick={() => onChange(value - 1)} className="grid h-7 w-7 place-items-center text-ink-2 hover:text-ink disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
      <span className={cx("min-w-[26px] text-center font-mono text-sm font-semibold tnum", tone === "sos" ? "text-sos" : tone === "warn" ? "text-warn" : "text-ink")}>{value}</span>
      <button aria-label="Increase" disabled={busy} onClick={() => onChange(value + 1)} className="grid h-7 w-7 place-items-center text-ink-2 hover:text-ink disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}
