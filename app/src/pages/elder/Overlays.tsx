// Saathi's escalation call and the fall-detection countdown, shown over any elder screen.
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { speak, stopSpeaking } from "../../lib/speech";
import { Button, useToast } from "../../components/ui";
import { Bi, useElder } from "./shared";

export function EscalationCall() {
  const { raiseSOS, reload } = useElder();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useLive<{ stage: string }>("escalation", (e) => {
    if (e.stage === "calling") {
      setOpen(true);
      try { navigator.vibrate?.([400, 200, 400, 200, 400]); } catch { /* not supported */ }
      speak("பாட்டி, நான் சாத்தி. காலை மாத்திரை சாப்பிட்டீங்களா? நீங்க நலமா?", "Paati, this is Saathi. Did you take your morning tablets? Are you well?");
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
    <div className="fixed inset-0 z-[950] overflow-y-auto bg-night text-white safe-top safe-bottom animate-slidein">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col px-5 pb-6 pt-10">
        <p className="text-[15px] text-white/60"><Bi inline ta="அழைப்பு வருகிறது" en="Incoming call" /></p>
        <div className="mt-4 flex items-center gap-4">
          <img src="/icons/icon.svg" alt="" className="h-16 w-16" style={{ borderRadius: 14 }} />
          <h1 className="text-[36px] font-bold leading-tight"><Bi ta="சாத்தி" en="Saathi" /></h1>
        </div>
        <blockquote className="mt-8 border-l-4 border-brand pl-4 text-[26px] font-semibold leading-snug">
          <Bi ta="“பாட்டி, காலை மாத்திரை சாப்பிட்டீங்களா? நலமா?”" en="“Paati, did you take your morning tablets? Are you well?”" />
        </blockquote>
        <div className="mt-auto flex flex-col gap-3 pt-10">
          <Button variant="brand" size="xl" className="!min-h-[84px] !text-[24px]" icon={<Phone className="h-7 w-7" strokeWidth={2} />} loading={busy} onClick={ok}>
            <Bi ta="ஆம், நலம்" en="Yes, I'm fine" />
          </Button>
          <Button variant="sos" size="xl" className="!min-h-[72px] !text-[22px]" icon={<PhoneOff className="h-6 w-6" strokeWidth={2} />} onClick={() => { setOpen(false); stopSpeaking(); void raiseSOS("Saathi call (pressed help)"); }}>
            <Bi ta="உதவி வேண்டும்" en="I need help" />
          </Button>
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
    <div className="fixed inset-0 z-[940] overflow-y-auto bg-white safe-top safe-bottom animate-slidein">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col px-5 pb-6">
        <div className="-mx-5 bg-warn px-5 py-3 text-[17px] font-semibold text-white"><Bi inline ta="விழுந்தது போல் தெரிகிறது" en="It looks like you fell" /></div>
        <h1 className="mt-7 text-[40px] font-bold leading-[1.05]"><Bi ta="நீங்கள் நலமா?" en="Are you OK?" /></h1>
        <div className="mt-8 border-y border-line py-6">
          <p className="text-[17px] text-ink-2"><Bi inline ta="உதவி அழைக்கப்படும்" en="Calling for help in" /></p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-[96px] font-semibold leading-[0.85] text-warn tnum">{left}</span>
            <span className="text-[22px] font-semibold text-warn"><Bi inline ta="விநாடி" en="sec" /></span>
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-warn transition-[width] duration-1000 ease-linear" style={{ width: `${(left / FALL_SECONDS) * 100}%` }} /></div>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <Button variant="primary" size="xl" className="!min-h-[84px] !text-[24px]" onClick={() => setLeft(null)}><Bi ta="நான் நலம்" en="I'm OK" /></Button>
          <Button variant="sos" size="xl" className="!min-h-[72px] !text-[22px]" onClick={() => { setLeft(null); void raiseSOS("fall sensor", "fall"); }}><Bi ta="இப்போதே உதவி" en="Get help now" /></Button>
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
