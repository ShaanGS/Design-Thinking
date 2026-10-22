// Health Vault: every paper becomes one lifetime record. Ask Saathi up front, then the papers, what Saathi found,
// the timeline, lab trends and a doctor brief with a share link. "?ask=1" focuses Ask, "?upload=1" opens upload.
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Upload, RefreshCw, Copy, Trash2, FileText, Check, ArrowUp, Plus, Sparkles, ExternalLink } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { isTamil } from "../../lib/format";
import { Button, Segmented, Spinner, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Pill, Section, StatCard, Tile, TopBar } from "../../components/kit";
import Capsule from "../../components/Capsule";
import { slotTime } from "../family/ctx";
import QR from "../../components/QR";
import type { HealthRecord, Insight, MedDocument, Medication } from "../../../shared/types";
import { DocThumb, LEVEL_STYLE, SCAN_CSS, Sources, TRENDS, Timeline, TrendChart, docDate, docTitle, isImage, offTarget, prettyDate, seriesFor, targetText, verdict } from "./vaultShared";

type Tab = "findings" | "timeline" | "trends" | "brief";

export default function VaultPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [rec, setRec] = useState<HealthRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("findings");
  const [open, setOpen] = useState<MedDocument | null>(null);
  const [busy, setBusy] = useState<"upload" | "samples" | "analyse" | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploadSheet, setUploadSheet] = useState(params.get("upload") === "1");
  const [askFocus, setAskFocus] = useState(params.get("ask") === "1" ? 1 : 0);
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
  // Deep links from the home screen and the "+" sheet
  useEffect(() => {
    if (params.get("upload") === "1") setUploadSheet(true);
    if (params.get("ask") === "1") setAskFocus((n) => n + 1);
  }, [params]);
  const clearParams = () => { if (params.has("upload") || params.has("ask")) setParams({}, { replace: true }); };
  const closeUpload = () => { setUploadSheet(false); clearParams(); };

  async function upload(files: FileList | File[] | null) {
    const list = [...(files || [])].slice(0, 10);
    if (!list.length) return;
    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
    setBusy("upload"); closeUpload();
    try { await api.post("/api/vault/upload", fd); toast(`Reading ${list.length} paper${list.length > 1 ? "s" : ""}…`, "info"); await load(); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ""; if (camRef.current) camRef.current.value = ""; }
  }
  async function samples() {
    setBusy("samples");
    try { await api.post("/api/vault/samples"); toast("Added 6 sample papers. Saathi is reading them.", "info"); closeUpload(); await load(); }
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
    return lo === hi ? `${lo}` : `${lo}–${hi}`;
  }, [rec]);

  const inputs = (
    <>
      <style>{SCAN_CSS}</style>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <input ref={camRef} type="file" accept="image/*,application/pdf" multiple capture="environment" className="hidden" onChange={(e) => void upload(e.target.files)} />
    </>
  );

  if (error && !rec) return (
    <div>
      <TopBar back={false} title="Records" />
      <div className="px-4 pb-32">
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-10 text-center shadow-card">
          <Art name="folder" size={80} />
          <p className="mt-2 font-bold">Couldn't open the health record</p>
          <p className="mt-1 text-[14px] text-ink-2">{error}</p>
          <Pill variant="soft" icon={RefreshCw} className="mt-4" onClick={() => void load()}>Try again</Pill>
        </div>
      </div>
    </div>
  );
  if (!rec) return <div><TopBar back={false} title="Records" /><div className="grid h-64 place-items-center"><Spinner className="h-8 w-8 text-violet" /></div></div>;

  const first = rec.patient.nickname || rec.patient.name.split(" ")[0];
  const pos = rec.patient.sex === "M" ? "his" : "her";
  const docs = rec.documents;
  const sorted = [...docs].sort((a, b) => docDate(b).localeCompare(docDate(a)));
  const asks = rec.insights.length;
  const labsOff = TRENDS.filter((t) => { const pts = seriesFor(rec.labs, t); return pts.length > 0 && offTarget(t, pts[pts.length - 1].value); }).length;

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }} onDrop={onDrop}>
      {inputs}
      <TopBar back={false} title={`${first}'s records`} sub={docs.length ? `${docs.length} paper${docs.length === 1 ? "" : "s"}${years ? ` · ${years}` : ""} · ${rec.events.length} events` : "Health vault"}
        right={<Pill variant="violet" size="sm" icon={Plus} onClick={() => setUploadSheet(true)}>Add</Pill>} />

      <div className="px-4 pb-32">
        {processing > 0 && (
          <div className="mb-3 flex items-center gap-3 rounded-3xl bg-lilac p-3 pr-4">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white"><Art name="folder" size={38} /><span className="vault-scan" /></span>
            <div className="min-w-0 flex-1 leading-tight"><div className="text-[14px] font-bold">Reading {processing} paper{processing === 1 ? "" : "s"}…</div><div className="text-[12.5px] text-lilac-ink">Dates, medicines, lab values and diagnoses</div></div>
            <Spinner className="h-4 w-4 text-violet" />
          </div>
        )}

        <AskCard docs={docs} onOpen={setOpen} pos={pos} focus={askFocus} empty={docs.length === 0} />

        {docs.length === 0 ? (
          <div className={cx("relative mt-4 overflow-hidden rounded-3xl bg-white p-5 shadow-card", drag && "ring-4 ring-violet/20")}>
            <Art name="folder" size={120} className="absolute -right-3 -top-2" float />
            <div className="max-w-[64%]">
              <h2 className="font-display text-[20px] font-extrabold leading-tight">Empty the plastic bag into Saathi</h2>
              <p className="mt-1.5 text-[13px] leading-snug text-ink-2">Years of prescriptions and reports that no doctor reads in full.</p>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-ink-2">Photograph them once. Saathi builds the timeline, charts the trends and finds what was missed.</p>
            <div className="mt-4 flex flex-col gap-2">
              <Pill variant="violet" size="lg" icon={Camera} onClick={() => camRef.current?.click()}>Scan papers</Pill>
              <Pill variant="soft" size="lg" disabled={busy === "samples"} onClick={() => void samples()}>{busy === "samples" ? "Adding…" : "Try 6 sample papers"}</Pill>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard tone={asks ? "butter" : "mint"} label="For the doctor" value={asks} unit={asks === 1 ? "question" : "questions"} note={asks ? "Found across all papers" : "Nothing to flag"} art="stethoscope" onClick={() => setTab("findings")} />
              <StatCard tone={labsOff ? "peach" : "sky"} label="Lab trends" value={labsOff || "OK"} unit={labsOff ? "off target" : undefined} note={`${rec.labs.length} results charted`} art="blood" onClick={() => setTab("trends")} />
            </div>

            <Section title="Papers" action={<button onClick={() => setUploadSheet(true)} className="text-[13px] font-bold text-violet-600">Add papers</button>}>
              <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {sorted.map((d) => <div key={d.id} className="w-[96px] shrink-0"><DocThumb doc={d} onOpen={setOpen} /></div>)}
                <button type="button" onClick={() => setUploadSheet(true)}
                  className={cx("flex aspect-[3/4] w-[96px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-[12px] font-bold text-violet-700", drag ? "border-violet bg-violet-50" : "border-violet-200 bg-white/60")}>
                  <Upload className="h-5 w-5" strokeWidth={2} />Add
                </button>
              </div>
            </Section>

            <div className="mt-5">
              <Segmented value={tab} onChange={setTab} className="flex w-full [&>button]:flex-1 [&>button]:px-1"
                options={[{ value: "findings", label: `Found${asks ? ` ${asks}` : ""}` }, { value: "timeline", label: "Timeline" }, { value: "trends", label: "Trends" }, { value: "brief", label: "Doctor" }]} />
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="pt-4">
                  {tab === "findings" && <Findings insights={rec.insights} docs={docs} papers={docs.length} onOpen={setOpen} onAnalyse={analyse} busy={busy === "analyse"} />}
                  {tab === "timeline" && (rec.events.length ? <Timeline events={rec.events} docs={docs} onOpen={setOpen} />
                    : <p className="rounded-3xl bg-white p-5 text-[14px] text-ink-2 shadow-card">Events appear once Saathi has read the papers.</p>)}
                  {tab === "trends" && (
                    <div className="flex flex-col gap-3">
                      <p className="px-1 text-[13px] leading-snug text-ink-2">The dashed line is the usual target for someone with {pos} conditions. Tap a point to open the report it came from.</p>
                      {TRENDS.map((t) => {
                        const pts = seriesFor(rec.labs, t);
                        return (
                          <div key={t.key} className="overflow-hidden rounded-3xl bg-white shadow-card">
                            <TrendChart t={t} points={pts} docs={docs} onOpen={setOpen} />
                            {pts.length > 0 && <div className="px-4 pb-4"><Sources ids={pts.map((p) => p.docId)} docs={docs} onOpen={setOpen} /></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {tab === "brief" && <Brief rec={rec} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <BottomSheet open={uploadSheet} onClose={closeUpload} title="Add papers">
        <p className="-mt-2 mb-4 text-[13.5px] text-ink-2">Prescriptions, lab reports, scans, discharge summaries. Photos or PDFs, up to 10 at a time.</p>
        <div className="grid grid-cols-2 gap-3">
          <Tile tone="sky" art="qr" title="Take photos" sub="Use the camera" onClick={() => camRef.current?.click()} />
          <Tile tone="lilac" art="folder" title="Choose files" sub="Photos or PDFs" onClick={() => fileRef.current?.click()} />
          <Tile tone="butter" art="stethoscope" title={busy === "samples" ? "Adding…" : "Sample papers"} sub="6 example papers" onClick={() => void samples()} />
          {docs.length > 0 && <Tile tone="mint" art="brain" title={busy === "analyse" ? "Reading…" : "Re-analyse"} sub="Compare all papers again" onClick={() => { closeUpload(); void analyse(); }} />}
        </div>
        {busy === "upload" && <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-2"><Spinner className="h-4 w-4" />Uploading…</p>}
      </BottomSheet>

      {drag && <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center bg-ink/25"><div className="rounded-3xl bg-white px-8 py-6 text-[17px] font-bold shadow-lift">Drop to add to {first}'s record</div></div>}

      <DocViewer doc={open} onClose={() => setOpen(null)} onDeleted={() => { setOpen(null); void load(); }} />
    </div>
  );
}

/* ---------------------------------------------------------------- Ask Saathi */

type QA = { id: number; q: string; a?: string; sources?: string[]; err?: string };

function AskCard({ docs, onOpen, pos, focus, empty }: { docs: MedDocument[]; onOpen: (d: MedDocument) => void; pos: string; focus: number; empty: boolean }) {
  const presets = [`When was ${pos} stent put in?`, `Is ${pos} sugar getting better?`, "பாட்டிக்கு என்ன அலர்ஜி?", "What should we ask the doctor?", `Has ${pos} kidney function changed?`];
  const [list, setList] = useState<QA[]>([]);
  const [text, setText] = useState("");
  const n = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (list.length) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [list]);
  useEffect(() => {
    if (!focus) return;
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 350);
    return () => clearTimeout(t);
  }, [focus]);
  async function ask(q: string) {
    q = q.trim(); if (!q) return;
    const id = ++n.current;
    setList((l) => [...l, { id, q }]); setText("");
    try { const r = await api.post<{ answer: string; sources: string[] }>("/api/vault/ask", { question: q }); setList((l) => l.map((x) => (x.id === id ? { ...x, a: r.answer, sources: r.sources } : x))); }
    catch (e) { setList((l) => l.map((x) => (x.id === id ? { ...x, err: (e as Error).message } : x))); }
  }
  return (
    <div ref={box} className="hero-violet relative scroll-mt-20 overflow-hidden rounded-[28px] p-4 text-white shadow-lift">
      <Art name="chat" size={96} className="absolute -right-2 -top-3" float />
      <div className="relative max-w-[70%]">
        <div className="flex items-center gap-1.5"><span className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"><Sparkles className="h-3 w-3" />AI</span></div>
        <div className="mt-1.5 font-display text-[21px] font-extrabold leading-tight">Ask Saathi</div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-white/80">{empty ? "Add papers first, then ask anything about them." : `About ${pos} history, in English or Tamil. Every answer names its paper.`}</div>
      </div>

      {list.length > 0 && (
        <div className="relative mt-4 flex max-h-[360px] flex-col gap-2.5 overflow-y-auto pr-0.5 scrollbar-none">
          {list.map((x) => (
            <div key={x.id} className="flex flex-col gap-2">
              <div className={cx("ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-white/95 px-3.5 py-2 text-[14px] font-semibold text-violet-800", isTamil(x.q) && "font-tamil")}>{x.q}</div>
              <div className="flex max-w-[92%] items-end gap-2">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/20"><Art name="chat" size={24} /></span>
                <div className="min-w-0 rounded-[20px] rounded-bl-md bg-white px-3.5 py-2.5 text-ink">
                  {x.err ? <p className="text-[13.5px] text-peach-ink">Couldn't answer: {x.err}</p>
                    : x.a == null ? <p className="flex items-center gap-2 text-[13.5px] text-ink-2"><Spinner className="h-4 w-4 text-violet" />Looking through the papers…</p>
                    : <>
                        <p className={cx("text-[14px] leading-relaxed", isTamil(x.a) && "font-tamil")}>{x.a}</p>
                        {!!x.sources?.length && <div className="mt-2"><Sources ids={x.sources} docs={docs} onOpen={onOpen} /></div>}
                      </>}
                </div>
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
      )}

      <form className="relative mt-4 flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 ring-violet-200 focus-within:ring-4" onSubmit={(e) => { e.preventDefault(); void ask(text); }}>
        <input ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder={`When was ${pos} last echo?`} aria-label="Ask a question about the record"
          className={cx("min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none placeholder:text-ink-3", isTamil(text) && "font-tamil")} />
        <motion.button whileTap={{ scale: 0.9 }} type="submit" aria-label="Ask" disabled={!text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-white disabled:opacity-40"><ArrowUp className="h-5 w-5" strokeWidth={2.4} /></motion.button>
      </form>
      <div className="scrollbar-none relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {presets.map((p) => <button key={p} onClick={() => void ask(p)} className={cx("glass shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold", isTamil(p) && "font-tamil")}>{p}</button>)}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Findings */

function Findings({ insights, docs, papers, onOpen, onAnalyse, busy }: { insights: Insight[]; docs: MedDocument[]; papers: number; onOpen: (d: MedDocument) => void; onAnalyse: () => void; busy: boolean }) {
  if (!insights.length) return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-8 text-center shadow-card">
      <Art name="shield" size={80} />
      <p className="mt-2 font-bold">Nothing flagged yet</p>
      <p className="mt-1 text-[13.5px] text-ink-2">With enough papers, Saathi compares them for trends, clashes between prescriptions and overdue follow-ups.</p>
      <Pill variant="soft" icon={RefreshCw} className="mt-4" disabled={busy} onClick={onAnalyse}>{busy ? "Analysing…" : "Analyse again"}</Pill>
    </div>
  );
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-[13px] leading-snug text-ink-2">Saathi read all {papers} papers together and found {insights.length === 1 ? "one thing" : `${insights.length} things`} no single doctor could see. Each is a question for the doctor, never an instruction to change a medicine.</p>
      {insights.map((i, n) => {
        const s = LEVEL_STYLE[i.level];
        return (
          <motion.div key={i.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: n * 0.05 }} className="rounded-3xl bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <span className={cx("rounded-full px-2.5 py-0.5 text-[11.5px] font-bold", s.chip)}>{s.label}</span>
              <span className="font-display text-[13px] font-extrabold text-ink-3 tnum">{n + 1} of {insights.length}</span>
            </div>
            <h3 className="mt-2 text-[16px] font-extrabold leading-snug">{i.title}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{i.detail}</p>
            {i.ask && (
              <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-butter p-3">
                <Art name="stethoscope" size={34} className="shrink-0" />
                <p className="text-[13.5px] leading-snug"><b className="text-butter-ink">Ask the doctor:</b> {i.ask}</p>
              </div>
            )}
            <div className="mt-3"><Sources ids={i.sources} docs={docs} onOpen={onOpen} /></div>
          </motion.div>
        );
      })}
      <button onClick={onAnalyse} disabled={busy} className="mx-auto mt-1 flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-violet-700 disabled:opacity-50">
        <RefreshCw className={cx("h-4 w-4", busy && "animate-spin")} />Read all papers again
      </button>
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
    <div className="flex flex-col gap-3">
      {/* Share */}
      <div className="relative overflow-hidden rounded-3xl bg-sky p-4">
        {!share && <Art name="qr" size={92} className="absolute -right-2 -top-2" />}
        <div className={cx(!share && "max-w-[66%]")}>
          <div className="text-[16px] font-extrabold">Share with the doctor</div>
          <p className="mt-1 text-[12.5px] leading-snug text-sky-ink">The doctor scans a code to open the full record. No app, no login. The link stops working after 24 hours.</p>
        </div>
        {!share ? <Pill variant="ink" className="mt-3" disabled={sharing} onClick={() => void makeShare()}>{sharing ? "Creating…" : "Create doctor link"}</Pill> : (
          <div className="mt-3 flex flex-col items-center gap-3">
            <div className="rounded-3xl bg-white p-3 shadow-card"><QR text={url} size={180} /></div>
            <div className="flex w-full items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5">
              <span className="min-w-0 flex-1 select-all truncate font-mono text-[11.5px]">{url}</span>
              <button onClick={() => void copy()} aria-label="Copy link" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700"><Copy className="h-4 w-4" /></button>
            </div>
            <div className="flex w-full items-center justify-between text-[12.5px]">
              <span className="text-sky-ink">Expires {new Date(share.expires).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-violet-700">Preview<ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <article className="rounded-3xl bg-white p-4 shadow-card">
        <div className="flex items-baseline justify-between gap-2 text-[12px] text-ink-3"><span className="font-bold text-ink-2">Summary for the next visit</span><span className="tnum">{prettyDate(new Date().toISOString())}</span></div>
        <h2 className="mt-2 font-display text-[21px] font-extrabold leading-tight">{p.name}</h2>
        <p className="text-[12.5px] text-ink-2">{p.age} years · {p.sex === "F" ? "Female" : "Male"} · Blood {p.blood}{p.doctor ? ` · ${p.doctor}` : ""}</p>
        <div className="mt-3 rounded-2xl bg-peach px-3 py-2.5 text-[14px]"><b className="text-peach-ink">Allergy:</b> {p.allergies.length ? p.allergies.join(", ") : "none recorded"}</div>

        <BriefSection title="Problems">
          <div className="flex flex-wrap gap-1.5">{p.conditions.length ? p.conditions.map((c) => <span key={c} className="rounded-full bg-lilac px-2.5 py-1 text-[12.5px] font-semibold text-lilac-ink">{c}</span>) : <span className="text-[13px] text-ink-3">None recorded</span>}</div>
        </BriefSection>

        <BriefSection title="Current medicines">
          {meds == null ? <Spinner /> : meds.length ? (
            <ul className="flex flex-col gap-1.5">{meds.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2">
                <Capsule color={m.color} size={26} />
                <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[13.5px] font-bold">{m.name} <span className="font-medium text-ink-2">{m.dose}</span></div><div className="truncate text-[11.5px] text-ink-3">{m.purpose || "—"}</div></div>
                <span className="shrink-0 text-[11.5px] font-semibold text-ink-2">{m.slots.map(slotTime).join(" · ")}</span>
              </li>
            ))}</ul>
          ) : <p className="text-[13px] text-ink-3">No medicines added yet.</p>}
        </BriefSection>

        {trends.length > 0 && (
          <BriefSection title="Key results">
            <ul className="flex flex-col gap-1.5">{trends.map(({ t, pts }) => {
              const last = pts[pts.length - 1];
              const v = verdict(pts, t);
              const off = offTarget(t, last.value);
              return (
                <li key={t.key} className="flex items-center gap-3 rounded-2xl bg-canvas px-3 py-2">
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[13.5px] font-bold">{t.key} {v && !v.steady && <span className={cx("ml-1 text-[11.5px] font-bold", v.worse ? "text-peach-ink" : "text-mint-ink")}>{v.worse ? "worse" : "better"}</span>}</div>
                    <div className="truncate text-[11.5px] text-ink-3 tnum">{pts.map((x) => x.value).join(" → ")} · aim {targetText(t)}</div>
                  </div>
                  <span className={cx("shrink-0 font-display text-[17px] font-extrabold tnum", off ? "text-peach-ink" : "text-ink")}>{last.value}<span className="ml-0.5 text-[10.5px] font-semibold text-ink-3">{t.unit}</span></span>
                </li>
              );
            })}</ul>
          </BriefSection>
        )}

        {questions.length > 0 && (
          <BriefSection title="Questions for the doctor">
            <ol className="flex flex-col gap-1.5">{questions.map((i, n) => (
              <li key={i.id}>
                <button onClick={() => setChecked((c) => ({ ...c, [i.id]: !c[i.id] }))} aria-pressed={!!checked[i.id]} className="flex w-full items-start gap-3 rounded-2xl bg-butter/60 px-3 py-2.5 text-left">
                  <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2", checked[i.id] ? "border-violet bg-violet text-white" : "border-butter-ink/40 bg-white")}>{checked[i.id] && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                  <span className={cx("text-[13.5px] leading-snug", checked[i.id] && "text-ink-3 line-through")}><span className="font-bold tnum">{n + 1}.</span> {i.ask}</span>
                </button>
              </li>
            ))}</ol>
          </BriefSection>
        )}
      </article>
    </div>
  );
}

const BriefSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-4"><h4 className="mb-2 text-[13.5px] font-extrabold">{title}</h4>{children}</section>
);

/* ---------------------------------------------------------------- Document viewer */

function DocViewer({ doc, onClose, onDeleted }: { doc: MedDocument | null; onClose: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { setConfirm(false); }, [doc?.id]);
  const x = doc?.extraction;
  async function del() {
    if (!doc) return;
    setDeleting(true);
    try { await api.del(`/api/vault/docs/${doc.id}`); toast("Paper removed from the record", "info"); onDeleted(); }
    catch (e) { toast((e as Error).message, "warn"); } finally { setDeleting(false); }
  }
  const meta = x ? [x.docType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()), x.date && prettyDate(x.date), x.provider].filter(Boolean).join(" · ") : "";
  return (
    <BottomSheet open={!!doc} onClose={onClose} title={doc ? (doc.status === "processing" ? doc.filename : docTitle(doc)) : ""} tall>
      {doc && (
        <div className="flex flex-col gap-4">
          {meta && <p className="-mt-2 text-[12.5px] text-ink-2">{meta}</p>}
          <div className="relative overflow-hidden rounded-3xl bg-canvas">
            {isImage(doc) ? <img src={doc.url} alt={docTitle(doc)} className="max-h-[320px] w-full object-cover object-top" /> : (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex h-40 flex-col items-center justify-center gap-2 text-ink-2"><FileText className="h-10 w-10" strokeWidth={1.5} /><span className="font-semibold">Open PDF</span></a>
            )}
            {doc.status === "processing" && <div className="vault-scan" />}
            {isImage(doc) && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-bold shadow-card">Full size<ExternalLink className="h-3 w-3" /></a>}
          </div>
          {doc.status === "processing" && <p className="flex items-center gap-2 text-[14px] text-ink-2"><Spinner className="h-4 w-4 text-violet" />Saathi is reading this paper…</p>}
          {doc.status === "error" && <p className="rounded-2xl bg-peach p-3 text-[13.5px]"><b className="text-peach-ink">Couldn't read this paper.</b> {doc.error}</p>}
          {x && (
            <>
              <div className="rounded-2xl bg-lilac p-3">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-lilac-ink"><Sparkles className="h-3.5 w-3.5" />What Saathi read</div>
                <p className="mt-1 text-[14px] leading-relaxed">{x.summary}</p>
              </div>
              {x.allergies.length > 0 && <p className="rounded-2xl bg-peach px-3 py-2.5 text-[14px]"><b className="text-peach-ink">Allergy:</b> {x.allergies.join(", ")}</p>}
              {x.conditions.length > 0 && <div className="flex flex-wrap gap-1.5">{x.conditions.map((c) => <span key={c} className="rounded-full bg-canvas px-2.5 py-1 text-[12.5px] font-semibold">{c}</span>)}</div>}
              {x.medications.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[13.5px] font-extrabold">Medicines on this paper</h4>
                  <ul className="flex flex-col gap-1.5">
                    {x.medications.map((m, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 rounded-2xl bg-canvas px-3 py-2 text-[13.5px]"><span className="min-w-0"><b>{m.name}</b>{m.generic && <span className="text-ink-3"> · {m.generic}</span>}</span><span className="shrink-0 text-[12px] text-ink-2">{m.frequency || m.dose || ""}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {x.labs.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-[13.5px] font-extrabold">Lab values</h4>
                  <ul className="flex flex-col gap-1.5">{x.labs.map((l, i) => {
                    const t = TRENDS.find((tr) => tr.re.test(l.test));
                    const off = t && offTarget(t, l.value);
                    return (
                      <li key={i} className={cx("flex items-baseline gap-2 rounded-2xl px-3 py-2 text-[13.5px]", off ? "bg-peach" : "bg-canvas")}>
                        <span className="min-w-0 flex-1">{l.test}{off && t && <span className="ml-1 text-[11.5px] text-peach-ink">aim {targetText(t)}</span>}</span>
                        <span className={cx("font-display font-extrabold tnum", off ? "text-peach-ink" : "text-ink")}>{l.value}</span>
                        <span className="w-12 text-[11.5px] text-ink-3">{l.unit}</span>
                      </li>
                    );
                  })}</ul>
                </div>
              )}
            </>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-[12px] text-ink-3">
            <span>Added {prettyDate(doc.createdAt)}{doc.uploadedBy && !/^u_/.test(doc.uploadedBy) ? ` by ${doc.uploadedBy}` : ""}</span>
            {!confirm ? <Button variant="ghost" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete</Button> : (
              <div className="flex items-center gap-1.5">
                <Button variant="primary" size="sm" loading={deleting} onClick={() => void del()}>Remove</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Keep</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
