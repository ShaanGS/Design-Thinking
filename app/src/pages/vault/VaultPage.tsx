// Health Vault: every paper becomes one lifetime record, with trends, cross-doctor findings, Q&A and a doctor brief.
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Camera, Upload, Sparkles, RefreshCw, FileStack, CalendarRange, ListChecks, AlertOctagon, Send, Share2, Copy, Trash2, FileText, MessageCircleQuestion, ShieldAlert, Stethoscope, Check } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { isTamil } from "../../lib/format";
import { Badge, Button, Card, EmptyState, Input, Modal, Spinner, cx, useToast } from "../../components/ui";
import QR from "../../components/QR";
import type { HealthRecord, Insight, MedDocument, Medication } from "../../../shared/types";
import { DocThumb, LEVEL_STYLE, SCAN_CSS, SourceChip, TRENDS, Timeline, TrendChart, docDate, docTitle, isImage, prettyDate, seriesFor, verdict } from "./vaultShared";

type Tab = "timeline" | "trends" | "caught" | "ask" | "brief";

export default function VaultPage() {
  const toast = useToast();
  const [rec, setRec] = useState<HealthRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("caught");
  const [open, setOpen] = useState<MedDocument | null>(null);
  const [busy, setBusy] = useState<"upload" | "samples" | "analyse" | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => api.get<HealthRecord>("/api/vault").then((r) => { setRec(r); setError(null); }).catch((e) => setError(e.message)), []);
  useEffect(() => { void load(); }, [load]);
  useLive("vault", () => { void load(); });
  // While anything is still being read, poll as a safety net in case a live update is missed.
  const processing = rec?.documents.some((d) => d.status === "processing");
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
    catch (e) { toast((e as Error).message, "sos"); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ""; if (camRef.current) camRef.current.value = ""; }
  }
  async function samples() {
    setBusy("samples");
    try { await api.post("/api/vault/samples"); toast("Added 6 sample papers. Saathi is reading them.", "info"); await load(); }
    catch (e) { toast((e as Error).message, "sos"); } finally { setBusy(null); }
  }
  async function analyse() {
    setBusy("analyse");
    try { await api.post("/api/vault/analyse"); await load(); setTab("caught"); toast("Record re-analysed", "ok"); }
    catch (e) { toast((e as Error).message, "sos"); } finally { setBusy(null); }
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); };

  const stats = useMemo(() => {
    if (!rec) return null;
    const years = rec.events.map((e) => +String(e.date).slice(0, 4)).filter((y) => y > 1900);
    return {
      papers: rec.documents.length,
      years: years.length ? (Math.min(...years) === Math.max(...years) ? `${years[0]}` : `${Math.min(...years)}–${Math.max(...years)}`) : "—",
      events: rec.events.length,
      urgent: rec.insights.filter((i) => i.level === "high").length,
    };
  }, [rec]);

  if (error && !rec) return <div className="p-6"><EmptyState title="Couldn't open the health record">{error}<div className="mt-3"><Button onClick={() => void load()}>Try again</Button></div></EmptyState></div>;
  if (!rec || !stats) return <div className="grid h-64 place-items-center"><Spinner className="h-8 w-8" /></div>;

  const first = rec.patient.name.split(" ")[0];
  const docs = rec.documents;
  const hidden = (
    <>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*,application/pdf" multiple capture="environment" className="hidden" onChange={(e) => void upload(e.target.files)} />
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6" onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop}>
      <style>{SCAN_CSS}</style>
      {hidden}

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">Health Vault</div>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight sm:text-4xl">{first}'s health record</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">Every prescription, report and discharge paper, read and joined into one history, so no doctor works from half the story.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="brand" icon={<Camera className="h-4 w-4" />} loading={busy === "upload"} onClick={() => camRef.current?.click()}>Scan papers</Button>
          <Button variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Upload files</Button>
          <Button variant="soft" icon={<Sparkles className="h-4 w-4" />} loading={busy === "samples"} onClick={() => void samples()}>Add sample papers</Button>
          {docs.length > 0 && <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} loading={busy === "analyse"} onClick={() => void analyse()}>Re-analyse</Button>}
        </div>
      </div>

      {docs.length === 0 ? (
        <div className={cx("rounded-3xl border-2 border-dashed bg-white p-8 text-center sm:p-14", drag ? "border-brand bg-brand-50" : "border-line")}>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-brand-700"><FileStack className="h-8 w-8" /></div>
          <h2 className="text-2xl font-bold">Empty the plastic bag into Saathi</h2>
          <p className="mx-auto mt-2 max-w-lg text-ink-2">Every family keeps years of prescriptions and reports in a bag no doctor ever reads in full. Photograph them once; Saathi builds the timeline, charts the trends and finds what was missed.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="brand" size="lg" icon={<Camera className="h-5 w-5" />} onClick={() => camRef.current?.click()}>Scan papers</Button>
            <Button variant="outline" size="lg" icon={<Sparkles className="h-5 w-5" />} loading={busy === "samples"} onClick={() => void samples()}>Try 6 sample papers</Button>
          </div>
          <p className="mt-4 hidden text-sm text-ink-3 sm:block">or drop photos and PDFs anywhere on this page</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={<FileStack className="h-5 w-5" />} label="Papers read" value={stats.papers} />
            <StatTile icon={<CalendarRange className="h-5 w-5" />} label="Years covered" value={stats.years} />
            <StatTile icon={<ListChecks className="h-5 w-5" />} label="Events" value={stats.events} />
            <StatTile icon={<AlertOctagon className="h-5 w-5" />} label="Urgent questions" value={stats.urgent} tone={stats.urgent ? "sos" : undefined} onClick={() => setTab("caught")} />
          </div>

          {/* Documents */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">Papers · {docs.length}</h2>
              {processing && <Badge tone="brand"><Spinner className="h-3 w-3 text-brand-700" /> Reading {docs.filter((d) => d.status === "processing").length}</Badge>}
            </div>
            <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-7">
              {[...docs].sort((a, b) => docDate(b).localeCompare(docDate(a))).map((d) => (
                <div key={d.id} className="w-[132px] shrink-0 sm:w-auto"><DocThumb doc={d} onOpen={setOpen} /></div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()}
                className={cx("flex w-[132px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center text-sm font-semibold text-ink-2 transition sm:w-auto", drag ? "border-brand bg-brand-50" : "border-line hover:border-ink-3")}>
                <Upload className="h-6 w-6" /><span>Add papers</span><span className="hidden text-xs font-normal text-ink-3 sm:block">or drop files here</span>
              </button>
            </div>
          </section>

          {/* Tabs */}
          <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div role="tablist" className="inline-flex min-w-max gap-1 rounded-2xl bg-paper-2 p-1">
              {([
                ["caught", "Caught", rec.insights.length],
                ["timeline", "Timeline", rec.events.length],
                ["trends", "Trends", null],
                ["ask", "Ask", null],
                ["brief", "Doctor brief", null],
              ] as [Tab, string, number | null][]).map(([k, label, n]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={cx("flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition", tab === k ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink")}>
                  {label}{n != null && n > 0 && <span className={cx("rounded-full px-1.5 text-[11px]", k === "caught" ? "bg-sos text-white" : "bg-ink/10")}>{n}</span>}
                </button>
              ))}
            </div>
          </div>

          {tab === "caught" && <Caught insights={rec.insights} docs={docs} onOpen={setOpen} onAnalyse={analyse} busy={busy === "analyse"} />}
          {tab === "timeline" && (
            <Card className="p-5 sm:p-6">
              {rec.events.length ? <Timeline events={rec.events} docs={docs} onOpen={setOpen} /> : <EmptyState title="No events yet">Events appear once Saathi has read the papers.</EmptyState>}
            </Card>
          )}
          {tab === "trends" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-2">Dashed line: the usual target for someone with her conditions. Tap a point to open the report it came from.</p>
              <div className="grid gap-3 md:grid-cols-2">{TRENDS.map((t) => <TrendChart key={t.key} t={t} points={seriesFor(rec.labs, t)} docs={docs} onOpen={setOpen} />)}</div>
            </div>
          )}
          {tab === "ask" && <Ask docs={docs} onOpen={setOpen} />}
          {tab === "brief" && <Brief rec={rec} />}
        </>
      )}

      {drag && docs.length > 0 && <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center bg-brand/20"><div className="rounded-3xl bg-white px-8 py-6 text-lg font-bold shadow-2xl">Drop to add to {first}'s record</div></div>}

      <DocViewer doc={open} onClose={() => setOpen(null)} onDeleted={() => { setOpen(null); void load(); }} />
    </div>
  );
}

function StatTile({ icon, label, value, tone, onClick }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "sos"; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={cx("flex min-w-0 items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-card sm:p-4", tone === "sos" ? "border-sos/30" : "border-line", onClick && "hover:border-ink-3")}>
      <div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tone === "sos" ? "bg-sos-50 text-sos" : "bg-paper-2 text-ink-2")}>{icon}</div>
      <div className="min-w-0">
        <div className={cx("font-display text-xl font-bold leading-none tnum sm:text-2xl", tone === "sos" && "text-sos")}>{value}</div>
        <div className="mt-1 text-xs font-semibold text-ink-3">{label}</div>
      </div>
    </Tag>
  );
}

