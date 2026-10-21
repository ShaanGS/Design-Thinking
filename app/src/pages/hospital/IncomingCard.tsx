// One row of the incoming queue: ETA, who, condition and danger flags; the selected row opens to the brief and the ER's actions.
import { Check } from "lucide-react";
import type { Emergency, Hospital } from "../../../shared/types";
import { Button, cx } from "../../components/ui";
import { fmtTime, timeAgo } from "../../lib/format";
import { redFlags, type PatientFile } from "./useNetwork";

const STATUS: Record<Emergency["status"], { label: string; cls: string }> = {
  triage: { label: "Triaging", cls: "text-warn" },
  dispatched: { label: "En route", cls: "text-sos" },
  arrived: { label: "Arrived", cls: "text-ink" },
  admitted: { label: "In ER", cls: "text-teal" },
  resolved: { label: "Closed", cls: "text-ink-3" },
  cancelled: { label: "Cancelled", cls: "text-ink-3" },
};

export function statusOf(e: Emergency) { return STATUS[e.status]; }

const month = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

export default function IncomingRow({ e, file, hospitals, ownId, selected, onSelect, onAction, busy, onOpenRecord, fresh }: {
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
  const conf = e.triage ? Math.round(e.triage.confidence * 100) : null;
  const open = selected && mine;

  return (
    <li className={cx("border-b border-line last:border-b-0", fresh && "animate-slidein")}>
      <button type="button" onClick={onSelect} aria-expanded={open}
        className={cx("grid w-full grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 px-4 py-3.5 text-left transition-colors sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:px-5",
          selected ? "bg-paper" : "hover:bg-paper/60")}>
        {/* ETA */}
        <div className="row-span-2 sm:row-span-1">
          {e.status === "arrived" || e.status === "admitted" ? (
            <div className="font-display text-[26px] font-semibold leading-none" style={{ fontStretch: "85%" }}>{e.status === "admitted" ? "In ER" : "Here"}</div>
          ) : e.etaLeftMin != null ? (
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[42px] font-semibold leading-[0.9] tnum" style={{ fontStretch: "85%" }}>{e.etaLeftMin}</span>
              <span className="text-[13px] text-ink-3">min</span>
            </div>
          ) : <div className="font-display text-[22px] font-semibold leading-none text-warn">…</div>}
          {e.status === "dispatched" && (
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-line">
              <div className="h-full bg-ink transition-all duration-700" style={{ width: `${Math.max(4, Math.round(e.progress * 100))}%` }} />
            </div>
          )}
        </div>

        {/* Who and why */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[17px] font-semibold">{p ? `${p.name}, ${p.age} ${p.sex}` : mine ? "Opening her record…" : "Patient"}</span>
            {p?.blood && <span className="font-mono text-[13px] text-ink-2">{p.blood}</span>}
          </div>
          <div className="text-[15px]">
            {e.triage ? <><span className="font-semibold">{e.triage.label}</span><span className="text-ink-3"> · {conf}% · {e.triage.source}</span></>
              : <span className="text-warn">Waiting for symptoms</span>}
          </div>
          {mine && f && (
            <p className="mt-1 text-[13.5px] leading-snug text-ink">
              <Flag k="ALLERGY" v={flags.allergies.length ? flags.allergies.join(", ") : "none recorded"} />
              {flags.thinners.length > 0 && <><Sep /><Flag k={`ON ${flags.thinners.map((t) => t.split(" ")[0].toUpperCase()).join(", ")}`} v={flags.thinners.map((t) => t.split(" ").slice(1).join(" ")).join(", ")} /></>}
              {flags.egfr && <><Sep /><Flag k="eGFR" v={`${flags.egfr.value} (${month(flags.egfr.date)})`} warn={flags.egfr.value < 45} /></>}
            </p>
          )}
          {!mine && <p className="mt-0.5 text-[13.5px] text-ink-3">To {dest?.short || "another hospital"} · details shared only with the receiving ER</p>}
        </div>

        {/* Status */}
        <div className="col-start-2 mt-1.5 flex items-center gap-3 text-[13px] sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-0.5">
          <span className={cx("inline-flex items-center gap-1.5 font-semibold", st.cls)}>
            {e.status === "dispatched" && <span className="h-2 w-2 rounded-full bg-sos animate-blink" />}{st.label}
          </span>
          <span className="text-ink-3">SOS {fmtTime(e.startedAt)} · {e.source}</span>
          {e.teamReady && e.status !== "admitted" && <span className="inline-flex items-center gap-1 font-semibold text-teal"><Check className="h-3.5 w-3.5" strokeWidth={2.5} />Team ready</span>}
        </div>
      </button>

      {open && (
        <div className="border-t border-line bg-paper px-4 pb-4 pt-3 sm:px-5 sm:pl-[7.25rem]">
          {e.symptomText && (
            <p className="text-[15px] text-ink-2">Said on the call: <span className="text-ink">“{e.symptomText}”</span>{e.triage?.english && e.triage.english !== e.symptomText ? ` (${e.triage.english})` : ""}</p>
          )}
          {e.brief && (
            <figure className="mt-3 border-l-2 border-ink pl-4">
              <blockquote className="text-[15px] leading-relaxed text-ink">{e.brief}</blockquote>
              <figcaption className="mt-1 text-[13px] text-ink-3">Pre-arrival brief, written by Saathi from her records</figcaption>
            </figure>
          )}
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-3">
            <div><dt className="text-ink-3">Needs</dt><dd className="font-semibold">{e.route?.needLabel || "Being worked out"}</dd></div>
            <div><dt className="text-ink-3">Routing</dt><dd className="font-semibold">{e.route ? (e.route.savedMin > 0 ? `~${e.route.savedMin} min saved vs nearest` : "Nearest capable hospital") : "Pending"}</dd></div>
            <div><dt className="text-ink-3">Family</dt><dd className="font-semibold">{e.responders.length ? `${e.responders.map((r) => `${r.name}${r.relation ? ` (${r.relation.toLowerCase()})` : ""}`).join(", ")} on the way` : "Notified, no one confirmed yet"}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {e.teamReady ? (
              <span className="inline-flex h-10 items-center gap-1.5 px-1 text-[15px] font-semibold text-teal"><Check className="h-4 w-4" strokeWidth={2.5} />Team ready</span>
            ) : (
              <Button variant="primary" disabled={e.status === "admitted"} loading={busy === `${e.id}:ready`} onClick={() => onAction("ready")}>
                {e.triage?.condition === "cardiac" ? "Page cath lab team" : "Mark team ready"}
              </Button>
            )}
            <Button variant="outline" disabled={e.status !== "arrived"} loading={busy === `${e.id}:admit`} onClick={() => onAction("admit")}>Patient received</Button>
            <Button variant="ghost" disabled={e.status !== "admitted"} loading={busy === `${e.id}:resolve`} onClick={() => onAction("resolve")}>Close case</Button>
            <button type="button" disabled={!f} onClick={onOpenRecord} className="ml-auto text-[15px] font-semibold text-info hover:underline disabled:text-ink-3 disabled:no-underline">Open full record</button>
          </div>
          <p className="mt-2 text-[13px] text-ink-3">Started {timeAgo(e.startedAt)}. Opening the record is logged and the family is told.</p>
        </div>
      )}
    </li>
  );
}

function Flag({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return <span className="inline-block max-w-full align-top"><b className={cx("text-[12px] font-bold tracking-[0.03em]", warn ? "text-warn" : "text-ink")}>{k}</b> <span className={cx(warn && "text-warn")}>{v}</span></span>;
}
const Sep = () => <span className="px-1.5 text-ink-3">·</span>;
