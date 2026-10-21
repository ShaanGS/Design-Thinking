// Full-screen emergency flow for the elder: "What happened?" picker, then a calm live status view.
import { useEffect, useState, type ReactNode } from "react";
import { Check, HeartPulse, Wind, PersonStanding, Brain, Bug, HelpCircle, Ambulance, Users, Hospital as HospitalIcon, DoorOpen, Pill, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { Button, useToast, cx } from "../../components/ui";
import { CONDITION_INFO, type Condition, type Emergency, type Hospital } from "../../../shared/types";
import { Bi, useElder } from "./shared";

const CHOICES: { c: Condition; icon: typeof HeartPulse; tone: string }[] = [
  { c: "cardiac", icon: HeartPulse, tone: "text-sos" },
  { c: "breath", icon: Wind, tone: "text-info" },
  { c: "fall", icon: PersonStanding, tone: "text-warn" },
  { c: "stroke", icon: Brain, tone: "text-brand-700" },
  { c: "snake", icon: Bug, tone: "text-teal" },
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
    catch (e) { toast((e as Error).message, "sos"); setSent(null); }
  };
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0 && !sent) void send("unknown"); }, [left, sent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-[900] overflow-y-auto bg-white safe-top safe-bottom animate-slidein">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col gap-4 px-4 py-6">
        <div className="flex items-center gap-2 self-start rounded-full bg-sos-50 px-3 py-1.5 text-sm font-bold text-sos">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sos" />
          <Bi inline ta="உதவி அழைக்கப்படுகிறது" en="Help is already being called" />
        </div>
        <h1 className="text-[38px] font-extrabold leading-tight"><Bi ta="என்ன ஆச்சு?" en="What happened?" /></h1>
        <div className="grid grid-cols-2 gap-3">
          {CHOICES.map(({ c, icon: I, tone }) => (
            <button key={c} onClick={() => send(c)} disabled={!!sent}
              className={cx("flex min-h-[124px] flex-col items-start justify-between gap-2 rounded-3xl border-2 bg-paper p-4 text-left transition active:scale-[.98]",
                sent === c ? "border-sos bg-sos-50" : "border-line hover:border-sos", sent && sent !== c && "opacity-40")}>
              <I className={cx("h-9 w-9", tone)} strokeWidth={2.2} />
              <span className="text-[21px] font-bold leading-tight [overflow-wrap:anywhere]"><Bi ta={CONDITION_INFO[c].ta} en={CONDITION_INFO[c].en} /></span>
            </button>
          ))}
          <button onClick={() => send("unknown")} disabled={!!sent}
            className={cx("col-span-2 flex min-h-[88px] items-center gap-4 rounded-3xl border-2 border-dashed border-ink-3 bg-white p-4 text-left active:scale-[.98]", sent && sent !== "unknown" && "opacity-40")}>
            <HelpCircle className="h-9 w-9 shrink-0 text-ink-2" strokeWidth={2.2} />
            <span className="text-[22px] font-bold leading-tight"><Bi ta="தெரியவில்லை" en="Not sure" /></span>
          </button>
        </div>
        <div className="mt-auto rounded-2xl bg-paper-2 p-4 text-center text-base text-ink-2">
          {sent ? <span className="inline-flex items-center gap-2 font-semibold text-ink"><Loader2 className="h-5 w-5 animate-spin" /><Bi inline ta="சரியான மருத்துவமனையைத் தேடுகிறோம்…" en="Finding the right hospital…" /></span>
            : <Bi ta={`பதில் இல்லையென்றால் ${Math.max(0, left)} விநாடியில் தானாகத் தொடரும்`} en={`Continuing automatically in ${Math.max(0, left)} s`} />}
        </div>
      </div>
    </div>
  );
}

