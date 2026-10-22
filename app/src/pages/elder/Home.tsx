// Paati's home: a warm violet header with her portrait, greeting and the time; the big red help button;
// the tablets to take now; four big tiles; fall detection; and simple sheets for calling family and settings.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings2, Phone, Volume2, Check, LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { speak } from "../../lib/speech";
import Blister from "../../components/Blister";
import { Avatar, useToast, cx, Spinner } from "../../components/ui";
import { Art, BottomSheet, Person, whoFor } from "../../components/kit";
import { SLOT_LABEL, type Slot, type TodayDose } from "../../../shared/types";
import SosButton from "./SosButton";
import { enableMotion } from "./Overlays";
import { BigButton, Bi, ElderSheet, ElderTile, tamilName, useElder, useT } from "./shared";

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
  const [sheet, setSheet] = useState<"call" | "menu" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const p = data?.patient;
  const next = useMemo(() => pickSlot(data?.today || []), [data?.today]);
  const checkin = data?.checkin && !data.checkin.answeredAt ? data.checkin : null;
  const family = (data?.members || []).filter((m) => m.role === "guardian");
  const me = (data?.members || []).find((m) => m.role === "elder");

  const hour = now.getHours();
  const greetTa = hour < 12 ? "காலை வணக்கம்" : hour < 17 ? "மதிய வணக்கம்" : "மாலை வணக்கம்";
  const greetEn = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = p?.nickname || "Paati";
  const [hm, ampm] = now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).split(" ");
  const dateTa = `${TA_DAYS[now.getDay()]}, ${now.getDate()} ${TA_MONTHS[now.getMonth()]}`;
  const dateEn = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const ta = lang === "ta";

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
      `${tamilName(name)}, ${SLOT_LABEL[next.slot].ta} மாத்திரை நேரம். ${pending.map((d) => d.med.name).join(", ")}. சாப்பிட்டதும் சாப்பிட்டேன் பொத்தானை அழுத்துங்கள்.`,
      `${name}, it's time for your ${SLOT_LABEL[next.slot].en.toLowerCase()} tablets: ${pending.map((d) => `${d.med.name} ${d.med.dose}`).join(", ")}. Press "I took them" after you take them.`,
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
  const askerWho = checkin ? whoFor(checkin.requestedBy) : null;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      {/* Warm violet header */}
      <header className="hero-violet relative overflow-hidden px-5 pb-12 pt-4 text-white safe-top">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <Person who="paati" size={64} online={me?.online} className="shrink-0 ring-4 ring-white/30" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="leading-none">
              <span className="font-display text-[36px] font-extrabold tracking-tight tnum">{hm}</span>
              <span className="ml-1 font-display text-[16px] font-bold text-white/80">{ampm}</span>
            </div>
            <div className={cx("mt-1 truncate text-[15px] font-semibold text-white/85", ta && "font-tamil")}>{ta ? dateTa : dateEn}</div>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => setSheet("menu")} aria-label={t("அமைப்புகள்", "Settings")}
            className="glass grid h-14 w-14 shrink-0 place-items-center rounded-full">
            <Settings2 className="h-6 w-6" strokeWidth={2} />
          </motion.button>
        </div>
        <Bi ta={`${greetTa}, ${tamilName(name)}`} en={`${greetEn}, ${name}`} className="relative mt-5 text-[28px] font-extrabold leading-tight" sub="!opacity-80 !text-[17px]" />
      </header>

      <ElderSheet>
        {/* A family member is checking on her */}
        {checkin && (
          <motion.section initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-[28px] bg-lilac p-4 shadow-card">
            <div className="flex items-center gap-3">
              {askerWho ? <Person who={askerWho} size={60} /> : <Avatar name={checkin.requestedBy} size={60} />}
              <Bi ta={`${checkin.requestedBy} உங்களை விசாரிக்கிறார்`} en={`${checkin.requestedBy} is checking on you`} className="min-w-0 flex-1 text-[22px] font-extrabold leading-tight" />
            </div>
            <div className="mt-4 flex flex-col gap-2.5">
              <BigButton tone="violet" disabled={!!busy} onClick={() => void answer("ok")} icon={busy === "ok" ? <Spinner className="h-6 w-6 text-white" /> : <Check className="h-7 w-7" strokeWidth={2.6} />}>
                <Bi ta="நான் நலம்" en="I'm OK" />
              </BigButton>
              <BigButton tone="white" disabled={!!busy} onClick={() => void answer("help")} className="!min-h-[64px] !text-sos-600">
                <Bi ta="உதவி வேண்டும்" en="I need help" className="text-[20px]" />
              </BigButton>
            </div>
          </motion.section>
        )}

        {/* The help button */}
        <section className="relative overflow-hidden rounded-[32px] bg-white px-4 pb-5 pt-4 shadow-card">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_80%_at_50%_30%,#FFE6E9_0%,transparent_70%)]" />
          <div className="relative">
            <SosButton onTrigger={() => void raiseSOS("app")} />
            <div className="mt-2 text-center">
              <Bi ta="2 விநாடி அழுத்திப் பிடியுங்கள்" en="Press and hold for 2 seconds" className="items-center text-[20px] font-extrabold leading-tight" />
              <p className={cx("mt-2 text-[15px] leading-snug text-ink-2", ta && "font-tamil")}>
                {ta ? "குடும்பம், ஆம்புலன்ஸ், மருத்துவமனை எல்லோருக்கும் உடனே தெரியும்" : "Your family, the ambulance and the hospital all hear at once"}
              </p>
            </div>
          </div>
        </section>

        {/* Tablets now */}
        <section className="rounded-[28px] bg-white p-4 shadow-card">
          {next.slot ? (
            <>
              <div className="flex items-start gap-3">
                <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-2xl bg-butter"><Art name="pills" size={58} /></span>
                <div className="min-w-0 flex-1">
                  <Bi ta={`${SLOT_LABEL[next.slot].ta} மாத்திரைகள்`} en={`${SLOT_LABEL[next.slot].en} tablets`} className="text-[24px] font-extrabold leading-tight" />
                  <span className="mt-1 inline-block rounded-full bg-canvas px-3 py-1 text-[15px] font-semibold text-ink-2">
                    <Bi inline ta={`சுமார் ${hour12(slotHour)} மணி`} en={`About ${hour12(slotHour)} ${slotHour >= 12 ? "pm" : "am"}`} />
                  </span>
                </div>
              </div>
              <div className="mt-4 flex justify-center rounded-2xl bg-canvas py-3">
                <Blister size="lg" doses={next.doses.map((d) => ({ id: `${d.med.id}-${d.slot}`, color: d.med.color, name: d.med.name, status: d.status }))} />
              </div>
              <ul className="mt-3 flex flex-col">
                {next.doses.map((d) => (
                  <li key={`${d.med.id}-${d.slot}`} className="flex min-h-[48px] items-center gap-3 border-b border-line py-2 text-[19px] leading-tight last:border-b-0">
                    <span className="h-4 w-7 shrink-0 rounded-full border border-black/15" style={{ background: d.med.color }} />
                    <span className={cx("min-w-0 flex-1", d.status === "taken" && "text-ink-3 line-through decoration-1")}>
                      <span className="font-bold">{d.med.name}</span> <span className="text-ink-2">{d.med.dose}</span>
                    </span>
                    {d.status === "taken" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint"><Check className="h-5 w-5 text-mint-ink" strokeWidth={3} /></span>}
                    {d.status === "missed" && <span className="shrink-0 rounded-full bg-peach px-2.5 py-0.5 text-[15px] font-bold text-peach-ink"><Bi inline ta="தாமதம்" en="Late" /></span>}
                  </li>
                ))}
              </ul>
              {slotAllTaken ? (
                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-mint px-4 py-3 text-mint-ink">
                  <Check className="h-7 w-7 shrink-0" strokeWidth={3} />
                  <Bi ta="எல்லாம் சாப்பிட்டீர்கள்" en="All taken. Well done!" className="text-[20px] font-extrabold" />
                </div>
              ) : (
                <div className="mt-3 flex gap-2.5">
                  <BigButton tone="violet" className="!min-h-[80px] flex-1" disabled={busy === "took"} onClick={() => void tookSlot()}
                    icon={busy === "took" ? <Spinner className="h-6 w-6 text-white" /> : <Check className="h-7 w-7" strokeWidth={2.6} />}>
                    <Bi ta="சாப்பிட்டேன்" en="I took them" />
                  </BigButton>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={hear} aria-label={t("கேளுங்கள்", "Hear")}
                    className="flex w-[80px] shrink-0 flex-col items-center justify-center gap-1 rounded-[24px] bg-violet-50 text-violet-700">
                    <Volume2 className="h-7 w-7" strokeWidth={2} />
                    <span className="text-[16px] font-bold"><Bi inline ta="கேள்" en="Hear" /></span>
                  </motion.button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-2xl bg-mint"><Art name="pills" size={58} /></span>
              {next.allDone
                ? <Bi ta="இன்றைய மாத்திரை முடிந்தது" en="All tablets done for today" className="text-[22px] font-extrabold leading-tight" />
                : <Bi ta="இன்று மாத்திரை இல்லை" en="No tablets today" className="text-[22px] font-extrabold leading-tight" />}
            </div>
          )}
        </section>

        {/* Big tiles */}
        <div className="grid grid-cols-2 gap-3">
          <ElderTile tone="lilac" art="chat" ta="சாத்தியிடம் பேசு" en="Talk to Saathi" onClick={() => nav("/elder/talk")} />
          <ElderTile tone="rose" art="heart" ta="நாடித்துடிப்பு" en="Check my pulse" onClick={() => nav("/elder/pulse")} />
          <ElderTile tone="sky" art="shield" ta="என் அட்டை" en="My card" onClick={() => nav("/elder/card")} />
          <ElderTile tone="mint" art="home" ta="குடும்பத்தை அழை" en="Call family" onClick={() => setSheet("call")} />
        </div>

        {/* Fall detection */}
        <button onClick={() => void toggleFall()} role="switch" aria-checked={fallOn}
          className="flex min-h-[88px] items-center gap-4 rounded-[28px] bg-white px-5 py-4 text-left shadow-card">
          <Bi ta="விழுந்தால் தானாக உதவி அழைக்கும்" en="Call for help by itself if I fall" className="min-w-0 flex-1 text-[19px] font-bold leading-snug" />
          <span className={cx("relative h-10 w-[68px] shrink-0 rounded-full transition-colors", fallOn ? "bg-violet" : "bg-line-2")} aria-hidden="true">
            <span className={cx("absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-all", fallOn ? "left-[32px]" : "left-1")} />
          </span>
        </button>
      </ElderSheet>

      {/* Call family */}
      <BottomSheet open={sheet === "call"} onClose={() => setSheet(null)} title={<Bi inline ta="குடும்பத்தை அழை" en="Call family" />}>
        {family.length === 0 && <p className="text-[18px] text-ink-2">{t("குடும்பத்தினர் இன்னும் சேரவில்லை", "No family members have joined yet.")}</p>}
        <ul className="flex flex-col gap-3">
          {family.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-3xl bg-canvas p-3">
              <Avatar name={m.name} size={60} online={m.online} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[21px] font-extrabold">{m.name}</div>
                <div className="text-[15px] text-ink-2">{m.relation}</div>
              </div>
              {m.phone ? (
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} aria-label={`Call ${m.name}`}
                  className="flex h-16 shrink-0 items-center gap-2 rounded-full bg-violet px-5 text-[18px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(91,71,230,.8)]">
                  <Phone className="h-6 w-6" strokeWidth={2.2} /><Bi inline ta="அழை" en="Call" />
                </a>
              ) : <span className="text-[15px] text-ink-3">{t("எண் இல்லை", "No number")}</span>}
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* Settings */}
      <BottomSheet open={sheet === "menu"} onClose={() => setSheet(null)} title={<Bi inline ta="அமைப்புகள்" en="Settings" />}>
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[18px] font-bold"><Bi inline ta="மொழி" en="Language" /></p>
            <div className="grid grid-cols-2 gap-2">
              {(["ta", "en"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)}
                  className={cx("h-16 rounded-[22px] text-[20px] font-bold transition-colors", lang === l ? "bg-violet text-white" : "bg-canvas text-ink", l === "ta" && "font-tamil")}>
                  {l === "ta" ? "தமிழ்" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-3xl bg-canvas p-3">
            <Person who="paati" size={56} />
            <div className="min-w-0 leading-tight">
              <div className="text-[18px] font-bold">{user?.name}</div>
              {p && <div className="text-[14px] text-ink-2">{p.address}</div>}
            </div>
          </div>
          <BigButton tone="white" className="!min-h-[64px] !text-[19px]" icon={<LogOut className="h-6 w-6" strokeWidth={2} />} onClick={async () => { await signOut(); nav("/"); }}>
            <Bi inline ta="வெளியேறு" en="Sign out" />
          </BigButton>
        </div>
      </BottomSheet>
    </div>
  );
}
