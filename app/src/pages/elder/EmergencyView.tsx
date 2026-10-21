// Full-screen emergency flow for the elder: "What happened?" picker, then a calm live status board.
import { useEffect, useState, type ReactNode } from "react";
import { Check, HeartPulse, Wind, PersonStanding, Brain, Bug, HelpCircle, DoorOpen, Pill, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";
import { useToast, cx } from "../../components/ui";
import { CONDITION_INFO, type Condition, type Emergency, type Hospital } from "../../../shared/types";
import { Bi, useElder } from "./shared";

const CHOICES: { c: Condition; icon: typeof HeartPulse }[] = [
  { c: "cardiac", icon: HeartPulse },
  { c: "breath", icon: Wind },
  { c: "fall", icon: PersonStanding },
  { c: "stroke", icon: Brain },
  { c: "snake", icon: Bug },
];
const AUTO_SECONDS = 10;

export function SymptomPicker({ emergency }: { emergency: Emergency }) {
  const toast = useToast();
  const [sent, setSent] = useState<Condition | null>(null);
  const [left, setLeft] = useState(AUTO_SECONDS);

  const send = async (c: Condition) => {
    if (sent) return;
    setSent(c);
    try { await api.post(`/api/sos/${emergency.id}/symptom`, { condition: c }); }
    catch (e) { toast((e as Error).message, "warn"); setSent(null); }
  };
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0 && !sent) void send("unknown"); }, [left, sent]); // eslint-disable-line react-hooks/exhaustive-deps

  const choice = (c: Condition, Icon: typeof HeartPulse, extra?: ReactNode) => (
    <li key={c} className="border-b border-line">
      <button onClick={() => send(c)} disabled={!!sent}
        className={cx("flex min-h-[80px] w-full items-center gap-4 px-5 py-3 text-left transition-colors",
          sent === c ? "bg-ink text-white" : "hover:bg-paper active:bg-paper-2", sent && sent !== c && "opacity-35")}>
        <Icon className={cx("h-8 w-8 shrink-0", sent === c ? "text-brand" : "text-ink-2")} strokeWidth={1.75} />
        <span className="min-w-0 flex-1 text-[24px] font-semibold leading-tight"><Bi ta={CONDITION_INFO[c].ta} en={CONDITION_INFO[c].en} /></span>
        {extra ?? <ChevronRight className={cx("h-6 w-6 shrink-0", sent === c ? "text-white/70" : "text-ink-3")} strokeWidth={1.75} />}
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-[900] overflow-y-auto bg-white safe-top safe-bottom">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col">
        <div className="flex items-center gap-2.5 bg-sos px-5 py-3 text-white">
          <span className="h-2.5 w-2.5 shrink-0 animate-blink rounded-full bg-white" />
          <span className="text-[17px] font-semibold"><Bi inline ta="உதவி அழைக்கப்படுகிறது" en="Help is being called" /></span>
        </div>
        <div className="px-5 pb-5 pt-6">
          <h1 className="text-[40px] font-bold leading-[1.05]"><Bi ta="என்ன ஆச்சு?" en="What happened?" /></h1>
          <p className="mt-2 text-[17px] text-ink-2"><Bi inline ta="தொட்டுச் சொல்லுங்கள். சரியான மருத்துவமனைக்கு அனுப்புவோம்." en="Tap one so we send you to the right hospital." /></p>
        </div>
        <ul className="border-t border-line">
          {CHOICES.map(({ c, icon }) => choice(c, icon))}
          {choice("unknown", HelpCircle, sent ? undefined : <span className="shrink-0 font-display text-[28px] font-semibold text-ink-3 tnum">{Math.max(0, left)}</span>)}
        </ul>
        <div className="mt-auto px-5 py-5">
          {sent ? (
            <p className="text-[17px] font-semibold"><Bi inline ta="சரியான மருத்துவமனையைத் தேடுகிறோம்…" en="Finding the right hospital…" /></p>
          ) : (
            <>
              <div className="h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-ink-3 transition-[width] duration-1000 ease-linear" style={{ width: `${(Math.max(0, left) / AUTO_SECONDS) * 100}%` }} /></div>
              <p className="mt-2 text-[15px] text-ink-2"><Bi inline ta={`பதில் இல்லையென்றால் ${Math.max(0, left)} விநாடியில் தானாகத் தொடரும்`} en={`Continuing on its own in ${Math.max(0, left)} seconds`} /></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-4 border-b border-white/10 py-4 last:border-b-0">
      <span className={cx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2", done ? "border-brand bg-brand text-night" : "border-white/35")}>
        {done ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="h-2 w-2 animate-blink rounded-full bg-white/70" />}
      </span>
      <div className="min-w-0 flex-1 text-[22px] font-semibold leading-tight">{children}</div>
    </li>
  );
}

export function EmergencyScreen({ emergency }: { emergency: Emergency }) {
  const { lang } = useElder();
  const toast = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => { api.get<Hospital[]>("/api/hospitals").then(setHospitals).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const h = hospitals.find((x) => x.id === (emergency.hospitalId || emergency.route?.hospitalId));
  const hName = h?.short || (lang === "ta" ? "மருத்துவமனை" : "the hospital");
  const there = emergency.status === "arrived" || emergency.status === "admitted";
  const triage = emergency.status === "triage";
  const sinceStart = (now - new Date(emergency.startedAt).getTime()) / 1000;
  const cancelLeft = Math.max(0, Math.ceil(60 - sinceStart));
  const canCancel = cancelLeft > 0 && (triage || emergency.status === "dispatched");
  const responders = emergency.responders.map((r) => r.name).join(", ");
  const teamReady = emergency.teamReady || emergency.status === "admitted";
  const started = new Date(emergency.startedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  const cancel = async () => {
    setCancelling(true);
    try { await api.post(`/api/sos/${emergency.id}/cancel`); toast(lang === "ta" ? "ரத்து செய்யப்பட்டது. குடும்பத்துக்கு தெரிவிக்கப்பட்டது." : "Cancelled. Your family has been told you're OK.", "ok"); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setCancelling(false); }
  };

  return (
    <div className="fixed inset-0 z-[850] overflow-y-auto bg-night text-white safe-top safe-bottom">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col px-5 pb-6 pt-5">
        <div className="flex items-center justify-between text-[13px] font-semibold text-white/60">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sos" />EMERGENCY</span>
          <span className="font-mono tnum">{started}</span>
        </div>

        <h1 className="mt-5 text-[40px] font-bold leading-[1.05]">
          {there ? <Bi ta="மருத்துவர்கள் உங்களுடன்" en="Doctors are with you" /> : <Bi ta="உதவி வருகிறது" en="Help is on the way" />}
        </h1>
        <p className="mt-2 text-[18px] text-white/75"><Bi inline ta="மெதுவாக மூச்சு விடுங்கள். நீங்கள் தனியாக இல்லை." en="Breathe slowly. You are not alone." /></p>

        {/* Departure-board block */}
        <section className="mt-7 border-y border-white/15 py-5">
          {triage ? (
            <p className="flex items-center gap-3 text-[22px] font-semibold">
              <span className="h-2.5 w-2.5 animate-blink rounded-full bg-brand" />
              <Bi inline ta="சரியான மருத்துவமனையைத் தேடுகிறோம்" en="Finding the right hospital" />
            </p>
          ) : there ? (
            <>
              <p className="text-[15px] text-white/60"><Bi inline ta="வந்து சேர்ந்தீர்கள்" en="You have reached" /></p>
              <p className="mt-1 font-display text-[40px] font-semibold leading-none text-brand">{hName}</p>
            </>
          ) : (
            <>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[15px] text-white/60"><Bi inline ta="ஆம்புலன்ஸ் வர" en="Ambulance arrives in" /></p>
                  <p className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-[88px] font-semibold leading-[0.85] text-brand tnum" style={{ fontStretch: "85%" }}>{emergency.etaLeftMin ?? "–"}</span>
                    <span className="text-[22px] font-semibold text-brand"><Bi inline ta="நிமிடம்" en="min" /></span>
                  </p>
                </div>
                <div className="pb-1 text-right">
                  <p className="text-[15px] text-white/60"><Bi inline ta="செல்லும் இடம்" en="Going to" /></p>
                  <p className="mt-1 text-[22px] font-semibold leading-tight">{hName}</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-night-3"><div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${Math.round(emergency.progress * 100)}%` }} /></div>
            </>
          )}
        </section>

        <ul className="mt-2">
          <Step done>
            <Bi ta="குடும்பத்துக்கு தெரியும்" en="Your family knows" />
            {responders && <p className="mt-1 text-[17px] font-medium text-brand"><Bi inline ta={`${responders} வருகிறார்கள்`} en={`${responders} on the way`} /></p>}
          </Step>
          <Step done={!triage}><Bi ta={`${hName}-க்கு உங்கள் விவரங்கள் சென்றன`} en={`${hName} has your medical records`} /></Step>
          <Step done={teamReady}>{teamReady ? <Bi ta="மருத்துவர்கள் தயார்" en="The doctors are ready for you" /> : <Bi ta="மருத்துவர்கள் தயாராகிறார்கள்" en="The doctors are getting ready" />}</Step>
        </ul>

        {!there && (
          <section className="mt-6 rounded-xl bg-night-2 px-5 py-4">
            <p className="text-[15px] font-semibold text-white/60"><Bi inline ta="இப்போது செய்யுங்கள்" en="Do this now" /></p>
            <ul className="mt-2 flex flex-col">
              <li className="flex items-center gap-4 border-b border-white/10 py-3">
                <DoorOpen className="h-8 w-8 shrink-0 text-brand" strokeWidth={1.75} />
                <span className="text-[21px] font-semibold leading-tight"><Bi ta="கதவைத் திறந்து வையுங்கள்" en="Unlock the front door" /></span>
              </li>
              <li className="flex items-center gap-4 py-3">
                <Pill className="h-8 w-8 shrink-0 text-brand" strokeWidth={1.75} />
                <span className="text-[21px] font-semibold leading-tight"><Bi ta="மாத்திரைப் பெட்டியை அருகில் வையுங்கள்" en="Keep your medicine box close" /></span>
              </li>
            </ul>
          </section>
        )}

        {canCancel && (
          <button onClick={cancel} disabled={cancelling}
            className="mt-auto flex min-h-[56px] items-center justify-center gap-2 pt-8 text-[17px] font-medium text-white/75 underline decoration-white/40 underline-offset-4 hover:text-white disabled:opacity-50">
            <Bi inline ta={`தவறுதலாக அழுத்தினேன் · ரத்து செய் (${cancelLeft})`} en={`Pressed by mistake · cancel (${cancelLeft})`} />
          </button>
        )}
      </div>
    </div>
  );
}
