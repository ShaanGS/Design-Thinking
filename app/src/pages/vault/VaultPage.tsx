// Health Vault: every paper becomes one lifetime record, with findings, a timeline, trends, Q&A and a doctor brief.
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Camera, Upload, RefreshCw, Copy, Trash2, FileText, Check, ArrowUp } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { isTamil } from "../../lib/format";
import { Button, Input, Modal, Spinner, cx, useToast } from "../../components/ui";
import QR from "../../components/QR";
import type { HealthRecord, Insight, MedDocument, Medication } from "../../../shared/types";
import { DocThumb, LEVEL_STYLE, SCAN_CSS, Sources, TRENDS, Timeline, TrendChart, docDate, docTitle, isImage, offTarget, prettyDate, seriesFor, targetText, verdict } from "./vaultShared";

type Tab = "findings" | "timeline" | "trends" | "ask" | "brief";

export default function VaultPage() {
  const toast = useToast();
  const [rec, setRec] = useState<HealthRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("findings");
  const [open, setOpen] = useState<MedDocument | null>(null);
  const [busy, setBusy] = useState<"upload" | "samples" | "analyse" | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api.get<HealthRecord>("/api/vault").then((r) => { setRec(r); setError(null); }).catch((e) => setError(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  useLive("vault", () => { void load(); });
  // While anything is still being read, poll as a safety net in case a live update is missed.
  const processing = rec?.documents.filter((d) => d.status === "processing").length ?? 0;
  useEffect(() => { if (!processing) return; const t = setInterval(() => void load(), 4000); return () => clearInterval(t); }, [processing, load]);
  // Keep the open viewer in sync with fresh data
  useEffect(() => { if (open && rec) { const fresh = rec.documents.find((d) => d.id === open.id); if (fresh && fresh !== open) setOpen(fresh); } }, [rec]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(files: FileList | File[] | null) {
    const list = [...(files || [])].slice(0, 10);
    if (!list.length) return;
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    setBusy("upload");
    try { await api.post("/api/vault/upload", fd); toast(`Reading ${list.length} paper${list.length > 1 ? "s" : ""}…`, "info"); await load(); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ""; if (camRef.current) camRef.current.value = ""; }
  }
  async function samples() {
    setBusy("samples");
    try { await api.post("/api/vault/samples"); toast("Added 6 sample papers. Saathi is reading them.", "info"); await load(); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(null); }
  }
  async function analyse() {
    setBusy("analyse");
    try { await api.post("/api/vault/analyse"); await load(); setTab("findings"); toast("Record re-analysed", "ok"); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(null); }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); };

  const years = useMemo(() => {
    if (!rec) return "";
    const ys = rec.events.map((e) => +String(e.date).slice(0, 4)).filter((y) => y > 1900);
    if (!ys.length) return "";
    const lo = Math.min(...ys), hi = Math.max(...ys);
    return lo === hi ? `from ${lo}` : `from ${lo} to ${hi}`;
  }, [rec]);

  if (error && !rec) return (
    <div className="py-10">
      <h1 className="text-[28px] font-semibold">Couldn't open the health record</h1>
      <p className="mt-1 text-ink-2">{error}</p>
      <Button className="mt-4" variant="outline" onClick={() => void load()}>Try again</Button>
    </div>
  );
  if (!rec) return <div className="grid h-64 place-items-center"><Spinner className="h-8 w-8" /></div>;

  const first = rec.patient.nickname || rec.patient.name.split(" ")[0];
  const docs = rec.documents;
  const sorted = [...docs].sort((a, b) => docDate(b).localeCompare(docDate(a)));
  const asks = rec.insights.length;

  return (
    <div className="flex flex-col gap-8" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop}>
      <style>{SCAN_CSS}</style>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*,application/pdf" multiple capture="environment" className="hidden" onChange={(e) => void upload(e.target.files)} />

      <header className="flex flex-col gap-4">
        <div className="min-w-0 max-w-[44rem]">
          <h1 className="text-[34px] font-semibold leading-tight sm:text-[40px]" style={{ fontStretch: "85%" }}>{first}'s health record</h1>
          <p className="mt-1 text-[16px] text-ink-2">
            {docs.length === 0 ? "Every prescription, report and discharge paper, read and joined into one history."
              : <>{docs.length} paper{docs.length === 1 ? "" : "s"} {years}, read into {rec.events.length} events.{" "}
                {asks > 0 ? <b className="font-semibold text-ink">{asks} question{asks === 1 ? "" : "s"} to take to the doctor.</b> : "Nothing to flag."}</>}
          </p>
          {processing > 0 && <p className="mt-1 flex items-center gap-2 text-[14px] text-ink-2"><Spinner className="h-3.5 w-3.5" />Reading {processing} paper{processing === 1 ? "" : "s"}…</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="brand" icon={<Camera className="h-4 w-4" />} loading={busy === "upload"} onClick={() => camRef.current?.click()}>Scan papers</Button>
          <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Upload</Button>
          <Button variant="ghost" loading={busy === "samples"} onClick={() => void samples()}>Add sample papers</Button>
          {docs.length > 0 && <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} loading={busy === "analyse"} onClick={() => void analyse()}>Re-analyse</Button>}
        </div>
      </header>

      {docs.length === 0 ? (
        <div className={cx("rounded-xl border-2 border-dashed bg-white px-6 py-12 sm:px-12", drag ? "border-ink-3 bg-paper" : "border-line-2")}>
          <h2 className="font-display text-[26px] font-semibold leading-tight">Empty the plastic bag into Saathi</h2>
          <p className="mt-2 max-w-[36rem] text-[16px] text-ink-2">Every family keeps years of prescriptions and reports in a bag no doctor reads in full. Photograph them once; Saathi builds the timeline, charts the trends and finds what was missed.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="brand" size="lg" icon={<Camera className="h-5 w-5" />} onClick={() => camRef.current?.click()}>Scan papers</Button>
            <Button variant="outline" size="lg" loading={busy === "samples"} onClick={() => void samples()}>Try 6 sample papers</Button>
          </div>
          <p className="mt-4 hidden text-[14px] text-ink-3 sm:block">Or drop photos and PDFs anywhere on this page.</p>
        </div>
      ) : (
        <>
          <section aria-label="Papers">
            <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {sorted.map((d) => <div key={d.id} className="w-[104px] shrink-0 sm:w-[116px]"><DocThumb doc={d} onOpen={setOpen} /></div>)}
              <button type="button" onClick={() => fileRef.current?.click()}
                className={cx("flex aspect-[3/4] w-[104px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-[13px] text-ink-2 sm:w-[116px]", drag ? "border-ink-3 bg-paper" : "border-line-2 hover:border-ink-3 hover:text-ink")}>
                <Upload className="h-5 w-5" strokeWidth={1.75} />Add papers
              </button>
            </div>
          </section>

          <div>
            <div role="tablist" className="scrollbar-none -mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
              {([
                ["findings", "Findings", asks],
                ["timeline", "Timeline", rec.events.length],
                ["trends", "Trends", null],
                ["ask", "Ask", null],
                ["brief", "Doctor brief", null],
              ] as [Tab, string, number | null][]).map(([k, label, n]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={cx("-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-[16px] transition-colors", tab === k ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink")}>
                  {label}{n != null && n > 0 && <span className="ml-1.5 text-[14px] font-normal text-ink-3 tnum">{n}</span>}
                </button>
              ))}
            </div>

            <div className="pt-6">
              {tab === "findings" && <Findings insights={rec.insights} docs={docs} papers={docs.length} onOpen={setOpen} onAnalyse={analyse} busy={busy === "analyse"} />}
              {tab === "timeline" && (rec.events.length ? <div className="max-w-[48rem]"><Timeline events={rec.events} docs={docs} onOpen={setOpen} /></div>
                : <p className="text-[15px] text-ink-2">Events appear once Saathi has read the papers.</p>)}
              {tab === "trends" && (
                <div className="flex flex-col gap-4">
                  <p className="max-w-[44rem] text-[15px] text-ink-2">The dashed line is the usual target for someone with {rec.patient.sex === "M" ? "his" : "her"} conditions. Tap a point to open the report it came from.</p>
                  <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
                    {TRENDS.map((t) => {
                      const pts = seriesFor(rec.labs, t);
                      return (
                        <div key={t.key} className="flex flex-col bg-white">
                          <TrendChart t={t} points={pts} docs={docs} onOpen={setOpen} />
                          <div className="px-4 pb-4 sm:px-5"><Sources ids={pts.map((p) => p.docId)} docs={docs} onOpen={setOpen} /></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {tab === "ask" && <Ask docs={docs} onOpen={setOpen} pos={rec.patient.sex === "M" ? "his" : "her"} />}
              {tab === "brief" && <Brief rec={rec} />}
            </div>
          </div>
        </>
      )}

      {drag && docs.length > 0 && <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center bg-ink/25"><div className="rounded-xl bg-white px-8 py-6 text-[18px] font-semibold shadow-lift">Drop to add to {first}'s record</div></div>}

      <DocViewer doc={open} onClose={() => setOpen(null)} onDeleted={() => { setOpen(null); void load(); }} />
    </div>
  );
}

/* ---------------------------------------------------------------- Findings */

function Findings({ insights, docs, papers, onOpen, onAnalyse, busy }: { insights: Insight[]; docs: MedDocument[]; papers: number; onOpen: (d: MedDocument) => void; onAnalyse: () => void; busy: boolean }) {
  if (!insights.length) return (
    <div className="max-w-[40rem]">
      <p className="text-[16px]"><b>Nothing flagged yet.</b> <span className="text-ink-2">With enough papers, Saathi compares them for trends, clashes between prescriptions and overdue follow-ups.</span></p>
      <Button className="mt-4" variant="outline" loading={busy} onClick={onAnalyse}>Analyse again</Button>
    </div>
  );
  return (
    <div className="max-w-[48rem]">
      <p className="text-[16px] text-ink-2">Saathi read all {papers} papers together and found {insights.length === 1 ? "one thing" : `${insights.length} things`} no single doctor could see. Each is a question for the doctor, never an instruction to change a medicine.</p>
      <ol className="mt-6 border-t border-line">
        {insights.map((i, n) => {
          const s = LEVEL_STYLE[i.level];
          return (
            <li key={i.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-line py-5 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
              <span className="font-display text-[26px] font-semibold leading-none tnum text-ink-3">{n + 1}.</span>
              <div className="min-w-0">
                <div className={cx("text-[13px] font-semibold", s.text)}>{s.label}</div>
                <h3 className="mt-0.5 text-[19px] font-semibold leading-snug">{i.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{i.detail}</p>
                {i.ask && <p className="mt-3 border-l-[3px] border-ink pl-3 text-[16px] leading-snug"><b>Ask the doctor:</b> {i.ask}</p>}
                <div className="mt-3"><Sources ids={i.sources} docs={docs} onOpen={onOpen} /></div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------------------------------------------------------- Ask */

type QA = { id: number; q: string; a?: string; sources?: string[]; err?: string };

function Ask({ docs, onOpen, pos }: { docs: MedDocument[]; onOpen: (d: MedDocument) => void; pos: string }) {
  const presets = [`When was ${pos} stent put in?`, `Is ${pos} sugar getting better?`, "பாட்டிக்கு என்ன அலர்ஜி?", "What should we ask the doctor?", `Has ${pos} kidney function changed?`];
  const [list, setList] = useState<QA[]>([]);
  const [text, setText] = useState("");
  const n = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (list.length) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [list]);
  async function ask(q: string) {
    q = q.trim(); if (!q) return;
    const id = ++n.current;
    setList((l) => [...l, { id, q }]); setText("");
    try { const r = await api.post<{ answer: string; sources: string[] }>("/api/vault/ask", { question: q }); setList((l) => l.map((x) => (x.id === id ? { ...x, a: r.answer, sources: r.sources } : x))); }
    catch (e) { setList((l) => l.map((x) => (x.id === id ? { ...x, err: (e as Error).message } : x))); }
  }
  return (
    <div className="flex max-w-[48rem] flex-col gap-5">
      <p className="text-[16px] text-ink-2">Ask about {pos} history in English or Tamil. Every answer names the paper it came from.</p>
      {list.length > 0 && (
        <ol className="border-t border-line">
          {list.map((x) => (
            <li key={x.id} className="border-b border-line py-4">
              <p className={cx("text-[17px] font-semibold", isTamil(x.q) && "font-tamil")}>{x.q}</p>
              <div className="mt-1.5">
                {x.err ? <p className="text-[15px] text-warn">Couldn't answer: {x.err}</p>
                  : x.a == null ? <p className="flex items-center gap-2 text-[15px] text-ink-2"><Spinner className="h-4 w-4" />Looking through the papers…</p>
                  : <>
                      <p className={cx("text-[16px] leading-relaxed", isTamil(x.a) && "font-tamil")}>{x.a}</p>
                      {!!x.sources?.length && <div className="mt-2"><Sources ids={x.sources} docs={docs} onOpen={onOpen} /></div>}
                    </>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <div ref={end} />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`When was ${pos} last echo?`} aria-label="Ask a question about the record" className={cx(isTamil(text) && "font-tamil")} />
        <Button type="submit" icon={<ArrowUp className="h-4 w-4" />} disabled={!text.trim()}>Ask</Button>
      </form>
      <div>
        <div className="mb-2 text-[14px] text-ink-3">Try asking</div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => <button key={p} onClick={() => void ask(p)} className={cx("rounded-[10px] border border-line bg-white px-3 py-1.5 text-[14px] text-ink hover:border-ink-3", isTamil(p) && "font-tamil")}>{p}</button>)}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Doctor brief */

function Brief({ rec }: { rec: HealthRecord }) {
  const toast = useToast();
  const [meds, setMeds] = useState<Medication[] | null>(null);
  const [share, setShare] = useState<{ token: string; expires: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => { api.get<Medication[]>("/api/meds").then(setMeds).catch(() => setMeds([])); }, []);
  const p = rec.patient;
  const url = share ? `${location.origin}/share/${share.token}` : "";
  const trends = TRENDS.map((t) => ({ t, pts: seriesFor(rec.labs, t) })).filter((x) => x.pts.length);
  const questions = rec.insights.filter((i) => i.ask);

  async function makeShare() {
    setSharing(true);
    try { setShare(await api.post<{ token: string; expires: string }>("/api/vault/share")); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setSharing(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); toast("Link copied", "ok"); }
    catch { toast("Select the link and copy it", "info"); }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <article className="min-w-0 rounded-md border border-line-2 bg-white px-5 py-6 sm:px-10 sm:py-9">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2 text-[13px] text-ink-2">
          <span className="font-semibold text-ink">Health summary for the next visit</span>
          <span className="tnum">Prepared {prettyDate(new Date().toISOString())}</span>
        </div>
        <h2 className="mt-5 font-display text-[30px] font-semibold leading-tight">{p.name}</h2>
        <p className="text-[15px] text-ink-2">{p.age} years · {p.sex === "F" ? "Female" : "Male"} · Blood group {p.blood}{p.doctor ? ` · ${p.doctor}` : ""}</p>

        <p className="mt-5 border-y-2 border-ink py-2.5 text-[17px]"><b>Allergy:</b> {p.allergies.length ? p.allergies.join(", ") : "none recorded"}</p>

        <BriefSection title="Problems">
          <p className="text-[16px]">{p.conditions.length ? p.conditions.join(" · ") : "None recorded"}</p>
        </BriefSection>

        <BriefSection title="Current medicines">
          {meds == null ? <Spinner /> : meds.length ? (
            <div className="-mx-1 overflow-x-auto"><table className="w-full min-w-[420px] text-[15px]">
              <thead><tr className="text-left text-[13px] text-ink-3"><th className="px-1 pb-1.5 font-medium">Medicine</th><th className="px-1 pb-1.5 font-medium">Dose</th><th className="px-1 pb-1.5 font-medium">When</th><th className="px-1 pb-1.5 font-medium">For</th></tr></thead>
              <tbody>{meds.map((m) => (
                <tr key={m.id} className="border-t border-line align-top">
                  <td className="px-1 py-2 font-semibold">{m.name}{m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() && <span className="block text-[13px] font-normal text-ink-3">{m.generic}</span>}</td>
                  <td className="px-1 py-2">{m.dose}</td>
                  <td className="px-1 py-2">{m.slots.map((s) => s[0].toUpperCase() + s.slice(1)).join(", ")}</td>
                  <td className="px-1 py-2 text-ink-2">{m.purpose || "—"}</td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <p className="text-[15px] text-ink-3">No medicines added yet.</p>}
        </BriefSection>

        {trends.length > 0 && (
          <BriefSection title="Key results">
            <div className="-mx-1 overflow-x-auto"><table className="w-full min-w-[420px] text-[15px]">
              <thead><tr className="text-left text-[13px] text-ink-3"><th className="px-1 pb-1.5 font-medium">Test</th><th className="px-1 pb-1.5 font-medium">Over time</th><th className="px-1 pb-1.5 text-right font-medium">Latest</th><th className="px-1 pb-1.5 font-medium">Aim</th></tr></thead>
              <tbody>{trends.map(({ t, pts }) => {
                const last = pts[pts.length - 1];
                const v = verdict(pts, t);
                return (
                  <tr key={t.key} className="border-t border-line align-baseline">
                    <td className="px-1 py-2 font-semibold">{t.key}</td>
                    <td className="px-1 py-2 tnum text-ink-2">{pts.map((x) => x.value).join(" → ")}{v && !v.steady && <span className={cx("ml-2 text-[13px] font-semibold", v.worse ? "text-warn" : "text-teal")}>{v.worse ? "worse" : "better"}</span>}</td>
                    <td className={cx("px-1 py-2 text-right font-semibold tnum", offTarget(t, last.value) ? "text-warn" : "text-ink")}>{last.value} <span className="text-[12px] font-normal text-ink-3">{t.unit}</span></td>
                    <td className="px-1 py-2 text-ink-3">{targetText(t)}</td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          </BriefSection>
        )}

        {questions.length > 0 && (
          <BriefSection title="Questions for the doctor">
            <ol className="flex flex-col">{questions.map((i, n) => (
              <li key={i.id}>
                <button onClick={() => setChecked((c) => ({ ...c, [i.id]: !c[i.id] }))} aria-pressed={!!checked[i.id]} className="flex w-full items-start gap-3 py-1.5 text-left">
                  <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border-[1.5px]", checked[i.id] ? "border-ink bg-ink text-white" : "border-ink-3")}>{checked[i.id] && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                  <span className={cx("text-[16px] leading-snug", checked[i.id] && "text-ink-3 line-through")}><span className="tnum">{n + 1}.</span> {i.ask}</span>
                </button>
              </li>
            ))}</ol>
          </BriefSection>
        )}
      </article>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div>
          <h3 className="text-[18px] font-semibold">Share with the doctor</h3>
          <p className="mt-1 text-[15px] text-ink-2">The doctor scans the code to open the full record. No app or login. The link stops working after 24 hours.</p>
        </div>
        {!share ? <Button variant="primary" size="lg" loading={sharing} onClick={() => void makeShare()}>Create doctor link</Button> : (
          <>
            <div className="w-max rounded-md border border-line bg-white p-3"><QR text={url} size={184} /></div>
            <div className="flex items-center gap-2 rounded-[10px] border border-line bg-white px-3 py-2">
              <span className="min-w-0 flex-1 select-all truncate font-mono text-[12px]">{url}</span>
              <button onClick={() => void copy()} aria-label="Copy link" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-paper hover:text-ink"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="text-[14px] text-ink-2">Expires {new Date(share.expires).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[15px] text-info underline-offset-2 hover:underline">Preview what the doctor sees</a>
          </>
        )}
      </aside>
    </div>
  );
}

const BriefSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-6"><h4 className="mb-2 text-[15px] font-semibold">{title}</h4>{children}</section>
);

/* ---------------------------------------------------------------- Document viewer */

function DocViewer({ doc, onClose, onDeleted }: { doc: MedDocument | null; onClose: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { setConfirm(false); }, [doc?.id]);
  if (!doc) return null;
  const x = doc.extraction;
  async function del() {
    setDeleting(true);
    try { await api.del(`/api/vault/docs/${doc!.id}`); toast("Paper removed from the record", "info"); onDeleted(); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setDeleting(false); }
  }
  const meta = x ? [x.docType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), x.date && prettyDate(x.date), x.provider].filter(Boolean).join(" · ") : "";
  return (
    <Modal open onClose={onClose} title={doc.status === "processing" ? doc.filename : docTitle(doc)} wide>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative self-start overflow-hidden rounded-md border border-line bg-white">
          {isImage(doc) ? <img src={doc.url} alt={docTitle(doc)} className="w-full" /> : (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex aspect-[3/4] flex-col items-center justify-center gap-2 text-ink-2"><FileText className="h-12 w-12" strokeWidth={1.5} /><span className="font-semibold">Open PDF</span></a>
          )}
          {doc.status === "processing" && <div className="vault-scan" />}
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          {doc.status === "processing" && <p className="flex items-center gap-2 text-[15px] text-ink-2"><Spinner className="h-4 w-4" />Saathi is reading this paper…</p>}
          {doc.status === "error" && <p className="border-l-[3px] border-warn pl-3 text-[15px]"><b>Couldn't read this paper.</b> <span className="text-ink-2">{doc.error}</span></p>}
          {x && (
            <>
              <div>
                {meta && <p className="text-[14px] text-ink-2">{meta}</p>}
                <p className="mt-1 text-[16px] leading-relaxed">{x.summary}</p>
              </div>
              {x.allergies.length > 0 && <p className="text-[16px]"><b>Allergy:</b> {x.allergies.join(", ")}</p>}
              {x.conditions.length > 0 && <p className="text-[15px]"><span className="text-ink-2">Conditions:</span> {x.conditions.join(", ")}</p>}
              {x.medications.length > 0 && (
                <div>
                  <h4 className="mb-1 text-[15px] font-semibold">Medicines on this paper</h4>
                  <ul className="border-t border-line">
                    {x.medications.map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 border-b border-line py-2 text-[15px]"><span className="min-w-0"><b>{m.name}</b>{m.generic && <span className="text-ink-3"> · {m.generic}</span>}</span><span className="shrink-0 text-[14px] text-ink-2">{m.frequency || m.dose || ""}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {x.labs.length > 0 && (
                <div>
                  <h4 className="mb-1 text-[15px] font-semibold">Lab values</h4>
                  <table className="w-full text-[15px]">
                    <tbody>{x.labs.map((l, i) => {
                      const t = TRENDS.find((tr) => tr.re.test(l.test));
                      const off = t && offTarget(t, l.value);
                      return (
                        <tr key={i} className="border-t border-line">
                          <td className="py-1.5 pr-2">{l.test}</td>
                          <td className={cx("py-1.5 pr-1 text-right font-semibold tnum", off ? "text-warn" : "text-ink")}>{l.value}</td>
                          <td className="py-1.5 pl-1 text-[13px] text-ink-3">{l.unit}{off && t && <span className="text-warn"> · aim {targetText(t)}</span>}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[13px] text-ink-3">
            <span>Added {prettyDate(doc.createdAt)}{doc.uploadedBy && !/^u_/.test(doc.uploadedBy) ? ` by ${doc.uploadedBy}` : ""}</span>
            {!confirm ? <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete</Button> : (
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-ink">Remove this paper?</span>
                <Button variant="primary" size="sm" loading={deleting} onClick={() => void del()}>Remove</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Keep</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
