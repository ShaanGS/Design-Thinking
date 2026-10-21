// Break-glass view of the incoming patient's full record (every access is logged server-side).
import { useState } from "react";
import { FileText, Lock } from "lucide-react";
import { Badge, Modal, Segmented, cx } from "../../components/ui";
import { fmtDate } from "../../lib/format";
import type { PatientFile } from "./useNetwork";

type Tab = "summary" | "timeline" | "labs" | "docs";

export default function RecordModal({ file, open, onClose }: { file: PatientFile | undefined; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [viewing, setViewing] = useState<string | null>(null);
  if (!file) return null;
  const { record, meds } = file;
  const p = record.patient;
  // Latest value per test
  const latest = new Map<string, (typeof record.labs)[number]>();
  for (const l of record.labs) latest.set(l.test, l);
  const docTitle = (id: string) => record.documents.find((d) => d.id === id)?.extraction?.title || "Document";

  return (
    <Modal open={open} onClose={() => { setViewing(null); onClose(); }} wide title={<span className="flex items-center gap-2">{p.name}, {p.age}{p.sex} <Badge tone="sos">{p.blood}</Badge></span>}>
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-warn-50 px-3 py-2 text-xs font-semibold text-warn"><Lock className="h-3.5 w-3.5" /> Emergency access (break-glass). This view is logged and shared with the family.</div>
      <Segmented value={tab} onChange={setTab} className="mb-4" options={[{ value: "summary", label: "Summary" }, { value: "timeline", label: "Timeline" }, { value: "labs", label: "Labs" }, { value: "docs", label: `Papers (${record.documents.length})` }]} />

      {tab === "summary" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-3">Conditions</h4>
            <ul className="flex flex-col gap-1 text-sm">{p.conditions.map((c) => <li key={c} className="rounded-lg bg-paper px-2.5 py-1.5">{c}</li>)}</ul>
            <h4 className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-ink-3">Allergies</h4>
            <div className="flex flex-wrap gap-1.5">{p.allergies.length ? p.allergies.map((a) => <Badge key={a} tone="sos">⚠ {a}</Badge>) : <span className="text-sm text-ink-2">None recorded</span>}</div>
            <h4 className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-ink-3">Doctors</h4>
            <p className="text-sm text-ink-2">{p.doctor || "Not recorded"}</p>
          </section>
          <section>
            <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-3">Current medicines</h4>
            <ul className="flex flex-col gap-1">
              {meds.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm">
                  <span className="h-3 w-5 shrink-0 rounded-full border border-black/15" style={{ background: m.color }} />
                  <span className="min-w-0 flex-1"><b>{m.name}</b> {m.dose}{m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() ? <span className="text-ink-3"> ({m.generic})</span> : null}</span>
                  <span className="text-xs text-ink-2">{m.slots.join(" + ")}</span>
                </li>
              ))}
            </ul>
            {record.insights.length > 0 && <>
              <h4 className="mb-1.5 mt-4 text-xs font-bold uppercase tracking-wide text-ink-3">Flagged by Saathi</h4>
              <ul className="flex flex-col gap-1.5">{record.insights.slice(0, 5).map((i) => (
                <li key={i.id} className={cx("rounded-lg border-l-4 px-2.5 py-1.5 text-sm", i.level === "high" ? "border-sos bg-sos-50" : i.level === "med" ? "border-warn bg-warn-50" : "border-info bg-info-50")}><b>{i.title}</b></li>
              ))}</ul>
            </>}
          </section>
        </div>
      )}

      {tab === "timeline" && (
        <ol className="relative ml-2 border-l-2 border-line">
          {[...record.events].reverse().map((ev, i) => (
            <li key={i} className="mb-3 ml-4">
              <span className={cx("absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white", ev.kind === "heart" ? "bg-sos" : ev.kind === "rx" ? "bg-brand" : ev.kind === "scan" ? "bg-teal" : "bg-info")} />
              <div className="font-mono text-xs text-ink-3">{fmtDate(ev.date)}</div>
              <div className="font-semibold">{ev.title}</div>
              <div className="text-sm text-ink-2">{ev.detail} <span className="text-xs text-ink-3">· {docTitle(ev.docId)}</span></div>
            </li>
          ))}
          {!record.events.length && <li className="ml-4 text-sm text-ink-2">No history on record.</li>}
        </ol>
      )}

      {tab === "labs" && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-ink-3"><th className="py-2">Test</th><th>Latest</th><th>Date</th><th>History</th></tr></thead>
            <tbody>
              {[...latest.values()].map((l) => {
                const hist = record.labs.filter((x) => x.test === l.test).map((x) => x.value);
                return (
                  <tr key={l.test} className="border-t border-line">
                    <td className="py-2 font-semibold">{l.test}</td>
                    <td className="font-mono tnum">{l.value} <span className="text-xs text-ink-3">{l.unit}</span></td>
                    <td className="font-mono text-xs text-ink-2">{l.date}</td>
                    <td className="font-mono text-xs text-ink-2">{hist.join(" → ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!latest.size && <p className="py-4 text-sm text-ink-2">No lab results on record.</p>}
        </div>
      )}

      {tab === "docs" && (
        viewing ? (
          <div>
            <button className="mb-2 text-sm font-semibold text-info" onClick={() => setViewing(null)}>← All papers</button>
            <img src={viewing} alt="Medical document" className="w-full rounded-xl border border-line" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {record.documents.map((d) => (
              <button key={d.id} onClick={() => d.mime.startsWith("image/") ? setViewing(d.url) : window.open(d.url, "_blank")} className="overflow-hidden rounded-xl border border-line text-left hover:border-ink-3">
                {d.mime.startsWith("image/") ? <img src={d.url} alt="" className="aspect-[3/4] w-full object-cover object-top" /> : <div className="grid aspect-[3/4] place-items-center bg-paper-2"><FileText className="h-8 w-8 text-ink-3" /></div>}
                <div className="p-2 text-xs"><div className="truncate font-semibold">{d.extraction?.title || d.filename}</div><div className="text-ink-3">{d.extraction?.date || ""}</div></div>
              </button>
            ))}
          </div>
        )
      )}
    </Modal>
  );
}
