// Talk to Saathi: a Tamil-first conversation, by voice or by tapping a ready-made reply.
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, VolumeX } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { canListen, listen, speak, stopSpeaking } from "../../lib/speech";
import { fmtTime, isTamil } from "../../lib/format";
import { useToast, cx, Spinner } from "../../components/ui";
import type { ChatTurn, Emergency } from "../../../shared/types";
import { SubScreen, useElder, useT } from "./shared";

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

  useEffect(() => { api.get<ChatTurn[]>("/api/chat").then(setTurns).catch((e) => { setTurns([]); toast(e.message, "sos"); }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
    } catch (e) { toast((e as Error).message, "sos"); setText(m); }
    finally { setSending(false); }
  }

  function mic() {
    if (listening) { stopRef.current(); return; }
    stopSpeaking();
    setListening(true);
    stopRef.current = listen(lang === "ta" ? "ta-IN" : "en-IN", (heard) => void send(heard), (err) => { setListening(false); if (err) toast(err, "sos"); });
  }

  const name = data?.patient.nickname || "Paati";
  const list = turns?.filter((x) => x.role !== "system") || [];
  return (
    <SubScreen ta="சாத்தியிடம் பேசு" en="Talk to Saathi">
      <div className="-mt-1 flex items-center justify-between gap-3">
        <span className="min-w-0 text-[15px] leading-snug text-ink-2">{t("தமிழிலோ ஆங்கிலத்திலோ பேசலாம்", "Speak in Tamil or English")}</span>
        <button onClick={toggleVoice} aria-pressed={voice} className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line px-2.5 text-[15px] font-semibold text-ink-2 hover:bg-paper">
          {voice ? <Volume2 className="h-5 w-5" strokeWidth={1.75} /> : <VolumeX className="h-5 w-5" strokeWidth={1.75} />}{voice ? t("குரல் ஆன்", "Voice on") : t("குரல் ஆஃப்", "Voice off")}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {turns === null && <div className="grid flex-1 place-items-center py-10"><Spinner className="h-8 w-8" /></div>}
        {turns?.length === 0 && (
          <div className="py-6">
            <p className="font-tamil text-[24px] font-semibold leading-snug">வணக்கம் {name}! எப்படி இருக்கீங்க?</p>
            <p className="text-[17px] text-ink-2">Hello {name}! How are you today?</p>
          </div>
        )}
        {list.map((c) => {
          const mine = c.role === "user";
          return (
            <div key={c.id} className={cx("flex max-w-[88%] flex-col animate-slidein", mine ? "self-end items-end" : "self-start items-start")}>
              <div className={cx("rounded-xl px-4 py-3 text-[20px] leading-snug",
                mine ? "bg-ink text-white" : c.redFlag ? "border-l-4 border-sos bg-sos-50 text-ink" : "bg-paper text-ink")}>
                {c.redFlag && <p className="mb-1 text-[15px] font-semibold text-sos">{t("அவசரம்: உதவி அழைக்கப்படுகிறது", "Emergency: calling for help")}</p>}
                <span className={isTamil(c.text) ? "font-tamil" : undefined}>{c.text}</span>
                {c.english && !mine && <span className="mt-1.5 block text-[15px] leading-snug text-ink-2">{c.english}</span>}
              </div>
              <div className="mt-1 flex items-center gap-3 px-1 text-[13px] text-ink-3">
                <span>{mine ? name : "Saathi"} · {fmtTime(c.at)}</span>
                {!mine && <button onClick={() => speak(c.text, c.english || undefined)} className="font-semibold text-info hover:underline">{t("மீண்டும் கேள்", "Play")}</button>}
              </div>
            </div>
          );
        })}
        {sending && <div className="flex items-center gap-2 self-start rounded-xl bg-paper px-4 py-3 text-[17px] text-ink-2"><Spinner className="h-4 w-4" />{t("சாத்தி யோசிக்கிறது…", "Saathi is thinking…")}</div>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 border-t border-line bg-white px-5 pb-4 pt-3 safe-bottom">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none">
          {QUICK.map((q) => (
            <button key={q.ta} disabled={sending} onClick={() => void send(lang === "ta" ? q.ta : q.en)}
              className="shrink-0 rounded-xl border border-line-2 bg-white px-3.5 py-2 text-left hover:border-ink-3 disabled:opacity-45">
              <span className={cx("block max-w-[230px] text-[17px] font-semibold leading-tight", lang === "ta" && "font-tamil")}>{lang === "ta" ? q.ta : q.en}</span>
              <span className={cx("block max-w-[230px] text-[13px] text-ink-2", lang === "en" && "font-tamil")}>{lang === "ta" ? q.en : q.ta}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {canListen() && (
            <button onClick={mic} aria-label={t("பேசுங்கள்", "Speak")} aria-pressed={listening}
              className={cx("flex h-16 shrink-0 items-center gap-2 rounded-2xl px-5 text-[17px] font-semibold transition-colors", listening ? "bg-ink text-white" : "bg-brand text-ink")}>
              <Mic className={cx("h-7 w-7", listening && "animate-blink")} strokeWidth={2} />
              {listening ? t("கேட்கிறேன்", "Listening") : t("பேசு", "Speak")}
            </button>
          )}
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label={t("செய்தி", "Message")}
              placeholder={t("இங்கே எழுதுங்கள்", "Type here")}
              className={cx("h-16 min-w-0 flex-1 rounded-2xl border border-line-2 bg-white px-4 text-[18px] focus:border-info focus:outline-none", lang === "ta" && "font-tamil")} />
            <button type="submit" disabled={!text.trim() || sending} aria-label={t("அனுப்பு", "Send")} className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-ink text-white disabled:opacity-30"><Send className="h-6 w-6" strokeWidth={2} /></button>
          </form>
        </div>
      </div>
    </SubScreen>
  );
}
