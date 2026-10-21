// Saathi's escalation call and the fall-detection countdown, shown over any elder screen.
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, PersonStanding } from "lucide-react";
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
    catch (e) { toast((e as Error).message, "sos"); }
    finally { setBusy(false); stopSpeaking(); }
  };
  return (
    <div className="fixed inset-0 z-[950] overflow-y-auto bg-[#0F2A24] text-white safe-top safe-bottom animate-slidein">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center gap-5 px-5 py-10 text-center">
        <div className="mt-6 font-mono text-sm uppercase tracking-[0.2em] text-white/60">Incoming call</div>
        <div className="grid h-32 w-32 place-items-center rounded-full bg-brand shadow-[0_0_0_14px_rgba(217,142,4,.18),0_0_0_30px_rgba(217,142,4,.08)]">
          <img src="/icons/icon.svg" alt="" className="h-20 w-20 rounded-2xl" />
        </div>
        <h1 className="text-4xl font-extrabold"><Bi ta="சாத்தி அழைக்கிறது" en="Saathi is calling" /></h1>
        <div className="rounded-3xl bg-white/10 p-5 text-2xl font-semibold leading-snug">
          <Bi ta="“பாட்டி, காலை மாத்திரை சாப்பிட்டீங்களா? நலமா?”" en="“Paati, did you take your morning tablets? Are you well?”" />
        </div>
        <div className="mt-auto flex w-full flex-col gap-3">
          <Button size="xl" className="!min-h-[84px] bg-[#1FA971] text-white hover:bg-[#178a5c]" icon={<Phone className="h-7 w-7" />} loading={busy} onClick={ok}>
            <Bi ta="ஆம், நலம்" en="Yes, I'm fine" />
          </Button>
          <Button size="xl" variant="sos" className="!min-h-[84px]" icon={<PhoneOff className="h-7 w-7" />} onClick={() => { setOpen(false); stopSpeaking(); void raiseSOS("Saathi call (pressed help)"); }}>
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
    <div className="fixed inset-0 z-[940] overflow-y-auto bg-warn text-white safe-top safe-bottom animate-slidein">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center gap-5 px-5 py-10 text-center">
        <PersonStanding className="mt-6 h-20 w-20" />
        <h1 className="text-4xl font-extrabold"><Bi ta="நீங்கள் விழுந்தீர்களா?" en="Did you fall?" /></h1>
        <p className="text-xl"><Bi ta={`${left} விநாடியில் உதவி அழைக்கப்படும்`} en={`Calling for help in ${left} s`} /></p>
        <div className="font-display text-[96px] font-extrabold leading-none tnum">{left}</div>
        <div className="mt-auto flex w-full flex-col gap-3">
          <Button size="xl" className="!min-h-[84px] bg-white text-ink hover:bg-white/90" onClick={() => setLeft(null)}><Bi ta="நான் நலம்" en="I'm OK" /></Button>
          <Button size="xl" variant="sos" className="!min-h-[84px]" onClick={() => { setLeft(null); void raiseSOS("fall sensor", "fall"); }}><Bi ta="உதவி" en="Get help now" /></Button>
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
