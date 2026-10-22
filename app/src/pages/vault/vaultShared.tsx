// Pieces shared by the Health Vault and the doctor share page, in the soft clay style.
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, Tooltip } from "recharts";
import { FileText } from "lucide-react";
import { cx } from "../../components/ui";
import { Art, type ArtName } from "../../components/kit";
import type { LabPoint, MedDocument, RecordEvent } from "../../../shared/types";

const VIOLET = "#6F5CF6", INK3 = "#9C99B4", LINE = "#ECEAF5", WARN = "#B54A12";

export const SCAN_CSS = `
@keyframes vault-scan { 0% { top: -30%; } 100% { top: 100%; } }
.vault-scan { position:absolute; left:0; right:0; height:30%; background:linear-gradient(transparent, rgba(111,92,246,.45), transparent); animation: vault-scan 1.3s linear infinite; }
@media print {
  @page { margin: 14mm; }
  .no-print { display:none !important; }
  body { background:#fff !important; }
  .print-break { break-inside: avoid; }
}
`;

export const KIND_META: Record<string, { label: string; art: ArtName; tone: string }> = {
  heart: { label: "Heart", art: "heart", tone: "bg-rose" },
  lab: { label: "Lab", art: "blood", tone: "bg-peach" },
  scan: { label: "Scan", art: "brain", tone: "bg-sky" },
  rx: { label: "Prescription", art: "pills", tone: "bg-lilac" },
  admission: { label: "Admission", art: "bed", tone: "bg-butter" },
  other: { label: "Other", art: "folder", tone: "bg-mint" },
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

/** A chip linking a fact back to the paper it came from. */
export function SourceChip({ doc, onOpen }: { doc: MedDocument | undefined; onOpen?: (d: MedDocument) => void }) {
  if (!doc) return null;
  return (
    <button type="button" onClick={() => onOpen?.(doc)}
      className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-left text-[12px] font-semibold text-violet-700">
      <FileText className="h-3 w-3 shrink-0" /><span className="truncate">{docTitle(doc)}{docTitle(doc).includes(docYear(doc)) ? "" : `, ${docYear(doc)}`}</span>
    </button>
  );
}

/** Source chips, introduced by a label. */
export function Sources({ ids, docs, onOpen, label = "From" }: { ids: string[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void; label?: string }) {
  const list = [...new Set(ids)].map((id) => docs.find((d) => d.id === id)).filter(Boolean) as MedDocument[];
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
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
      <div className={cx("relative w-full overflow-hidden rounded-2xl bg-white shadow-card", compact ? "aspect-[4/5]" : "aspect-[3/4]")}>
        {isImage(doc)
          ? <img src={doc.url} alt="" loading="lazy" className={cx("h-full w-full object-cover object-top", reading && "opacity-60")} />
          : <div className="grid h-full place-items-center bg-lilac"><div className="flex flex-col items-center gap-1 text-lilac-ink"><Art name="folder" size={44} /><span className="text-[11px] font-bold">PDF</span></div></div>}
        {reading && <div className="vault-scan" />}
        {doc.status === "error" && <span className="absolute inset-x-2 bottom-2 rounded-full bg-peach px-2 py-0.5 text-center text-[10.5px] font-bold text-peach-ink">Couldn't read</span>}
      </div>
      <div className="mt-1.5 min-w-0 px-0.5">
        <div className="line-clamp-2 text-[12px] font-bold leading-snug text-ink">{reading ? doc.filename : docTitle(doc)}</div>
        <div className="text-[11px] text-ink-3 tnum">{reading ? "Reading…" : doc.status === "error" ? "Tap to see why" : prettyDate(docDate(doc))}</div>
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
 * One lab trend as a card: violet line, the target as a dashed line, the latest value big.
 * Clicking a point opens the paper it came from.
 */
export function TrendChart({ t, points, docs, onOpen, height = 130 }: { t: TrendDef; points: LabPoint[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void; height?: number }) {
  const v = verdict(points, t);
  const last = points[points.length - 1];
  const off = last && offTarget(t, last.value);
  const data = points.map((p) => ({ ...p, x: p.date.slice(0, 4) }));
  const vals = points.map((p) => p.value).concat(t.target);
  const { domain, ticks } = niceScale(Math.min(...vals), Math.max(...vals));
  return (
    <div className="print-break flex min-w-0 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[16px] font-extrabold leading-tight">{t.key}</h4>
          <div className="text-[12px] text-ink-2">{t.label}</div>
        </div>
        {last && (
          <div className={cx("shrink-0 rounded-2xl px-3 py-1.5 text-right leading-none", off ? "bg-peach" : "bg-mint")}>
            <span className={cx("font-display text-[22px] font-extrabold tnum", off ? "text-peach-ink" : "text-mint-ink")}>{last.value}</span>
            <span className="ml-1 text-[11px] font-semibold text-ink-2">{t.unit}</span>
          </div>
        )}
      </div>
      {points.length === 0 ? <div className="grid flex-1 place-items-center py-6 text-[13px] text-ink-3">No results yet</div> : (
        <>
          <div style={{ height }} className="-ml-2 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 18, right: 14, bottom: 0, left: 0 }}>
                <XAxis dataKey="x" tick={{ fontSize: 11, fill: INK3 }} tickLine={false} axisLine={{ stroke: LINE }} interval="preserveStartEnd" minTickGap={16} />
                <YAxis width={34} domain={domain} ticks={ticks} tick={{ fontSize: 11, fill: INK3 }} tickLine={false} axisLine={false} />
                <ReferenceLine y={t.target} stroke={INK3} strokeDasharray="4 4" strokeWidth={1}
                  label={{ value: `target ${t.target}`, position: "insideBottomRight", fontSize: 10, fill: INK3, offset: 4 }} />
                <Tooltip formatter={(val: number) => [`${val} ${t.unit}`, t.key]} labelFormatter={(_, p) => (p?.[0] ? prettyDate((p[0].payload as LabPoint).date) : "")}
                  contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 24px -8px rgba(23,20,46,.25)", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke={VIOLET} strokeWidth={2.4} isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const i = props.index ?? 0, p = points[i], isLast = i === points.length - 1;
                    const d = docs.find((x) => x.id === p?.docId);
                    const o = p && offTarget(t, p.value);
                    return (
                      <g key={i} style={{ cursor: d && onOpen ? "pointer" : "default" }} onClick={() => d && onOpen?.(d)}>
                        <circle cx={props.cx} cy={props.cy} r={10} fill="transparent" />
                        <circle cx={props.cx} cy={props.cy} r={isLast ? 5 : 3.5} fill={isLast && o ? WARN : VIOLET} stroke="#fff" strokeWidth={2} />
                        {isLast && <text x={(props.cx ?? 0) - 7} y={(props.cy ?? 0) - 9} textAnchor="end" fontSize={12} fontWeight={700} fill={o ? WARN : VIOLET}>{p.value}</text>}
                      </g>
                    );
                  }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px]">
            <span className={cx("rounded-full px-2.5 py-0.5 font-bold", !v ? "bg-canvas text-ink-3" : v.steady ? "bg-canvas text-ink-2" : v.worse ? "bg-peach text-peach-ink" : "bg-mint text-mint-ink")}>{v ? v.text : "One result so far"}</span>
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

/** The record as a dated timeline: a year chip, then each event with its clay icon. */
export function Timeline({ events, docs, onOpen }: { events: RecordEvent[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void }) {
  return (
    <div className="flex flex-col gap-5">
      {groupByYear(events).map(([year, list]) => (
        <section key={year}>
          <h3 className="mb-2 inline-flex rounded-full bg-violet px-3 py-1 font-display text-[13px] font-extrabold text-white tnum">{year}</h3>
          <ol className="relative ml-[23px] border-l-2 border-line-2 pl-0">
            {list.map((e, i) => {
              const d = new Date(e.date.length === 10 ? e.date + "T00:00:00" : e.date);
              const day = isNaN(d.getTime()) ? e.date : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
              const k = kindMeta(e.kind);
              return (
                <li key={`${e.date}-${i}`} className="print-break relative -ml-[24px] flex gap-3 pb-3 last:pb-0">
                  <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-4 ring-canvas", k.tone)}><Art name={k.art} size={32} /></span>
                  <div className="min-w-0 flex-1 rounded-2xl bg-white p-3 shadow-card">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-[14px] font-bold leading-snug">{e.title}</div>
                      <div className="shrink-0 text-[11.5px] font-semibold text-ink-3 tnum">{day}</div>
                    </div>
                    {e.detail && <div className="mt-0.5 text-[12.5px] leading-snug text-ink-2">{e.detail}</div>}
                    {onOpen && <div className="no-print mt-2"><SourceChip doc={docs.find((x) => x.id === e.docId)} onOpen={onOpen} /></div>}
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

/** How much a finding matters. Red is kept for emergencies, so the most pressing is peach. */
export const LEVEL_STYLE = {
  high: { text: "text-peach-ink", label: "Ask soon", chip: "bg-peach text-peach-ink", tone: "bg-peach" },
  med: { text: "text-lilac-ink", label: "Worth asking", chip: "bg-lilac text-lilac-ink", tone: "bg-lilac" },
  info: { text: "text-ink-3", label: "For information", chip: "bg-canvas text-ink-2", tone: "bg-canvas" },
} as const;
