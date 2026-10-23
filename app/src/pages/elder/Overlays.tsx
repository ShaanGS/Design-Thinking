// Saathi's escalation call and the fall-detection countdown, shown over any elder screen.
import { useEffect, useRef, useState } from "react";
import { Phone, Check } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { speak, stopSpeaking } from "../../lib/speech";
import { ProgressRing, Spinner, useToast } from "../../components/ui";
import { Art } from "../../components/kit";
import { BigButton, Bi, useElder } from "./shared";

export function EscalationCall() {
  const { raiseSOS, reload } = useElder();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useLive<{ stage: string }>("escalation", (e) => {
    if (e.stage === "calling") {
      setOpen(true);
      try { navigator.vibrate?.([400, 200, 400, 200, 400]); } catch { /* not supported */ }
      speak("Paati, this is Saathi. Did you take your morning tablets? Are you well?");
    }
    if (e.stage === "resolved") { setOpen(false); stopSpeaking(); }
  });
  if (!open) return null;
  const ok = async () => {
    setBusy(true);
    try { await api.post("/api/demo/escalation-answer"); setOpen(false); reload(); toast("Thank you! Your family has been told you're fine.", "ok"); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(false); stopSpeaking(); }
  };
  return (
    <div className="hero-violet fixed inset-0 z-[950] overflow-y-auto text-white animate-slidein">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div className="relative flex min-h-full flex-col items-center px-5 pb-8 pt-6 text-center safe-top">
        <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[16px] font-bold">
          <span className="h-2.5 w-2.5 animate-blink rounded-full bg-[#5BE39A]" /><Bi inline ta="அழைப்பு வருகிறது" en="Incoming call" />
        </span>
        <div className="relative mt-10 grid h-[180px] w-[180px] place-items-center">
          <span className="absolute h-[150px] w-[150px] rounded-full bg-white/25 animate-ripple" />
          <span className="absolute h-[150px] w-[150px] rounded-full bg-white/20 animate-ripple [animation-delay:1s]" />
          <span className="relative grid h-[150px] w-[150px] place-items-center rounded-full bg-white shadow-lift"><Art name="chat" size={104} /></span>
        </div>
        <h1 className="mt-5 text-[40px] font-extrabold leading-tight"><Bi ta="சாத்தி" en="Saathi" className="items-center" /></h1>
        <blockquote className="glass mt-6 w-full rounded-[28px] px-5 py-4 text-left text-[23px] font-bold leading-snug">
          <Bi ta="“பாட்டி, காலை மாத்திரை சாப்பிட்டீங்களா? நலமா?”" en="“Paati, did you take your morning tablets? Are you well?”" />
        </blockquote>
        <div className="mt-auto flex w-full flex-col gap-3 pt-8">
          <BigButton tone="white" className="!min-h-[84px] !text-[24px] !text-mint-ink" disabled={busy} onClick={() => void ok()}
            icon={busy ? <Spinner className="h-7 w-7" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-mint"><Phone className="h-6 w-6" strokeWidth={2.4} /></span>}>
            <Bi ta="ஆம், நலம்" en="Yes, I'm fine" className="text-ink" />
          </BigButton>
          <BigButton tone="sos" onClick={() => { setOpen(false); stopSpeaking(); void raiseSOS("Saathi call (pressed help)"); }}>
            <Bi ta="உதவி வேண்டும்" en="I need help" />
          </BigButton>
        </div>
      </div>
    </div>
  );
}

const FALL_SECONDS = 15;
const SPIKE = 28; // m/s² including gravity

/** Listens to the accelerometer while fall detection is on; a hard spike opens a countdown. */
export function FallWatcher() {
  const { fallOn, raiseSOS } = useElder();
  const [left, setLeft] = useState<number | null>(null);
  const lastSpike = useRef(0);

  useEffect(() => {
    if (!fallOn) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity; if (!a) return;
      const g = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      if (g > SPIKE && Date.now() - lastSpike.current > 20000) { lastSpike.current = Date.now(); setLeft(FALL_SECONDS); try { navigator.vibrate?.([300, 150, 300]); } catch { /* not supported */ } }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [fallOn]);

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { setLeft(null); void raiseSOS("fall sensor", "fall"); return; }
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left, raiseSOS]);

  // A hidden hook so the demo can simulate a fall without dropping a phone.
  useEffect(() => {
    const sim = () => setLeft(FALL_SECONDS);
    window.addEventListener("saathi:simulate-fall", sim);
    return () => window.removeEventListener("saathi:simulate-fall", sim);
  }, []);

  if (left === null) return null;
  return (
    <div className="fixed inset-0 z-[940] overflow-y-auto bg-[radial-gradient(90%_60%_at_50%_0%,#FFD2B5_0%,#FFE3D1_45%,#FFF4EC_100%)] animate-slidein">
      <div className="flex min-h-full flex-col items-center px-5 pb-8 pt-6 text-center safe-top">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[16px] font-bold text-peach-ink shadow-card">
          <span className="h-2.5 w-2.5 animate-blink rounded-full bg-peach-ink" /><Bi inline ta="விழுந்தது போல் தெரிகிறது" en="It looks like you fell" />
        </span>
        <h1 className="mt-6 text-[44px] font-extrabold leading-[1.05]"><Bi ta="நீங்கள் நலமா?" en="Are you OK?" className="items-center" /></h1>
        <div className="mt-8 rounded-full bg-white p-3 shadow-lift">
          <ProgressRing value={left / FALL_SECONDS} size={190} stroke={14} color="#B54A12" track="#FFE3D1">
            <div className="flex flex-col items-center leading-none">
              <span className="font-display text-[76px] font-extrabold text-peach-ink tnum">{left}</span>
              <span className="mt-1 text-[16px] font-bold text-ink-2"><Bi inline ta="விநாடி" en="seconds" /></span>
            </div>
          </ProgressRing>
        </div>
        <p className="mt-5 text-[19px] font-bold text-ink-2"><Bi ta="பிறகு தானாக உதவி அழைக்கப்படும்" en="Then help is called by itself" className="items-center" /></p>
        <div className="mt-auto flex w-full flex-col gap-3 pt-8">
          <BigButton tone="violet" className="!min-h-[84px] !text-[24px]" icon={<Check className="h-8 w-8" strokeWidth={2.6} />} onClick={() => setLeft(null)}>
            <Bi ta="நான் நலம்" en="I'm OK" />
          </BigButton>
          <BigButton tone="sos" onClick={() => { setLeft(null); void raiseSOS("fall sensor", "fall"); }}>
            <Bi ta="இப்போதே உதவி" en="Get help now" />
          </BigButton>
        </div>
      </div>
    </div>
  );
}

/** Request motion permission where the browser requires it (iOS Safari). */
export async function enableMotion(): Promise<boolean> {
  const DM = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent;
  if (!DM) return false;
  if (typeof DM.requestPermission === "function") {
    try { return (await DM.requestPermission()) === "granted"; } catch { return false; }
  }
  return true;
}
