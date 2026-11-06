// Call Saathi: Paati talks to Saathi by voice, in Tamil or English (Callvi's call engine, in Saathi's soft-clay look).
// The call is the interface: she never has to read or tap anything once it starts. Captions stay on for her
// (big type) and for the family watching. If something serious comes up, the emergency screen rises over the
// call and Saathi stays on the line with her.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Keyboard, Check, RotateCcw, X } from "lucide-react";
import { api } from "../../lib/api";
import { useToast, cx } from "../../components/ui";
import { Art } from "../../components/kit";
import { useSaathiCall, type CallLang } from "../../lib/voice/useSaathiCall";
import { formatCallDuration, isActivePhase, VOICE_ERRORS, type VoiceState } from "../../lib/voice/voice-state";
import { ACTIVE, SubScreen, useElder } from "./shared";

const LANG_KEY = "saathi-call-lang";
const readCallLang = (): CallLang => { try { return localStorage.getItem(LANG_KEY) === "ta" ? "ta" : "en"; } catch { return "en"; } };
const SAY = [
  "I took my morning tablets",
  "I didn't sleep well",
  "Tell Karthik to call me",
  "What did the heart doctor say?",
  "Teach me about scam calls",
];

interface VoiceInfo { mode: "elevenlabs" | "device"; lastCall: { summary: string; started_at: string } | null }

