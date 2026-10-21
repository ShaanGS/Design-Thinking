// Pieces shared by the Health Vault and the doctor share page.
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip } from "recharts";
import { FileText } from "lucide-react";
import { cx } from "../../components/ui";
import type { LabPoint, MedDocument, RecordEvent } from "../../../shared/types";

const INK = "#14172B", INK3 = "#858AA0", LINE = "#E1E3E9", WARN = "#B25E00";

export const SCAN_CSS = `
@keyframes vault-scan { 0% { top: -30%; } 100% { top: 100%; } }
.vault-scan { position:absolute; left:0; right:0; height:30%; background:linear-gradient(transparent, rgba(245,184,0,.45), transparent); animation: vault-scan 1.3s linear infinite; }
@media print {
  @page { margin: 14mm; }
  .no-print { display:none !important; }
  body { background:#fff !important; }
  .print-break { break-inside: avoid; }
}
`;

export const KIND_META: Record<string, { label: string }> = {
  heart: { label: "Heart" },
  lab: { label: "Lab" },
  scan: { label: "Scan" },
  rx: { label: "Prescription" },
  admission: { label: "Admission" },
  other: { label: "Other" },
};
export const kindMeta = (k: string) => KIND_META[k] || KIND_META.other;

export const docTitle = (d: MedDocument) => d.extraction?.title || d.filename.replace(/\.[a-z0-9]+$/i, "");
export const docDate = (d: MedDocument) => d.extraction?.date || d.createdAt.slice(0, 10);
export const docYear = (d: MedDocument) => docDate(d).slice(0, 4);
export const isImage = (d: MedDocument) => d.mime.startsWith("image/");

export function prettyDate(s: string, withDay = true) {
  const d = new Date(s.length === 10 ? s + "T00:00:00" : s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", withDay ? { day: "numeric", month: "short", year: "numeric" } : { month: "short", year: "numeric" });
}

/** Text link from a fact back to the paper it came from. */
export function SourceChip({ doc, onOpen }: { doc: MedDocument | undefined; onOpen?: (d: MedDocument) => void }) {
  if (!doc) return null;
  return (
    <button type="button" onClick={() => onOpen?.(doc)}
      className="inline-flex max-w-full items-baseline gap-1 text-left text-[14px] text-info underline-offset-2 hover:underline">
      <FileText className="h-3.5 w-3.5 shrink-0 translate-y-[2px]" /><span className="truncate">{docTitle(doc)}{docTitle(doc).includes(docYear(doc)) ? "" : `, ${docYear(doc)}`}</span>
    </button>
  );
}

/** Comma-separated source links, introduced by a label. */
export function Sources({ ids, docs, onOpen, label = "From" }: { ids: string[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void; label?: string }) {
  const list = [...new Set(ids)].map((id) => docs.find((d) => d.id === id)).filter(Boolean) as MedDocument[];
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px]">
      <span className="text-ink-3">{label}</span>
      {list.map((d) => <SourceChip key={d.id} doc={d} onOpen={onOpen} />)}
    </div>
  );
}

/** A paper as a small page: the photo itself, then its title and date. */
export function DocThumb({ doc, onOpen, compact }: { doc: MedDocument; onOpen: (d: MedDocument) => void; compact?: boolean }) {
  const reading = doc.status === "processing";
  return (
    <button type="button" data-doc-thumb onClick={() => onOpen(doc)} className="group flex w-full flex-col text-left">
      <div className={cx("relative w-full overflow-hidden rounded-md border border-line bg-white transition group-hover:border-ink-3", compact ? "aspect-[4/5]" : "aspect-[3/4]")}>
        {isImage(doc)
          ? <img src={doc.url} alt="" loading="lazy" className={cx("h-full w-full object-cover object-top", reading && "opacity-60")} />
          : <div className="grid h-full place-items-center text-ink-3"><div className="flex flex-col items-center gap-1"><FileText className="h-8 w-8" strokeWidth={1.5} /><span className="text-[12px] font-semibold">PDF</span></div></div>}
        {reading && <div className="vault-scan" />}
      </div>
      <div className="mt-1.5 min-w-0">
        <div className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">{reading ? doc.filename : docTitle(doc)}</div>
        <div className={cx("text-[12px] tnum", doc.status === "error" ? "font-semibold text-warn" : "text-ink-3")}>
          {reading ? "Reading…" : doc.status === "error" ? "Couldn't read" : prettyDate(docDate(doc))}
        </div>
      </div>
    </button>
  );
}

