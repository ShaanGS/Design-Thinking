// Talk to Saathi: a Tamil-first conversation, by voice (speech in and out) or by tapping a ready-made reply.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Send, Volume2, VolumeX, Play } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { canListen, listen, speak, stopSpeaking } from "../../lib/speech";
import { fmtTime, isTamil } from "../../lib/format";
import { useToast, cx, Spinner } from "../../components/ui";
import { Art, Person } from "../../components/kit";
import type { ChatTurn, Emergency } from "../../../shared/types";
import { SubScreen, tamilName, useElder, useT } from "./shared";

const QUICK = [
  { ta: "நல்லா இருக்கேன்", en: "I'm doing well" },
  { ta: "காலை மாத்திரை சாப்பிட்டேன்", en: "I took my morning tablets" },
  { ta: "ராத்திரி சரியா தூக்கம் வரலை", en: "I didn't sleep well last night" },
  { ta: "கார்த்திக் கிட்ட பேசணும்", en: "I want to talk to Karthik" },
  { ta: "கொஞ்சம் நெஞ்சு கனமா இருக்கு, வியர்க்குது", en: "My chest feels heavy, I'm sweating" },
];
const VOICE_KEY = "saathi-elder-voice";

export default function Talk() {
  const { data, lang, reload } = useElder();
  const toast = useToast();
  const t = useT();
  const [turns, setTurns] = useState<ChatTurn[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem(VOICE_KEY) !== "off"; } catch { return true; } });
  const stopRef = useRef<() => void>(() => {});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get<ChatTurn[]>("/api/chat").then(setTurns).catch((e) => { setTurns([]); toast(e.message, "warn"); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stopRef.current(); stopSpeaking(); }, []);
  useLive<ChatTurn>("chat", (c) => setTurns((l) => (l && !l.some((x) => x.id === c.id) ? [...l, c] : l)));
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns?.length, sending]);

  const toggleVoice = () => { const v = !voice; setVoice(v); if (!v) stopSpeaking(); try { localStorage.setItem(VOICE_KEY, v ? "on" : "off"); } catch { /* ignore */ } };

  async function send(msg: string) {
    const m = msg.trim(); if (!m || sending) return;
    setSending(true); setText("");
    try {
      const r = await api.post<{ user: ChatTurn; reply: ChatTurn; action: string; emergency: Emergency | null }>("/api/chat", { text: m });
      setTurns((l) => { const base = l || []; const add = [r.user, r.reply].filter((x) => !base.some((b) => b.id === x.id)); return [...base, ...add]; });
      if (voice) speak(r.reply.text, r.reply.english || undefined);
      if (r.emergency || r.action === "log_meds") reload();
    } catch (e) { toast((e as Error).message, "warn"); setText(m); }
    finally { setSending(false); }
  }

  function mic() {
    if (listening) { stopRef.current(); return; }
    stopSpeaking();
    setListening(true);
    stopRef.current = listen("en-IN", (heard) => void send(heard), (err) => { setListening(false); if (err) toast(err, "warn"); });
  }

  const name = data?.patient.nickname || "Paati";
  const list = turns?.filter((x) => x.role !== "system") || [];
  const ta = lang === "ta";
  return (
    <SubScreen ta="சாத்தியிடம் பேசு" en="Talk to Saathi" art="chat" sheetClass="pb-0"
      right={
        <motion.button whileTap={{ scale: 0.95 }} onClick={toggleVoice} aria-pressed={voice}
          className="glass flex h-14 shrink-0 items-center gap-2 rounded-full px-4 text-[16px] font-bold">
          {voice ? <Volume2 className="h-6 w-6" strokeWidth={2} /> : <VolumeX className="h-6 w-6" strokeWidth={2} />}
          <span className={ta ? "font-tamil" : undefined}>{voice ? t("குரல் ஆன்", "Voice on") : t("குரல் ஆஃப்", "Voice off")}</span>
        </motion.button>
      }>
      <div className="flex flex-1 flex-col gap-4">
        {turns === null && <div className="grid flex-1 place-items-center py-10"><Spinner className="h-8 w-8 text-violet" /></div>}
        {turns?.length === 0 && (
          <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
            <Art name="chat" size={64} className="shrink-0" />
            <div>
              <p className="text-[22px] font-bold leading-snug">Hello {name}! How are you feeling today?</p>
              <p className="text-[16px] text-ink-2">Hello {name}! How are you today?</p>
            </div>
          </div>
        )}
        {list.map((c) => {
          const mine = c.role === "user";
          return (
            <div key={c.id} className={cx("flex items-end gap-2 animate-slidein", mine ? "flex-row-reverse self-end" : "self-start")}>
              {mine ? <Person who="paati" size={40} className="mb-6 shrink-0" /> : <span className="mb-6 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lilac"><Art name="chat" size={32} /></span>}
              <div className={cx("flex flex-col", mine ? "items-end" : "items-start")} style={{ maxWidth: 280 }}>
                <div className={cx("rounded-[24px] px-4 py-3 text-[20px] leading-snug",
                  mine ? "rounded-br-md bg-violet text-white" : c.redFlag ? "rounded-bl-md bg-sos-50 text-ink ring-2 ring-sos/40" : "rounded-bl-md bg-white text-ink shadow-card")}>
                  {c.redFlag && <p className="mb-1 text-[15px] font-bold text-sos-600">{t("அவசரம்: உதவி அழைக்கப்படுகிறது", "Emergency: calling for help")}</p>}
                  <span className={isTamil(c.text) ? "font-tamil" : undefined}>{c.text}</span>
                  {c.english && !mine && <span className="mt-1.5 block text-[15px] leading-snug text-ink-2">{c.english}</span>}
                </div>
                <div className="flex items-center gap-1 px-1 text-[13px] text-ink-3">
                  <span className="py-1">{mine ? name : "Saathi"} · {fmtTime(c.at)}</span>
                  {!mine && (
                    <button onClick={() => speak(c.text, c.english || undefined)} className="flex h-11 items-center gap-1 rounded-full px-2 font-bold text-violet-600">
                      <Play className="h-4 w-4" fill="currentColor" />{t("கேள்", "Play")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex items-center gap-2 self-start rounded-[24px] bg-white px-4 py-3 text-[17px] text-ink-2 shadow-card">
            <Spinner className="h-5 w-5 text-violet" />{t("சாத்தி யோசிக்கிறது…", "Saathi is thinking…")}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 flex flex-col gap-3 rounded-t-[28px] bg-white px-4 pb-4 pt-3 shadow-[0_-12px_30px_-14px_rgba(73,54,196,.3)]">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
          {QUICK.map((q) => (
            <motion.button key={q.ta} whileTap={{ scale: 0.96 }} disabled={sending} onClick={() => void send(q.en)}
              className="min-h-[56px] shrink-0 rounded-[20px] bg-lilac px-4 py-2 text-left disabled:opacity-45">
              <span className="block max-w-[230px] text-[17px] font-bold leading-tight">{q.en}</span>
            </motion.button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {canListen() && (
            <motion.button whileTap={{ scale: 0.94 }} onClick={mic} aria-label={t("பேசுங்கள்", "Speak")} aria-pressed={listening}
              className={cx("relative grid h-16 w-16 shrink-0 place-items-center rounded-full text-white transition-colors", listening ? "bg-ink" : "bg-violet shadow-[0_10px_24px_-10px_rgba(91,71,230,.8)]")}>
              {listening && <span className="absolute inset-0 rounded-full bg-violet/40 animate-ripple" />}
              <Mic className={cx("relative h-7 w-7", listening && "animate-blink")} strokeWidth={2.2} />
            </motion.button>
          )}
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label={t("செய்தி", "Message")}
              placeholder={listening ? t("கேட்கிறேன்…", "Listening…") : t("இங்கே எழுதுங்கள்", "Type here")}
              className={cx("h-16 min-w-0 flex-1 rounded-full bg-canvas px-5 text-[18px] placeholder:text-ink-3 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet/15", ta && "font-tamil")} />
            <button type="submit" disabled={!text.trim() || sending} aria-label={t("அனுப்பு", "Send")} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink text-white disabled:opacity-30"><Send className="h-6 w-6" strokeWidth={2} /></button>
          </form>
        </div>
      </div>
    </SubScreen>
  );
}
