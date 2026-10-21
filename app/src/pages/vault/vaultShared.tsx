// Pieces shared by the Health Vault and the doctor share page.
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid, Tooltip, LabelList } from "recharts";
import { FileText, CheckCircle2, AlertTriangle, Heart, FlaskConical, ScanLine, Pill, BedDouble, CircleDot } from "lucide-react";
import { cx } from "../../components/ui";
import type { LabPoint, MedDocument, RecordEvent } from "../../../shared/types";

export const SCAN_CSS = `
@keyframes vault-scan { 0% { top: -30%; } 100% { top: 100%; } }
.vault-scan { position:absolute; left:0; right:0; height:30%; background:linear-gradient(transparent, rgba(217,142,4,.55), transparent); animation: vault-scan 1.3s linear infinite; }
@media print { .no-print { display:none !important; } body { background:#fff !important; } .print-break { break-inside: avoid; } }
`;

export const KIND_META: Record<string, { label: string; dot: string; icon: typeof Heart }> = {
  heart: { label: "Heart", dot: "bg-sos", icon: Heart },
  lab: { label: "Lab", dot: "bg-info", icon: FlaskConical },
  scan: { label: "Scan", dot: "bg-teal", icon: ScanLine },
  rx: { label: "Prescription", dot: "bg-brand", icon: Pill },
  admission: { label: "Admission", dot: "bg-sos", icon: BedDouble },
  other: { label: "Other", dot: "bg-ink-3", icon: CircleDot },
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

/** Small pill linking a fact back to the paper it came from. */
export function SourceChip({ doc, onOpen }: { doc: MedDocument | undefined; onOpen?: (d: MedDocument) => void }) {
  if (!doc) return null;
  return (
    <button type="button" onClick={() => onOpen?.(doc)}
      className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold text-ink-2 hover:border-brand hover:text-ink">
      <FileText className="h-3 w-3 shrink-0" /><span className="truncate">{docTitle(doc)}</span><span className="shrink-0 text-ink-3">· {docYear(doc)}</span>
    </button>
  );
}

export function DocThumb({ doc, onOpen, compact }: { doc: MedDocument; onOpen: (d: MedDocument) => void; compact?: boolean }) {
  return (
    <button type="button" onClick={() => onOpen(doc)} className="group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:border-ink-3">
      <div className={cx("relative w-full overflow-hidden bg-paper-2", compact ? "aspect-[4/5]" : "aspect-[3/4]")}>
        {isImage(doc)
          ? <img src={doc.url} alt="" loading="lazy" className={cx("h-full w-full object-cover object-top transition", doc.status === "processing" && "opacity-70 blur-[1px]")} />
          : <div className="grid h-full place-items-center text-ink-3"><div className="flex flex-col items-center gap-1"><FileText className="h-10 w-10" /><span className="text-xs font-bold">PDF</span></div></div>}
        {doc.status === "processing" && <div className="vault-scan" />}
        <div className="absolute right-2 top-2">
          {doc.status === "done" && <CheckCircle2 className="h-6 w-6 rounded-full bg-white text-teal" />}
          {doc.status === "error" && <AlertTriangle className="h-6 w-6 rounded-full bg-white p-0.5 text-sos" />}
        </div>
        {doc.status === "processing" && <div className="absolute inset-x-2 bottom-2 rounded-lg bg-ink/80 px-2 py-1 text-center text-[11px] font-semibold text-white">Reading…</div>}
      </div>
      <div className="min-w-0 px-3 py-2">
        <div className="line-clamp-2 text-[13px] font-semibold leading-snug">{doc.status === "processing" ? doc.filename : docTitle(doc)}</div>
        <div className={cx("mt-0.5 text-[11px]", doc.status === "error" ? "text-sos" : "text-ink-3")}>{doc.status === "error" ? "Couldn't read" : prettyDate(docDate(doc))}</div>
      </div>
    </button>
  );
}

export const TRENDS = [
  { key: "HbA1c", re: /hba1c|a1c/i, unit: "%", target: 7, good: "below" as const, label: "Sugar control (3-month average)" },
  { key: "eGFR", re: /egfr/i, unit: "mL/min", target: 60, good: "above" as const, label: "Kidney function" },
  { key: "LDL", re: /ldl/i, unit: "mg/dL", target: 70, good: "below" as const, label: "Bad cholesterol" },
  { key: "Haemoglobin", re: /haemoglobin|hemoglobin|^hb$/i, unit: "g/dL", target: 12, good: "above" as const, label: "Blood count" },
];
export type TrendDef = (typeof TRENDS)[number];

export function seriesFor(labs: LabPoint[], t: TrendDef) {
  return labs.filter((l) => t.re.test(l.test)).sort((a, b) => a.date.localeCompare(b.date));
}

export function verdict(points: LabPoint[], t: TrendDef) {
  if (points.length < 2) return null;
  const a = points[0].value, b = points[points.length - 1].value;
  if (a === b) return { worse: false, text: `Steady: ${a} → ${b}` };
  const worse = t.good === "below" ? b > a : b < a;
  return { worse, text: `${worse ? "Getting worse" : "Better"}: ${a} → ${b}` };
}

/** Line chart with the usual target as a dashed line. Clicking a point opens its source paper. */
export function TrendChart({ t, points, docs, onOpen, height = 170 }: { t: TrendDef; points: LabPoint[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void; height?: number }) {
  const v = verdict(points, t);
  const color = v?.worse ? "#D62839" : "#0F6E5A";
  const data = points.map((p) => ({ ...p, x: prettyDate(p.date, false) }));
  const vals = points.map((p) => p.value).concat(t.target);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.25 || 1;
  const sourceDocs = [...new Set(points.map((p) => p.docId))].map((id) => docs.find((d) => d.id === id)).filter(Boolean) as MedDocument[];
  return (
    <div className="print-break flex min-w-0 flex-col rounded-2xl border border-line bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-base font-bold">{t.key} <span className="font-sans text-xs font-medium text-ink-3">{t.unit}</span></h4>
        <span className="text-[11px] font-semibold text-ink-3">target {t.good === "below" ? "<" : ">"} {t.target}</span>
      </div>
      <div className="text-xs text-ink-2">{t.label}</div>
      {points.length === 0 ? <div className="grid flex-1 place-items-center py-8 text-sm text-ink-3">No results yet</div> : (
        <>
          <div style={{ height }} className="mt-2 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 22, right: 18, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#E9EFEC" vertical={false} />
                <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#7D8F89" }} tickLine={false} axisLine={{ stroke: "#DAE3DF" }} interval="preserveStartEnd" />
                <YAxis width={36} domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]} tick={{ fontSize: 11, fill: "#7D8F89" }} tickLine={false} axisLine={false} />
                <ReferenceLine y={t.target} stroke="#4B5D57" strokeDasharray="5 5" strokeOpacity={0.7} />
                <Tooltip formatter={(val: number) => [`${val} ${t.unit}`, t.key]} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 12, borderColor: "#DAE3DF", fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} isAnimationActive={false}
                  dot={(props: { cx?: number; cy?: number; index?: number }) => {
                    const p = points[props.index ?? 0];
                    const d = docs.find((x) => x.id === p?.docId);
                    return <circle key={props.index} cx={props.cx} cy={props.cy} r={5.5} fill={color} stroke="#fff" strokeWidth={2} style={{ cursor: d && onOpen ? "pointer" : "default" }} onClick={() => d && onOpen?.(d)} />;
                  }}>
                  <LabelList dataKey="value" position="top" offset={10} style={{ fontSize: 12, fontWeight: 700, fill: "#13221E", fontFamily: "IBM Plex Mono, monospace" }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
          {v && <div className={cx("mt-1 text-sm font-bold", v.worse ? "text-sos" : "text-teal")}>{v.text}</div>}
          {onOpen && sourceDocs.length > 0 && <div className="no-print mt-2 flex flex-wrap gap-1">{sourceDocs.map((d) => <SourceChip key={d.id} doc={d} onOpen={onOpen} />)}</div>}
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

export function Timeline({ events, docs, onOpen }: { events: RecordEvent[]; docs: MedDocument[]; onOpen?: (d: MedDocument) => void }) {
  return (
    <div className="flex flex-col gap-6">
      {groupByYear(events).map(([year, list]) => (
        <section key={year} className="print-break">
          <div className="mb-2 flex items-center gap-3"><span className="font-display text-2xl font-bold">{year}</span><div className="h-px flex-1 bg-line" /><span className="text-xs font-semibold text-ink-3">{list.length} event{list.length > 1 ? "s" : ""}</span></div>
          <ol className="relative ml-2 border-l-2 border-line">
            {list.map((e, i) => {
              const k = kindMeta(e.kind);
              return (
                <li key={`${e.date}-${i}`} className="relative pb-4 pl-6 last:pb-0">
                  <span className={cx("absolute -left-[9px] top-1 h-4 w-4 rounded-full border-[3px] border-white", k.dot)} />
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-xs text-ink-3">{prettyDate(e.date)}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{k.label}</span>
                  </div>
                  <div className="font-semibold leading-snug">{e.title}</div>
                  <div className="text-sm text-ink-2">{e.detail}</div>
                  {onOpen && <div className="mt-1"><SourceChip doc={docs.find((d) => d.id === e.docId)} onOpen={onOpen} /></div>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export const LEVEL_STYLE = {
  high: { box: "border-sos/30 bg-sos-50", bar: "bg-sos", title: "text-sos", label: "Urgent question" },
  med: { box: "border-warn/30 bg-warn-50", bar: "bg-warn", title: "text-warn", label: "Worth asking" },
  info: { box: "border-info/30 bg-info-50", bar: "bg-info", title: "text-info", label: "For your information" },
} as const;
