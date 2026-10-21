// Paati's home screen: time and greeting, a family check-in, the tablets to take now,
// a short list of things she can do, and the help slab fixed at the bottom.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, HeartPulse, IdCard, Phone, Volume2, Check, Menu, LogOut, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { speak } from "../../lib/speech";
import Blister from "../../components/Blister";
import { Button, Modal, useToast, cx } from "../../components/ui";
import { SLOT_LABEL, type Slot, type TodayDose } from "../../../shared/types";
import SosButton from "./SosButton";
import { enableMotion } from "./Overlays";
import { Bi, useElder, useT } from "./shared";

const ORDER: Slot[] = ["morning", "afternoon", "night"];
const TA_DAYS = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];
const TA_MONTHS = ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"];

function useClock() {
  const [d, setD] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setD(new Date()), 15000); return () => clearInterval(t); }, []);
  return d;
}

/** The slot Paati should act on now: a due or missed one first, else the next upcoming one. */
function pickSlot(today: TodayDose[]): { slot: Slot | null; doses: TodayDose[]; allDone: boolean } {
  for (const s of ORDER) { const d = today.filter((x) => x.slot === s); if (d.some((x) => x.status === "due" || x.status === "missed")) return { slot: s, doses: d, allDone: false }; }
  for (const s of ORDER) { const d = today.filter((x) => x.slot === s); if (d.some((x) => x.status === "upcoming")) return { slot: s, doses: d, allDone: false }; }
  return { slot: null, doses: [], allDone: today.length > 0 };
}
const hour12 = (h: number) => (h > 12 ? h - 12 : h);