/* ---------------------------------------------------------------- Caught */

function Caught({ insights, docs, onOpen, onAnalyse, busy }: { insights: Insight[]; docs: MedDocument[]; onOpen: (d: MedDocument) => void; onAnalyse: () => void; busy: boolean }) {
  if (!insights.length) return <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Nothing flagged yet" action={<Button variant="outline" loading={busy} onClick={onAnalyse}>Analyse again</Button>}>When there are enough papers, Saathi compares them to find trends, clashes between prescriptions and overdue follow-ups.</EmptyState>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-2xl bg-ink p-4 text-white">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <p className="text-sm leading-relaxed"><b>Saathi read every paper together</b> and found {insights.length} thing{insights.length > 1 ? "s" : ""} no single doctor could see, because no single doctor saw every paper. Each one is a question to take to the doctor, never an instruction to change a medicine.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {insights.map((i) => {
          const s = LEVEL_STYLE[i.level];
          return (
            <article key={i.id} className={cx("relative flex flex-col gap-2 overflow-hidden rounded-2xl border p-4 pl-5", s.box)}>
              <span className={cx("absolute inset-y-0 left-0 w-1.5", s.bar)} />
              <div className={cx("text-[11px] font-bold uppercase tracking-[0.08em]", s.title)}>{s.label}</div>
              <h3 className="text-lg font-bold leading-snug text-ink">{i.title}</h3>
              <p className="text-[15px] leading-relaxed text-ink-2">{i.detail}</p>
              {i.ask && (
                <div className="flex items-start gap-2 rounded-xl bg-white/80 p-3 text-sm">
                  <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" /><span><b>Ask the doctor:</b> {i.ask}</span>
                </div>
              )}
              {i.sources.length > 0 && <div className="flex flex-wrap gap-1">{i.sources.map((id) => <SourceChip key={id} doc={docs.find((d) => d.id === id)} onOpen={onOpen} />)}</div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Ask */

const PRESETS = ["When was her stent put in?", "Is her sugar getting better?", "பாட்டிக்கு என்ன அலர்ஜி?", "What should we ask the doctor?", "Has her kidney function changed?"];
type QA = { id: number; q: string; a?: string; sources?: string[]; err?: string };

function Ask({ docs, onOpen }: { docs: MedDocument[]; onOpen: (d: MedDocument) => void }) {
  const [list, setList] = useState<QA[]>([]);
  const [text, setText] = useState("");
  const n = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [list]);
  async function ask(q: string) {
    q = q.trim(); if (!q) return;
    const id = ++n.current;
    setList((l) => [...l, { id, q }]); setText("");
    try { const r = await api.post<{ answer: string; sources: string[] }>("/api/vault/ask", { question: q }); setList((l) => l.map((x) => (x.id === id ? { ...x, a: r.answer, sources: r.sources } : x))); }
    catch (e) { setList((l) => l.map((x) => (x.id === id ? { ...x, err: (e as Error).message } : x))); }
  }
  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><MessageCircleQuestion className="h-5 w-5" /></div>
        <div><h3 className="text-lg font-bold">Ask about her history</h3><p className="text-sm text-ink-2">In English or Tamil. Every answer points to the paper it came from.</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => <button key={p} onClick={() => void ask(p)} className={cx("rounded-full border border-line bg-paper px-3 py-1.5 text-sm font-medium hover:border-ink-3", isTamil(p) && "font-tamil")}>{p}</button>)}
      </div>
      {list.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          {list.map((x) => (
            <div key={x.id} className="flex flex-col gap-2">
              <div className={cx("max-w-[85%] self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-white", isTamil(x.q) && "font-tamil")}>{x.q}</div>
              <div className="max-w-[92%] self-start rounded-2xl rounded-bl-md border border-line bg-paper px-4 py-3">
                {x.err ? <span className="text-sos">{x.err}</span> : x.a == null ? <span className="flex items-center gap-2 text-ink-2"><Spinner className="h-4 w-4" /> Looking through the papers…</span> : (
                  <>
                    <p className={cx("leading-relaxed", isTamil(x.a) && "font-tamil")}>{x.a}</p>
                    {!!x.sources?.length && <div className="mt-2 flex flex-wrap gap-1">{x.sources.map((s) => <SourceChip key={s} doc={docs.find((d) => d.id === s)} onOpen={onOpen} />)}</div>}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. When was her last echo?" aria-label="Ask a question about her record" className={cx(isTamil(text) && "font-tamil")} />
        <Button type="submit" icon={<Send className="h-4 w-4" />} disabled={!text.trim()}>Ask</Button>
      </form>
    </Card>
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
    catch (e) { toast((e as Error).message, "sos"); } finally { setSharing(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); toast("Link copied", "ok"); }
    catch { toast("Select the link and copy it", "info"); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper-2 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-bold"><Stethoscope className="h-4 w-4" /> One-page brief for the next visit</div>
          <span className="text-xs text-ink-3">Prepared {prettyDate(new Date().toISOString())}</span>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <div>
            <h2 className="text-2xl font-bold">{p.name}</h2>
            <div className="text-sm text-ink-2">{p.age} years · {p.sex === "F" ? "Female" : "Male"} · Blood {p.blood}{p.doctor ? ` · ${p.doctor}` : ""}</div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-sos/30 bg-sos-50 px-4 py-3 text-sos">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div><div className="text-[11px] font-bold uppercase tracking-wide">Allergies</div><div className="font-bold">{p.allergies.length ? p.allergies.join(", ") : "None recorded"}</div></div>
          </div>
          <BriefSection title="Problems">
            <ul className="flex flex-wrap gap-2">{p.conditions.map((c) => <li key={c} className="rounded-full bg-paper-2 px-3 py-1 text-sm font-medium">{c}</li>)}</ul>
          </BriefSection>
          <BriefSection title="Current medicines">
            {meds == null ? <Spinner /> : meds.length ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[360px] text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ink-3"><th className="pb-1 font-bold">Medicine</th><th className="pb-1 font-bold">Dose</th><th className="pb-1 font-bold">When</th><th className="pb-1 font-bold">For</th></tr></thead>
                <tbody>{meds.map((m) => (
                  <tr key={m.id} className="border-t border-line"><td className="py-2 pr-2 font-semibold">{m.name}{m.generic && m.generic.toLowerCase() !== m.name.toLowerCase() && <span className="block text-xs font-normal text-ink-3">{m.generic}</span>}</td><td className="py-2 pr-2">{m.dose}</td><td className="py-2 pr-2 capitalize">{m.slots.join(" + ")}</td><td className="py-2 text-ink-2">{m.purpose || "—"}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="text-sm text-ink-3">No medicines added yet.</p>}
          </BriefSection>
          {trends.length > 0 && (
            <BriefSection title="Key trends">
              <ul className="grid gap-2 sm:grid-cols-2">{trends.map(({ t, pts }) => {
                const v = verdict(pts, t);
                return <li key={t.key} className="flex items-baseline justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-sm"><span className="font-semibold">{t.key}</span><span className={cx("font-mono text-xs font-bold", v?.worse ? "text-sos" : "text-teal")}>{pts.map((x) => x.value).join(" → ")}</span></li>;
              })}</ul>
            </BriefSection>
          )}
          {questions.length > 0 && (
            <BriefSection title="Questions for the doctor">
              <ul className="flex flex-col gap-1.5">{questions.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setChecked((c) => ({ ...c, [i.id]: !c[i.id] }))} className="flex w-full items-start gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-paper">
                    <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2", checked[i.id] ? "border-teal bg-teal text-white" : "border-line")}>{checked[i.id] && <Check className="h-3.5 w-3.5" />}</span>
                    <span className={cx("text-[15px]", checked[i.id] && "text-ink-3 line-through")}>{i.ask}</span>
                  </button>
                </li>
              ))}</ul>
            </BriefSection>
          )}
        </div>
      </Card>

      <Card className="flex h-max flex-col gap-4 p-5 lg:sticky lg:top-4">
        <div><h3 className="text-lg font-bold">Share with the doctor</h3><p className="text-sm text-ink-2">The doctor scans the code to open the full record. No app or login needed. The link stops working after 24 hours.</p></div>
        {!share ? <Button variant="teal" size="lg" icon={<Share2 className="h-5 w-5" />} loading={sharing} onClick={() => void makeShare()}>Create doctor link</Button> : (
          <>
            <div className="mx-auto rounded-2xl border border-line bg-white p-3"><QR text={url} size={196} /></div>
            <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2">
              <span className="min-w-0 flex-1 select-all truncate font-mono text-xs">{url}</span>
              <button onClick={() => void copy()} aria-label="Copy link" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-ink/5"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="text-xs text-ink-2">Expires {new Date(share.expires).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-center text-sm font-semibold text-teal underline-offset-2 hover:underline">Preview what the doctor sees</a>
          </>
        )}
      </Card>
    </div>
  );
}

const BriefSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section><h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">{title}</h4>{children}</section>
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
    catch (e) { toast((e as Error).message, "sos"); } finally { setDeleting(false); }
  }
  return (
    <Modal open onClose={onClose} title={doc.status === "processing" ? doc.filename : docTitle(doc)} wide>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-line bg-paper-2">
          {isImage(doc) ? <img src={doc.url} alt={docTitle(doc)} className="w-full" /> : (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex aspect-[3/4] flex-col items-center justify-center gap-2 text-ink-2"><FileText className="h-14 w-14" /><span className="font-semibold">Open PDF</span></a>
          )}
          {doc.status === "processing" && <div className="vault-scan" />}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {doc.status === "processing" && <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-700"><Spinner className="h-4 w-4 text-brand-700" /> Saathi is reading this paper…</div>}
          {doc.status === "error" && <div className="rounded-xl border border-sos/30 bg-sos-50 p-3 text-sm text-sos"><b>Couldn't read this paper.</b> {doc.error}</div>}
          {x && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge tone="dark">{x.docType.replace(/_/g, " ")}</Badge>
                {x.date && <Badge tone="mute">{prettyDate(x.date)}</Badge>}
                {x.provider && <Badge tone="info">{x.provider}</Badge>}
              </div>
              <p className="leading-relaxed">{x.summary}</p>
              {(x.conditions.length > 0 || x.allergies.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {x.allergies.map((a) => <Badge key={a} tone="sos">Allergy: {a}</Badge>)}
                  {x.conditions.map((c) => <Badge key={c} tone="mute">{c}</Badge>)}
                </div>
              )}
              {x.medications.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Medicines on this paper</h4>
                  <ul className="divide-y divide-line rounded-xl border border-line">
                    {x.medications.map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"><span><b>{m.name}</b>{m.generic && <span className="text-ink-3"> · {m.generic}</span>}</span><span className="shrink-0 font-mono text-xs text-ink-2">{m.frequency || m.dose || ""}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {x.labs.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Lab values</h4>
                  <table className="w-full text-sm">
                    <tbody>{x.labs.map((l, i) => {
                      const t = TRENDS.find((tr) => tr.re.test(l.test));
                      const off = t && (t.good === "below" ? l.value > t.target : l.value < t.target);
                      return <tr key={i} className="border-t border-line first:border-t-0"><td className="py-1.5 pr-2">{l.test}</td><td className={cx("py-1.5 pr-2 text-right font-mono font-bold", off ? "text-sos" : "text-ink")}>{l.value}</td><td className="py-1.5 text-xs text-ink-3">{l.unit}</td></tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-3">
            <span>Added {prettyDate(doc.createdAt)}{doc.uploadedBy ? ` by ${doc.uploadedBy}` : ""}</span>
            {!confirm ? <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete</Button> : (
              <div className="flex items-center gap-2 rounded-xl bg-sos-50 px-3 py-1.5 text-sm text-sos">
                <span className="font-semibold">Remove this paper?</span>
                <Button variant="sos" size="sm" loading={deleting} onClick={() => void del()}>Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Keep</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
