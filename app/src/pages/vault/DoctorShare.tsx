// Public, read-only record a doctor opens from the family's QR link. No sign-in needed.
// Same soft clay look as the app, shown inside the phone frame on a laptop.
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Printer, FileText, ExternalLink, Clock } from "lucide-react";
import { Logo, Spinner, cx } from "../../components/ui";
import { Art, BottomSheet, Person, PhoneFrame, Pill, Section, Sheet, VioletHeader, whoFor } from "../../components/kit";
import Capsule from "../../components/Capsule";
import { slotTime } from "../family/ctx";
import type { HealthRecord, MedDocument, Medication } from "../../../shared/types";
import { DocThumb, LEVEL_STYLE, SCAN_CSS, Sources, TRENDS, Timeline, TrendChart, docTitle, isImage, prettyDate, seriesFor } from "./vaultShared";

type Shared = { record: HealthRecord; meds: Medication[]; expires: string };

const side = (
  <div>
    <Person who="priya" size={88} />
    <h2 className="mt-4 text-[28px] font-extrabold leading-tight">What the doctor sees</h2>
    <p className="mt-2 text-[15px] leading-relaxed text-ink-2">The family shares a 24-hour link from the Records tab. The doctor scans it and gets every paper, read and joined into one history. No app, no login.</p>
  </div>
);

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
    <PhoneFrame label={side}>
      <div className="flex min-h-full flex-col bg-canvas">
        <VioletHeader className="pb-16"><Logo size={32} light /></VioletHeader>
        <Sheet className="flex flex-1 flex-col items-center text-center">
          <Art name="shield" size={120} float />
          <h1 className="mt-3 font-display text-[22px] font-extrabold leading-tight">This record link isn't available</h1>
          <p className="mt-2 text-[14px] text-ink-2">{err}</p>
          <p className="mt-4 rounded-3xl bg-white p-4 text-[13px] leading-snug text-ink-2 shadow-card">Family links expire after 24 hours to protect the patient's privacy. Ask the family to share a new one.</p>
        </Sheet>
      </div>
    </PhoneFrame>
  );
  if (!data) return (
    <PhoneFrame label={side}>
      <div className="grid min-h-full place-items-center bg-canvas p-8"><div className="flex items-center gap-3 text-ink-2"><Spinner className="h-5 w-5 text-violet" />Opening the shared record…</div></div>
    </PhoneFrame>
  );

  const { record: rec, meds } = data;
  const p = rec.patient;
  const who = whoFor(p.nickname) ?? whoFor(p.name);
  const flagged = rec.insights;
  const trends = TRENDS.map((t) => ({ t, pts: seriesFor(rec.labs, t) })).filter((x) => x.pts.length > 0);
  const expires = new Date(data.expires).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <PhoneFrame label={side}>
      <div className="min-h-full bg-canvas print:bg-white">
        <style>{SCAN_CSS}</style>
        <VioletHeader>
          <div className="flex items-center justify-between gap-3">
            <Logo size={30} light sub="Shared medical record" />
            <button aria-label="Print" onClick={() => window.print()} className="no-print glass grid h-10 w-10 place-items-center rounded-full"><Printer className="h-[18px] w-[18px]" /></button>
          </div>
          <div className="mt-5 flex items-center gap-4">
            {who ? <Person who={who} size={76} className="ring-[3px] ring-white/50" /> : <span className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white/20 font-display text-[30px] font-extrabold">{p.name[0]}</span>}
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[23px] font-extrabold leading-tight">{p.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-bold">
                <span className="glass rounded-full px-2.5 py-1">{p.age} · {p.sex === "F" ? "Female" : "Male"}</span>
                <span className="glass rounded-full px-2.5 py-1">Blood {p.blood}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 text-[12px]">
            {p.abha && <span className="glass rounded-full px-3 py-1">ABHA <span className="font-mono font-semibold">{p.abha}</span></span>}
            {p.doctor && <span className="glass rounded-full px-3 py-1">{p.doctor}</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-butter px-3 py-1 font-bold text-butter-ink"><Clock className="h-3 w-3" />Link expires {expires}</span>
          </div>
        </VioletHeader>

        <Sheet className="pb-12">
          <div className="relative overflow-hidden rounded-3xl bg-peach p-4">
            <Art name="shield" size={64} className="absolute -right-1 -top-1" />
            <div className="text-[12px] font-extrabold text-peach-ink">Allergy</div>
            <div className="mt-0.5 max-w-[78%] font-display text-[19px] font-extrabold leading-tight">{p.allergies.length ? p.allergies.join(", ") : "No known allergies recorded"}</div>
          </div>

          <p className="mt-3 px-1 text-[12px] text-ink-3">Compiled {prettyDate(new Date().toISOString())} from {rec.documents.length} family-held documents.</p>

          <Section title="Current medicines">
            {meds.length ? (
              <ul className="flex flex-col gap-2">{meds.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-card">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lilac"><Capsule color={m.color} size={32} /></span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[14.5px] font-bold">{m.name} <span className="font-medium text-ink-2">{m.dose}</span></div>
                    <div className="truncate text-[12px] text-ink-2">{[m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() ? m.generic : null, m.purpose].filter(Boolean).join(" · ") || "—"}</div>
                    {m.prescribedBy && <div className="truncate text-[11.5px] text-ink-3">{m.prescribedBy}</div>}
                  </div>
                  <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">{m.slots.map(slotTime).join(" · ")}</span>
                </li>
              ))}</ul>
            ) : <Empty>No current medicines listed.</Empty>}
          </Section>

          <Section title="Problem list">
            {p.conditions.length ? <div className="flex flex-wrap gap-2">{p.conditions.map((c) => <span key={c} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold shadow-card">{c}</span>)}</div> : <Empty>None recorded.</Empty>}
          </Section>

          {flagged.length > 0 && (
            <Section title="Flagged for review">
              <p className="-mt-1 mb-3 px-1 text-[12.5px] text-ink-2">Found by reading every document together. For the treating doctor's judgement.</p>
              <ol className="flex flex-col gap-2">
                {flagged.map((i, n) => {
                  const s = LEVEL_STYLE[i.level];
                  return (
                    <li key={i.id} className="print-break rounded-3xl bg-white p-4 shadow-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cx("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", s.chip)}>{s.label}</span>
                        <span className="font-display text-[13px] font-extrabold text-ink-3 tnum">{n + 1}</span>
                      </div>
                      <div className="mt-2 text-[15px] font-extrabold leading-snug">{i.title}</div>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{i.detail}</p>
                      {i.ask && <p className="mt-2 rounded-2xl bg-butter px-3 py-2 text-[13px]"><b className="text-butter-ink">Family asks:</b> {i.ask}</p>}
                      <div className="no-print mt-2.5"><Sources ids={i.sources} docs={rec.documents} onOpen={setOpen} /></div>
                    </li>
                  );
                })}
              </ol>
            </Section>
          )}

          {trends.length > 0 && (
            <Section title="Lab trends">
              <div className="flex flex-col gap-3">
                {trends.map(({ t, pts }) => <div key={t.key} className="overflow-hidden rounded-3xl bg-white shadow-card"><TrendChart t={t} points={pts} docs={rec.documents} onOpen={setOpen} height={120} /></div>)}
              </div>
            </Section>
          )}

          <Section title="Timeline">
            {rec.events.length ? <Timeline events={rec.events} docs={rec.documents} onOpen={setOpen} /> : <Empty>No events recorded.</Empty>}
          </Section>

          <Section title={`Source documents (${rec.documents.length})`} className="no-print">
            <div className="grid grid-cols-3 gap-3">{rec.documents.map((d) => <DocThumb key={d.id} doc={d} onOpen={setOpen} compact />)}</div>
          </Section>

          <div className="no-print mt-6 flex justify-center"><Pill variant="soft" icon={Printer} onClick={() => window.print()}>Print this summary</Pill></div>
          <footer className="mt-6 px-1 text-center text-[11.5px] leading-snug text-ink-3">Compiled by Saathi from documents the family uploaded. Read-only copy; verify against the originals before clinical decisions. Link expires {expires}.</footer>
        </Sheet>

        <BottomSheet open={!!open} onClose={() => setOpen(null)} title={open ? docTitle(open) : ""} tall>
          {open && (
            <div className="flex flex-col gap-3">
              {(open.extraction?.date || open.extraction?.provider) && <p className="-mt-2 text-[12.5px] text-ink-2">{[open.extraction?.date && prettyDate(open.extraction.date), open.extraction?.provider].filter(Boolean).join(" · ")}</p>}
              {open.extraction?.summary && <p className="rounded-2xl bg-lilac p-3 text-[14px] leading-relaxed">{open.extraction.summary}</p>}
              {isImage(open) ? (
                <a href={open.url} target="_blank" rel="noopener noreferrer" className="relative block overflow-hidden rounded-3xl bg-canvas">
                  <img src={open.url} alt={docTitle(open)} className="w-full" />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold shadow-card">Full size<ExternalLink className="h-3 w-3" /></span>
                </a>
              ) : <a href={open.url} target="_blank" rel="noopener noreferrer" className="flex h-32 flex-col items-center justify-center gap-2 rounded-3xl bg-canvas font-semibold text-violet-700"><FileText className="h-8 w-8" />Open PDF</a>}
            </div>
          )}
        </BottomSheet>
      </div>
    </PhoneFrame>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="rounded-3xl bg-white p-4 text-[13.5px] text-ink-3 shadow-card">{children}</p>;
