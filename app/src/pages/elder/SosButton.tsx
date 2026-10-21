// The big red help button. Must be held for 2 seconds so dusting or a pocket can't trigger it.
import { useEffect, useRef, useState } from "react";
import { cx } from "../../components/ui";
import { useElder } from "./shared";

const HOLD_MS = 2000;
const SIZE = 236, STROKE = 12, R = (SIZE - STROKE) / 2, C = 2 * Math.PI * R;

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
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {!holding && <span className="absolute inset-[18px] rounded-full animate-pulsering" aria-hidden="true" />}
        <svg width={SIZE} height={SIZE} className="pointer-events-none absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#FBE2E5" strokeWidth={STROKE} fill="none" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="#13221E" strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
        </svg>
        <button
          aria-label={lang === "ta" ? "உதவிக்கு 2 விநாடி அழுத்திப் பிடிக்கவும்" : "Hold for 2 seconds to call for help"}
          onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); begin(); }}
          onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
          onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } }}
          onKeyUp={end}
          onContextMenu={(e) => e.preventDefault()}
          className={cx("absolute inset-[18px] flex touch-none select-none flex-col items-center justify-center rounded-full text-white shadow-[0_14px_36px_-10px_rgba(214,40,57,.8)] transition-transform",
            "bg-[radial-gradient(circle_at_35%_30%,#ff6b78,#D62839_62%)]", holding && "scale-[.96]")}
          style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
        >
          <span className="font-tamil text-[46px] font-bold leading-none">உதவி</span>
          <span className="mt-1 font-display text-2xl font-extrabold tracking-[0.18em]">HELP</span>
          <span className="mt-1 text-sm font-semibold opacity-90">{holding ? `${Math.ceil((1 - p) * 2)}…` : lang === "ta" ? "2 விநாடி அழுத்தவும்" : "hold 2 seconds"}</span>
        </button>
      </div>
      <p className="max-w-[300px] text-center text-[15px] leading-snug text-ink-2">
        {lang === "ta"
          ? <><span className="font-tamil font-semibold text-ink">அழுத்திப் பிடியுங்கள். குடும்பமும் ஆம்புலன்ஸும் ஒரே நேரத்தில் அழைக்கப்படும்.</span><br /><span className="text-sm">Press and hold. Family and ambulance are called together.</span></>
          : <><span className="font-semibold text-ink">Press and hold. Family and ambulance are called together.</span><br /><span className="font-tamil text-sm">அழுத்திப் பிடியுங்கள்</span></>}
      </p>
    </div>
  );
}
