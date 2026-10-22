// Public bystander page (/help/:token): a stranger finds Paati unwell, scans the QR on her emergency card or
// pendant and lands here with no app and no login. Three giant actions (call 108, alert her family, CPR coach),
// the facts paramedics need, and live status once the family and hospital have been alerted.
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, ChevronRight, Check, MapPin } from "lucide-react";
import { Art, Person, PhoneFrame, whoFor } from "../components/kit";
import { Avatar, Spinner, cx } from "../components/ui";
import CprCoach from "../components/CprCoach";
import { StageLabel } from "./Landing";
import type { CardInfo, HelpStatus } from "../../shared/types";

const ACTIVE = ["triage", "dispatched", "arrived", "admitted"];

async function call<T>(method: "GET" | "POST", url: string, body?: unknown): Promise<T> {
  let res: Response;
  try { res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("No internet. Call 108 directly."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Call 108 directly.");
  return data as T;
}

/** Best-effort location so the family knows where she was found (never blocks the alert for long). */
function where(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const t = setTimeout(() => resolve(null), 3500);
    navigator.geolocation.getCurrentPosition(
      (p) => { clearTimeout(t); resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { clearTimeout(t); resolve(null); },
      { enableHighAccuracy: true, timeout: 3000, maximumAge: 60000 },
    );
  });
}

export default function Bystander() {
  const { code = "" } = useParams();
  const [card, setCard] = useState<CardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<HelpStatus | null>(null);
  const [alerted, setAlerted] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [alertErr, setAlertErr] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [cpr, setCpr] = useState(false);

  const refresh = useCallback(() => call<HelpStatus>("GET", `/api/public/help/${encodeURIComponent(code)}/status`).then(setStatus).catch(() => {}), [code]);
  useEffect(() => {
    call<CardInfo>("GET", `/api/public/help/${encodeURIComponent(code)}`).then(setCard).catch((e) => setError((e as Error).message));
    void refresh();
  }, [code, refresh]);

  const em = status?.emergency ?? null;
  const live = !!em && ACTIVE.includes(em.status);
  // After alerting (or if an emergency is already running), follow it every 3 seconds.
  useEffect(() => {
    if (!alerted && !live) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [alerted, live, refresh]);

  async function alertFamily() {
    setAlerting(true); setAlertErr(null);
    try {
      const loc = await where();
      setShared(!!loc);
      const s = await call<HelpStatus>("POST", `/api/public/help/${encodeURIComponent(code)}/alert`, loc ?? {});
      setStatus(s); setAlerted(true);
      try { navigator.vibrate?.([120, 60, 120]); } catch { /* not supported */ }
    } catch (e) { setAlertErr((e as Error).message); }
    finally { setAlerting(false); }
  }

  const name = card?.name.split(" ")[0] || "She";
  const label = <StageLabel who="paati" title="A stranger's phone" text="Kamala collapses at the market. A passer-by scans the QR on her card or pendant: no app, no login. They can call 108, alert her family (Karthik's app and the ER light up live) and get a CPR coach." />;

  return (
    <PhoneFrame label={label}>
      <div className="min-h-full bg-canvas">
        {/* Header */}
        <header className="hero-sos relative overflow-hidden px-5 pb-12 pt-4 text-white safe-top">
          <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-white/10" />
          <span className="glass relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-wider">
            <span className="h-2 w-2 animate-blink rounded-full bg-white" />Saathi emergency card
          </span>
          <div className="relative mt-4 flex items-center gap-4">
            <Person who="paati" size={92} className="shrink-0 ring-4 ring-white/40" />
            <div className="min-w-0">
              <h1 className="text-[27px] font-extrabold leading-[1.1]">{card ? `${name}, ${card.age} may need help` : error ? "Someone may need help" : "Loading…"}</h1>
              <p className="mt-1 font-tamil text-[16px] font-semibold leading-snug text-white/90">இவருக்கு உதவி தேவைப்படலாம்</p>
            </div>
          </div>
          <p className="relative mt-3 text-[14.5px] leading-snug text-white/85">You scanned the card she carries. Stay with her. Thank you for stopping.</p>
        </header>

        <div className="relative -mt-7 flex flex-col gap-3 rounded-t-[32px] bg-canvas px-4 pb-12 pt-5">
          {/* 1. Call 108 */}
          <motion.a whileTap={{ scale: 0.97 }} href="tel:108"
            className="relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-[28px] bg-sos px-4 py-3 text-white shadow-sos">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20"><Art name="ambulance" size={58} /></span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-display text-[25px] font-extrabold">Call 108</div>
              <div className="text-[13.5px] text-white/85">Free ambulance · <span className="font-tamil">ஆம்புலன்ஸ்</span></div>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-sos-600"><Phone className="h-6 w-6" strokeWidth={2.4} /></span>
          </motion.a>

          {/* 2. Alert her family, or the live status once alerted */}
          {card && (live || alerted) && em ? (
            <LiveStatus status={status!} name={name} shared={shared} />
          ) : card ? (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => void alertFamily()} disabled={alerting}
              className="relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-[28px] bg-violet px-4 py-3 text-left text-white shadow-[0_14px_28px_-12px_rgba(91,71,230,.85)] disabled:opacity-80">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/20">{alerting ? <Spinner className="h-8 w-8 text-white" /> : <Art name="home" size={56} />}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[19px] font-extrabold">{alerting ? "Alerting her family…" : "Alert her family and start an emergency"}</div>
                <div className="mt-0.5 text-[13px] text-white/85">Her son and the nearest suitable hospital are told at once</div>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0" />
            </motion.button>
          ) : null}
          {alertErr && <p className="rounded-2xl bg-peach px-4 py-3 text-[14px] font-semibold text-peach-ink">{alertErr}</p>}
          {em && !live && em.status === "cancelled" && alerted && (
            <p className="rounded-2xl bg-mint px-4 py-3 text-[14px] font-semibold text-mint-ink">Her family cancelled the alert. If she still needs help, call 108.</p>
          )}

          {/* 3. CPR coach */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCpr(true)}
            className="relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-[28px] bg-white px-4 py-3 pr-24 text-left shadow-card">
            <div className="min-w-0 leading-tight">
              <div className="text-[12px] font-extrabold uppercase tracking-wider text-sos-600">CPR coach</div>
              <div className="mt-0.5 text-[19px] font-extrabold">Start CPR coach</div>
              <div className="mt-0.5 text-[13px] text-ink-2">If she isn't breathing normally</div>
            </div>
            <Art name="cpr" size={86} className="absolute -bottom-1 right-2" />
          </motion.button>

          {error && (
            <div className="rounded-[28px] bg-white p-5 text-center shadow-card">
              <Art name="qr" size={64} className="mx-auto" />
              <p className="mt-2 font-bold">{error}</p>
              <p className="mt-1 text-[13.5px] text-ink-2">Check that she is breathing, keep her warm and stay with her until help arrives.</p>
            </div>
          )}
          {!card && !error && <div className="grid place-items-center py-10"><Spinner className="h-8 w-8 text-violet" /></div>}

          {card && <CriticalInfo card={card} />}

          {card && card.contacts.length > 0 && (
            <section className="rounded-[28px] bg-white p-4 shadow-card">
              <h2 className="text-[17px] font-bold">Call her family</h2>
              <ul className="mt-2 flex flex-col">
                {card.contacts.map((c) => (
                  <li key={c.phone} className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0">
                    <Avatar name={c.name} size={48} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="truncate text-[16px] font-bold">{c.name} <span className="font-medium text-ink-2">· {c.relation}</span></div>
                      <div className="font-mono text-[14px] text-ink-2 tnum">{c.phone}</div>
                    </div>
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`Call ${c.name}`}
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet text-white shadow-[0_10px_20px_-8px_rgba(91,71,230,.8)]">
                      <Phone className="h-5 w-5" strokeWidth={2.4} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="px-3 pt-2 text-center text-[12px] leading-relaxed text-ink-3">
            Saathi shows only what's needed in an emergency. Her family is told whenever this page is used to raise an alert.
          </p>
        </div>
      </div>
      <CprCoach open={cpr} onClose={() => setCpr(false)} name={card ? name : undefined} etaMin={em?.status === "dispatched" ? em.etaLeftMin : null} />
    </PhoneFrame>
  );
}

function LiveStatus({ status, name, shared }: { status: HelpStatus; name: string; shared: boolean }) {
  const em = status.emergency!;
  const first = status.familyTold[0];
  const others = status.familyTold.slice(1).map((m) => m.name);
  const responding = new Set(em.responders.map((r) => r.name));
  const there = em.status === "arrived" || em.status === "admitted";
  return (
    <motion.section initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="overflow-hidden rounded-[28px] bg-white shadow-lift ring-2 ring-sos/30">
      <div className="flex items-center gap-2 bg-sos-50 px-4 py-2 text-[12px] font-extrabold uppercase tracking-wider text-sos-600">
        <span className="h-2 w-2 animate-blink rounded-full bg-sos" />Emergency started · live
      </div>
      <div className="p-4">
        {/* Ambulance */}
        <div className="flex items-center gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-peach"><Art name="ambulance" size={56} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            {em.status === "triage" ? (
              <>
                <div className="text-[19px] font-extrabold">Finding the right hospital…</div>
                <div className="mt-0.5 text-[13px] text-ink-2">Saathi checks which hospital has what {name} needs</div>
              </>
            ) : there ? (
              <>
                <div className="text-[19px] font-extrabold">The ambulance has reached {em.hospital?.short}</div>
                <div className="mt-0.5 text-[13px] text-ink-2">Thank you for helping {name}</div>
              </>
            ) : (
              <>
                <div className="font-display text-[20px] font-extrabold">Ambulance coming in <span className="whitespace-nowrap text-sos-600 tnum">{em.etaLeftMin ?? "–"} min</span></div>
                <div className="mt-0.5 text-[13.5px] text-ink-2">to {em.hospital?.name ?? "the hospital"}</div>
              </>
            )}
          </div>
        </div>
        {em.status === "dispatched" && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas-2"><div className="h-full rounded-full bg-sos transition-[width] duration-700" style={{ width: `${Math.max(4, Math.round(em.progress * 100))}%` }} /></div>
        )}

        {/* Family */}
        {first && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-mint/60 p-3">
            {whoFor(first.name) ? <Person who={whoFor(first.name)!} size={48} /> : <Avatar name={first.name} size={48} />}
            <div className="min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5 text-[16px] font-extrabold"><Check className="h-4 w-4 text-mint-ink" strokeWidth={3} />{first.name} has been told</div>
              <div className="mt-0.5 text-[13px] text-ink-2">{others.length ? `${others.join(" and ")} too. ` : ""}{responding.size ? `${[...responding].join(", ")} on the way.` : "They can see this live."}</div>
            </div>
          </div>
        )}
        <ul className="mt-3 flex flex-col gap-1.5 text-[13.5px] text-ink-2">
          {em.hospital && <li className="flex items-center gap-2"><Check className={cx("h-4 w-4 shrink-0", "text-mint-ink")} strokeWidth={3} />{em.hospital.short} has her medical records</li>}
          {shared && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-violet-600" strokeWidth={2.4} />Your location was shared with her family</li>}
          <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-3" />Please stay with {name} until help arrives</li>
        </ul>
        {em.hospital?.phone && (
          <a href={`tel:${em.hospital.phone.replace(/\s/g, "")}`} className="mt-3 flex h-12 items-center justify-center gap-2 rounded-full bg-violet-50 text-[14px] font-bold text-violet-700">
            <Phone className="h-4 w-4" />Call {em.hospital.short} ER
          </a>
        )}
      </div>
    </motion.section>
  );
}

function CriticalInfo({ card }: { card: CardInfo }) {
  return (
    <section className="rounded-[28px] bg-white p-4 shadow-card">
      <h2 className="text-[17px] font-bold">For the ambulance team</h2>
      <div className="mt-3 flex gap-2">
        <div className="flex items-center gap-2 rounded-2xl bg-rose/60 py-2 pl-2 pr-4">
          <Art name="blood" size={40} />
          <div className="leading-none"><div className="text-[11.5px] font-semibold text-ink-2">Blood group</div><div className="mt-1 font-display text-[26px] font-extrabold tnum">{card.blood}</div></div>
        </div>
        <div className="flex flex-1 flex-col justify-center rounded-2xl bg-canvas px-3 py-2 leading-tight">
          <div className="text-[11.5px] font-semibold text-ink-2">Patient</div>
          <div className="text-[15px] font-bold">{card.name}</div>
          <div className="text-[13px] text-ink-2">{card.sex === "F" ? "Female" : "Male"}, {card.age}</div>
        </div>
      </div>
      <div className="mt-2 rounded-2xl bg-rose px-4 py-3">
        <div className="text-[12px] font-bold text-rose-ink">Allergy</div>
        <div className="text-[16px] font-bold leading-snug">{card.allergies.join(", ") || "None known"}</div>
      </div>
      {card.thinners.length > 0 && (
        <div className="mt-2 rounded-2xl bg-butter px-4 py-3">
          <div className="text-[12px] font-bold text-butter-ink">On a blood thinner: she may bleed more</div>
          <div className="text-[16px] font-bold leading-snug">{card.thinners.map((m) => `${m.name} ${m.dose}`).join(", ")}</div>
        </div>
      )}
      <div className="mt-3 text-[12px] font-bold text-ink-2">Conditions</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {card.conditions.map((c) => <span key={c} className="rounded-full bg-lilac px-3 py-1 text-[13px] font-semibold leading-snug">{c}</span>)}
      </div>
      {card.meds.length > 0 && (
        <>
          <div className="mt-3 text-[12px] font-bold text-ink-2">Daily medicines</div>
          <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[13.5px]">
            {card.meds.map((m) => (
              <li key={m.name} className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-4 shrink-0 rounded-full border border-black/15" style={{ background: m.color }} />
                <span className="truncate"><span className="font-semibold">{m.name}</span> <span className="text-ink-2">{m.dose}</span></span>
              </li>
            ))}
          </ul>
        </>
      )}
      {card.doctor && <p className="mt-3 text-[12.5px] leading-snug text-ink-2"><span className="font-bold">Her doctors:</span> {card.doctor}</p>}
    </section>
  );
}
