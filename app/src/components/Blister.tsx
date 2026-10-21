// A day's doses as a medicine blister strip: each cavity holds a pill; taking it pops the pill out.
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cx } from "./ui";

export interface BlisterDose {
  id: string;
  color: string;
  name: string;
  status: "taken" | "missed" | "due" | "upcoming";
}

const SIZES = {
  sm: { w: 22, h: 34, pill: [12, 22], gap: 6, pad: 6 },
  md: { w: 30, h: 46, pill: [16, 30], gap: 8, pad: 8 },
  lg: { w: 44, h: 66, pill: [24, 44], gap: 10, pad: 10 },
};

export default function Blister({ doses, size = "md", showNames, className }: { doses: BlisterDose[]; size?: keyof typeof SIZES; showNames?: boolean; className?: string }) {
  const s = SIZES[size];
  // remember which doses were not taken on the previous render so a fresh "taken" pops
  const prev = useRef<Record<string, string>>({});
  const [popping, setPopping] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fresh = doses.filter((d) => d.status === "taken" && prev.current[d.id] && prev.current[d.id] !== "taken").map((d) => d.id);
    prev.current = Object.fromEntries(doses.map((d) => [d.id, d.status]));
    if (fresh.length) {
      setPopping(new Set(fresh));
      const t = setTimeout(() => setPopping(new Set()), 500);
      return () => clearTimeout(t);
    }
  }, [doses]);
  if (!doses.length) return null;
  return (
    <div className={cx("inline-flex flex-col gap-1.5", className)}>
      <div className="inline-flex rounded-[10px] border border-line-2 bg-[#E6E8ED]" style={{ gap: s.gap, padding: s.pad }} role="list" aria-label="Doses">
        {doses.map((d) => {
          const taken = d.status === "taken";
          const showPill = !taken || popping.has(d.id);
          return (
            <div key={d.id} role="listitem" aria-label={`${d.name}: ${d.status}`} title={`${d.name} · ${d.status}`}
              className={cx("relative grid place-items-center rounded-[9px] border",
                taken ? "border-dashed border-line-2 bg-[#DCDFE6]" : d.status === "missed" ? "border-warn bg-white" : "border-white bg-white/90")}
              style={{ width: s.w, height: s.h, boxShadow: taken ? "inset 0 1px 2px rgba(20,23,43,.15)" : "0 1px 0 rgba(20,23,43,.08)" }}>
              {showPill && (
                <span className={cx("block rounded-full border border-black/15", popping.has(d.id) && "animate-pop")}
                  style={{ width: s.pill[0], height: s.pill[1], background: d.color, boxShadow: "inset -2px -3px 0 rgba(0,0,0,.08)" }} />
              )}
              {taken && !popping.has(d.id) && <Check className="text-teal" style={{ width: s.pill[0] * 0.8, height: s.pill[0] * 0.8 }} strokeWidth={3} />}
              {d.status === "due" && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-[#E6E8ED]" />}
            </div>
          );
        })}
      </div>
      {showNames && (
        <div className="flex text-[11px] leading-tight text-ink-2" style={{ gap: s.gap, paddingLeft: s.pad }}>
          {doses.map((d) => <span key={d.id} className="truncate text-center" style={{ width: s.w }}>{d.name.slice(0, 6)}</span>)}
        </div>
      )}
    </div>
  );
}
