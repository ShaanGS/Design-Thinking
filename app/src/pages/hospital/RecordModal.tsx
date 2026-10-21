// Break-glass view of the incoming patient's full record (every access is logged server-side and shown to the family).
import { useState } from "react";
import { FileText, Lock } from "lucide-react";
import { Modal, Segmented, cx } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import type { PatientFile } from "./useNetwork";

type Tab = "summary" | "timeline" | "labs" | "docs";
const LEVEL: Record<string, { word: string; cls: string }> = { high: { word: "Urgent", cls: "text-warn" }, med: { word: "Review", cls: "text-ink" }, info: { word: "Note", cls: "text-ink-2" } };

export default function RecordModal({ file, open, onClose }: { file: PatientFile | undefined; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [viewing, setViewing] = useState<string | null>(null);
  if (!file) return null;
  const { record, meds } = file;
  const p = record.patient;
  const latest = new Map<string, (typeof record.labs)[number]>();
  for (const l of record.labs) latest.set(l.test, l);
  const docTitle = (id: string) => record.documents.find((d) => d.id === id)?.extraction?.title || "Document";

  return (
    <Modal open={open} onClose={() => { setViewing(null); onClose(); }} wide
      title={<span className="flex flex-wrap items-baseline gap-x-2">{p.name}<span className="font-sans text-[15px] font-normal text-ink-2">{p.age} {p.sex} · blood {p.blood}</span></span>}>
      <p className="-mt-1 mb-4 flex items-center gap-1.5 text-[13px] text-ink-2"><Lock className="h-3.5 w-3.5" strokeWidth={1.75} />Emergency access. This view is logged and the family is told.</p>
      <Segmented value={tab} onChange={setTab} className="mb-5" options={[{ value: "summary", label: "Summary" }, { value: "timeline", label: "Timeline" }, { value: "labs", label: "Labs" }, { value: "docs", label: `Papers (${record.documents.length})` }]} />

      {tab === "summary" && (
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Block title="Allergies">
              {p.allergies.length ? <p className="text-[16px] font-semibold">{p.allergies.join(", ")}</p> : <p className="text-ink-2">None recorded</p>}
            </Block>
            <Block title="Conditions">
              <ul className="divide-y divide-line border-y border-line text-[15px]">{p.conditions.map((c) => <li key={c} className="py-1.5">{c}</li>)}</ul>
            </Block>
            <Block title="Doctors"><p className="text-[15px] text-ink-2">{p.doctor || "Not recorded"}</p></Block>
          </div>
          <div className="flex flex-col gap-6">
            <Block title={`Current medicines (${meds.length})`}>
              <table className="w-full text-[15px]">
                <tbody>
                  {meds.map((m) => (
                    <tr key={m.id} className="border-t border-line first:border-t-0">
                      <td className="py-1.5 pr-2"><span className="inline-block h-2.5 w-4 rounded-full border border-black/15 align-middle" style={{ background: m.color }} /></td>
                      <td className="py-1.5"><span className="font-semibold">{m.name}</span> {m.dose}{m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() ? <span className="text-ink-3"> · {m.generic}</span> : null}</td>
                      <td className="py-1.5 text-right text-[13px] text-ink-2">{m.slots.join(" + ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
            {record.insights.length > 0 && (
              <Block title="Flagged by Saathi across her papers">
                <ol className="flex flex-col gap-2 text-[15px]">
                  {record.insights.slice(0, 5).map((i, n) => (
                    <li key={i.id} className="grid grid-cols-[1.25rem_1fr] gap-x-1">
                      <span className="font-display text-ink-3 tnum">{n + 1}</span>
                      <span><span className={cx("text-[12px] font-bold", LEVEL[i.level]?.cls)}>{LEVEL[i.level]?.word}</span> {i.title}</span>
                    </li>
                  ))}
                </ol>
              </Block>
            )}
          </div>
        </div>
      )}

      {tab === "timeline" && (
        <ol className="divide-y divide-line border-y border-line">
          {[...record.events].reverse().map((ev, i) => (
            <li key={i} className="grid grid-cols-[6.5rem_1fr] gap-x-4 py-2.5">
              <span className="font-mono text-[12px] leading-6 text-ink-3">{fmtDate(ev.date)}</span>
              <div><div className="font-semibold">{ev.title}</div><div className="text-[14px] text-ink-2">{ev.detail} <span className="text-ink-3">· {docTitle(ev.docId)}</span></div></div>
            </li>
          ))}
          {!record.events.length && <li className="py-3 text-ink-2">No history on record.</li>}
        </ol>
      )}

      {tab === "labs" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-[15px]">
            <thead><tr className="text-left text-[12px] text-ink-3"><th className="py-2 font-medium">Test</th><th className="py-2 text-right font-medium">Latest</th><th className="py-2 pl-4 font-medium">Date</th><th className="py-2 font-medium">History</th></tr></thead>
            <tbody>
              {[...latest.values()].map((l) => {
                const hist = record.labs.filter((x) => x.test === l.test).map((x) => x.value);
                return (
                  <tr key={l.test} className="border-t border-line">
                    <td className="py-2 font-semibold">{l.test}</td>
                    <td className="py-2 text-right font-display font-semibold tnum">{l.value} <span className="font-sans text-[12px] font-normal text-ink-3">{l.unit}</span></td>
                    <td className="py-2 pl-4 font-mono text-[12px] text-ink-2">{l.date}</td>
                    <td className="py-2 text-[13px] text-ink-2 tnum">{hist.join(" → ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!latest.size && <p className="py-4 text-ink-2">No lab results on record.</p>}
        </div>
      )}

      {tab === "docs" && (
        viewing ? (
          <div>
            <button className="mb-2 text-[15px] font-semibold text-info hover:underline" onClick={() => setViewing(null)}>← All papers</button>
            <img src={viewing} alt="Medical document" className="w-full rounded-[10px] border border-line" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {record.documents.map((d) => (
              <button key={d.id} onClick={() => d.mime.startsWith("image/") ? setViewing(d.url) : window.open(d.url, "_blank")} className="overflow-hidden rounded-[10px] border border-line text-left hover:border-ink-3">
                {d.mime.startsWith("image/") ? <img src={d.url} alt="" className="aspect-[3/4] w-full object-cover object-top" /> : <div className="grid aspect-[3/4] place-items-center bg-paper-2"><FileText className="h-7 w-7 text-ink-3" strokeWidth={1.75} /></div>}
                <div className="border-t border-line p-2 text-[13px]"><div className="truncate font-semibold">{d.extraction?.title || d.filename}</div><div className="text-ink-3">{d.extraction?.date || ""}</div></div>
              </button>
            ))}
          </div>
        )
      )}
    </Modal>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h4 className="mb-1.5 text-[15px] font-semibold text-ink-2">{title}</h4>{children}</section>;
}
