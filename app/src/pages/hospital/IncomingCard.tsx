// The incoming patient: the big red card (siren, portrait, live ETA, why us), then her red flags, the brief and the ER's steps.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, FileText, Lock, Users } from "lucide-react";
import type { Emergency, Hospital } from "../../../shared/types";
import { NEED_LABEL } from "../../../shared/types";
import { Avatar, cx } from "../../components/ui";
import { Art, Pill, type ArtName } from "../../components/kit";
import { fmtTime, timeAgo } from "../../lib/format";
import { redFlags, type PatientFile } from "./useNetwork";
import { STATUS_LABEL, teamLabel, useHospital } from "./ctx";

const month = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
const pronoun = (sex?: "F" | "M") => (sex === "M" ? { sub: "he", obj: "him", pos: "his" } : { sub: "she", obj: "her", pos: "her" });

/** Live countdown in the simulation's minutes, ticking smoothly between server updates. */
function useCountdown(e: Emergency, speed: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (e.status !== "dispatched") return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [e.status]);
  if (!e.route || !e.dispatchedAt) return null;
  const total = e.route.etaMin * 60;
  let left = Math.max(0, total - ((now - Date.parse(e.dispatchedAt)) / 1000) * speed);
  // Trust the server if the two clocks disagree
  if (e.etaLeftMin != null && Math.abs(left / 60 - e.etaLeftMin) > 2) left = e.etaLeftMin * 60;
  if (e.status !== "dispatched") left = 0;
  return { left, total, progress: total ? 1 - left / total : 1 };
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/* ---------------------------------------------------------------- The big card */

