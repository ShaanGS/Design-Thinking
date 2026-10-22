// Full-screen emergency flow for Paati: "What happened?" picker, then a calm live screen:
// help is coming, the ambulance countdown, who in the family is responding, the hospital, a CPR coach
// for whoever is with her, and the "I'm OK, cancel" flow.
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { api } from "../../lib/api";
import { useToast, cx, Avatar, Spinner } from "../../components/ui";
import { Art, BottomSheet, type ArtName } from "../../components/kit";
import CprCoach from "../../components/CprCoach";
import { CONDITION_INFO, type Condition, type Emergency, type Hospital } from "../../../shared/types";
import { BigButton, Bi, useElder } from "./shared";

const CHOICES: { c: Condition; art: ArtName; tone: string }[] = [
  { c: "cardiac", art: "heart", tone: "bg-rose" },
  { c: "breath", art: "stethoscope", tone: "bg-sky" },
  { c: "fall", art: "bed", tone: "bg-peach" },
  { c: "stroke", art: "brain", tone: "bg-lilac" },
  { c: "snake", art: "blood", tone: "bg-butter" },
  { c: "unknown", art: "chat", tone: "bg-mint" },
];
const AUTO_SECONDS = 10;

export function SymptomPicker({ emergency }: { emergency: Emergency }) {
  const toast = useToast();
  const [sent, setSent] = useState<Condition | null>(null);
  const [left, setLeft] = useState(AUTO_SECONDS);

  const send = async (c: Condition) => {
    if (sent) return;
    setSent(c);
    try { navigator.vibrate?.(40); } catch { /* not supported */ }
    try { await api.post(`/api/sos/${emergency.id}/symptom`, { condition: c }); }
    catch (e) { toast((e as Error).message, "warn"); setSent(null); }
  };
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (left <= 0 && !sent) void send("unknown"); }, [left, sent]); // eslint-disable-line react-hooks/exhaustive-deps
  const secs = Math.max(0, left);

  return (
    <div className="fixed inset-0 z-[900] flex flex-col overflow-y-auto bg-canvas">
      <div className="hero-sos relative overflow-hidden px-5 pb-12 pt-4 text-white safe-top">
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-white/10" />
        <div className="glass relative inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[15px] font-bold">
          <span className="h-2.5 w-2.5 shrink-0 animate-blink rounded-full bg-white" />
          <Bi inline ta="உதவி அழைக்கப்படுகிறது" en="Calling for help" />
        </div>
        <div className="relative mt-4 flex items-end justify-between gap-2">
          <div>
            <h1 className="text-[40px] font-extrabold leading-[1.05]"><Bi ta="என்ன ஆச்சு?" en="What happened?" /></h1>
            <p className="mt-2 text-[17px] leading-snug text-white/85"><Bi inline ta="ஒன்றைத் தொடுங்கள். சரியான மருத்துவமனைக்கு அனுப்புவோம்." en="Tap one so we send you to the right hospital." /></p>
          </div>
          <Art name="siren" size={84} className="-mb-1 shrink-0" float />
        </div>
      </div>

      <div className="relative -mt-7 flex flex-1 flex-col rounded-t-[32px] bg-canvas px-4 pb-6 pt-5">
        <div className="grid grid-cols-2 gap-3">
          {CHOICES.map(({ c, art, tone }) => (
            <motion.button key={c} whileTap={{ scale: 0.96 }} onClick={() => void send(c)} disabled={!!sent}
              className={cx("relative flex min-h-[132px] flex-col overflow-hidden rounded-3xl p-4 text-left transition-opacity",
                tone, sent === c && "ring-4 ring-violet", sent && sent !== c && "opacity-35")}>
              <Bi ta={CONDITION_INFO[c].ta} en={CONDITION_INFO[c].en} className="relative z-[1] max-w-[88%] text-[22px] font-extrabold leading-[1.15]" />
              <Art name={art} size={70} className="absolute -bottom-1 -right-1" />
              {c === "unknown" && !sent && (
                <span className="absolute bottom-3 left-4 grid h-11 w-11 place-items-center rounded-full bg-white font-display text-[20px] font-extrabold text-mint-ink tnum shadow-card">{secs}</span>
              )}
              {sent === c && <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-violet text-white"><Check className="h-5 w-5" strokeWidth={3} /></span>}
            </motion.button>
          ))}
        </div>
        <div className="mt-auto pt-5">
          {sent ? (
            <p className="flex items-center gap-3 text-[18px] font-bold"><Spinner className="h-6 w-6 text-violet" /><Bi inline ta="சரியான மருத்துவமனையைத் தேடுகிறோம்…" en="Finding the right hospital…" /></p>
          ) : (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-violet transition-[width] duration-1000 ease-linear" style={{ width: `${(secs / AUTO_SECONDS) * 100}%` }} /></div>
              <p className="mt-2 text-[16px] text-ink-2"><Bi inline ta={`பதில் இல்லையென்றால் ${secs} விநாடியில் தானாகத் தொடரும்`} en={`Carrying on by itself in ${secs} seconds`} /></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StepRow({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", done ? "bg-white text-sos-600" : "border-2 border-white/50")}>
        {done ? <Check className="h-5 w-5" strokeWidth={3.2} /> : <span className="h-2.5 w-2.5 animate-blink rounded-full bg-white" />}
      </span>
      <div className="min-w-0 flex-1 text-[19px] font-bold leading-tight">{children}</div>
    </li>
  );
}

export function EmergencyScreen({ emergency }: { emergency: Emergency }) {
  const { lang, data } = useElder();
  const toast = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [cpr, setCpr] = useState(false);
  useEffect(() => { api.get<Hospital[]>("/api/hospitals").then(setHospitals).catch(() => {}); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const ta = lang === "ta";
  const h = hospitals.find((x) => x.id === (emergency.hospitalId || emergency.route?.hospitalId));
  const hName = h?.short || (ta ? "மருத்துவமனை" : "the hospital");
  const there = emergency.status === "arrived" || emergency.status === "admitted";
  const triage = emergency.status === "triage";
  const sinceStart = (now - new Date(emergency.startedAt).getTime()) / 1000;
  const cancelLeft = Math.max(0, Math.ceil(60 - sinceStart));
  const canCancel = cancelLeft > 0 && (triage || emergency.status === "dispatched");
  const teamReady = emergency.teamReady || emergency.status === "admitted";
  const started = new Date(emergency.startedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const family = (data?.members || []).filter((m) => m.role === "guardian");
  const responding = new Set(emergency.responders.map((r) => r.name));
  const responders = emergency.responders.map((r) => r.name).join(", ");
  const name = data?.patient.name.split(" ")[0] || "her";

  useEffect(() => { if (!canCancel) setConfirm(false); }, [canCancel]);

  const cancel = async () => {
    setCancelling(true);
    try { await api.post(`/api/sos/${emergency.id}/cancel`); toast(ta ? "ரத்து செய்யப்பட்டது. குடும்பத்துக்கு தெரிவிக்கப்பட்டது." : "Cancelled. Your family has been told you're OK.", "ok"); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setCancelling(false); setConfirm(false); }
  };

  return (
    <div className="hero-sos fixed inset-0 z-[850] overflow-y-auto text-white">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div className="relative flex min-h-full flex-col px-4 pb-8 pt-4 safe-top">
        <div className="flex items-center justify-between px-1">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold uppercase tracking-wider">
            <span className="h-2 w-2 animate-blink rounded-full bg-white" />Emergency · <span className="font-tamil normal-case tracking-normal">அவசரம்</span>
          </span>
          <span className="font-display text-[15px] font-bold text-white/85 tnum">{started}</span>
        </div>

        <div className="mt-5 px-1">
          <h1 className="text-[40px] font-extrabold leading-[1.05]">
            {there ? <Bi ta="மருத்துவர்கள் உங்களுடன்" en="Doctors are with you" /> : <Bi ta="உதவி வருகிறது" en="Help is coming" />}
          </h1>
          <p className="mt-2 text-[18px] leading-snug text-white/85"><Bi inline ta="மெதுவாக மூச்சு விடுங்கள். நீங்கள் தனியாக இல்லை." en="Breathe slowly. You are not alone." /></p>
        </div>

        {/* Calm breathing circle with the ambulance countdown */}
        <div className="relative mx-auto my-6 grid h-[220px] w-[220px] place-items-center">
          <span className="absolute inset-0 rounded-full bg-white/15 animate-breathe" />
          <span className="absolute inset-[14px] rounded-full bg-white/15 animate-breathe [animation-delay:.6s]" />
          <div className="relative flex h-[172px] w-[172px] flex-col items-center justify-center rounded-full bg-white text-ink shadow-lift">
            {triage ? (
              <>
                <Art name="siren" size={64} />
                <span className="mt-1 px-4 text-center text-[16px] font-bold leading-tight"><Bi inline ta="மருத்துவமனை தேடுகிறோம்" en="Choosing a hospital" /></span>
              </>
            ) : there ? (
              <>
                <Art name="hospital" size={70} />
                <span className="mt-1 px-3 text-center text-[17px] font-extrabold leading-tight">{hName}</span>
              </>
            ) : (
              <>
                <Art name="ambulance" size={58} className="-mt-1" />
                <span className="font-display text-[52px] font-extrabold leading-none text-sos-600 tnum">{emergency.etaLeftMin ?? "–"}</span>
                <span className="text-[15px] font-bold text-ink-2"><Bi inline ta="நிமிடத்தில் ஆம்புலன்ஸ்" en="min to ambulance" /></span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Hospital */}
          {!triage && (
            <section className="flex items-center gap-3 rounded-3xl bg-white p-4 text-ink shadow-card">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-sky"><Art name="hospital" size={54} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink-2">{there ? <Bi inline ta="வந்து சேர்ந்தீர்கள்" en="You have reached" /> : <Bi inline ta="செல்லும் மருத்துவமனை" en="Going to" />}</div>
                <div className="text-[21px] font-extrabold leading-tight">{h?.name || hName}</div>
                {!there && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas-2">
                    <div className="h-full rounded-full bg-sos transition-[width] duration-700" style={{ width: `${Math.max(4, Math.round(emergency.progress * 100))}%` }} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Family */}
          <section className="rounded-3xl bg-white p-4 text-ink shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 -space-x-3">
                {family.slice(0, 3).map((m) => <Avatar key={m.id} name={m.name} size={52} className="ring-[3px] ring-white" />)}
              </div>
              <Bi ta="குடும்பத்துக்கு தெரியும்" en="Your family knows" className="min-w-0 flex-1 text-[21px] font-extrabold leading-tight" />
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-mint-ink"><Check className="h-5 w-5" strokeWidth={3} /></span>
            </div>
            {family.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {family.map((m) => (
                  <li key={m.id} className={cx("rounded-full px-3 py-1 text-[15px] font-bold", responding.has(m.name) ? "bg-mint text-mint-ink" : "bg-canvas text-ink-2")}>
                    {m.name}{responding.has(m.name) ? (ta ? " வருகிறார்" : " is coming") : ""}
                  </li>
                ))}
              </ul>
            )}
            {responders && !family.some((m) => responding.has(m.name)) && (
              <p className="mt-2 text-[16px] font-bold text-mint-ink"><Bi inline ta={`${responders} வருகிறார்கள்`} en={`${responders} on the way`} /></p>
            )}
          </section>

          {/* Progress */}
          <section className="glass rounded-3xl px-4 py-2">
            <ul>
              <StepRow done={!triage}><Bi ta={`${hName}-க்கு உங்கள் விவரங்கள் சென்றன`} en={`${hName} has your medical records`} /></StepRow>
              <StepRow done={teamReady}>{teamReady ? <Bi ta="மருத்துவர்கள் தயார்" en="The doctors are ready for you" /> : <Bi ta="மருத்துவர்கள் தயாராகிறார்கள்" en="The doctors are getting ready" />}</StepRow>
            </ul>
          </section>

          {!there && (
            <section className="glass rounded-3xl p-4">
              <p className="text-[15px] font-bold text-white/80"><Bi inline ta="இப்போது செய்யுங்கள்" en="Do this now" /></p>
              <ul className="mt-2 flex flex-col gap-2">
                <li className="flex items-center gap-3"><Art name="home" size={48} className="shrink-0" /><Bi ta="கதவைத் திறந்து வையுங்கள்" en="Unlock the front door" className="text-[19px] font-bold leading-tight" /></li>
                <li className="flex items-center gap-3"><Art name="pills" size={48} className="shrink-0" /><Bi ta="மாத்திரைப் பெட்டியை அருகில் வையுங்கள்" en="Keep your medicine box close" className="text-[19px] font-bold leading-tight" /></li>
              </ul>
            </section>
          )}

          {/* CPR coach for whoever is with her */}
          {!there && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCpr(true)}
              className="relative flex min-h-[96px] items-center gap-3 overflow-hidden rounded-3xl bg-white p-4 pr-24 text-left text-ink shadow-lift">
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold uppercase tracking-wider text-sos-600">CPR coach</div>
                <Bi ta="உடன் இருப்பவருக்கு" en={`For the person with ${name}`} className="text-[20px] font-extrabold leading-tight" />
              </div>
              <Art name="cpr" size={84} className="absolute -bottom-1 right-2" />
            </motion.button>
          )}
        </div>

        {canCancel && (
          <button onClick={() => setConfirm(true)} disabled={cancelling}
            className="glass mt-6 flex min-h-[64px] items-center justify-center gap-2 rounded-full px-5 text-[18px] font-bold disabled:opacity-50">
            <X className="h-6 w-6 shrink-0" strokeWidth={2.4} />
            <Bi inline ta={`நான் நலம், ரத்து செய் (${cancelLeft})`} en={`I'm OK, cancel (${cancelLeft})`} />
          </button>
        )}
      </div>

      <BottomSheet open={confirm} onClose={() => setConfirm(false)} title={<Bi inline ta="ரத்து செய்யவா?" en="Cancel the help?" />}>
        <p className="text-[18px] leading-snug text-ink-2"><Bi ta="உங்கள் குடும்பத்துக்கு நீங்கள் நலம் என்று சொல்வோம். ஆம்புலன்ஸ் திரும்பிவிடும்." en="We'll tell your family you're OK and stop the ambulance." /></p>
        <div className="mt-5 flex flex-col gap-3">
          <BigButton tone="ink" disabled={cancelling} onClick={() => void cancel()} icon={cancelling ? <Spinner className="h-6 w-6 text-white" /> : undefined}>
            <Bi ta="ஆம், நான் நலம்" en="Yes, I'm OK" />
          </BigButton>
          <BigButton tone="sos" onClick={() => setConfirm(false)}>
            <Bi ta="இல்லை, உதவி வேண்டும்" en="No, keep help coming" className="text-[20px]" />
          </BigButton>
        </div>
      </BottomSheet>

      <CprCoach open={cpr} onClose={() => setCpr(false)} name={name} etaMin={emergency.status === "dispatched" ? emergency.etaLeftMin : null} />
    </div>
  );
}