export const TRENDS = [
  { key: "HbA1c", re: /hba1c|a1c/i, unit: "%", target: 7, good: "below" as const, label: "Sugar control, 3-month average" },
  { key: "eGFR", re: /egfr/i, unit: "mL/min", target: 60, good: "above" as const, label: "Kidney function" },
  { key: "LDL", re: /ldl/i, unit: "mg/dL", target: 70, good: "below" as const, label: "Bad cholesterol" },
  { key: "Haemoglobin", re: /haemoglobin|hemoglobin|^hb$/i, unit: "g/dL", target: 12, good: "above" as const, label: "Blood count" },
];
export type TrendDef = (typeof TRENDS)[number];

export function seriesFor(labs: LabPoint[], t: TrendDef) {
  return labs.filter((l) => t.re.test(l.test)).sort((a, b) => a.date.localeCompare(b.date));
}

export const offTarget = (t: TrendDef, v: number) => (t.good === "below" ? v > t.target : v < t.target);
export const targetText = (t: TrendDef) => `${t.good === "below" ? "below" : "above"} ${t.target}`;

export function verdict(points: LabPoint[], t: TrendDef) {
  if (points.length < 2) return null;
  const a = points[0].value, b = points[points.length - 1].value;
  const since = points[0].date.slice(0, 4);
  if (a === b) return { worse: false, steady: true, text: `Steady since ${since}` };
  const worse = t.good === "below" ? b > a : b < a;
  return { worse, steady: false, text: `${worse ? "Worse" : "Better"} since ${since}: ${a} → ${b}` };
}

