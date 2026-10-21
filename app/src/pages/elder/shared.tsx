// Shared pieces of the elder app: language, live data context, bilingual text, screen chrome.
import { createContext, useContext, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cx } from "../../components/ui";
import type { Emergency, Overview } from "../../../shared/types";

export type Lang = "ta" | "en";
const LANG_KEY = "saathi-elder-lang";
export const readLang = (fallback: Lang): Lang => { try { const v = localStorage.getItem(LANG_KEY); return v === "en" || v === "ta" ? v : fallback; } catch { return fallback; } };
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

/** Bilingual text: the chosen language large, the other small underneath. */
export function Bi({ ta, en, className, sub, inline }: { ta: ReactNode; en: ReactNode; className?: string; sub?: string; inline?: boolean }) {
  const { lang } = useElder();
  const [a, b] = lang === "ta" ? [ta, en] : [en, ta];
  if (inline) return <span className={className}>{a}</span>;
  return (
    <span className={cx("flex flex-col", className)}>
      <span className={lang === "ta" ? "font-tamil" : undefined}>{a}</span>
      <span className={cx("text-[0.62em] font-medium leading-snug opacity-75", lang === "en" && "font-tamil", sub)}>{b}</span>
    </span>
  );
}
/** Pick the string for the current language. */
export const useT = () => { const { lang } = useElder(); return (ta: string, en: string) => (lang === "ta" ? ta : en); };

export function SubScreen({ ta, en, children, tone = "paper" }: { ta: string; en: string; children: ReactNode; tone?: "paper" | "white" }) {
  const nav = useNavigate();
  const { lang } = useElder();
  return (
    <div className={cx("flex min-h-[100dvh] flex-col", tone === "white" ? "bg-white" : "bg-paper")}>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur safe-top">
        <button onClick={() => nav("/elder")} aria-label={lang === "ta" ? "பின்செல்" : "Back"}
          className="flex h-14 items-center gap-2 rounded-2xl bg-ink px-4 text-lg font-bold text-white active:scale-[.98]">
          <ArrowLeft className="h-6 w-6" />
          <span className={lang === "ta" ? "font-tamil" : undefined}>{lang === "ta" ? "பின்" : "Back"}</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold leading-tight"><span className={lang === "ta" ? "font-tamil" : undefined}>{lang === "ta" ? ta : en}</span></h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-4 py-5">{children}</div>
    </div>
  );
}

export const ACTIVE = ["triage", "dispatched", "arrived", "admitted"];
