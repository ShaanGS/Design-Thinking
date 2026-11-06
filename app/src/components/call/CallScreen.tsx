// The call screen, ported from Callvi (call-screen.tsx): a dark "calling" screen, then the light live surface with
// the voice orb, captions and round controls. Saathi adds one state, "incoming", for when the family asks Saathi
// to ring her. Nothing on this screen is simulated: every state comes from the voice SDK or the browser.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { Captions, ChevronDown, Mic, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { formatCallDuration, isActivePhase, VOICE_ERRORS, type VoiceState } from "../../lib/voice/voice-state";

export type CallLang = "ta" | "en";
const COPY = {
  en: {
    calling: "Calling…", incoming: "Incoming call", allowMic: "Allow your microphone to connect", ai: "Your AI helper",
    speaking: "Saathi is speaking", you: "You're speaking", listening: "I'm listening", muted: "Microphone off",
    mute: "Mute", unmute: "Unmute", captions: "Captions", captionsEmpty: "What you and Saathi say appears here.",
    end: "End", accept: "Accept", decline: "Decline", minimise: "Back", failed: "The call didn't connect", tryAgain: "Try again", close: "Close",
    idle: "Just ask: the doctor, your tablets, the gas, a bill.", footer: "Interrupt anytime. Ask anything. Go at your own pace.", youLabel: "You",
  },
  ta: {
    calling: "அழைக்கிறது…", incoming: "அழைப்பு வருகிறது", allowMic: "பேச மைக்ரோஃபோனை அனுமதிக்கவும்", ai: "உங்கள் AI உதவியாளர்",
    speaking: "சாத்தி பேசுகிறது", you: "நீங்கள் பேசுகிறீர்கள்", listening: "நான் கேட்கிறேன்", muted: "மைக்ரோஃபோன் அணைக்கப்பட்டது",
    mute: "ஒலியடக்கு", unmute: "ஒலி இயக்கு", captions: "வசனம்", captionsEmpty: "நீங்களும் சாத்தியும் பேசுவது இங்கே தெரியும்.",
    end: "முடி", accept: "எடு", decline: "வேண்டாம்", minimise: "பின்", failed: "அழைப்பு இணையவில்லை", tryAgain: "மீண்டும் முயலுங்கள்", close: "மூடு",
    idle: "கேளுங்கள்: டாக்டர், மாத்திரை, கேஸ், கரண்ட் பில்.", footer: "குறுக்கிடலாம். கேள்வி கேட்கலாம். உங்கள் வேகத்தில் பேசலாம்.", youLabel: "நீங்கள்",
  },
};

/** The shape responds only to measured audio amplitude; idle is still. */
export function VoiceOrb({ level = 0, className = "" }: { level?: number; className?: string }) {
  return (
    <div aria-hidden className={`voice-orb ${className}`} style={{ "--voice-level": Math.max(0, Math.min(1, level)) } as CSSProperties}>
      <span className="voice-orb-light" />
    </div>
  );
}