export default function Call() {
  const { data, reload } = useElder();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [lang, setLang] = useState<CallLang>(readCallLang);
  const [info, setInfo] = useState<VoiceInfo | null>(null);
  const call = useSaathiCall({ onEmergency: reload, onLogged: reload });
  const { state } = call;
  const active = isActivePhase(state.phase) || state.phase === "requesting_mic";
  const emergency = data?.emergency && ACTIVE.includes(data.emergency.status);

  useEffect(() => { api.get<VoiceInfo>("/api/voice").then(setInfo).catch(() => setInfo(null)); }, [state.phase === "ended"]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (l: CallLang) => { setLang(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ } };
  const begin = () => void call.start(lang, { textOnly: params.get("textcall") === "1" });
  useEffect(() => { if (state.phase === "error" && state.error === "unsupported") toast(VOICE_ERRORS.unsupported, "warn"); }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = data?.patient.nickname || "Paati";
  const ended = state.phase === "ended";
  const mins = ended && state.connectedAt ? formatCallDuration(Date.now() - state.connectedAt) : null;

  return (
    <SubScreen ta="சாத்தியை அழை" en="Call Saathi" art="chat">
      {/* Who Saathi is */}
      <section className="relative overflow-hidden rounded-[28px] bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <span className="relative grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-lilac">
            <span className="absolute inset-0 rounded-full bg-violet/15 animate-breathe" />
            <Art name="chat" size={64} className="relative" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[24px] font-extrabold">Talk to Saathi</p>
            <p className="mt-1 text-[17px] leading-snug text-ink-2">Like a phone call. Tell Saathi how you are, ask about your tablets, or leave a message for Karthik.</p>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="rounded-[28px] bg-white p-4 shadow-card">
        <p className="px-1 text-[19px] font-extrabold">Saathi will speak</p>
        <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Language">
          {([["ta", "தமிழ்", "Tamil"], ["en", "English", "English"]] as const).map(([l, label, sub]) => (
            <motion.button key={l} type="button" role="radio" aria-checked={lang === l} whileTap={{ scale: 0.96 }} onClick={() => pick(l)}
              className={cx("relative flex min-h-[84px] flex-col items-center justify-center rounded-[22px] border-2 px-3 text-center",
                lang === l ? "border-violet bg-violet-50 text-violet-700" : "border-line bg-canvas text-ink")}>
              <span className={cx("text-[24px] font-extrabold leading-none", l === "ta" && "font-tamil")}>{label}</span>
              {l === "ta" && <span className="mt-1 text-[14px] font-semibold text-ink-2">{sub}</span>}
              {lang === l && <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-violet text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>}
            </motion.button>
          ))}
        </div>
      </section>

      {/* The call button */}
      <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={begin} disabled={active}
        className="flex min-h-[96px] w-full items-center justify-center gap-4 rounded-[28px] bg-violet px-6 text-white shadow-[0_18px_34px_-14px_rgba(91,71,230,.9)] disabled:opacity-60">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/20"><Phone className="h-8 w-8" strokeWidth={2.2} fill="currentColor" /></span>
        <span className="text-left leading-tight">
          <span className="block text-[26px] font-extrabold">{ended ? "Call again" : "Call Saathi"}</span>
          <span className="block text-[16px] font-semibold text-white/80">{lang === "ta" ? "In Tamil" : "In English"}</span>
        </span>
      </motion.button>

      {ended && (
        <section className="flex items-start gap-3 rounded-[24px] bg-mint px-4 py-3 text-mint-ink">
          <Check className="mt-0.5 h-7 w-7 shrink-0" strokeWidth={3} />
          <div className="leading-snug">
            <p className="text-[19px] font-extrabold">Call ended{mins ? ` · ${mins}` : ""}</p>
            <p className="text-[16px]">Karthik can see what you shared.</p>
          </div>
        </section>
      )}

      {info?.lastCall && (
        <section className="rounded-[24px] bg-white p-4 shadow-card">
          <p className="text-[15px] font-bold text-ink-2">Last time, Saathi told your family</p>
          <p className="mt-1 text-[18px] leading-snug">“{info.lastCall.summary}”</p>
        </section>
      )}

      {/* Things she can say */}
      <section className="rounded-[28px] bg-lilac p-4">
        <p className="px-1 text-[19px] font-extrabold">You can say things like</p>
        <ul className="mt-3 flex flex-col gap-2">
          {SAY.map((s) => <li key={s} className="rounded-[18px] bg-white/80 px-4 py-3 text-[18px] font-semibold leading-snug">“{s}”</li>)}
        </ul>
      </section>

      <button type="button" onClick={() => nav("/elder/talk")} className="flex min-h-[64px] items-center justify-center gap-2 rounded-[24px] bg-white text-[18px] font-bold text-violet-700 shadow-card">
        <Keyboard className="h-6 w-6" strokeWidth={2} />Type to Saathi instead
      </button>
      <p className="px-2 pb-2 text-center text-[15px] leading-snug text-ink-3">
        Saathi is an AI, not a doctor. If you say something is wrong, it tells your family and calls the ambulance.
      </p>

      <AnimatePresence>
        {(active || state.phase === "error") && !emergency && (
          <LiveCall key="live" state={state} name={name} device={call.mode === "device"} onMute={call.toggleMute} onEnd={() => void call.stop()}
            onRetry={begin} onClose={call.reset} />
        )}
      </AnimatePresence>
      {active && emergency && <OnCallChip muted={state.muted} onMute={call.toggleMute} onEnd={() => void call.stop()} />}
    </SubScreen>
  );
}

/* ---------------------------------------------------------------- The live call surface */

function LiveCall({ state, name, device, onMute, onEnd, onRetry, onClose }: {
  state: VoiceState; name: string; device: boolean; onMute: () => void; onEnd: () => void; onRetry: () => void; onClose: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const connecting = state.phase === "requesting_mic" || state.phase === "connecting";
  const failed = state.phase === "error";
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (failed || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null; let gone = false;
    (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen")
      .then((l) => { if (gone) void l.release(); else lock = l; }).catch(() => undefined);
    return () => { gone = true; void lock?.release(); };
  }, [failed]);

  const status = state.phase === "requesting_mic" ? "Allow the microphone"
    : connecting ? "Calling Saathi…"
    : state.phase === "agent_speaking" ? "Saathi is speaking"
    : state.phase === "thinking" ? "Saathi is thinking…"
    : state.phase === "elder_speaking" ? "Saathi is listening to you"
    : state.muted ? "You are on mute" : "Your turn. Speak any time.";
  const lines = state.transcript.slice(-2);
  const capRef = useRef<HTMLElement>(null);
  useEffect(() => { const el = capRef.current; if (el) el.scrollTop = el.scrollHeight; }, [state.transcript]);
  const level = state.phase === "agent_speaking" || state.phase === "elder_speaking" ? Math.max(state.level, 0.12) : state.level;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ duration: 0.25 }}
      role="dialog" aria-modal="true" aria-label={`Call with Saathi`}
      className="hero-violet fixed inset-0 z-[800] flex flex-col overflow-hidden text-white safe-top">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -left-20 bottom-24 h-56 w-56 rounded-full bg-white/5" />

      <header className="relative flex items-center justify-between px-6 pb-2 pt-2">
        <span className="glass rounded-full px-3 py-1 text-[14px] font-bold">{device ? "Phone's voice (backup)" : "AI companion"}</span>
        <span className="font-display text-[20px] font-bold tnum text-white/90">{state.connectedAt ? formatCallDuration(now - state.connectedAt) : ""}</span>
      </header>

      {failed ? (
        <main className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <span className="grid h-32 w-32 place-items-center rounded-full bg-white/15"><Art name="chat" size={92} /></span>
          <h2 className="text-[28px] font-extrabold leading-tight">The call didn't connect</h2>
          <p className="max-w-[300px] text-[18px] leading-snug text-white/85" role="alert">{VOICE_ERRORS[state.error ?? "generic"]}</p>
          <div className="mt-2 flex w-full max-w-[320px] flex-col gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onRetry} className="flex min-h-[72px] items-center justify-center gap-3 rounded-[24px] bg-white text-[22px] font-extrabold text-violet-700">
              <RotateCcw className="h-7 w-7" strokeWidth={2.4} />Try again
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onClose} className="glass flex min-h-[64px] items-center justify-center gap-2 rounded-[24px] text-[19px] font-bold">
              <X className="h-6 w-6" strokeWidth={2.4} />Close
            </motion.button>
          </div>
        </main>
      ) : (
        <>
          <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[2.5vh] overflow-hidden px-6 py-2">
            <p className="text-center text-[min(40px,5.5vh)] font-extrabold leading-none tracking-tight [@media(max-height:720px)]:hidden">Saathi</p>
            <Orb level={level} connecting={connecting} />
            <p role="status" aria-live="polite" className="max-w-[320px] text-center text-[min(24px,3.6vh)] font-extrabold leading-tight">{status}</p>
          </main>

          {/* Captions: the last two lines, in type she can read */}
          <section ref={capRef} aria-label="Captions" className="relative mx-4 mb-3 max-h-[22vh] min-h-[80px] shrink-0 overflow-y-auto rounded-[26px] bg-white/95 px-4 py-3 text-ink shadow-lift scrollbar-none">
            {lines.length === 0
              ? <p className="py-6 text-center text-[17px] text-ink-3">{connecting ? `Connecting to Saathi for ${name}…` : "What you and Saathi say appears here."}</p>
              : <ol className="flex flex-col gap-2">{lines.map((l) => (
                  <li key={l.id} className="text-[19px] leading-snug">
                    <span className={cx("mr-1.5 text-[14px] font-extrabold uppercase tracking-wide", l.role === "saathi" ? "text-violet-600" : "text-ink-3")}>{l.role === "saathi" ? "Saathi" : "You"}</span>
                    <span className={/[஀-௿]/.test(l.text) ? "font-tamil" : undefined}>{l.text}</span>
                  </li>))}</ol>}
          </section>

          <footer className="relative flex shrink-0 items-start justify-center gap-10 px-6 pb-[max(16px,3vh)]">
            <CallControl label={state.muted ? "Unmute" : "Mute"} onClick={onMute} disabled={connecting} pressed={state.muted}
              icon={state.muted ? <MicOff className="h-8 w-8" strokeWidth={2.2} /> : <Mic className="h-8 w-8" strokeWidth={2.2} />} />
            <CallControl label="End call" onClick={onEnd} end icon={<PhoneOff className="h-9 w-9" strokeWidth={2.2} />} />
          </footer>
        </>
      )}
    </motion.div>
  );
}

