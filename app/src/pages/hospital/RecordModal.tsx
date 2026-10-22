// Break-glass view of the incoming patient's full record: the history Saathi extracted from her papers.
// Every read is logged on the server and shown to the family.
import { useRef, useState } from "react";
import { ChevronLeft, FileText, Lock, TrendingDown, TrendingUp } from "lucide-react";
import { Avatar, Segmented, cx } from "../../components/ui";
import { Art, BottomSheet } from "../../components/kit";
import { fmtDate } from "../../lib/format";
import type { PatientFile } from "./useNetwork";
import { ANTICOAG } from "./useNetwork";

type Tab = "summary" | "timeline" | "labs" | "docs";
const LEVEL: Record<string, { word: string; cls: string }> = {
  high: { word: "Urgent", cls: "bg-peach text-peach-ink" }, med: { word: "Review", cls: "bg-butter text-butter-ink" }, info: { word: "Note", cls: "bg-lilac text-lilac-ink" },
};
const EVENT_ART: Record<string, "heart" | "blood" | "brain" | "pills" | "bed" | "folder"> = { heart: "heart", lab: "blood", scan: "brain", rx: "pills", admission: "bed" };

export default function RecordModal({ file, open, onClose }: { file: PatientFile | undefined; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [viewing, setViewing] = useState<string | null>(null);
  const last = useRef(file);
  if (file) last.current = file;
  const close = () => { setViewing(null); onClose(); };
  const shown = file ?? last.current; // keep the content while the sheet slides away
  if (!shown) return null;
  const { record, meds } = shown;
  const p = record.patient;
  const latest = new Map<string, (typeof record.labs)[number]>();
  for (const l of [...record.labs].sort((a, b) => a.date.localeCompare(b.date))) latest.set(l.test, l);
  const docTitle = (id: string) => record.documents.find((d) => d.id === id)?.extraction?.title || "Document";

  return (
    <BottomSheet open={open} onClose={close} tall
      title={
        <span className="flex items-center gap-3">
          <Avatar name={p.name} size={46} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{p.name}</span>
            <span className="block text-[13px] font-semibold text-ink-2">{p.age} {p.sex} · blood {p.blood}</span>
          </span>
        </span>
      }>
      <p className="-mt-1 mb-4 flex items-center gap-2 rounded-2xl bg-butter px-3.5 py-2.5 text-[12.5px] font-semibold text-butter-ink">
        <Lock className="h-4 w-4 shrink-0" />Emergency access. This view is logged and the family is told.
      </p>
      <Segmented value={tab} onChange={(v) => { setTab(v); setViewing(null); }} className="mb-5 w-full [&>button]:flex-1 [&>button]:px-1"
        options={[{ value: "summary", label: "Summary" }, { value: "timeline", label: "History" }, { value: "labs", label: "Labs" }, { value: "docs", label: `Papers ${record.documents.length}` }]} />

      {tab === "summary" && (
        <div className="flex flex-col gap-5">
          <div className={cx("flex items-center gap-3 rounded-3xl p-3.5", p.allergies.length ? "bg-peach" : "bg-mint")}>
            <Art name="shield" size={48} />
            <div className="min-w-0 leading-tight">
              <div className={cx("text-[12.5px] font-semibold", p.allergies.length ? "text-peach-ink" : "text-mint-ink")}>Allergies</div>
              <div className="mt-0.5 text-[16px] font-extrabold">{p.allergies.length ? p.allergies.join(", ") : "None recorded"}</div>
            </div>
          </div>

          <Block title="Conditions">
            <div className="flex flex-wrap gap-2">{p.conditions.map((c) => <span key={c} className="rounded-full bg-lilac px-3 py-1.5 text-[13px] font-semibold text-lilac-ink">{c}</span>)}</div>
          </Block>

          <Block title={`Current medicines (${meds.length})`}>
            <ul className="rounded-3xl bg-canvas px-3.5">
              {meds.map((m) => {
                const thinner = ANTICOAG.test(`${m.name} ${m.generic || ""}`);
                return (
                  <li key={m.id} className="flex items-center gap-3 border-b border-line-2/70 py-2.5 last:border-b-0">
                    <span className="h-3.5 w-6 shrink-0 rounded-full border border-black/10" style={{ background: m.color }} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[14.5px]"><span className="font-bold">{m.name}</span> {m.dose}</div>
                      <div className="truncate text-[12px] text-ink-3">{[m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() ? m.generic : null, m.slots.join(" + ")].filter(Boolean).join(" · ")}</div>
                    </div>
                    {thinner && <span className="shrink-0 rounded-full bg-rose px-2 py-0.5 text-[11px] font-bold text-rose-ink">Thinner</span>}
                  </li>
                );
              })}
              {!meds.length && <li className="py-3 text-[14px] text-ink-2">No current medicines.</li>}
            </ul>
          </Block>

          {record.insights.length > 0 && (
            <Block title="Flagged by Saathi across her papers">
              <ol className="flex flex-col gap-2">
                {record.insights.slice(0, 5).map((i) => (
                  <li key={i.id} className="rounded-2xl bg-canvas px-3.5 py-2.5">
                    <span className={cx("mr-2 rounded-full px-2 py-0.5 text-[11px] font-bold", LEVEL[i.level]?.cls)}>{LEVEL[i.level]?.word}</span>
                    <span className="text-[14px] font-semibold">{i.title}</span>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          <Block title="Her doctors"><p className="text-[14px] text-ink-2">{p.doctor || "Not recorded"}</p></Block>
        </div>
      )}

      {tab === "timeline" && (
        <ol className="relative flex flex-col gap-3 before:absolute before:bottom-3 before:left-[21px] before:top-3 before:w-0.5 before:bg-line-2">
          {[...record.events].reverse().map((ev, i) => (
            <li key={i} className="relative flex gap-3">
              <span className="relative z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white shadow-card"><Art name={EVENT_ART[ev.kind] || "folder"} size={30} /></span>
              <div className="min-w-0 flex-1 rounded-2xl bg-canvas px-3.5 py-2.5">
                <div className="text-[12px] font-semibold text-ink-3 tnum">{fmtDate(ev.date)}</div>
                <div className="text-[14.5px] font-bold leading-snug">{ev.title}</div>
                <div className="text-[13px] leading-snug text-ink-2">{ev.detail}</div>
                <div className="mt-1 text-[11.5px] text-ink-3">From {docTitle(ev.docId)}</div>
              </div>
            </li>
          ))}
          {!record.events.length && <li className="py-3 text-ink-2">No history on record.</li>}
        </ol>
      )}

      {tab === "labs" && (
        <div className="grid grid-cols-2 gap-3">
          {[...latest.values()].map((l) => {
            const hist = record.labs.filter((x) => x.test === l.test).sort((a, b) => a.date.localeCompare(b.date)).map((x) => x.value);
            const prev = hist.length > 1 ? hist[hist.length - 2] : null;
            const kidney = /egfr/i.test(l.test) && l.value < 45;
            return (
              <div key={l.test} className={cx("rounded-3xl p-3.5", kidney ? "bg-peach" : "bg-canvas")}>
                <div className="truncate text-[12.5px] font-semibold text-ink-2">{l.test}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-[24px] font-extrabold leading-none tnum">{l.value}</span>
                  <span className="min-w-0 truncate text-[12px] text-ink-3">{l.unit}</span>
                  {prev != null && prev !== l.value && (l.value > prev ? <TrendingUp className="ml-auto h-4 w-4 shrink-0 text-ink-3" /> : <TrendingDown className="ml-auto h-4 w-4 shrink-0 text-ink-3" />)}
                </div>
                <div className="mt-1 text-[11.5px] text-ink-3 tnum">{fmtDate(l.date)}</div>
                {hist.length > 1 && <div className="mt-1 truncate text-[11.5px] text-ink-2 tnum">{hist.join(" → ")}</div>}
              </div>
            );
          })}
          {!latest.size && <p className="col-span-2 py-4 text-ink-2">No lab results on record.</p>}
        </div>
      )}

      {tab === "docs" && (
        viewing ? (
          <div>
            <button className="mb-3 inline-flex h-10 items-center gap-1 rounded-full bg-canvas pl-2 pr-4 text-[14px] font-semibold" onClick={() => setViewing(null)}><ChevronLeft className="h-4 w-4" />All papers</button>
            <img src={viewing} alt="Medical document" className="w-full rounded-3xl shadow-card" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {record.documents.map((d) => (
              <button key={d.id} onClick={() => d.mime.startsWith("image/") ? setViewing(d.url) : window.open(d.url, "_blank")} className="overflow-hidden rounded-3xl bg-canvas text-left">
                {d.mime.startsWith("image/") ? <img src={d.url} alt="" className="aspect-[3/4] w-full object-cover object-top" /> : <div className="grid aspect-[3/4] place-items-center"><FileText className="h-7 w-7 text-ink-3" strokeWidth={1.75} /></div>}
                <div className="p-2.5 text-[12.5px] leading-tight"><div className="truncate font-bold">{d.extraction?.title || d.filename}</div><div className="mt-0.5 text-ink-3">{d.extraction?.date || ""}</div></div>
              </button>
            ))}
            {!record.documents.length && <p className="col-span-2 py-4 text-ink-2">No papers uploaded.</p>}
          </div>
        )
      )}
    </BottomSheet>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h4 className="mb-2 text-[14px] font-bold text-ink-2">{title}</h4>{children}</section>;
}
