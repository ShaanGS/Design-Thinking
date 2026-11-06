// Saathi on the phone: the voice-first entry, ported from Callvi (voice-entry.tsx). The elder never has to use an
// app: she taps one button (or answers when Saathi rings), says what she needs, and Saathi does it while they talk.
// The same call engine as Callvi; Saathi's errands, safety rules and family app sit behind it.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, AudioLines, Globe2, Phone, Pill, Receipt, Stethoscope } from "lucide-react";
import { useLive } from "../lib/socket";
import { useAuth } from "../lib/auth";
import { useSaathiCall } from "../lib/voice/useSaathiCall";
import { initialVoiceState, isActivePhase } from "../lib/voice/voice-state";
import { CallScreen, VoiceOrb, type CallLang } from "../components/call/CallScreen";
import type { Errand } from "../../shared/types";
import styles from "./phone.module.css";

const LANG_KEY = "saathi-phone-lang";
const TEXT = {
  en: {
    announcement: "One phone call. Everything handled.", discover: "How it works",
    eyebrow: "A HELPER ON THE PHONE FOR EVERY ELDER.", title: "Just call.\nSaathi takes care of it.",
    body: "Book the doctor, reorder your tablets, book the gas, pay the electricity bill. Say it in Tamil or English and Saathi does it while you talk. Your family approves anything that costs money.",
    doctor: "Doctor visits", medicines: "Medicines", bills: "Bills & bookings",
    cardLabel: "YOUR HELPER ON THE PHONE", cardTitle: "Start with a hello.",
    cardBody: "Tell Saathi what you need today. It gets it done on the internet while you talk, and tells Karthik.",
    call: "Call Saathi", again: "Call again", returnCall: "Return to your call", ended: "All done for now.",
    endedBody: "Karthik can see what you asked for and what Saathi did.",
    firstCall: "No app. No forms. Just a phone call.", browser: "Live voice · Tamil & English", hint: "Just speak. Saathi will do the rest.",
    sectionTitle: "One phone call.\nThe errands, done.", sectionBody: "Elders already know how to answer a phone. That is the whole interface.",
    s1: "Say what you need.", s1b: "In Tamil or English: the doctor, your tablets, the gas cylinder, the electricity bill.",
    s2: "Saathi does it for real.", s2b: "It opens the websites, fills in the forms and tells you each step. Anything that costs money waits for your family's yes.",
    s3: "Your family stays in the loop.", s3b: "Karthik watches every step live and approves payments from his phone.",
    family: "Open the family app", purpose: "Saathi · Design Thinking · Group 4 · SRM", voiceChat: "Call Saathi",
  },
  ta: {
    announcement: "ஒரு phone call. எல்லாம் முடிஞ்சிடும்.", discover: "எப்படி வேலை செய்யுது",
    eyebrow: "ஒவ்வொரு பெரியவருக்கும் phone-ல ஒரு உதவியாளர்", title: "Call பண்ணுங்க.\nசாத்தி பாத்துக்கும்.",
    body: "டாக்டர் booking, மாத்திரை order, கேஸ் சிலிண்டர், கரண்ட் பில். தமிழிலோ English-லோ சொல்லுங்க, பேசிக்கிட்டே சாத்தி செஞ்சு முடிக்கும். பணம் கட்டணும்னா குடும்பம் சரின்னு சொன்ன பிறகுதான்.",
    doctor: "டாக்டர்", medicines: "மாத்திரை", bills: "பில் & booking",
    cardLabel: "PHONE-ல உங்க உதவியாளர்", cardTitle: "ஒரு வணக்கத்தில் தொடங்கலாம்.",
    cardBody: "இன்னிக்கு என்ன வேணும்னு சாத்திகிட்ட சொல்லுங்க. பேசிக்கிட்டே internet-ல செஞ்சு, கார்த்திக்குக்கும் சொல்லும்.",
    call: "சாத்தியை அழையுங்கள்", again: "மீண்டும் அழையுங்கள்", returnCall: "அழைப்புக்குத் திரும்புங்கள்", ended: "இப்போதைக்கு எல்லாம் முடிஞ்சது.",
    endedBody: "நீங்க கேட்டதும் சாத்தி செஞ்சதும் கார்த்திக்குக்கு தெரியும்.",
    firstCall: "App இல்லை. படிவம் இல்லை. ஒரு phone call மட்டும்.", browser: "நேரடிக் குரல் · தமிழ் & English", hint: "பேசுங்க. மீதியை சாத்தி பாத்துக்கும்.",
    sectionTitle: "ஒரு phone call.\nவேலைகள் முடிஞ்சது.", sectionBody: "பெரியவங்களுக்கு phone எடுக்கத் தெரியும். அதுதான் முழு interface.",
    s1: "என்ன வேணும்னு சொல்லுங்க.", s1b: "தமிழிலோ English-லோ: டாக்டர், மாத்திரை, கேஸ், கரண்ட் பில்.",
    s2: "சாத்தி உண்மையா செய்யும்.", s2b: "Website-களைத் திறந்து, படிவங்களை நிரப்பி, ஒவ்வொரு படியையும் சொல்லும். பணம் கட்ட குடும்பத்தின் சம்மதம் வேணும்.",
    s3: "குடும்பத்துக்கும் தெரியும்.", s3b: "கார்த்திக் ஒவ்வொரு படியையும் நேரலையா பாத்து, phone-லயே பணத்துக்கு சம்மதம் தருவார்.",
    family: "குடும்ப app-ஐத் திற", purpose: "சாத்தி · Design Thinking · Group 4 · SRM", voiceChat: "சாத்தியை அழையுங்கள்",
  },
};

