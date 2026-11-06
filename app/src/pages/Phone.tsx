// Paati's ordinary phone. No Saathi app: just a lock screen, a dialer, and phone calls. Saathi rings her (when the
// family taps "Ring Paati") or she calls Saathi from her favourites, and everything happens by voice.
// This screen stands in for a real phone line in the demo; the voice, the errands and the safety rules are real.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone as PhoneIcon, PhoneOff, Mic, MicOff, Volume2, Grid3x3, UserPlus, Pause, Users, Captions, ChevronLeft, Star } from "lucide-react";
import { useLive } from "../lib/socket";
import { useAuth } from "../lib/auth";
import { cx } from "../components/ui";
import { PhoneFrame } from "../components/kit";
import { StageLabel } from "./Landing";
import { useSaathiCall, type CallLang } from "../lib/voice/useSaathiCall";
import { formatCallDuration, isActivePhase, VOICE_ERRORS } from "../lib/voice/voice-state";

const LANG_KEY = "saathi-phone-lang";
type View = "home" | "dialer" | "incoming" | "call";

function useClock() { const [d, setD] = useState(new Date()); useEffect(() => { const t = setInterval(() => setD(new Date()), 10000); return () => clearInterval(t); }, []); return d; }

/** A classic two-tone ringtone and vibration while the phone rings. */
function useRingtone(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let stopped = false; let ctx: AudioContext | null = null;
    try { ctx = new AudioContext(); void ctx.resume().catch(() => undefined); } catch { /* no audio */ }
    const ring = () => {
      if (stopped) return;
      try { navigator.vibrate?.([700, 300, 700]); } catch { /* ignore */ }
      if (ctx) {
        const g = ctx.createGain(); g.gain.value = 0.06; g.connect(ctx.destination);
        for (const f of [440, 480]) { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(g); o.start(); o.stop(ctx.currentTime + 1.6); }
      }
      setTimeout(ring, 3200);
    };
    ring();
    return () => { stopped = true; void ctx?.close().catch(() => undefined); };
  }, [on]);
}

