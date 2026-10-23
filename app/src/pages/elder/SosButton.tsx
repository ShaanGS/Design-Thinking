// The help button: a big round red clay button with the siren, soft ripples and a progress ring.
// It must be held for 2 seconds (the ring fills) so dusting or a pocket can't trigger it. Haptics on start, each second and on fire.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Art } from "../../components/kit";
import { cx } from "../../components/ui";
import { useElder } from "./shared";

const HOLD_MS = 2000;
const SIZE = 236, BTN = 196, STROKE = 9;

export default function SosButton({ onTrigger }: { onTrigger: () => void }) {
  const { lang } = useElder();
  const [p, setP] = useState(0);
  const start = useRef(0);
  const raf = useRef(0);
  const fired = useRef(false);
  const lastSec = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const buzz = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* not supported */ } };
  const tick = () => {
    const ms = performance.now() - start.current;
    const v = Math.min(1, ms / HOLD_MS);
    setP(v);
    const sec = Math.floor(ms / 1000);
    if (sec > lastSec.current && v < 1) { lastSec.current = sec; buzz(50); }
    if (v >= 1) {
      if (!fired.current) { fired.current = true; buzz([220, 90, 220]); onTrigger(); }
      start.current = 0; setTimeout(() => setP(0), 500);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  const begin = () => {
    if (start.current) return;
    fired.current = false; lastSec.current = 0; start.current = performance.now();
    buzz(40);
    raf.current = requestAnimationFrame(tick);
  };
  const end = () => { if (!start.current) return; start.current = 0; cancelAnimationFrame(raf.current); if (!fired.current) setP(0); };

  const holding = p > 0 && p < 1;
  const secs = Math.max(1, Math.ceil((1 - p) * 2));
  const r = (SIZE - STROKE) / 2, c = 2 * Math.PI * r;
  const ta = lang === "ta";

  return (
    <div className="relative mx-auto grid place-items-center" style={{ width: SIZE, height: SIZE }}>
      {/* soft ripples behind the button */}
      <span className="absolute rounded-full bg-sos/25 animate-ripple" style={{ width: BTN, height: BTN }} aria-hidden="true" />
      <span className="absolute rounded-full bg-sos/20 animate-ripple [animation-delay:1s]" style={{ width: BTN, height: BTN }} aria-hidden="true" />
      <span className={cx("absolute rounded-full", !holding && "animate-pulsering")} style={{ width: BTN, height: BTN }} aria-hidden="true" />
      {/* progress ring */}
      <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke="rgba(255,59,77,.14)" strokeWidth={STROKE} fill="none" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} stroke="#FF3B4D" strokeWidth={STROKE} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <motion.button
        data-sos
        animate={{ scale: holding ? 0.94 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
        aria-label={ta ? "உதவிக்கு 2 விநாடி அழுத்திப் பிடிக்கவும்" : "Hold for 2 seconds to call for help"}
        onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); begin(); }}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } }}
        onKeyUp={end}
        onContextMenu={(e) => e.preventDefault()}
        className="relative flex touch-none select-none flex-col items-center justify-center rounded-full text-white"
        style={{ width: BTN, height: BTN, WebkitUserSelect: "none", WebkitTouchCallout: "none",
          background: "radial-gradient(circle at 34% 28%, #FF8C97 0%, #FF4D5E 42%, #E5263A 78%, #C81B2E 100%)",
          boxShadow: "inset 0 -10px 22px rgba(120,0,20,.28), inset 0 8px 16px rgba(255,255,255,.28), 0 18px 40px -10px rgba(255,59,77,.6)" }}
      >
        {holding ? (
          <span className="font-display text-[76px] font-extrabold leading-none tnum">{secs}</span>
        ) : (
          <Art name="siren" size={78} className="-mt-2" />
        )}
        <span className={cx("mt-1 text-[32px] font-extrabold leading-none", ta ? "font-tamil" : "font-display")}>
          {holding ? (ta ? "பிடியுங்கள்" : "Hold on") : ta ? "உதவி" : "Help"}
        </span>
        <span className="mt-1 text-[15px] font-bold text-white/85">
          {holding ? "Keep holding" : "Hold 2 seconds"}
        </span>
      </motion.button>
    </div>
  );
}