function Row({ done, icon, children }: { done: boolean; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cx("flex items-start gap-3 rounded-2xl border p-4 transition-colors", done ? "border-teal/30 bg-teal-50" : "border-line bg-white")}>
      <div className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-full text-white", done ? "bg-teal" : "bg-ink-3")}>{done ? <Check className="h-6 w-6" strokeWidth={3} /> : icon}</div>
      <div className="min-w-0 flex-1 pt-0.5 text-xl font-bold leading-tight">{children}</div>
    </div>
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
  const sinceStart = (now - new Date(emergency.startedAt).getTime()) / 1000;
  const canCancel = sinceStart < 60 && (emergency.status === "triage" || emergency.status === "dispatched");
  const responders = emergency.responders.map((r) => r.name).join(", ");

  const cancel = async () => {
    setCancelling(true);
    try { await api.post(`/api/sos/${emergency.id}/cancel`); toast(lang === "ta" ? "ரத்து செய்யப்பட்டது. குடும்பத்துக்கு தெரிவிக்கப்பட்டது." : "Cancelled. Your family has been told you're OK.", "ok"); }
    catch (e) { toast((e as Error).message, "sos"); }
    finally { setCancelling(false); }
  };

  return (
    <div className="fixed inset-0 z-[850] overflow-y-auto bg-paper safe-top safe-bottom animate-slidein">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col gap-4 px-4 py-6">
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-teal-100 animate-breathe" aria-hidden="true">
            <div className="h-[72px] w-[72px] rounded-full bg-teal" />
          </div>
          {there ? (
            <h1 className="text-[32px] font-extrabold leading-tight"><Bi ta="மருத்துவர்கள் உங்களுடன் இருக்கிறார்கள்" en="Doctors are with you" /></h1>
          ) : (
            <h1 className="text-[34px] font-extrabold leading-tight"><Bi ta="உதவி வருகிறது" en="Help is on the way" /></h1>
          )}
          <p className="text-lg text-ink-2">
            {there
              ? <Bi ta={`நீங்கள் ${hName}-ல் இருக்கிறீர்கள்.`} en={`You're at ${hName}.`} />
              : <Bi ta="வட்டத்துடன் சேர்ந்து மெதுவாக மூச்சு விடுங்கள்" en="Breathe slowly with the circle" />}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Row done icon={<Users className="h-6 w-6" />}>
            <Bi ta="குடும்பத்துக்கு தெரியும்" en="Your family knows" />
            {responders && <div className="mt-1 text-base font-semibold text-teal"><Bi inline ta={`${responders} வருகிறார்கள்`} en={`${responders} on the way`} /></div>}
          </Row>
          <Row done={emergency.status !== "triage"} icon={emergency.status === "triage" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Ambulance className="h-6 w-6" />}>
            {emergency.status === "triage" ? <Bi ta="சரியான மருத்துவமனையைத் தேடுகிறோம்" en="Finding the right hospital" />
              : there ? <Bi ta={`${hName} வந்து சேர்ந்தீர்கள்`} en={`Reached ${hName}`} />
              : <>
                  <Bi ta="ஆம்புலன்ஸ் வருகிறது" en="Ambulance is coming" />
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-5xl font-extrabold leading-none text-sos tnum">{emergency.etaLeftMin ?? "–"}</span>
                    <span className="text-base font-semibold text-ink-2">{lang === "ta" ? "நிமிடம்" : "min"} · {hName}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-sos transition-all duration-700" style={{ width: `${Math.round(emergency.progress * 100)}%` }} /></div>
                </>}
          </Row>
          {emergency.status !== "triage" && (
            <Row done={emergency.teamReady || emergency.status === "admitted"} icon={<HospitalIcon className="h-6 w-6" />}>
              {emergency.teamReady || emergency.status === "admitted"
                ? <Bi ta={`${hName} மருத்துவர்கள் தயார்`} en={`${hName} doctors are ready for you`} />
                : <Bi ta={`${hName}-க்கு உங்கள் விவரங்கள் அனுப்பப்பட்டன`} en={`${hName} has your medical records`} />}
            </Row>
          )}
          {!there && (
            <>
              <div className="flex items-start gap-3 rounded-2xl border-2 border-brand bg-brand-50 p-4">
                <DoorOpen className="mt-0.5 h-8 w-8 shrink-0 text-brand-700" />
                <div className="text-xl font-bold leading-tight"><Bi ta="கதவைத் திறந்து வையுங்கள்" en="Unlock the front door" /></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border-2 border-brand bg-brand-50 p-4">
                <Pill className="mt-0.5 h-8 w-8 shrink-0 text-brand-700" />
                <div className="text-xl font-bold leading-tight"><Bi ta="மாத்திரைப் பெட்டியை எடுத்து வையுங்கள்" en="Keep your medicine box ready" /></div>
              </div>
            </>
          )}
        </div>

        {canCancel && (
          <Button variant="outline" size="xl" className="mt-auto border-2" loading={cancelling} onClick={cancel}>
            <Bi ta="தவறுதலாக அழுத்தினேன்" en="Pressed by mistake · cancel" />
          </Button>
        )}
      </div>
    </div>
  );
}