export default function PhonePage() {
  const { user } = useAuth();
  const now = useClock();
  const [view, setView] = useState<View>("home");
  const [lang, setLang] = useState<CallLang>(() => { try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ta"; } catch { return "ta"; } });
  const [incoming, setIncoming] = useState<{ lang: CallLang; from: string } | null>(null);
  const [captions, setCaptions] = useState(true);
  const call = useSaathiCall({ onEmergency: () => undefined, onLogged: () => undefined });
  const { state } = call;
  const active = isActivePhase(state.phase) || state.phase === "requesting_mic";

  useLive<{ lang: CallLang; from: string }>("ring", (r) => { if (!active) { setIncoming(r); setView("incoming"); } });
  useRingtone(view === "incoming");
  // An unanswered call stops ringing after 40 seconds
  useEffect(() => { if (view !== "incoming") return; const t = setTimeout(() => setView("home"), 40000); return () => clearTimeout(t); }, [view]);
  // After a call ends, go back to the lock screen
  useEffect(() => { if (state.phase !== "ended") return; const t = setTimeout(() => { call.reset(); setView("home"); }, 2500); return () => clearTimeout(t); }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickLang = (l: CallLang) => { setLang(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ } };
  const dialSaathi = () => { setView("call"); void call.start(lang); };
  const answer = () => { const l = incoming?.lang ?? lang; setView("call"); void call.start(l); };

  const label = <StageLabel who="paati" title="Paati's ordinary phone" text="No app to learn. Saathi rings her, or she calls Saathi, and asks in Tamil or English: book the doctor, order her tablets, book the gas, pay a bill. Saathi does it on the web while they talk, and Karthik approves anything that costs money." />;
  const time = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).replace(/\s?[ap]m$/i, "");
  const date = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <PhoneFrame label={label}>
      <div className="relative flex min-h-full flex-col overflow-hidden bg-[#0d1117] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_20%_10%,#1f4e5f_0%,transparent_60%),radial-gradient(80%_60%_at_90%_90%,#3b2a5c_0%,transparent_60%)]" />
        <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex min-h-full flex-1 flex-col items-center px-6 pb-8 pt-16 safe-top">
              <p className="text-[18px] font-medium text-white/80">{date}</p>
              <p className="mt-1 font-display text-[88px] font-bold leading-none tracking-tight tnum">{time}</p>
              <p className="mt-6 max-w-[260px] text-center text-[15px] text-white/55">{user?.name ?? "Paati"}'s phone</p>
              <div className="flex-1" />
              <motion.button whileTap={{ scale: 0.92 }} onClick={() => setView("dialer")} aria-label="Phone"
                className="grid h-[76px] w-[76px] place-items-center rounded-[22px] bg-[#34c759] shadow-[0_12px_30px_-10px_rgba(52,199,89,.7)]">
                <PhoneIcon className="h-9 w-9" fill="currentColor" strokeWidth={0} />
              </motion.button>
              <p className="mt-2 text-[14px] font-semibold text-white/80">Phone</p>
            </motion.div>
          )}

          {view === "dialer" && (
            <motion.div key="dialer" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} className="relative flex min-h-full flex-1 flex-col bg-[#101418] px-4 pb-8 pt-4 safe-top">
              <button onClick={() => setView("home")} className="flex h-11 items-center gap-1 self-start text-[17px] text-[#4cb3ff]"><ChevronLeft className="h-6 w-6" />Back</button>
              <h1 className="mt-2 px-1 text-[34px] font-bold">Favourites</h1>
              <ul className="mt-3 flex flex-col">
                <li>
                  <button onClick={dialSaathi} className="flex w-full items-center gap-4 border-b border-white/10 px-1 py-3 text-left">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white"><img src="/art/chat.webp" alt="" className="h-11 w-11 object-contain" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[21px] font-semibold">Saathi</span><span className="block text-[14px] text-white/55">helper · speaks {lang === "ta" ? "Tamil" : "English"}</span></span>
                    <Star className="h-5 w-5 text-[#ffcc00]" fill="currentColor" />
                  </button>
                </li>
                {[["Karthik", "son", "+919000000000"], ["Meena", "neighbour", "+919000000002"]].map(([n, r, t]) => (
                  <li key={n}>
                    <a href={`tel:${t}`} className="flex items-center gap-4 border-b border-white/10 px-1 py-3">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15 text-[22px] font-semibold">{n[0]}</span>
                      <span><span className="block text-[21px] font-semibold">{n}</span><span className="block text-[14px] text-white/55">{r}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl bg-white/5 p-3">
                <p className="text-[13px] text-white/60">Saathi speaks</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([["ta", "தமிழ்"], ["en", "English"]] as const).map(([l, t]) => (
                    <button key={l} onClick={() => pickLang(l)} aria-pressed={lang === l} className={cx("h-12 rounded-xl text-[17px] font-semibold", lang === l ? "bg-white text-[#101418]" : "bg-white/10", l === "ta" && "font-tamil")}>{t}</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === "incoming" && (
            <motion.div key="incoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex min-h-full flex-1 flex-col items-center px-6 pb-12 pt-20 safe-top">
              <p className="text-[17px] text-white/70">Incoming call</p>
              <p className="mt-2 text-[44px] font-semibold leading-none">Saathi</p>
              <p className="mt-2 text-[15px] text-white/55">{incoming ? `asked by ${incoming.from}` : "helper"}</p>
              <div className="relative mt-12 grid h-36 w-36 place-items-center">
                <span className="absolute inset-0 rounded-full bg-white/10 animate-ripple" />
                <span className="grid h-32 w-32 place-items-center rounded-full bg-white"><img src="/art/chat.webp" alt="" className="h-24 w-24 object-contain" /></span>
              </div>
              <div className="flex-1" />
              <div className="flex w-full items-start justify-around">
                <RoundButton label="Decline" tone="red" onClick={() => setView("home")} icon={<PhoneOff className="h-9 w-9" />} />
                <RoundButton label="Accept" tone="green" pulse onClick={answer} icon={<PhoneIcon className="h-9 w-9" fill="currentColor" strokeWidth={0} />} />
              </div>
            </motion.div>
          )}

          {view === "call" && (
            <motion.div key="call" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex min-h-full flex-1 flex-col items-center px-6 pb-8 pt-12 safe-top">
              <p className="text-[36px] font-semibold leading-none">Saathi</p>
              <p role="status" className="mt-2 text-[17px] text-white/70 tnum">
                {state.phase === "error" ? "Call failed" : state.phase === "ended" ? "Call ended" : !state.connectedAt ? "Calling…" : formatCallDuration(Date.now() - state.connectedAt)}
              </p>
              {call.mode === "device" && <p className="mt-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] text-white/70">Phone's voice (backup)</p>}
              <CallTimer active={!!state.connectedAt && active} />
              <div className="relative mt-[4vh] grid h-[min(132px,17vh)] w-[min(132px,17vh)] shrink-0 place-items-center">
                <span className="absolute inset-0 rounded-full bg-white/10 transition-transform duration-100" style={{ transform: `scale(${1 + Math.max(state.level, state.phase === "agent_speaking" ? 0.1 : 0) * 0.5})` }} />
                <span className="relative grid h-[82%] w-[82%] place-items-center rounded-full bg-white"><img src="/art/chat.webp" alt="" className="h-[75%] w-[75%] object-contain" /></span>
              </div>

              {state.phase === "error" ? (
                <div className="mt-6 text-center">
                  <p className="max-w-[280px] text-[16px] text-white/80" role="alert">{VOICE_ERRORS[state.error ?? "generic"]}</p>
                  <button onClick={() => { call.reset(); setView("dialer"); }} className="mt-4 h-12 rounded-full bg-white px-6 text-[16px] font-semibold text-[#101418]">OK</button>
                </div>
              ) : (
                <>
                  <div className="mt-[3vh] min-h-[84px] w-full">
                    {captions && state.transcript.length > 0 && (
                      <div className="max-h-[17vh] overflow-y-auto rounded-2xl bg-black/45 px-4 py-3 text-[17px] leading-snug backdrop-blur scrollbar-none" aria-label="Live captions">
                        {state.transcript.slice(-2).map((l) => (
                          <p key={l.id} className={cx(l.role === "elder" && "text-white/65", /[஀-௿]/.test(l.text) && "font-tamil")}>{l.text}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-x-6 gap-y-5">
                    <GridButton label={state.muted ? "Unmute" : "Mute"} on={state.muted} onClick={call.toggleMute} icon={state.muted ? <MicOff /> : <Mic />} />
                    <GridButton label="Keypad" icon={<Grid3x3 />} disabled />
                    <GridButton label="Speaker" icon={<Volume2 />} on />
                    <GridButton label="Add call" icon={<UserPlus />} disabled />
                    <GridButton label="Hold" icon={<Pause />} disabled />
                    <GridButton label="Captions" icon={<Captions />} on={captions} onClick={() => setCaptions((c) => !c)} />
                  </div>
                  <div className="mt-[4vh]"><RoundButton label="End" tone="red" onClick={() => void call.stop()} icon={<PhoneOff className="h-9 w-9" />} /></div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PhoneFrame>
  );
}

/** Re-renders the call timer every second. */
function CallTimer({ active }: { active: boolean }) {
  const [, set] = useState(0);
  const r = useRef<number>();
  useEffect(() => { if (!active) return; r.current = window.setInterval(() => set((n) => n + 1), 1000); return () => window.clearInterval(r.current); }, [active]);
  return null;
}

function RoundButton({ label, icon, onClick, tone, pulse }: { label: string; icon: React.ReactNode; onClick: () => void; tone: "red" | "green"; pulse?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label}
        className={cx("relative grid h-[76px] w-[76px] place-items-center rounded-full text-white", tone === "red" ? "bg-[#ff3b30]" : "bg-[#34c759]")}>
        {pulse && <span className="absolute inset-0 rounded-full bg-[#34c759]/50 animate-ripple" />}
        <span className="relative">{icon}</span>
      </motion.button>
      <span className="text-[15px] text-white/85">{label}</span>
    </div>
  );
}

function GridButton({ label, icon, onClick, on, disabled }: { label: string; icon: React.ReactNode; onClick?: () => void; on?: boolean; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button onClick={onClick} disabled={disabled} aria-label={label} aria-pressed={on}
        className={cx("grid h-[64px] w-[64px] place-items-center rounded-full [&_svg]:h-7 [&_svg]:w-7", on ? "bg-white text-[#101418]" : "bg-white/15 text-white", disabled && "opacity-35")}>{icon}</button>
      <span className="text-[13px] text-white/75">{label}</span>
    </div>
  );
}
