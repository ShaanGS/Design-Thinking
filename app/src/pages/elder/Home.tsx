// Paati's home screen: greeting, check-in reply, next tablets, the help button and four big tiles.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircleHeart, HeartPulse, IdCard, PhoneCall, Volume2, Check, Menu, LogOut, Languages, Activity, Sun, Sunset, Moon, PartyPopper, Phone } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { speak } from "../../lib/speech";
import { Button, Modal, Avatar, useToast, cx } from "../../components/ui";
import { SLOT_LABEL, type Slot, type TodayDose } from "../../../shared/types";
import SosButton from "./SosButton";
import { enableMotion } from "./Overlays";
import { Bi, useElder, useT } from "./shared";

const SLOT_ICON: Record<Slot, typeof Sun> = { morning: Sun, afternoon: Sunset, night: Moon };
const ORDER: Slot[] = ["morning", "afternoon", "night"];

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

  async function answer(a: "ok" | "help") {
    if (!checkin) return;
    setBusy(a);
    try { await api.post(`/api/checkins/${checkin.id}/answer`, { answer: a }); if (a === "ok") toast(t("குடும்பத்துக்கு சொல்லிவிட்டேன்", "Your family has been told you're OK"), "ok"); reload(); }
    catch (e) { toast((e as Error).message, "sos"); }
    finally { setBusy(null); }
  }
  async function tookSlot() {
    if (!next.slot) return;
    setBusy("took");
    try { await api.post("/api/doses/slot", { slot: next.slot }); try { navigator.vibrate?.(60); } catch { /* ignore */ } toast(t("நன்று! குறித்துக்கொண்டேன்", "Well done! Noted."), "ok"); reload(); }
    catch (e) { toast((e as Error).message, "sos"); }
    finally { setBusy(null); }
  }
  function hear() {
    if (!next.slot) return;
    const pending = next.doses.filter((d) => d.status !== "taken");
    const listTa = pending.map((d) => d.med.name).join(", ");
    const ok = speak(
      `${name}, ${SLOT_LABEL[next.slot].ta} மாத்திரை நேரம். ${listTa}. சாப்பிட்டதும் பச்சை பொத்தானை அழுத்துங்கள்.`,
      `${name}, it's time for your ${SLOT_LABEL[next.slot].en.toLowerCase()} tablets: ${pending.map((d) => `${d.med.name} ${d.med.dose}`).join(", ")}. Press the green button after you take them.`,
    );
    if (!ok) toast(t("இந்த போனில் குரல் இல்லை", "Voice isn't available on this phone"));
  }
  async function toggleFall() {
    if (fallOn) { setFallOn(false); return; }
    const ok = await enableMotion();
    if (!ok) { toast(t("இந்த போனில் சென்சார் அனுமதி இல்லை", "Motion sensor isn't available here"), "sos"); return; }
    setFallOn(true); toast(t("விழுதல் கண்டறிதல் இயக்கப்பட்டது", "Fall detection is on"), "ok");
  }

  const pendingCount = next.doses.filter((d) => d.status !== "taken").length;
  const slotAllTaken = next.slot && pendingCount === 0;
  const SlotIcon = next.slot ? SLOT_ICON[next.slot] : PartyPopper;

  return (
    <div className="flex min-h-full flex-col bg-paper">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-1 pt-4 safe-top">
        <div className="flex items-center gap-2">
          <img src="/icons/icon.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="font-display text-xl font-bold">Saathi</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-medium text-ink-2 tnum">{now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
          <button onClick={() => setMenu(true)} aria-label="Menu" className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-card active:scale-95"><Menu className="h-6 w-6" /></button>
        </div>
      </header>

      <main className="flex flex-col gap-4 px-4 pb-8 pt-2">
        {/* Greeting */}
        <section className="pt-1">
          <h1 className={cx("font-extrabold leading-[1.1]", lang === "ta" ? "font-tamil text-[30px]" : "text-[34px]")}>
            {lang === "ta" ? `${greetTa}, ${name}` : `${greetEn}, ${name}`}
          </h1>
          <p className={cx("mt-1 text-lg text-ink-2", lang === "en" && "font-tamil")}>{lang === "ta" ? `${greetEn}, ${name}` : `${greetTa}, ${name}`}</p>
        </section>

        {/* Check-in from family */}
        {checkin && (
          <section className="animate-slidein rounded-3xl bg-info p-5 text-white shadow-card">
            <div className="flex items-center gap-3">
              <Avatar name={checkin.requestedBy} size={48} className="!bg-white/20 !text-white" />
              <div className="text-xl font-bold leading-tight">
                <Bi ta={`${checkin.requestedBy} உங்களை விசாரிக்கிறார்`} en={`${checkin.requestedBy} is checking on you`} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <Button size="xl" className="bg-white text-info hover:bg-white/90" loading={busy === "ok"} onClick={() => answer("ok")}><Bi ta="நான் நலம்" en="I'm OK" /></Button>
              <Button size="xl" variant="sos" loading={busy === "help"} onClick={() => answer("help")}><Bi ta="உதவி வேண்டும்" en="I need help" /></Button>
            </div>
          </section>
        )}

        {/* Next tablets */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", next.allDone ? "bg-teal-50 text-teal" : "bg-brand-100 text-brand-700")}><SlotIcon className="h-7 w-7" /></div>
              <div className="text-[22px] font-bold leading-tight">
                {next.slot ? <Bi ta={`${SLOT_LABEL[next.slot].ta} மாத்திரைகள்`} en={`${SLOT_LABEL[next.slot].en} tablets`} /> : next.allDone ? <Bi ta="இன்றைய மாத்திரை முடிந்தது" en="All tablets done today" /> : <Bi ta="மாத்திரைகள்" en="Tablets" />}
              </div>
            </div>
            {next.slot && !slotAllTaken && (
              <button onClick={hear} aria-label={t("கேளுங்கள்", "Hear")} className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-line px-3 text-base font-semibold active:scale-95">
                <Volume2 className="h-5 w-5" /><Bi inline ta="கேள்" en="Hear" />
              </button>
            )}
          </div>
          {next.doses.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2.5">
              {next.doses.map((d) => (
                <li key={`${d.med.id}-${d.slot}`} className="flex items-center gap-3">
                  <span className="h-6 w-11 shrink-0 rounded-full border border-black/15 shadow-inner" style={{ background: d.med.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-semibold">{d.med.name} <span className="font-normal text-ink-2">{d.med.dose}</span></div>
                    {d.med.purpose && <div className="truncate text-sm text-ink-3">{d.med.purpose}</div>}
                  </div>
                  {d.status === "taken" ? <span className="grid h-8 w-8 place-items-center rounded-full bg-teal text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>
                    : d.status === "missed" ? <span className="rounded-full bg-sos-50 px-2.5 py-1 text-sm font-bold text-sos"><Bi inline ta="தவறியது" en="Late" /></span> : null}
                </li>
              ))}
            </ul>
          )}
          {next.slot && !slotAllTaken && (
            <Button variant="teal" size="xl" className="mt-4 w-full !min-h-[76px] text-2xl" icon={<Check className="h-7 w-7" strokeWidth={3} />} loading={busy === "took"} onClick={tookSlot}>
              <Bi ta="சாப்பிட்டேன்" en="I took them" />
            </Button>
          )}
          {slotAllTaken && <p className="mt-3 text-lg font-semibold text-teal"><Bi ta="நன்று! எல்லாம் சாப்பிட்டீர்கள்" en="Well done, all taken" /></p>}
          {next.slot && next.doses.every((d) => d.status === "upcoming") && (
            <p className="mt-2 text-center text-sm text-ink-3"><Bi inline ta={`நேரம்: சுமார் ${SLOT_LABEL[next.slot].hour > 12 ? SLOT_LABEL[next.slot].hour - 12 : SLOT_LABEL[next.slot].hour} மணி`} en={`Around ${SLOT_LABEL[next.slot].hour > 12 ? SLOT_LABEL[next.slot].hour - 12 : SLOT_LABEL[next.slot].hour} ${SLOT_LABEL[next.slot].hour >= 12 ? "PM" : "AM"}`} /></p>
          )}
        </section>

        {/* Help */}
        <section className="flex flex-col items-center rounded-3xl bg-white px-4 py-6 shadow-card">
          <SosButton onTrigger={() => void raiseSOS("app")} />
        </section>

        {/* Tiles */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { key: "talk", to: "/elder/talk", icon: MessageCircleHeart, ta: "சாத்தியிடம் பேசு", en: "Talk to Saathi", tone: "bg-brand text-[#1d1300]" },
            { key: "pulse", to: "/elder/pulse", icon: HeartPulse, ta: "நாடித்துடிப்பு", en: "Check my pulse", tone: "bg-sos-50 text-sos" },
            { key: "card", to: "/elder/card", icon: IdCard, ta: "என் அவசர அட்டை", en: "My emergency card", tone: "bg-info-50 text-info" },
            { key: "call", to: null, icon: PhoneCall, ta: "குடும்பத்தை அழை", en: "Call family", tone: "bg-teal-50 text-teal" },
          ].map((tile) => (
            <button key={tile.key} onClick={() => (tile.to ? nav(tile.to) : setCallOpen(true))}
              className="flex min-h-[132px] flex-col items-start justify-between gap-3 rounded-3xl border border-line bg-white p-4 text-left shadow-card transition active:scale-[.98]">
              <span className={cx("grid h-12 w-12 place-items-center rounded-2xl", tile.tone)}><tile.icon className="h-7 w-7" /></span>
              <span className="text-[19px] font-bold leading-tight"><Bi ta={tile.ta} en={tile.en} /></span>
            </button>
          ))}
        </section>

        {/* Fall detection */}
        <button onClick={toggleFall} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left">
          <Activity className={cx("h-6 w-6", fallOn ? "text-teal" : "text-ink-3")} />
          <span className="flex-1 text-base font-semibold"><Bi ta="விழுதல் கண்டறிதல்" en="Fall detection" /></span>
          <span className={cx("relative h-8 w-14 rounded-full transition-colors", fallOn ? "bg-teal" : "bg-line")} aria-hidden="true">
            <span className={cx("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all", fallOn ? "left-7" : "left-1")} />
          </span>
          <span className="sr-only">{fallOn ? "on" : "off"}</span>
        </button>
      </main>

      {/* Call family */}
      <Modal open={callOpen} onClose={() => setCallOpen(false)} title={<Bi inline ta="குடும்பத்தை அழை" en="Call family" />}>
        <div className="flex flex-col gap-3">
          {family.length === 0 && <p className="text-ink-2">{t("குடும்பத்தினர் இன்னும் சேரவில்லை", "No family members have joined yet.")}</p>}
          {family.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <Avatar name={m.name} size={52} online={m.online} />
              <div className="min-w-0 flex-1">
                <div className="text-xl font-bold">{m.name}</div>
                <div className="text-sm text-ink-2">{m.relation}{m.phone ? <> · <span className="select-all font-mono">{m.phone}</span></> : null}</div>
              </div>
              {m.phone ? (
                <a href={`tel:${m.phone.replace(/\s/g, "")}`} className="grid h-14 w-14 place-items-center rounded-2xl bg-teal text-white active:scale-95" aria-label={`Call ${m.name}`}><Phone className="h-7 w-7" /></a>
              ) : <span className="text-sm text-ink-3">{t("எண் இல்லை", "No number")}</span>}
            </div>
          ))}
        </div>
      </Modal>

      {/* Menu */}
      <Modal open={menu} onClose={() => setMenu(false)} title={<Bi inline ta="அமைப்புகள்" en="Settings" />}>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-paper p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-2"><Languages className="h-4 w-4" /><Bi inline ta="மொழி" en="Language" /></div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" variant={lang === "ta" ? "primary" : "outline"} onClick={() => setLang("ta")}><span className="font-tamil">தமிழ்</span></Button>
              <Button size="lg" variant={lang === "en" ? "primary" : "outline"} onClick={() => setLang("en")}>English</Button>
            </div>
          </div>
          <div className="rounded-2xl bg-paper p-4 text-sm text-ink-2">
            <div className="font-semibold text-ink">{user?.name}</div>
            {p && <div>{p.address}</div>}
          </div>
          <Button size="lg" variant="outline" icon={<LogOut className="h-5 w-5" />} onClick={async () => { await signOut(); nav("/"); }}>
            <Bi inline ta="வெளியேறு" en="Sign out" />
          </Button>
        </div>
      </Modal>
    </div>
  );
}
