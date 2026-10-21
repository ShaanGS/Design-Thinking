// Talk to Saathi: a Tamil-first conversation, by voice or by tapping a ready-made reply.
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, VolumeX, AlertTriangle } from "lucide-react";
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
  { ta: "கொஞ்சம் நெஞ்சு கனமா இருக்கு, வியர்க்குது", en: "My chest feels heavy, I'm sweating", danger: true },
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
  return (
    <SubScreen ta="சாத்தியிடம் பேசு" en="Talk to Saathi" tone="white">
      <div className="-mx-4 -mt-5 flex items-center justify-between border-b border-line bg-paper px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-ink-2"><span className="h-2 w-2 rounded-full bg-teal" />{t("சாத்தி கேட்கிறது", "Saathi is listening")}</div>
        <button onClick={toggleVoice} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-semibold">
          {voice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}{voice ? t("குரல் ஆன்", "Voice on") : t("குரல் ஆஃப்", "Voice off")}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 pb-2">
        {turns === null && <div className="grid flex-1 place-items-center py-10"><Spinner className="h-8 w-8" /></div>}
        {turns?.length === 0 && (
          <div className="mx-auto mt-6 max-w-[300px] text-center text-lg text-ink-2">
            <img src="/icons/icon.svg" alt="" className="mx-auto mb-3 h-16 w-16 rounded-2xl" />
            <p className="font-tamil font-semibold text-ink">வணக்கம் {name}! எப்படி இருக்கீங்க?</p>
            <p className="text-base">Hello {name}! How are you today?</p>
          </div>
        )}
        {turns?.filter((x) => x.role !== "system").map((c) => {
          const mine = c.role === "user";
          return (
            <div key={c.id} className={cx("flex max-w-[88%] flex-col animate-slidein", mine ? "self-end items-end" : "self-start items-start")}>
              <div className={cx("rounded-3xl px-4 py-3 text-[19px] leading-snug",
                mine ? "rounded-br-lg bg-ink text-white" : c.redFlag ? "rounded-bl-lg bg-sos text-white" : "rounded-bl-lg bg-paper-2 text-ink")}>
                {c.redFlag && <div className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide"><AlertTriangle className="h-4 w-4" />{t("அவசரம்", "Emergency")}</div>}
                <span className={isTamil(c.text) ? "font-tamil" : undefined}>{c.text}</span>
                {c.english && !mine && <span className="mt-1.5 block text-[14px] leading-snug opacity-75">{c.english}</span>}
              </div>
              <div className="mt-1 flex items-center gap-2 px-2 text-xs text-ink-3">
                {fmtTime(c.at)}
                {!mine && <button onClick={() => speak(c.text, c.english || undefined)} className="font-semibold text-ink-2 underline-offset-2 hover:underline">{t("மீண்டும் கேள்", "Play")}</button>}
              </div>
            </div>
          );
        })}
        {sending && <div className="flex items-center gap-2 self-start rounded-3xl bg-paper-2 px-4 py-3 text-ink-2"><Spinner className="h-4 w-4" />{t("சாத்தி யோசிக்கிறது…", "Saathi is thinking…")}</div>}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 -mb-5 flex flex-col gap-3 border-t border-line bg-white/95 px-4 pb-4 pt-3 backdrop-blur safe-bottom">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
          {QUICK.map((q) => (
            <button key={q.ta} disabled={sending} onClick={() => void send(lang === "ta" ? q.ta : q.en)}
              className={cx("shrink-0 rounded-2xl border-2 px-3.5 py-2 text-left disabled:opacity-50", q.danger ? "border-sos/60 bg-sos-50" : "border-line bg-paper")}>
              <span className={cx("block max-w-[220px] text-base font-semibold leading-tight", lang === "ta" && "font-tamil")}>{lang === "ta" ? q.ta : q.en}</span>
              <span className={cx("block max-w-[220px] text-xs text-ink-2", lang === "en" && "font-tamil")}>{lang === "ta" ? q.en : q.ta}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {canListen() && (
            <button onClick={mic} aria-label={t("பேசுங்கள்", "Speak")} aria-pressed={listening}
              className={cx("grid h-16 w-16 shrink-0 place-items-center rounded-full text-white shadow-card transition active:scale-95", listening ? "bg-sos animate-pulsering" : "bg-brand")}>
              <Mic className="h-8 w-8" />
            </button>
          )}
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} aria-label={t("செய்தி", "Message")}
              placeholder={listening ? t("கேட்கிறேன்…", "Listening…") : t("இங்கே எழுதுங்கள்", "Type here")}
              className={cx("h-16 min-w-0 flex-1 rounded-2xl border border-line bg-paper px-4 text-lg focus:border-ink-3 focus:outline-none", lang === "ta" && "font-tamil")} />
            <button type="submit" disabled={!text.trim() || sending} aria-label={t("அனுப்பு", "Send")} className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-ink text-white disabled:opacity-40"><Send className="h-7 w-7" /></button>
          </form>
        </div>
      </div>
    </SubScreen>
  );
}