export function CallScreen({ state, lang, incoming, activity, device, onAccept, onDecline, onMute, onEnd, onRetry, onClose, onMinimise }: {
  state: VoiceState; lang: CallLang; incoming?: boolean; activity: string | null; device?: boolean;
  onAccept?: () => void; onDecline?: () => void; onMute: () => void; onEnd: () => void; onRetry: () => void; onClose: () => void; onMinimise: () => void;
}) {
  const t = COPY[lang];
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [captions, setCaptions] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const active = isActivePhase(state.phase);
  const connecting = !incoming && (state.phase === "requesting_mic" || state.phase === "connecting" || state.phase === "idle");
  const failed = state.phase === "error";

  useEffect(() => {
    primaryRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [connecting, failed, incoming]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null; let cancelled = false;
    (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen")
      .then((v) => { if (cancelled) void v.release(); else lock = v; }).catch(() => undefined);
    return () => { cancelled = true; void lock?.release(); };
  }, [active]);

  const duration = state.connectedAt === null ? "" : formatCallDuration(now - state.connectedAt);
  const status = state.phase === "agent_speaking" ? t.speaking : state.phase === "elder_speaking" ? t.you : state.muted ? t.muted : t.listening;
  const dark = connecting || incoming;

  return (
    <div role="dialog" aria-modal="true" aria-label="Call with Saathi"
      className={`call-root fixed inset-0 z-50 flex min-h-[100dvh] flex-col ${dark ? "call-surface text-white" : "voice-live-surface"}`}
      style={{ paddingTop: "max(env(safe-area-inset-top), 1.5rem)", paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}>
      {dark ? (
        <>
          <div className="flex flex-col items-center px-6 pt-[9vh] text-center">
            <p className="text-xl text-white/65" role="status">{incoming ? t.incoming : state.phase === "requesting_mic" ? t.allowMic : t.calling}</p>
            <h2 className="mt-2 text-5xl font-semibold tracking-tight">Saathi</h2>
            <p className="mt-4 text-sm text-white/45">{t.ai}</p>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="grid h-24 w-24 place-items-center rounded-full border border-white/10 text-4xl font-medium text-white/25">S</div>
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8 px-8 pb-8">
            {incoming ? (
              <div className="flex w-full justify-around gap-4">
                <DialControl label={t.decline} icon={<PhoneOff className="h-7 w-7" />} onClick={onDecline} end />
                <DialControl innerRef={primaryRef} label={t.accept} icon={<Phone className="h-7 w-7" />} onClick={onAccept} accept />
              </div>
            ) : (
              <>
                <div className="flex w-full justify-around gap-4">
                  <DialControl label={t.mute} icon={<MicOff className="h-7 w-7" />} disabled />
                  <DialControl label={t.captions} icon={<Captions className="h-7 w-7" />} onClick={() => setCaptions((v) => !v)} />
                </div>
                <DialControl innerRef={primaryRef} label={t.end} icon={<PhoneOff className="h-7 w-7" />} onClick={onEnd} end />
              </>
            )}
          </div>
        </>
      ) : failed ? (
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <VoiceOrb className="opacity-40" />
          <h2 className="mt-6 text-2xl font-medium">{t.failed}</h2>
          <p className="max-w-sm text-sm text-[#5e626c]" role="alert">{VOICE_ERRORS[state.error ?? "generic"]}</p>
          <div className="flex gap-4">
            <Control label={t.close} onClick={onClose} icon={<X className="h-6 w-6" />} />
            <Control innerRef={primaryRef} label={t.tryAgain} onClick={onRetry} icon={<Phone className="h-6 w-6" />} dark />
          </div>
        </main>
      ) : (
        <>
          <header className="flex items-center justify-between px-6">
            <button type="button" onClick={onMinimise} aria-label={t.minimise} className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm"><ChevronDown className="h-6 w-6" /></button>
            <div className="text-center"><p className="text-base font-medium">Saathi</p><p className="mt-0.5 text-xs text-[#858994]">{device ? "Phone's voice (backup)" : t.ai}</p></div>
            <span className="min-w-11 text-right text-sm tabular-nums text-[#858994]">{duration}</span>
          </header>
          <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-12 px-6 pb-10">
            <VoiceOrb level={state.level} />
            <div className="flex max-w-sm flex-col items-center gap-2 text-center">
              <p role="status" aria-live="polite" className="text-lg font-medium tracking-tight">{status}</p>
              <p className="text-sm text-[#858994]">{activity ?? t.idle}</p>
            </div>
            {captions ? (
              <div className="absolute inset-x-4 bottom-3 mx-auto max-h-44 max-w-xl overflow-y-auto rounded-2xl border border-[#e8e9ed] bg-white/95 p-5 shadow-sm">
                {state.transcript.length === 0 ? <p className="text-sm text-[#5e626c]">{t.captionsEmpty}</p> : (
                  <ol aria-label={t.captions} className="flex flex-col gap-3">{state.transcript.slice(-3).map((line) => <li key={line.id} className="text-sm"><span className="mr-2 font-medium text-[#858994]">{line.role === "saathi" ? "Saathi" : t.youLabel}</span>{line.text}</li>)}</ol>
                )}
              </div>
            ) : null}
          </main>
          <footer className="flex flex-col items-center gap-5 px-6 pb-5">
            <div className="flex items-center gap-4">
              <Control label={t.captions} onClick={() => setCaptions((v) => !v)} pressed={captions} icon={<Captions className="h-5 w-5" />} />
              <Control label={state.muted ? t.unmute : t.mute} onClick={onMute} pressed={state.muted} icon={state.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />} />
              <Control innerRef={primaryRef} label={t.end} onClick={onEnd} icon={<X className="h-7 w-7" />} dark />
            </div>
            <p className="text-center text-xs text-[#858994]">{t.footer}</p>
          </footer>
        </>
      )}
    </div>
  );
}

function Control({ innerRef, label, icon, onClick, pressed, dark = false }: { innerRef?: Ref<HTMLButtonElement>; label: string; icon: ReactNode; onClick: () => void; pressed?: boolean; dark?: boolean }) {
  return <button ref={innerRef} type="button" aria-label={label} aria-pressed={pressed} title={label} onClick={onClick} className={`voice-control ${dark ? "voice-control-dark" : ""} ${pressed ? "ring-2 ring-[#4269df]/40" : ""}`}>{icon}</button>;
}
function DialControl({ innerRef, label, icon, onClick, disabled, end = false, accept = false }: { innerRef?: Ref<HTMLButtonElement>; label: string; icon: ReactNode; onClick?: () => void; disabled?: boolean; end?: boolean; accept?: boolean }) {
  return <div className="flex flex-col items-center gap-2.5"><button ref={innerRef} type="button" aria-label={label} onClick={onClick} disabled={disabled} className={`voice-dial-control ${end ? "voice-dial-end" : ""} ${accept ? "voice-dial-accept" : ""}`}>{icon}</button><span className="text-sm text-white/80">{label}</span></div>;
}