/** Saathi's face, breathing with the real audio level (still when nobody speaks). */
function Orb({ level, connecting }: { level: number; connecting: boolean }) {
  const s = 1 + level * 0.35;
  return (
    <div className="relative grid h-[min(220px,27vh)] w-[min(220px,27vh)] shrink-0 place-items-center" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-white/10 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.6})` }} />
      <span className="absolute inset-[10%] rounded-full bg-white/15 transition-transform duration-100" style={{ transform: `scale(${s})` }} />
      {connecting && <span className="absolute inset-[10%] rounded-full border-4 border-white/40 animate-ripple" />}
      <span className="relative grid h-[68%] w-[68%] place-items-center rounded-full bg-white shadow-[0_24px_50px_-18px_rgba(30,16,120,.6)]">
        <img src="/art/chat.webp" alt="" draggable={false} className="pointer-events-none h-[75%] w-[75%] select-none object-contain art-shadow" />
      </span>
    </div>
  );
}

function CallControl({ label, icon, onClick, end, pressed, disabled }: { label: string; icon: React.ReactNode; onClick: () => void; end?: boolean; pressed?: boolean; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="grid h-[88px] place-items-center">
      <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={pressed}
        className={cx("grid place-items-center rounded-full disabled:opacity-40", end ? "h-[88px] w-[88px] bg-ink text-white shadow-[0_16px_30px_-12px_rgba(20,14,60,.7)]" : cx("h-[76px] w-[76px]", pressed ? "bg-white text-violet-700" : "glass"))}>
        {icon}
      </motion.button>
      </div>
      <span className="text-[17px] font-bold">{label}</span>
    </div>
  );
}

/** While the emergency screen is up, a small strip shows Saathi is still on the line. */
function OnCallChip({ muted, onMute, onEnd }: { muted: boolean; onMute: () => void; onEnd: () => void }) {
  // Leave room under the emergency screen so the strip never hides its last button ("I'm OK, cancel").
  useEffect(() => { document.documentElement.style.setProperty("--call-chip", "88px"); return () => { document.documentElement.style.removeProperty("--call-chip"); }; }, []);
  return (
    <div className="fixed inset-x-3 bottom-3 z-[960] flex items-center gap-3 rounded-[26px] bg-white px-3 py-2.5 text-ink shadow-lift">
      <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lilac">
        <span className="absolute inset-0 rounded-full bg-violet/20 animate-breathe" /><Art name="chat" size={36} className="relative" />
      </span>
      <p className="min-w-0 flex-1 text-[17px] font-extrabold leading-tight">Saathi is still on the call with you</p>
      <button type="button" onClick={onMute} aria-label={muted ? "Unmute" : "Mute"} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-canvas">
        {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </button>
      <button type="button" onClick={onEnd} aria-label="End call" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-white"><PhoneOff className="h-6 w-6" /></button>
    </div>
  );
}