export default function PhonePage() {
  const { user } = useAuth();
  const [lang, setLang] = useState<CallLang>(() => { try { return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ta"; } catch { return "ta"; } });
  const [incoming, setIncoming] = useState<CallLang | null>(null);
  const [minimised, setMinimised] = useState(false);
  const [ended, setEnded] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);
  const call = useSaathiCall({ onEmergency: () => undefined, onLogged: () => undefined });
  const { state } = call;
  const active = isActivePhase(state.phase) || state.phase === "requesting_mic";
  const t = TEXT[lang];

  const pick = (l: CallLang) => { setLang(l); try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ } };
  const begin = (l: CallLang = lang) => { if (active) { setMinimised(false); return; } setEnded(false); setMinimised(false); setIncoming(null); setActivity(null); call.reset(); void call.start(l); };

  // The family asked Saathi to ring her
  useLive<{ lang: CallLang }>("ring", (r) => { if (!active) { setIncoming(r.lang); setEnded(false); } });
  useEffect(() => { if (!incoming) return; const timer = setTimeout(() => setIncoming(null), 40000); return () => clearTimeout(timer); }, [incoming]);
  // What Saathi is doing right now, under the orb
  useLive<Errand>("errand", (e) => {
    if (!active) return;
    const last = e.steps.at(-1)?.text;
    setActivity(e.status === "running" ? `${e.title}: ${last ?? "starting"}` : e.status === "ready_for_family" ? `${e.title}: ready for Karthik to finish` : e.status === "needs_choice" ? `${e.title}: Saathi needs your answer` : `${e.title}: ${e.status === "done" ? "done" : e.status}`);
  });
  useEffect(() => { if (state.phase === "ended") { setEnded(true); setMinimised(false); } }, [state.phase]);

  const showingCall = !!incoming || (!ended && !minimised && state.phase !== "idle" && state.phase !== "ended");

  return (
    <div className={styles.landing} lang={lang}>
      <div className={styles.announcement}>
        <AudioLines size={19} aria-hidden />
        <span>{t.announcement}</span>
        <a href="#how-it-works" className={styles.discover}>{t.discover}<ArrowUpRight size={13} aria-hidden /></a>
      </div>
      <div className={styles.pageFrame}>
        <header className={styles.header}>
          <Link to="/phone" aria-label="Saathi" className={styles.wordmark}><AudioLines aria-hidden />saathi</Link>
          <nav aria-label="Saathi" className={styles.navigation}><a href="#how-it-works">{t.discover}</a></nav>
          <div className={styles.headerActions}>
            <button type="button" onClick={() => pick(lang === "ta" ? "en" : "ta")} className={styles.settingsButton} aria-label="Language"><Globe2 size={16} aria-hidden /><span>{lang === "ta" ? "தமிழ்" : "English"}</span></button>
            <button type="button" onClick={() => begin()} className={styles.headerCta}>{t.call}<ArrowUpRight size={15} aria-hidden /></button>
          </div>
        </header>

        <main id="main" className={styles.main}>
          <section className={styles.hero}>
            <div><p className={styles.eyebrow}>{t.eyebrow}</p><h1>{t.title}</h1></div>
            <p className={styles.heroDescription}>{t.body}</p>
          </section>

          <div className={styles.topicBar}>
            <div className={styles.topics}>
              <span><Stethoscope size={20} strokeWidth={1.6} aria-hidden />{t.doctor}</span>
              <span><Pill size={20} strokeWidth={1.6} aria-hidden />{t.medicines}</span>
              <span><Receipt size={20} strokeWidth={1.6} aria-hidden />{t.bills}</span>
            </div>
            <div className={styles.languagePill} role="radiogroup" aria-label="Language">
              {(["ta", "en"] as const).map((code) => <button key={code} type="button" role="radio" aria-checked={lang === code} onClick={() => pick(code)} className={lang === code ? styles.selectedLanguage : ""}>{code === "ta" ? "தமிழ்" : "English"}</button>)}
            </div>
          </div>

          <section id="start" className={styles.voiceStage} aria-label={t.cardLabel}>
            <div className={styles.stageTexture} aria-hidden />
            <div className={styles.stageCaption} aria-hidden><span className={styles.liveDot} />{t.browser}</div>
            <div className={styles.callCard}>
              <div className={styles.cardEyebrow}><VoiceOrb level={minimised ? state.level : 0} /><span>{t.cardLabel}</span></div>
              <h2>{ended ? t.ended : t.cardTitle}</h2>
              <p className={styles.cardDescription}>{ended ? t.endedBody : t.cardBody}</p>
              {minimised && active ? (
                <button type="button" onClick={() => setMinimised(false)} className={styles.callButton}><Phone size={17} />{t.returnCall}<ArrowUpRight size={17} /></button>
              ) : (
                <button type="button" onClick={() => begin()} className={styles.callButton}><Phone size={17} />{ended ? t.again : t.call}<ArrowUpRight size={17} aria-hidden /></button>
              )}
              <p className={styles.callHint}>{t.firstCall}</p>
            </div>
            <p className={styles.stageFootnote}>{t.hint}</p>
          </section>

          <section id="how-it-works" className={styles.howSection}>
            <div className={styles.sectionIntro}><h2>{t.sectionTitle}</h2><p>{t.sectionBody}</p></div>
            <div className={styles.steps}>
              {[[t.s1, t.s1b], [t.s2, t.s2b], [t.s3, t.s3b]].map(([title, description], index) => <article key={title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}
            </div>
            {user?.role !== "elder" && <Link to="/" className={styles.courseLink}>{t.family}<ArrowRight size={17} aria-hidden /></Link>}
          </section>
        </main>
        <footer className={styles.footer}><Link to="/phone" className={styles.wordmark}><AudioLines aria-hidden />saathi</Link><p>{t.purpose}</p></footer>
      </div>

      {!showingCall ? (
        <button type="button" className={styles.floatingCall} onClick={() => begin()} aria-label={active ? t.returnCall : t.voiceChat}>
          <VoiceOrb level={minimised ? state.level : 0} /><span>{active ? t.returnCall : t.voiceChat}</span>
        </button>
      ) : null}

      {showingCall ? (
        <CallScreen
          state={incoming ? initialVoiceState : state} lang={incoming ?? lang} incoming={!!incoming} activity={activity} device={call.mode === "device"}
          onAccept={() => { const l = incoming ?? lang; pick(l); begin(l); }} onDecline={() => setIncoming(null)}
          onMute={call.toggleMute} onEnd={() => void call.stop()} onRetry={() => begin()} onClose={() => call.reset()} onMinimise={() => setMinimised(true)} />
      ) : null}
    </div>
  );
}