export function IncomingHero({ e, file, hospitals }: { e: Emergency; file: PatientFile | undefined; hospitals: Hospital[] }) {
  const { demoSpeed, ownId, openRecord } = useHospital();
  const cd = useCountdown(e, demoSpeed);
  const p = file?.record.patient;
  const r = e.route;
  const nearest = hospitals.find((h) => h.id === r?.nearestId);
  const nearestMissing = r?.ranking.find((o) => o.hospitalId === r.nearestId)?.missing ?? [];
  const admitted = e.status === "admitted", arrived = e.status === "arrived";
  const progress = admitted || arrived ? 1 : cd?.progress ?? e.progress;
  const pickup = r?.pickupShare ?? 0.3;
  const onBoard = progress >= pickup;
  const conf = e.triage ? Math.round(e.triage.confidence * 100) : null;
  const red = !admitted;

  return (
    <motion.div layout initial={{ opacity: 0, y: 40, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={cx("relative mt-5 overflow-hidden rounded-[28px] p-4", red ? "hero-sos text-white shadow-sos" : "bg-white text-ink shadow-lift", red && !e.teamReady && "animate-pulsering")}>
      {red && <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 animate-ripple" />}
      <Art name={red ? "siren" : "stethoscope"} size={92} float={red} className="absolute -right-2 -top-2" />

      <div className={cx("flex items-center gap-1.5 text-[11.5px] font-extrabold tracking-[0.12em]", red ? "text-white/90" : "text-mint-ink")}>
        {red && <span className="h-2 w-2 rounded-full bg-white animate-blink" />}
        {admitted ? "IN YOUR ER" : arrived ? "AT THE ER DOOR" : "INCOMING PATIENT"}
      </div>

      {/* Who and what */}
      <div className="mt-3 flex items-center gap-3 pr-20">
        {p ? <Avatar name={p.name} size={60} className="ring-[3px] ring-white/60" /> : <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full bg-white/20"><Art name="heart" size={40} /></span>}
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[17px] font-extrabold">{p ? `${p.name.split(" ")[0]}, ${p.age} ${p.sex}` : "Opening her record…"}</div>
          {p && <div className={cx("text-[12.5px]", red ? "text-white/80" : "text-ink-2")}>Blood {p.blood} · {p.nickname}</div>}
        </div>
      </div>
      <div className="mt-3 font-display text-[23px] font-extrabold leading-tight">{e.triage?.label || "Emergency"}</div>
      <div className={cx("mt-0.5 text-[12.5px]", red ? "text-white/80" : "text-ink-2")}>
        {conf != null && `${conf}% sure · `}{e.triage?.source || "triage"} · SOS {fmtTime(e.startedAt)}
      </div>

      {/* ETA */}
      {red ? (
        <div className="mt-4 rounded-[22px] bg-black/10 p-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[12px] font-semibold text-white/80">{arrived ? "The ambulance is here" : onBoard ? `On board, coming to you` : "Ambulance reaching her home"}</div>
              <div className="font-display text-[46px] font-extrabold leading-none tnum">{arrived ? "Here" : cd ? mmss(cd.left) : e.etaLeftMin != null ? `${e.etaLeftMin}` : "…"}</div>
            </div>
            <div className="pb-1 text-right text-[12px] leading-snug text-white/80">
              {arrived ? `arrived ${timeAgo(e.arrivedAt || e.startedAt)}` : <>min left<br />of a {r?.etaMin ?? "?"} min trip</>}
            </div>
          </div>
          <div className="relative mt-5 h-2.5 rounded-full bg-white/25">
            <motion.div className="h-full rounded-full bg-white" animate={{ width: `${Math.max(3, progress * 100)}%` }} transition={{ duration: 0.3 }} />
            <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-peach" style={{ left: `${pickup * 100}%` }} title="Her home" />
            <motion.div className="absolute -top-[26px]" animate={{ left: `calc(${Math.min(1, progress) * 100}% - 20px)` }} transition={{ duration: 0.3 }}>
              <Art name="ambulance" size={40} />
            </motion.div>
          </div>
          <div className="relative mt-1.5 h-4 text-[11px] font-semibold text-white/70"><span className="absolute left-0">108 base</span><span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(70, Math.max(30, pickup * 100))}%` }}>Her home</span><span className="absolute right-0">You</span></div>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-mint px-3 py-2.5 text-[13.5px] font-semibold text-mint-ink">Received {timeAgo(e.arrivedAt || e.startedAt)}. Close the case when {pronoun(p?.sex).sub} is stable.</p>
      )}

      {/* Why us */}
      {r && red && (
        <div className="glass mt-3 rounded-[22px] p-3.5">
          <div className="text-[12px] font-bold text-white/80">Why Saathi sent {pronoun(p?.sex).obj} to you</div>
          <ul className="mt-2 flex flex-col gap-1.5 text-[13.5px] font-semibold leading-snug">
            <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />Needs {r.needLabel}. You have it.</li>
            {r.hospitalId === ownId && r.nearestId !== r.hospitalId && nearest ? (
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />
                <span>About <span className="font-display text-[16px] font-extrabold tnum">{r.savedMin} min</span> sooner to treatment than {nearest.short}, the nearest{nearestMissing.length ? ` (no ${nearestMissing.map((m) => NEED_LABEL[m] || m).join(", ")})` : ""}.</span>
              </li>
            ) : <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} />You are the nearest hospital that can treat {pronoun(p?.sex).obj}.</li>}
          </ul>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Pill variant="white" icon={FileText} className="flex-1" disabled={!file} onClick={() => openRecord(e.patientId)}>{file ? "Open full record" : "Opening record…"}</Pill>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------------- Nothing on the way */

export function QuietCard({ hospitalShort }: { hospitalShort: string }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="relative overflow-hidden rounded-[28px] bg-white p-5 pr-28 shadow-card">
      <div className="text-[12px] font-semibold text-mint-ink">All calm at {hospitalShort}</div>
      <div className="mt-1 font-display text-[19px] font-extrabold leading-tight">No one is on the way</div>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-2">Saathi will page you the moment an SOS is routed here, with the records, red flags and a live ETA.</p>
      <Art name="ambulance" size={110} float className="absolute -right-3 bottom-2" />
    </motion.div>
  );
}

/* ---------------------------------------------------------------- What the ER does next */

export function CaseSteps({ e, file }: { e: Emergency; file: PatientFile | undefined }) {
  const { act, busy } = useHospital();
  const pr = pronoun(file?.record.patient.sex);
  const steps: { key: string; title: string; sub: string; done: boolean; now: boolean; action?: () => void; label?: string; busyKey: string }[] = [
    { key: "ready", title: e.teamReady ? "Team ready" : teamLabel(e), sub: e.teamReady ? "The family can see the team is waiting." : e.status === "admitted" ? `Not needed now. ${pr.sub[0].toUpperCase()}${pr.sub.slice(1)} is with you.` : `So they are waiting when ${pr.sub} arrives.`, done: e.teamReady, now: !e.teamReady && e.status !== "admitted", action: () => act(e, "ready"), label: "Page now", busyKey: `${e.id}:ready` },
    { key: "admit", title: "Patient received", sub: e.status === "dispatched" ? "Unlocks when the ambulance reaches you." : e.status === "arrived" ? `Tap when ${pr.sub} is through the door.` : "Received. The family was told.", done: e.status === "admitted", now: e.status === "arrived", action: () => act(e, "admit"), label: "Received", busyKey: `${e.id}:admit` },
    { key: "resolve", title: "Close the case", sub: e.status === "admitted" ? `When ${pr.sub} is stable.` : "After the patient is received.", done: false, now: e.status === "admitted", action: () => act(e, "resolve"), label: "Close", busyKey: `${e.id}:resolve` },
  ];
  return (
    <ol className="rounded-3xl bg-white p-2 shadow-card">
      {steps.map((s, i) => (
        <li key={s.key} className={cx("flex items-center gap-3 rounded-[20px] p-2.5", s.now && "bg-violet-50")}>
          <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[14px] font-extrabold", s.done ? "bg-mint text-mint-ink" : s.now ? "bg-violet text-white" : "bg-canvas text-ink-3")}>
            {s.done ? <Check className="h-[18px] w-[18px]" strokeWidth={3} /> : i + 1}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className={cx("text-[15px] font-bold", !s.done && !s.now && "text-ink-2")}>{s.title}</div>
            <div className="mt-0.5 text-[12.5px] text-ink-2">{s.sub}</div>
          </div>
          {s.now && <Pill variant="violet" size="sm" className="h-11 shrink-0" disabled={busy === s.busyKey} onClick={s.action}>{busy === s.busyKey ? "…" : s.label}</Pill>}
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- Red flags */

export function RedFlags({ file }: { file: PatientFile | undefined }) {
  if (!file) return <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">Opening her record to check allergies, blood thinners and kidney function…</p>;
  const f = redFlags(file);
  const rows: { art: ArtName; tone: string; label: string; value: string; note?: string; alert: boolean }[] = [
    { art: "shield", tone: "bg-peach", label: "Allergies", value: f.allergies.length ? f.allergies.join(", ") : "None recorded", alert: f.allergies.length > 0 },
    { art: "blood", tone: "bg-rose", label: "Blood thinners", value: f.thinners.length ? f.thinners.join(", ") : "None", note: f.thinners.length ? "Bleeding risk with thrombolysis and procedures" : undefined, alert: f.thinners.length > 0 },
    { art: "stethoscope", tone: "bg-sky", label: "Kidney function", value: f.egfr ? `eGFR ${f.egfr.value}` : "No eGFR on record", note: f.egfr ? `${month(f.egfr.date)}${f.egfr.value < 45 ? " · go easy on contrast" : ""}` : undefined, alert: !!f.egfr && f.egfr.value < 45 },
  ];
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className={cx("flex items-center gap-3 rounded-3xl p-3 pr-4", r.alert ? "bg-white shadow-card ring-2 ring-peach" : "bg-white shadow-card")}>
          <span className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", r.tone)}><Art name={r.art} size={44} /></span>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">{r.label}{r.alert && <span className="rounded-full bg-peach px-2 py-0.5 text-[11px] font-bold text-peach-ink">Check</span>}</div>
            <div className="mt-0.5 text-[16px] font-extrabold">{r.value}</div>
            {r.note && <div className={cx("mt-0.5 text-[12.5px]", r.alert ? "text-peach-ink" : "text-ink-3")}>{r.note}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------- Pre-arrival brief */

export function BriefCard({ e, file }: { e: Emergency; file: PatientFile | undefined }) {
  const { openRecord } = useHospital();
  return (
    <div className="rounded-3xl bg-white p-4 shadow-card">
      {e.symptomText && (
        <div className="mb-3 rounded-2xl bg-butter px-3.5 py-2.5 text-[13.5px] leading-snug">
          <div className="text-[12px] font-semibold text-butter-ink">Said on the call</div>
          <div className="font-semibold">“{e.symptomText}”</div>
          {e.triage?.english && e.triage.english !== e.symptomText && <div className="text-ink-2">{e.triage.english}</div>}
        </div>
      )}
      <div className="flex items-start gap-3">
        <Art name="chat" size={44} className="shrink-0" />
        <div className="min-w-0">
          {e.brief ? <p className="text-[14.5px] leading-relaxed">{e.brief}</p> : <p className="text-[14px] text-ink-2">Saathi is writing the brief from her records.</p>}
          <p className="mt-1.5 text-[12px] text-ink-3">Written by Saathi from her records before arrival</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-canvas px-3 py-2.5 text-[13px]">
        <Users className="h-4 w-4 shrink-0 text-violet-600" />
        <span className="min-w-0 flex-1">{e.responders.length ? <><b>{e.responders.map((r) => `${r.name}${r.relation ? ` (${r.relation.toLowerCase()})` : ""}`).join(", ")}</b> on the way</> : "Family notified. No one has confirmed yet."}</span>
      </div>
      <Pill variant="soft" icon={FileText} className="mt-3 w-full" disabled={!file} onClick={() => openRecord(e.patientId)}>Open full record</Pill>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-ink-3"><Lock className="h-3.5 w-3.5" />Opening the record is logged and the family is told</p>
    </div>
  );
}

/* ---------------------------------------------------------------- Compact rows */

export function CaseRow({ e, hospitals, onClick, mine, file }: { e: Emergency; hospitals: Hospital[]; onClick: () => void; mine: boolean; file?: PatientFile }) {
  const dest = hospitals.find((h) => h.id === e.hospitalId);
  const red = e.status === "dispatched" || e.status === "arrived" || e.status === "triage";
  return (
    <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onClick} className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 pr-4 text-left shadow-card">
      <span className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", red ? "bg-rose" : "bg-mint")}><Art name={red ? "ambulance" : "bed"} size={40} /></span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[15px] font-bold">{e.triage?.label || "Finding out what happened"}</div>
        <div className="truncate text-[12.5px] text-ink-2">
          {mine ? (file ? `${file.record.patient.name.split(" ")[0]}, ${file.record.patient.age}` : "Patient") : `To ${dest?.short || "a hospital being chosen"}`} · {STATUS_LABEL[e.status]}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {e.status === "dispatched" && e.etaLeftMin != null ? <><div className="font-display text-[20px] font-extrabold leading-none tnum">{e.etaLeftMin}</div><div className="text-[11px] text-ink-3">min</div></> : <ChevronRight className="h-5 w-5 text-ink-3" />}
      </div>
    </motion.button>
  );
}
