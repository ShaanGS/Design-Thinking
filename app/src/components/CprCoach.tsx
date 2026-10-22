// Hands-only CPR coach: a 110-per-minute beat (sound, vibration, pulsing heart), a compression counter
// and the steps a panicking bystander needs. Used by the family emergency view, Paati's phone and the bystander page.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, X, Volume2, VolumeX } from "lucide-react";
import { Art } from "./kit";
import { cx } from "./ui";

const BPM = 110;

export default function CprCoach({ open, onClose, name, etaMin }: { open: boolean; onClose: () => void; name?: string; etaMin?: number | null }) {
  const [running, setRunning] = useState(false);
  const [count, setCount] = useState(0);
  const [secs, setSecs] = useState(0);
  const [sound, setSound] = useState(true);
  const [beat, setBeat] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  useEffect(() => { if (!open) { setRunning(false); setCount(0); setSecs(0); } }, [open]);

  useEffect(() => {
    if (!running) return;
    const click = () => {
      setBeat((b) => !b);
      setCount((c) => c + 1);
      try { navigator.vibrate?.(60); } catch { /* not supported */ }
      if (!soundRef.current) return;
      try {
        ctx.current ??= new AudioContext();
        const a = ctx.current, o = a.createOscillator(), g = a.createGain();
        o.frequency.value = 880; o.type = "sine";
        g.gain.setValueAtTime(0.25, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.08);
        o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.09);
      } catch { /* audio blocked */ }
    };
    click();
    const t = setInterval(click, 60000 / BPM);
    const s = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => { clearInterval(t); clearInterval(s); };
  }, [running]);

  const inCycle = ((count - 1) % 30) + 1;
  const mm = String(Math.floor(secs / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1500] flex flex-col overflow-y-auto bg-[radial-gradient(90%_60%_at_50%_30%,#FF5A6A_0%,#D91F33_55%,#8E0F1F_100%)] px-5 pb-6 text-white safe-top">
          <div className="flex items-center justify-between">
            <div className="leading-tight">
              <div className="text-[12px] font-bold uppercase tracking-wider text-white/75">CPR coach</div>
              <div className="text-[17px] font-extrabold">{name ? `Help ${name} breathe` : "Hands-only CPR"}</div>
            </div>
            <div className="flex gap-2">
              <button aria-label={sound ? "Mute" : "Sound on"} onClick={() => setSound((s) => !s)} className="glass grid h-10 w-10 place-items-center rounded-full">{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
              <button aria-label="Close" onClick={onClose} className="glass grid h-10 w-10 place-items-center rounded-full"><X className="h-5 w-5" /></button>
            </div>
          </div>

          {!running ? (
            <div className="mt-6 flex flex-1 flex-col">
              <ol className="flex flex-col gap-3">
                {[
                  ["Is she responding and breathing normally?", "Tap her shoulders and shout her name. Gasping is not normal breathing."],
                  ["Call 108 now, phone on speaker", "Saathi has already told the family and the ambulance where she is."],
                  ["Hands in the centre of the chest", "Heel of one hand, other hand on top, arms straight. Push 5 to 6 cm deep."],
                ].map(([t, d], i) => (
                  <li key={t} className="glass flex gap-3 rounded-3xl p-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[15px] font-extrabold text-sos-600">{i + 1}</span>
                    <div><div className="font-bold leading-snug">{t}</div><div className="mt-0.5 text-[13px] text-white/80">{d}</div></div>
                  </li>
                ))}
              </ol>
              <div className="mt-auto flex flex-col gap-3 pt-6">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setRunning(true)} className="h-16 rounded-full bg-white text-[18px] font-extrabold text-sos-600 shadow-lift">Start compressions</motion.button>
                <a href="tel:108" className="glass flex h-14 items-center justify-center gap-2 rounded-full text-[16px] font-bold"><Phone className="h-5 w-5" />Call 108</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center">
              <div className="mt-4 flex gap-6 text-center">
                <div><div className="font-display text-[28px] font-extrabold tnum">{mm}:{ss}</div><div className="text-[12px] text-white/75">CPR time</div></div>
                <div><div className="font-display text-[28px] font-extrabold tnum">{count}</div><div className="text-[12px] text-white/75">pushes</div></div>
                {etaMin != null && <div><div className="font-display text-[28px] font-extrabold tnum">{etaMin}<span className="text-[15px]"> min</span></div><div className="text-[12px] text-white/75">ambulance</div></div>}
              </div>
              <div className="relative my-6 grid h-[230px] w-[230px] place-items-center">
                <span className="absolute inset-0 rounded-full bg-white/15 animate-ripple" />
                <motion.div animate={{ scale: beat ? 0.86 : 1 }} transition={{ duration: 0.12 }} className="grid h-[200px] w-[200px] place-items-center rounded-full bg-white/20">
                  <Art name="cpr" size={150} />
                </motion.div>
              </div>
              <div className={cx("font-display text-[40px] font-extrabold leading-none", inCycle === 30 && "text-butter")}>PUSH</div>
              <div className="mt-2 text-[15px] text-white/85">Hard and fast, with every beep. {inCycle}/30</div>
              <p className="mt-3 max-w-[300px] text-center text-[13px] text-white/75">Don't stop until the ambulance team takes over. Swap with someone every 2 minutes if you can.</p>
              <div className="mt-auto flex w-full gap-3 pt-6">
                <a href="tel:108" className="glass flex h-14 flex-1 items-center justify-center gap-2 rounded-full font-bold"><Phone className="h-5 w-5" />108</a>
                <button onClick={() => setRunning(false)} className="h-14 flex-1 rounded-full bg-white font-extrabold text-sos-600">Pause</button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