export default function Home() {
  const { data, raiseSOS, lang, setLang, fallOn, setFallOn, reload } = useElder();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const t = useT();
  const now = useClock();
  const [menu, setMenu] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const p = data?.patient;
  const next = useMemo(() => pickSlot(data?.today || []), [data?.today]);
  const checkin = data?.checkin && !data.checkin.answeredAt ? data.checkin : null;
  const family = (data?.members || []).filter((m) => m.role === "guardian");

  const hour = now.getHours();
  const greetTa = hour < 12 ? "காலை வணக்கம்" : hour < 17 ? "மதிய வணக்கம்" : "மாலை வணக்கம்";
  const greetEn = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = p?.nickname || "Paati";
  const [hm, ampm] = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).split(" ");
  const dateTa = `${TA_DAYS[now.getDay()]}, ${now.getDate()} ${TA_MONTHS[now.getMonth()]}`;
  const dateEn = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  async function answer(a: "ok" | "help") {
    if (!checkin) return;
    setBusy(a);
    try { await api.post(`/api/checkins/${checkin.id}/answer`, { answer: a }); if (a === "ok") toast(t("குடும்பத்துக்கு சொல்லிவிட்டேன்", "Your family has been told you're OK"), "ok"); reload(); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(null); }
  }
  async function tookSlot() {
    if (!next.slot) return;
    setBusy("took");
    try { await api.post("/api/doses/slot", { slot: next.slot }); try { navigator.vibrate?.(60); } catch { /* ignore */ } toast(t("நன்று! குறித்துக்கொண்டேன்", "Well done! Noted."), "ok"); reload(); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(null); }
  }
  function hear() {
    if (!next.slot) return;
    const pending = next.doses.filter((d) => d.status !== "taken");
    const ok = speak(
      `${name}, ${SLOT_LABEL[next.slot].ta} மாத்திரை நேரம். ${pending.map((d) => d.med.name).join(", ")}. சாப்பிட்டதும் மஞ்சள் பொத்தானை அழுத்துங்கள்.`,
      `${name}, it's time for your ${SLOT_LABEL[next.slot].en.toLowerCase()} tablets: ${pending.map((d) => `${d.med.name} ${d.med.dose}`).join(", ")}. Press the yellow button after you take them.`,
    );
    if (!ok) toast(t("இந்த போனில் குரல் இல்லை", "Voice isn't available on this phone"));
  }
  async function toggleFall() {
    if (fallOn) { setFallOn(false); return; }
    const ok = await enableMotion();
    if (!ok) { toast(t("இந்த போனில் சென்சார் அனுமதி இல்லை", "Motion sensor isn't available here"), "warn"); return; }
    setFallOn(true); toast(t("விழுதல் கண்டறிதல் இயக்கப்பட்டது", "Fall detection is on"), "ok");
  }

  const pendingCount = next.doses.filter((d) => d.status !== "taken").length;
  const slotAllTaken = !!next.slot && pendingCount === 0;
  const slotHour = next.slot ? SLOT_LABEL[next.slot].hour : 0;

  const rows = [
    { key: "talk", icon: MessageCircle, ta: "சாத்தியிடம் பேசு", en: "Talk to Saathi", go: () => nav("/elder/talk") },
    { key: "pulse", icon: HeartPulse, ta: "நாடித்துடிப்பு பார்", en: "Check my pulse", go: () => nav("/elder/pulse") },
    { key: "card", icon: IdCard, ta: "என் அவசர அட்டை", en: "My emergency card", go: () => nav("/elder/card") },
    { key: "call", icon: Phone, ta: "குடும்பத்தை அழை", en: "Call family", go: () => setCallOpen(true) },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white pb-[124px]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-3 safe-top">
        <img src="/icons/icon.svg" alt="Saathi" className="h-8 w-8" style={{ borderRadius: 7 }} />
        <button onClick={() => setMenu(true)} aria-label={t("அமைப்புகள்", "Menu")}
          className="grid h-12 w-12 place-items-center rounded-xl border border-line text-ink hover:bg-paper active:bg-paper-2">
          <Menu className="h-6 w-6" strokeWidth={1.75} />
        </button>
      </header>

      {/* Time and greeting */}
      <section className="px-5 pb-6 pt-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[64px] font-semibold leading-none tnum" style={{ fontStretch: "88%" }}>{hm}</span>
          <span className="font-display text-[24px] font-medium text-ink-2">{ampm}</span>
        </div>
        <p className={cx("mt-2 text-[17px] text-ink-2", lang === "ta" && "font-tamil")}>{lang === "ta" ? dateTa : dateEn}</p>
        <h1 className={cx("mt-4 text-[30px] font-bold leading-tight", lang === "ta" && "font-tamil")}>{lang === "ta" ? `${greetTa}, ${name}` : `${greetEn}, ${name}`}</h1>
        <p className={cx("text-[18px] text-ink-2", lang === "en" && "font-tamil")}>{lang === "ta" ? `${greetEn}, ${name}` : `${greetTa}, ${name}`}</p>
      </section>

      {/* Check-in from family */}
      {checkin && (
        <section className="animate-slidein border-y-2 border-brand bg-brand-50 px-5 py-5">
          <p className="text-[24px] font-bold leading-tight">
            <Bi ta={`${checkin.requestedBy} உங்களை விசாரிக்கிறார்`} en={`${checkin.requestedBy} is checking on you`} />
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <Button variant="brand" size="xl" className="!min-h-[72px] !text-[22px]" loading={busy === "ok"} onClick={() => answer("ok")}><Bi ta="நான் நலம்" en="I'm OK" /></Button>
            <Button variant="outline" size="xl" className="!min-h-[64px] border-2 border-sos text-sos" loading={busy === "help"} onClick={() => answer("help")}><Bi ta="உதவி வேண்டும்" en="I need help" /></Button>
          </div>
        </section>
      )}

      {/* Tablets now */}
      <section className="border-t border-line px-5 py-6">
        {next.slot ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[26px] font-bold leading-tight"><Bi ta={`${SLOT_LABEL[next.slot].ta} மாத்திரைகள்`} en={`${SLOT_LABEL[next.slot].en} tablets`} /></h2>
              <span className="shrink-0 text-right text-[17px] text-ink-2">
                <Bi inline ta={`சுமார் ${hour12(slotHour)} மணி`} en={`About ${hour12(slotHour)} ${slotHour >= 12 ? "pm" : "am"}`} />
              </span>
            </div>
            <div className="mt-5">
              <Blister size="lg" doses={next.doses.map((d) => ({ id: `${d.med.id}-${d.slot}`, color: d.med.color, name: d.med.name, status: d.status }))} />
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {next.doses.map((d) => (
                <li key={`${d.med.id}-${d.slot}`} className="flex items-center gap-3 text-[19px] leading-tight">
                  <span className="h-3.5 w-6 shrink-0 rounded-full border border-black/15" style={{ background: d.med.color }} />
                  <span className={cx("min-w-0 flex-1", d.status === "taken" && "text-ink-3 line-through decoration-1")}>
                    <span className="font-semibold">{d.med.name}</span> <span className="text-ink-2">{d.med.dose}</span>
                  </span>
                  {d.status === "taken" && <Check className="h-6 w-6 shrink-0 text-teal" strokeWidth={2.5} />}
                  {d.status === "missed" && <span className="shrink-0 text-[15px] font-semibold text-warn"><Bi inline ta="தாமதம்" en="Late" /></span>}
                </li>
              ))}
            </ul>
            {slotAllTaken ? (
              <p className="mt-5 flex items-center gap-2 text-[20px] font-semibold text-teal"><Check className="h-6 w-6" strokeWidth={2.5} /><Bi inline ta="எல்லாம் சாப்பிட்டீர்கள்" en="All taken" /></p>
            ) : (
              <div className="mt-5 flex gap-3">
                <Button variant="brand" size="xl" className="!min-h-[80px] flex-1 !text-[24px]" loading={busy === "took"} onClick={tookSlot}>
                  <Bi ta="சாப்பிட்டேன்" en="I took them" />
                </Button>
                <button onClick={hear} aria-label={t("கேளுங்கள்", "Hear")}
                  className="flex w-[80px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-line-2 text-ink hover:bg-paper active:bg-paper-2">
                  <Volume2 className="h-7 w-7" strokeWidth={1.75} />
                  <span className="text-[15px] font-semibold"><Bi inline ta="கேள்" en="Hear" /></span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <h2 className="text-[26px] font-bold leading-tight">{next.allDone ? <Bi ta="இன்றைய மாத்திரை முடிந்தது" en="All tablets done for today" /> : <Bi ta="இன்று மாத்திரை இல்லை" en="No tablets today" />}</h2>
            {next.allDone && <p className="mt-2 flex items-center gap-2 text-[18px] text-teal"><Check className="h-5 w-5" strokeWidth={2.5} /><Bi inline ta="நன்று!" en="Well done!" /></p>}
          </div>
        )}
      </section>

      {/* Things to do */}
      <nav aria-label={t("செயல்கள்", "Actions")}>
        <ul className="border-y border-line">
          {rows.map((r) => (
            <li key={r.key} className="border-b border-line last:border-b-0">
              <button onClick={r.go} className="flex min-h-[84px] w-full items-center gap-4 px-5 py-3 text-left hover:bg-paper active:bg-paper-2">
                <r.icon className="h-7 w-7 shrink-0 text-ink-2" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 text-[22px] font-semibold leading-tight"><Bi ta={r.ta} en={r.en} /></span>
                <ChevronRight className="h-6 w-6 shrink-0 text-ink-3" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Fall detection */}
      <button onClick={toggleFall} role="switch" aria-checked={fallOn} className="flex items-center gap-4 px-5 py-5 text-left">
        <span className="min-w-0 flex-1 text-[17px] font-medium leading-tight text-ink-2">
          <Bi ta="விழுந்தால் தானாக உதவி அழைக்கும்" en="Call for help automatically if I fall" sub="text-[14px]" />
        </span>
        <span className={cx("relative h-8 w-14 shrink-0 rounded-full transition-colors", fallOn ? "bg-teal" : "bg-line-2")} aria-hidden="true">
          <span className={cx("absolute top-1 h-6 w-6 rounded-full bg-white transition-all", fallOn ? "left-7" : "left-1")} />
        </span>
      </button>

      <SosButton onTrigger={() => void raiseSOS("app")} />

      {/* Call family */}
      <Modal open={callOpen} onClose={() => setCallOpen(false)} title={<Bi inline ta="குடும்பத்தை அழை" en="Call family" />}>
        {family.length === 0 && <p className="text-[17px] text-ink-2">{t("குடும்பத்தினர் இன்னும் சேரவில்லை", "No family members have joined yet.")}</p>}
        <ul className="-mx-5 border-t border-line sm:-mx-6">
          {family.map((m) => (
            <li key={m.id} className="flex items-center gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[22px] font-semibold leading-tight">
                  {m.name}
                  {m.online && <span className="h-2.5 w-2.5 rounded-full bg-teal" aria-label="online" />}
                </div>
                <div className="text-[15px] text-ink-2">{m.relation}</div>
                {m.phone && <div className="mt-0.5 select-all font-mono text-[17px] text-ink">{m.phone}</div>}
              </div>
              {m.phone ? (
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="flex h-14 items-center gap-2 rounded-xl bg-ink px-5 text-[17px] font-semibold text-white active:bg-ink/85" aria-label={`Call ${m.name}`}>
                  <Phone className="h-5 w-5" strokeWidth={2} /><Bi inline ta="அழை" en="Call" />
                </a>
              ) : <span className="text-[15px] text-ink-3">{t("எண் இல்லை", "No number")}</span>}
            </li>
          ))}
        </ul>
      </Modal>

      {/* Menu */}
      <Modal open={menu} onClose={() => setMenu(false)} title={<Bi inline ta="அமைப்புகள்" en="Settings" />}>
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-[17px] font-semibold"><Bi inline ta="மொழி" en="Language" /></p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" variant={lang === "ta" ? "primary" : "outline"} onClick={() => setLang("ta")}><span className="font-tamil text-[18px]">தமிழ்</span></Button>
              <Button size="lg" variant={lang === "en" ? "primary" : "outline"} onClick={() => setLang("en")}><span className="text-[18px]">English</span></Button>
            </div>
          </div>
          <div className="border-t border-line pt-4 text-[15px] text-ink-2">
            <div className="text-[17px] font-semibold text-ink">{user?.name}</div>
            {p && <div>{p.address}</div>}
          </div>
          <Button size="lg" variant="outline" icon={<LogOut className="h-5 w-5" strokeWidth={1.75} />} onClick={async () => { await signOut(); nav("/"); }}>
            <Bi inline ta="வெளியேறு" en="Sign out" />
          </Button>
        </div>
      </Modal>
    </div>
  );
}
