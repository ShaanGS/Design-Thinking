// The help button: a full-width red slab fixed at the bottom of the screen, within thumb reach.
// It must be held for 2 seconds (it fills left to right) so dusting or a pocket can't trigger it.
import { useEffect, useRef, useState } from "react";
import { cx } from "../../components/ui";
import { useElder } from "./shared";

const HOLD_MS = 2000;

export default function SosButton({ onTrigger }: { onTrigger: () => void }) {
  const { lang } = useElder();
  const [p, setP] = useState(0);
  const start = useRef(0);
  const raf = useRef(0);
  const fired = useRef(false);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setP(v);
    if (v >= 1) {
      if (!fired.current) { fired.current = true; try { navigator.vibrate?.([220, 90, 220]); } catch { /* not supported */ } onTrigger(); }
      start.current = 0; setTimeout(() => setP(0), 400);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  const begin = () => {
    if (start.current) return;
    fired.current = false; start.current = performance.now();
    try { navigator.vibrate?.(40); } catch { /* not supported */ }
    raf.current = requestAnimationFrame(tick);
  };
  const end = () => { if (!start.current) return; start.current = 0; cancelAnimationFrame(raf.current); if (!fired.current) setP(0); };

  const holding = p > 0 && p < 1;
  const secs = Math.max(1, Math.ceil((1 - p) * 2));
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto max-w-[480px] bg-white px-3 pt-2 safe-bottom">
        <button
          data-sos
          aria-label={lang === "ta" ? "உதவிக்கு 2 விநாடி அழுத்திப் பிடிக்கவும்" : "Hold for 2 seconds to call for help"}
          onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); begin(); }}
          onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
          onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } }}
          onKeyUp={end}
          onContextMenu={(e) => e.preventDefault()}
          className="relative mb-2 flex h-[88px] w-full touch-none select-none items-center overflow-hidden rounded-2xl bg-sos text-left text-white shadow-lift"
          style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
        >
          <span className="absolute inset-y-0 left-0 bg-black/30" style={{ width: `${p * 100}%` }} aria-hidden="true" />
          <span className="relative flex w-full items-center justify-between gap-3 px-6">
            <span className="flex flex-col leading-none">
              <span className={cx("text-[36px] font-bold", lang === "ta" ? "font-tamil" : "font-display")}>{lang === "ta" ? "உதவி" : "Help"}</span>
              <span className={cx("mt-1.5 text-[15px] font-medium text-white/85", lang === "en" && "font-tamil")}>
                {holding ? (lang === "ta" ? "தொடர்ந்து அழுத்துங்கள்" : "Keep holding") : lang === "ta" ? "Hold for help" : "உதவிக்கு அழுத்திப் பிடியுங்கள்"}
              </span>
            </span>
            <span className={cx("shrink-0 text-right font-display text-[15px] font-medium leading-tight text-white/85", holding && "text-[34px] font-semibold text-white tnum")}>
              {holding ? secs : lang === "ta" ? <span className="font-tamil">2 விநாடி</span> : "2 seconds"}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
