// Shared pieces of the elder app: language, live data context, bilingual text, and the soft-clay screen chrome
// sized for a 72-year-old (big type, 56 px+ targets). The app speaks English.
import { createContext, useContext, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cx } from "../../components/ui";
import { Art, TONE_BG, type ArtName, type Tone } from "../../components/kit";
import type { Emergency, Overview } from "../../../shared/types";

export type Lang = "ta" | "en";
const LANG_KEY = "saathi-elder-lang";
export const readLang = (_fallback?: Lang): Lang => "en";
export const saveLang = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l); } catch { /* private mode */ } };

export interface ElderCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  data: Overview | null;
  reload: () => void;
  /** Raise an SOS from anywhere in the elder app. */
  raiseSOS: (source: string, condition?: string) => Promise<Emergency | null>;
  fallOn: boolean;
  setFallOn: (on: boolean) => void;
}
export const Ctx = createContext<ElderCtx>(null as unknown as ElderCtx);
export const useElder = () => useContext(Ctx);

/** Elder-screen text. Takes a Tamil string too so a translation can come back later, but shows English only. */
export function Bi({ en, className, inline }: { ta?: ReactNode; en: ReactNode; className?: string; sub?: string; inline?: boolean }) {
  if (inline) return <span className={className}>{en}</span>;
  return <span className={cx("flex flex-col", className)}><span>{en}</span></span>;
}
/** Pick the string for the current language. */
export const useT = () => (_ta: string, en: string) => en;

/** Her name as shown on her own screens. */
export const tamilName = (n: string) => n;

/** The canvas sheet that rises over the violet header (no tab bar in the elder app, so less bottom room). */
export function ElderSheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("relative -mt-7 flex flex-1 flex-col gap-4 rounded-t-[32px] bg-canvas px-4 pt-5", className ?? "pb-10")}>{children}</div>;
}

/** Sub-screen: violet header with a big "Home" button, the title and the 3D art. */
export function SubScreen({ ta, en, art, right, children, sheetClass }: { ta: string; en: string; art?: ArtName; right?: ReactNode; children: ReactNode; sheetClass?: string }) {
  const nav = useNavigate();
  const title = en;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <header className="hero-violet relative overflow-hidden px-5 pb-12 pt-4 text-white safe-top">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between gap-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => nav("/elder")} aria-label="Back to home"
            className="glass flex h-14 items-center gap-1 rounded-full pl-2.5 pr-5 text-[18px] font-bold">
            <ChevronLeft className="h-7 w-7" strokeWidth={2.4} />
            <span>Home</span>
          </motion.button>
          {right}
        </div>
        <div className="relative mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[32px] font-extrabold leading-[1.1]">{title}</h1>
          </div>
          {art && <Art name={art} size={84} className="-mb-2 shrink-0" float />}
        </div>
      </header>
      <ElderSheet className={sheetClass}>{children}</ElderSheet>
    </div>
  );
}

/** Big bento tile for the elder home: Tamil title, English under it, 3D art in the corner. */
export function ElderTile({ tone, art, ta, en, onClick, badge }: { tone: Tone; art: ArtName; ta: string; en: string; onClick: () => void; badge?: ReactNode }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} onClick={onClick}
      className={cx("relative flex min-h-[156px] flex-col overflow-hidden rounded-3xl p-4 text-left", TONE_BG[tone])}>
      <Bi ta={ta} en={en} className="relative z-[1] max-w-[92%] text-[22px] font-extrabold leading-[1.15]" />
      {badge && <span className="absolute left-4 bottom-4 z-[1]">{badge}</span>}
      <Art name={art} size={92} className="absolute -bottom-2 -right-2" />
    </motion.button>
  );
}

/** Large rounded action button for elder screens (at least 64 px tall). */
export function BigButton({ tone = "violet", children, onClick, disabled, className, icon }: {
  tone?: "violet" | "white" | "sos" | "ink" | "mint" | "soft"; children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; icon?: ReactNode;
}) {
  const T = {
    violet: "bg-violet text-white shadow-[0_14px_28px_-12px_rgba(91,71,230,.85)]",
    white: "bg-white text-ink shadow-card",
    sos: "bg-sos text-white shadow-sos",
    ink: "bg-ink text-white",
    mint: "bg-mint text-mint-ink",
    soft: "bg-violet-50 text-violet-700",
  }[tone];
  return (
    <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={onClick} disabled={disabled}
      className={cx("flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[24px] px-5 py-3 text-[22px] font-extrabold leading-tight disabled:opacity-50", T, className)}>
      {icon}{children}
    </motion.button>
  );
}

export const ACTIVE = ["triage", "dispatched", "arrived", "admitted"];
