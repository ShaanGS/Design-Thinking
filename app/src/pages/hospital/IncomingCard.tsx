// One incoming emergency: who, why, how soon, what's dangerous, and the ER's actions.
import { AlertTriangle, Ambulance, CheckCircle2, ClipboardList, Droplets, FileText, HeartPulse, Pill, ShieldAlert, Siren, UserRound, Users } from "lucide-react";
import type { Emergency, Hospital } from "../../../shared/types";
import { Badge, Button, cx } from "../../components/ui";
import { fmtTime, timeAgo } from "../../lib/format";
import { redFlags, type PatientFile } from "./useNetwork";

const STATUS: Record<Emergency["status"], { label: string; tone: "sos" | "warn" | "info" | "ok" | "mute" }> = {
  triage: { label: "Triaging", tone: "warn" },
  dispatched: { label: "En route", tone: "sos" },
  arrived: { label: "Arrived", tone: "info" },
  admitted: { label: "In ER", tone: "ok" },
  resolved: { label: "Closed", tone: "mute" },
  cancelled: { label: "Cancelled", tone: "mute" },
};

export function statusOf(e: Emergency) { return STATUS[e.status]; }

export default function IncomingCard({ e, file, hospitals, ownId, selected, onSelect, onAction, busy, onOpenRecord, fresh }: {
  e: Emergency;
  file: PatientFile | "denied" | undefined;
  hospitals: Hospital[];
  ownId: string | null;
  selected: boolean;
  onSelect: () => void;
  onAction: (action: "ready" | "admit" | "resolve") => void;
  busy: string | null;
  onOpenRecord: () => void;
  fresh?: boolean;
}) {
  const mine = !!ownId && e.hospitalId === ownId;
  const dest = hospitals.find((h) => h.id === e.hospitalId);
  const f = file && file !== "denied" ? file : undefined;
  const flags = redFlags(f);
  const p = f?.record.patient;
  const st = STATUS[e.status];
  const arrived = e.status === "arrived" || e.status === "admitted";
  const conf = e.triage ? Math.round(e.triage.confidence * 100) : null;

  return (
    <article
      onClick={onSelect}
      className={cx(
        "relative cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-card transition",
        selected ? "border-ink ring-2 ring-ink/10" : "border-line hover:border-ink-3",
        fresh && "animate-slidein",
      )}
    >
      <div className={cx("absolute inset-y-0 left-0 w-1.5", e.status === "admitted" ? "bg-teal" : e.status === "arrived" ? "bg-info" : e.status === "triage" ? "bg-warn" : "bg-sos")} />
      <div className="flex flex-col gap-3 py-4 pl-5 pr-4 sm:pl-6">
        {/* Header: status, who, ETA */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone={st.tone} dot>{st.label}</Badge>
              {mine ? <Badge tone="dark">Routed to you</Badge> : dest && <Badge tone="mute">To {dest.short}</Badge>}
              {e.teamReady && <Badge tone="ok"><CheckCircle2 className="h-3 w-3" /> Team ready</Badge>}
              <span className="text-xs text-ink-3">SOS {fmtTime(e.startedAt)} · via {e.source}</span>
            </div>
            <h3 className="flex items-center gap-2 text-xl font-bold leading-tight">
              <UserRound className="h-5 w-5 shrink-0 text-ink-3" />
              {p ? <span className="truncate">{p.name}, {p.age}{p.sex}</span> : <span className="text-ink-2">{mine ? "Loading patient…" : "Patient (record not shared)"}</span>}
              {p?.blood && <span className="rounded-md bg-sos-50 px-1.5 py-0.5 font-mono text-xs font-bold text-sos">{p.blood}</span>}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {e.triage ? (
                <>
                  <span className="inline-flex items-center gap-1 font-semibold text-sos"><Siren className="h-4 w-4" />{e.triage.label}</span>
                  <span className="text-ink-2">{conf}% · {e.triage.source}</span>
                </>
              ) : <span className="font-semibold text-warn">Waiting for symptoms…</span>}
            </div>
            {e.symptomText && mine && <p className="mt-1 text-sm italic text-ink-2">“{e.symptomText}”{e.triage?.english && e.triage.english !== e.symptomText ? ` (${e.triage.english})` : ""}</p>}
          </div>
          <div className="shrink-0 text-right">
            {arrived ? (
              <div className={cx("font-display text-3xl font-extrabold leading-none", e.status === "admitted" ? "text-teal" : "text-info")}>{e.status === "admitted" ? "IN ER" : "ARRIVED"}</div>
            ) : e.etaLeftMin != null ? (
              <>
                <div className="font-mono text-5xl font-medium leading-none text-sos tnum">{e.etaLeftMin}<span className="ml-1 text-lg">min</span></div>
                <div className="mt-1 text-xs text-ink-2">ambulance ETA</div>
              </>
            ) : <div className="font-display text-2xl font-bold text-warn">Routing…</div>}
            {e.status === "dispatched" && (
              <div className="ml-auto mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-paper-2">
                <div className="h-full bg-sos transition-all" style={{ width: `${Math.round(e.progress * 100)}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Red flags */}
        {mine && f && (
          <div className="grid gap-1.5 sm:grid-cols-3">
            <Flag icon={<ShieldAlert className="h-4 w-4" />} label="Allergy" tone={flags.allergies.length ? "sos" : "mute"} value={flags.allergies.length ? flags.allergies.join(", ") : "None recorded"} />
            <Flag icon={<Droplets className="h-4 w-4" />} label="Blood thinner" tone={flags.thinners.length ? "sos" : "mute"} value={flags.thinners.length ? flags.thinners.join(", ") : "None"} />
            <Flag icon={<HeartPulse className="h-4 w-4" />} label="Kidney (eGFR)" tone={flags.egfr && flags.egfr.value < 45 ? "warn" : "mute"} value={flags.egfr ? `${flags.egfr.value} · ${flags.egfr.date.slice(0, 7)}` : "No result"} />
          </div>
        )}

        {/* AI brief */}
        {e.brief && mine && (
          <div className="rounded-xl bg-info-50 px-3.5 py-3 text-sm leading-relaxed text-ink">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-info"><ClipboardList className="h-3.5 w-3.5" /> Pre-arrival brief</div>
            {e.brief}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-2">
          {e.route && <span className="inline-flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-warn" />Needs <b className="text-ink">{e.route.needLabel}</b></span>}
          {e.route && e.route.savedMin > 0 && <span className="inline-flex items-center gap-1.5"><Ambulance className="h-4 w-4 text-teal" />~{e.route.savedMin} min saved vs nearest</span>}
          {e.responders.length > 0 && (
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{e.responders.map((r) => `${r.name}${r.relation ? ` (${r.relation})` : ""}`).join(", ")} on the way</span>
          )}
          {f && <span className="inline-flex items-center gap-1.5"><Pill className="h-4 w-4" />{f.meds.length} current meds</span>}
        </div>

        {/* Actions */}
        {mine && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3" onClick={(ev) => ev.stopPropagation()}>
            <Button size="md" variant={e.teamReady ? "soft" : "primary"} disabled={e.teamReady || e.status === "admitted"} loading={busy === `${e.id}:ready`} onClick={() => onAction("ready")}
              icon={<CheckCircle2 className="h-4 w-4" />}>{e.teamReady ? "Team ready" : e.triage?.condition === "cardiac" ? "Page cath lab team" : "Mark team ready"}</Button>
            <Button size="md" variant="teal" disabled={e.status !== "arrived"} loading={busy === `${e.id}:admit`} onClick={() => onAction("admit")}>Patient received</Button>
            <Button size="md" variant="outline" disabled={e.status !== "admitted"} loading={busy === `${e.id}:resolve`} onClick={() => onAction("resolve")}>Close case</Button>
            <Button size="md" variant="ghost" className="sm:ml-auto" disabled={!f} onClick={onOpenRecord} icon={<FileText className="h-4 w-4" />}>Full record</Button>
          </div>
        )}
        {!mine && <p className="text-xs text-ink-3">Started {timeAgo(e.startedAt)}. Records open only for the receiving ER.</p>}
      </div>
    </article>
  );
}

function Flag({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "sos" | "warn" | "mute" }) {
  return (
    <div className={cx("flex min-w-0 items-start gap-2 rounded-xl border-l-4 px-3 py-2",
      tone === "sos" ? "border-sos bg-sos-50" : tone === "warn" ? "border-warn bg-warn-50" : "border-line bg-paper")}>
      <span className={cx("mt-0.5 shrink-0", tone === "sos" ? "text-sos" : tone === "warn" ? "text-warn" : "text-ink-3")}>{icon}</span>
      <div className="min-w-0">
        <div className={cx("text-[11px] font-bold uppercase tracking-wide", tone === "sos" ? "text-sos" : tone === "warn" ? "text-warn" : "text-ink-3")}>{tone !== "mute" && "⚠ "}{label}</div>
        <div className="text-sm font-semibold leading-snug text-ink">{value}</div>
      </div>
    </div>
  );
}