/** Round axis bounds and 3-5 evenly spaced ticks on whole "nice" steps. */
function niceScale(lo: number, hi: number) {
  const pad = (hi - lo) * 0.2 || Math.abs(hi) * 0.1 || 1;
  const span = hi - lo + pad * 2;
  const step = [0.5, 1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= 4) ?? 200;
  const a = Math.floor((lo - pad) / step) * step, b = Math.ceil((hi + pad) / step) * step;
  const ticks: number[] = [];
  for (let v = a; v <= b + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { domain: [a, b] as [number, number], ticks };
}

/**
 * One small multiple: thin ink line, the target as a dashed line, the latest value labelled.
 * Clicking a point opens the paper it came from.
 */
export function TrendChart({ t, points, docs, onOpen, height = 150 }: { t: TrendDef; points: LabPoint[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void; height?: number }) {
  const v = verdict(points, t);
  const last = points[points.length - 1];
  const data = points.map((p) => ({ ...p, x: p.date.slice(0, 4) }));
  const vals = points.map((p) => p.value).concat(t.target);
  const { domain, ticks } = niceScale(Math.min(...vals), Math.max(...vals));
  return (
    <div className="print-break flex min-w-0 flex-col bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-display text-[18px] font-semibold leading-tight">{t.key}</h4>
          <div className="text-[13px] text-ink-2">{t.label}</div>
        </div>
        {last && (
          <div className="shrink-0 text-right leading-none">
            <span className={cx("font-display text-[26px] font-semibold tnum", offTarget(t, last.value) ? "text-warn" : "text-ink")}>{last.value}</span>
            <span className="ml-1 text-[12px] text-ink-3">{t.unit}</span>
          </div>
        )}
      </div>
      {points.length === 0 ? <div className="grid flex-1 place-items-center py-8 text-[14px] text-ink-3">No results yet</div> : (
        <>
          <div style={{ height }} className="-ml-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 18, right: 30, bottom: 0, left: 0 }}>
                <XAxis dataKey="x" tick={{ fontSize: 11, fill: INK3 }} tickLine={false} axisLine={{ stroke: LINE }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis width={34} domain={domain} ticks={ticks} tick={{ fontSize: 11, fill: INK3 }} tickLine={false} axisLine={false} />
                <ReferenceLine y={t.target} stroke={INK3} strokeDasharray="4 4" strokeWidth={1}
                  label={{ value: `target ${t.target}`, position: "insideBottomRight", fontSize: 10, fill: INK3, offset: 4 }} />
                <Tooltip formatter={(val: number) => [`${val} ${t.unit}`, t.key]} labelFormatter={(_, p) => (p?.[0] ? prettyDate((p[0].payload as LabPoint).date) : "")}
                  contentStyle={{ borderRadius: 8, borderColor: LINE, fontSize: 12 }} />
                <Line type="linear" dataKey="value" stroke={INK} strokeWidth={1.5} isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const i = props.index ?? 0, p = points[i], isLast = i === points.length - 1;
                    const d = docs.find((x) => x.id === p?.docId);
                    const off = p && offTarget(t, p.value);
                    return (
                      <g key={i} style={{ cursor: d && onOpen ? "pointer" : "default" }} onClick={() => d && onOpen?.(d)}>
                        <circle cx={props.cx} cy={props.cy} r={10} fill="transparent" />
                        <circle cx={props.cx} cy={props.cy} r={isLast ? 4 : 2.5} fill={isLast && off ? WARN : INK} stroke="#fff" strokeWidth={isLast ? 1.5 : 0} />
                        {isLast && <text x={(props.cx ?? 0) + 8} y={(props.cy ?? 0) - 8} fontSize={12} fontWeight={600} fill={off ? WARN : INK}>{p.value}</text>}
                      </g>
                    );
                  }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
            <span className={cx("font-semibold", !v ? "text-ink-3" : v.steady ? "text-ink-2" : v.worse ? "text-warn" : "text-teal")}>{v ? v.text : "One result so far"}</span>
            <span className="text-ink-3">Aim: {targetText(t)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** Events grouped by year, newest year first. */
export function groupByYear(events: RecordEvent[]) {
  const m = new Map<string, RecordEvent[]>();
  for (const e of events) { const y = String(e.date).slice(0, 4) || "Undated"; if (!m.has(y)) m.set(y, []); m.get(y)!.push(e); }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([y, list]) => [y, [...list].sort((a, b) => b.date.localeCompare(a.date))] as const);
}

/** The record as a dated list: year, then a date column beside each event. */
export function Timeline({ events, docs, onOpen }: { events: RecordEvent[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void }) {
  return (
    <div className="flex flex-col gap-8">
      {groupByYear(events).map(([year, list]) => (
        <section key={year}>
          <h3 className="border-b border-ink pb-1 font-display text-[22px] font-semibold tnum">{year}</h3>
          <ol>
            {list.map((e, i) => {
              const d = new Date(e.date.length === 10 ? e.date + "T00:00:00" : e.date);
              const day = isNaN(d.getTime()) ? e.date : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
              return (
                <li key={`${e.date}-${i}`} className="print-break grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-3 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)]">
                  <div className="text-[14px] tnum text-ink-2">{day}</div>
                  <div className="min-w-0">
                    <div className="font-semibold leading-snug">{e.title} <span className="text-[13px] font-normal text-ink-3">· {kindMeta(e.kind).label}</span></div>
                    {e.detail && <div className="text-[15px] text-ink-2">{e.detail}</div>}
                    {onOpen && <div className="no-print mt-1"><SourceChip doc={docs.find((x) => x.id === e.docId)} onOpen={onOpen} /></div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** How much a finding matters. Red is kept for emergencies, so the most pressing is amber. */
export const LEVEL_STYLE = {
  high: { text: "text-warn", label: "Ask soon" },
  med: { text: "text-ink-2", label: "Worth asking" },
  info: { text: "text-ink-3", label: "For information" },
} as const;
