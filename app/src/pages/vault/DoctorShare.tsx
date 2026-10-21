// Public, read-only record a doctor opens from the family's QR link. No sign-in needed.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldAlert, Clock, Printer, FileText, Stethoscope, Link2Off } from "lucide-react";
import { Badge, Button, Modal, Spinner, cx } from "../../components/ui";
import type { HealthRecord, MedDocument, Medication } from "../../../shared/types";
import { DocThumb, LEVEL_STYLE, SCAN_CSS, TRENDS, Timeline, TrendChart, docTitle, isImage, prettyDate, seriesFor } from "./vaultShared";

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
    <div className="grid min-h-full place-items-center bg-paper p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-paper-2 text-ink-2"><Link2Off className="h-8 w-8" /></div>
        <h1 className="text-2xl font-bold">This record link isn't available</h1>
        <p className="mt-2 text-ink-2">{err}</p>
        <p className="mt-4 text-sm text-ink-3">Family links expire after 24 hours to protect the patient's privacy.</p>
      </div>
    </div>
  );
  if (!data) return <div className="grid min-h-full place-items-center bg-paper"><div className="flex flex-col items-center gap-3 text-ink-2"><Spinner className="h-8 w-8" />Opening the shared record…</div></div>;

  const { record: rec, meds } = data;
  const p = rec.patient;
  const flagged = rec.insights;
  const trends = TRENDS.map((t) => ({ t, pts: seriesFor(rec.labs, t) })).filter((x) => x.pts.length > 0);

  return (
    <div className="min-h-full bg-paper print:bg-white">
      <style>{SCAN_CSS}</style>
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/icons/icon.svg" alt="" width={28} height={28} className="rounded-lg" />
            <div className="leading-tight"><div className="text-sm font-bold">Shared medical record</div><div className="text-xs text-ink-3">Shared by the family via Saathi</div></div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="warn"><Clock className="h-3.5 w-3.5" /> Link expires {new Date(data.expires).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</Badge>
            <Button variant="outline" size="sm" className="no-print" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>Print</Button>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
            <span><b className="text-ink">{p.age}</b> yrs · {p.sex === "F" ? "Female" : "Male"}</span>
            <span>Blood <b className="text-ink">{p.blood}</b></span>
            {p.abha && <span>ABHA {p.abha}</span>}
            {p.doctor && <span>Treating: {p.doctor}</span>}
          </div>
        </header>

        <div className="flex items-start gap-3 rounded-2xl bg-sos px-5 py-4 text-white print:border print:border-sos print:bg-white print:text-sos">
          <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0" />
          <div><div className="text-xs font-bold uppercase tracking-[0.1em] opacity-90">Allergies</div><div className="text-xl font-bold">{p.allergies.length ? p.allergies.join(" · ") : "No known allergies recorded"}</div></div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Section title="Current medicines">
            {meds.length ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ink-3"><th className="pb-2 font-bold">Medicine</th><th className="pb-2 font-bold">Dose</th><th className="pb-2 font-bold">Schedule</th><th className="pb-2 font-bold">Indication</th></tr></thead>
                <tbody>{meds.map((m) => (
                  <tr key={m.id} className="border-t border-line align-top">
                    <td className="py-2 pr-2 font-semibold">{m.name}{m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() && <span className="block text-xs font-normal text-ink-3">{m.generic}</span>}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{m.dose}</td>
                    <td className="py-2 pr-2 capitalize">{m.slots.join(" + ")}</td>
                    <td className="py-2 text-ink-2">{m.purpose || "—"}{m.prescribedBy && <span className="block text-xs text-ink-3">{m.prescribedBy}</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            ) : <p className="text-sm text-ink-3">No current medicines listed.</p>}
          </Section>
          <Section title="Problem list">
            <ul className="flex flex-col gap-2">{p.conditions.map((c) => <li key={c} className="flex items-start gap-2 text-[15px]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />{c}</li>)}</ul>
          </Section>
        </div>

        {flagged.length > 0 && (
          <Section title="Flagged for review" note="Found by reading every document together. For the treating doctor's judgement.">
            <div className="grid gap-3 md:grid-cols-2">
              {flagged.map((i) => {
                const s = LEVEL_STYLE[i.level];
                return (
                  <div key={i.id} className={cx("print-break relative overflow-hidden rounded-xl border p-3 pl-4", s.box)}>
                    <span className={cx("absolute inset-y-0 left-0 w-1", s.bar)} />
                    <div className="font-bold leading-snug">{i.title}</div>
                    <p className="mt-1 text-sm text-ink-2">{i.detail}</p>
                    {i.ask && <p className="mt-1.5 flex items-start gap-1.5 text-sm"><Stethoscope className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><b>Family asks:</b> {i.ask}</span></p>}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {trends.length > 0 && (
          <Section title="Lab trends">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{trends.map(({ t, pts }) => <TrendChart key={t.key} t={t} points={pts} docs={rec.documents} height={130} />)}</div>
          </Section>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Section title="Timeline">{rec.events.length ? <Timeline events={rec.events} docs={rec.documents} onOpen={setOpen} /> : <p className="text-sm text-ink-3">No events recorded.</p>}</Section>
          <Section title={`Source documents · ${rec.documents.length}`} note="Tap to view the original.">
            <div className="grid grid-cols-3 gap-2">{rec.documents.map((d) => <DocThumb key={d.id} doc={d} onOpen={setOpen} compact />)}</div>
          </Section>
        </div>

        <footer className="pb-8 text-center text-xs text-ink-3">Compiled by Saathi from documents the family uploaded. Read-only copy; verify against the originals before clinical decisions.</footer>
      </main>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? docTitle(open) : ""} wide>
        {open && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 text-xs">{open.extraction?.date && <Badge tone="mute">{prettyDate(open.extraction.date)}</Badge>}{open.extraction?.provider && <Badge tone="info">{open.extraction.provider}</Badge>}</div>
            {open.extraction?.summary && <p className="text-sm text-ink-2">{open.extraction.summary}</p>}
            {isImage(open) ? <img src={open.url} alt={docTitle(open)} className="w-full rounded-xl border border-line" /> : <a href={open.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-teal"><FileText className="h-5 w-5" /> Open PDF</a>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="print-break min-w-0 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5 print:shadow-none">
      <div className="mb-3"><h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">{title}</h2>{note && <p className="mt-0.5 text-xs text-ink-3">{note}</p>}</div>
      {children}
    </section>
  );
}
