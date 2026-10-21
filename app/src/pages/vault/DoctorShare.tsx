// Public, read-only record a doctor opens from the family's QR link. No sign-in needed.
// Laid out as a clinical summary sheet that prints on A4 as it looks on screen.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer, FileText } from "lucide-react";
import { Button, Modal, Spinner, cx } from "../../components/ui";
import type { HealthRecord, MedDocument, Medication } from "../../../shared/types";
import { DocThumb, LEVEL_STYLE, SCAN_CSS, Sources, TRENDS, Timeline, TrendChart, docTitle, isImage, prettyDate, seriesFor } from "./vaultShared";

type Shared = { record: HealthRecord; meds: Medication[]; expires: string };

export default function DoctorShare() {
  const { token } = useParams();
  const [data, setData] = useState<Shared | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<MedDocument | null>(null);

  useEffect(() => {
    document.title = "Shared medical record · Saathi";
    fetch(`/api/public/share/${encodeURIComponent(token || "")}`)
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "This link isn't valid."); return j as Shared; })
      .then(setData)
      .catch((e) => setErr(e instanceof TypeError ? "Can't reach Saathi. Check the internet connection." : e.message));
  }, [token]);

  if (err) return (
    <div className="min-h-full bg-paper px-4 py-16">
      <div className="mx-auto max-w-[32rem]">
        <img src="/icons/icon.svg" alt="" width={32} height={32} style={{ borderRadius: 8 }} />
        <h1 className="mt-6 font-display text-[30px] font-semibold leading-tight">This record link isn't available.</h1>
        <p className="mt-2 text-[16px] text-ink-2">{err}</p>
        <p className="mt-4 text-[15px] text-ink-3">Family links expire after 24 hours to protect the patient's privacy. Ask the family to share a new one.</p>
      </div>
    </div>
  );
  if (!data) return <div className="grid min-h-full place-items-center bg-paper"><div className="flex items-center gap-3 text-ink-2"><Spinner className="h-5 w-5" />Opening the shared record…</div></div>;

  const { record: rec, meds } = data;
  const p = rec.patient;
  const flagged = rec.insights;
  const trends = TRENDS.map((t) => ({ t, pts: seriesFor(rec.labs, t) })).filter((x) => x.pts.length > 0);
  const expires = new Date(data.expires).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="min-h-full bg-paper pb-12 print:bg-white print:pb-0">
      <style>{SCAN_CSS}</style>
      <div className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-[56rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/icons/icon.svg" alt="" width={28} height={28} style={{ borderRadius: 7 }} />
            <div className="min-w-0 leading-tight"><div className="text-[15px] font-semibold">Shared medical record</div><div className="text-[13px] text-ink-3">Shared by the family through Saathi</div></div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-semibold text-warn">Link expires {expires}</span>
            <Button variant="outline" size="sm" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </div>

      <main className="mx-auto mt-6 max-w-[56rem] border border-line-2 bg-white px-5 py-7 sm:mt-8 sm:px-12 sm:py-10 print:m-0 print:max-w-none print:border-0 print:p-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Clinical summary</span>
          <span className="tnum">Compiled {prettyDate(new Date().toISOString())} from {rec.documents.length} family-held documents</span>
        </div>

        <header className="mt-6">
          <h1 className="font-display text-[34px] font-semibold leading-tight sm:text-[40px]" style={{ fontStretch: "85%" }}>{p.name}</h1>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px] sm:flex sm:flex-wrap">
            <Meta k="Age, sex">{p.age} · {p.sex === "F" ? "Female" : "Male"}</Meta>
            <Meta k="Blood group">{p.blood}</Meta>
            {p.abha && <Meta k="ABHA"><span className="font-mono text-[14px]">{p.abha}</span></Meta>}
            {p.doctor && <Meta k="Treating">{p.doctor}</Meta>}
          </dl>
        </header>

        <p className="mt-6 border-y-2 border-ink py-3 text-[18px]"><b>Allergy:</b> {p.allergies.length ? p.allergies.join(", ") : "no known allergies recorded"}</p>

        <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Section title="Current medicines">
            {meds.length ? (
              <div className="-mx-1 overflow-x-auto"><table className="w-full min-w-[400px] text-[14px]">
                <thead><tr className="text-left text-[12px] text-ink-3"><th className="px-1 pb-1.5 font-medium">Medicine</th><th className="px-1 pb-1.5 font-medium">Dose</th><th className="px-1 pb-1.5 font-medium">Schedule</th><th className="px-1 pb-1.5 font-medium">Indication</th></tr></thead>
                <tbody>{meds.map((m) => (
                  <tr key={m.id} className="border-t border-line align-top">
                    <td className="px-1 py-2 font-semibold">{m.name}{m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() && <span className="block text-[12px] font-normal text-ink-3">{m.generic}</span>}</td>
                    <td className="px-1 py-2">{m.dose}</td>
                    <td className="px-1 py-2">{m.slots.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ")}</td>
                    <td className="px-1 py-2 text-ink-2">{m.purpose || "—"}{m.prescribedBy && <span className="block text-[12px] text-ink-3">{m.prescribedBy}</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="text-[14px] text-ink-3">No current medicines listed.</p>}
          </Section>
          <Section title="Problem list">
            {p.conditions.length ? <ul className="flex flex-col">{p.conditions.map((c) => <li key={c} className="border-t border-line py-2 text-[15px] first:border-t-0 first:pt-0">{c}</li>)}</ul> : <p className="text-[14px] text-ink-3">None recorded.</p>}
          </Section>
        </div>

        {flagged.length > 0 && (
          <Section title="Flagged for review" note="Found by reading every document together. For the treating doctor's judgement." className="mt-10">
            <ol className="border-t border-line">
              {flagged.map((i, n) => {
                const s = LEVEL_STYLE[i.level];
                return (
                  <li key={i.id} className="print-break grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 border-b border-line py-3.5">
                    <span className="font-semibold tnum text-ink-3">{n + 1}.</span>
                    <div className="min-w-0">
                      <div className="text-[16px] font-semibold leading-snug">{i.title} <span className={cx("ml-1 text-[12px] font-semibold", s.text)}>{s.label}</span></div>
                      <p className="mt-0.5 text-[14px] leading-relaxed text-ink-2">{i.detail}</p>
                      {i.ask && <p className="mt-1.5 text-[14px]"><b>Family asks:</b> {i.ask}</p>}
                      <div className="no-print mt-1.5"><Sources ids={i.sources} docs={rec.documents} onOpen={setOpen} /></div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        )}

        {trends.length > 0 && (
          <Section title="Lab trends" note="Dashed line: usual target. Latest value labelled." className="mt-10">
            <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
              {trends.map(({ t, pts }) => <TrendChart key={t.key} t={t} points={pts} docs={rec.documents} onOpen={setOpen} height={120} />)}
            </div>
          </Section>
        )}

        <Section title="Timeline" className="mt-10">
          {rec.events.length ? <Timeline events={rec.events} docs={rec.documents} onOpen={setOpen} /> : <p className="text-[14px] text-ink-3">No events recorded.</p>}
        </Section>

        <Section title={`Source documents (${rec.documents.length})`} note="Tap to view the original." className="no-print mt-10">
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">{rec.documents.map((d) => <DocThumb key={d.id} doc={d} onOpen={setOpen} compact />)}</div>
        </Section>

        <footer className="mt-10 border-t border-line pt-3 text-[12px] text-ink-3">Compiled by Saathi from documents the family uploaded. Read-only copy; verify against the originals before clinical decisions. Link expires {expires}.</footer>
      </main>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? docTitle(open) : ""} wide>
        {open && (
          <div className="flex flex-col gap-3">
            {(open.extraction?.date || open.extraction?.provider) && <p className="text-[14px] text-ink-2">{[open.extraction?.date && prettyDate(open.extraction.date), open.extraction?.provider].filter(Boolean).join(" · ")}</p>}
            {open.extraction?.summary && <p className="text-[15px]">{open.extraction.summary}</p>}
            {isImage(open) ? <img src={open.url} alt={docTitle(open)} className="w-full rounded-md border border-line" /> : <a href={open.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-info underline-offset-2 hover:underline"><FileText className="h-5 w-5" />Open PDF</a>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Meta({ k, children }: { k: string; children: React.ReactNode }) {
  return <div><dt className="text-[12px] text-ink-3">{k}</dt><dd className="font-semibold">{children}</dd></div>;
}

function Section({ title, note, className, children }: { title: string; note?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cx("min-w-0", className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-display text-[19px] font-semibold">{title}</h2>
        {note && <p className="text-[13px] text-ink-3">{note}</p>}
      </div>
      {children}
    </section>
  );
}
