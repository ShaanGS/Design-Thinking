// Shared pieces of the elder app: language, live data context, bilingual text, screen chrome.
import { createContext, useContext, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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

/** Bilingual text: the chosen language at full size, the other beneath at ~60% in a quieter tone. */
export function Bi({ ta, en, className, sub, inline }: { ta: ReactNode; en: ReactNode; className?: string; sub?: string; inline?: boolean }) {
  const { lang } = useElder();
  const [a, b] = lang === "ta" ? [ta, en] : [en, ta];
  if (inline) return <span className={cx(lang === "ta" && "font-tamil", className)}>{a}</span>;
  return (
    <span className={cx("flex flex-col", className)}>
      <span className={lang === "ta" ? "font-tamil" : undefined}>{a}</span>
      <span className={cx("mt-0.5 text-[0.6em] font-normal leading-snug opacity-70", lang === "en" && "font-tamil", sub)}>{b}</span>
    </span>
  );
}
/** Pick the string for the current language. */
export const useT = () => { const { lang } = useElder(); return (ta: string, en: string) => (lang === "ta" ? ta : en); };

export function SubScreen({ ta, en, children }: { ta: string; en: string; children: ReactNode }) {
  const nav = useNavigate();
  const { lang } = useElder();
  const [title, other] = lang === "ta" ? [ta, en] : [en, ta];
  return (
    <div className="flex min-h-[100dvh] flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-line bg-white safe-top">
        <div className="flex items-center gap-1 px-2 pt-2">
          <button onClick={() => nav("/elder")} aria-label={lang === "ta" ? "பின்செல்" : "Back"}
            className="flex h-12 items-center gap-0.5 rounded-xl pl-1 pr-3 text-[19px] font-semibold text-ink hover:bg-paper active:bg-paper-2">
            <ChevronLeft className="h-7 w-7" strokeWidth={2} />
            <span className={lang === "ta" ? "font-tamil" : undefined}>{lang === "ta" ? "முகப்பு" : "Home"}</span>
          </button>
        </div>
        <div className="px-5 pb-4 pt-1">
          <h1 className={cx("text-[30px] font-bold leading-tight", lang === "ta" && "font-tamil")}>{title}</h1>
          <p className={cx("text-[17px] text-ink-2", lang === "en" && "font-tamil")}>{other}</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-5 px-5 py-5">{children}</div>
    </div>
  );
}

export const ACTIVE = ["triage", "dispatched", "arrived", "admitted"];
