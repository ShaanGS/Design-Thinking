// Saathi design system: small, consistent building blocks used by every screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X, Loader2 } from "lucide-react";
import { Person, whoFor } from "./kit";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Button ---------- */
type Variant = "primary" | "brand" | "teal" | "sos" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg" | "xl";
const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/85 active:bg-ink",
  brand: "bg-violet text-white hover:bg-violet-600 shadow-[0_10px_24px_-10px_rgba(91,71,230,.8)]",
  teal: "bg-teal text-white hover:bg-teal-600",
  sos: "bg-sos text-white hover:bg-sos-600 shadow-sos",
  outline: "bg-white text-ink shadow-card hover:bg-violet-50",
  ghost: "text-ink-2 hover:bg-violet-50 hover:text-ink",
  soft: "bg-violet-50 text-violet-700 hover:bg-violet-100",
};
const SIZE: Record<Size, string> = { sm: "h-9 px-4 text-[13px] rounded-full", md: "h-11 px-5 text-[14.5px] rounded-full", lg: "h-12 px-6 text-base rounded-full", xl: "min-h-[64px] px-7 py-3 text-lg rounded-full" };
export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...rest} disabled={disabled || loading}
      className={cx("inline-flex items-center justify-center gap-2 font-semibold leading-none transition-all active:scale-[.97] disabled:opacity-45 disabled:cursor-not-allowed select-none", VARIANT[variant], SIZE[size], className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("rounded-3xl bg-white shadow-card", className)}>{children}</div>;
}
export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 shrink-0 text-ink-2 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
        <div className="min-w-0"><h3 className="text-[17px] font-bold leading-tight">{title}</h3>{subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}</div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
type Tone = "ok" | "warn" | "sos" | "info" | "mute" | "brand" | "dark";
const TONE: Record<Tone, string> = {
  ok: "bg-mint text-mint-ink", warn: "bg-peach text-peach-ink", sos: "bg-sos text-white", info: "bg-violet-50 text-violet-700",
  mute: "bg-canvas-2 text-ink-2", brand: "bg-violet-100 text-violet-700", dark: "bg-ink text-white",
};
export function Badge({ tone = "mute", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold leading-5", TONE[tone], className)}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>;
}

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cx("h-5 w-5 animate-spin text-ink-3", className)} />;

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-white px-6 py-10 text-center shadow-card">
      {icon && <div className="mb-1 text-ink-3 [&_svg]:h-7 [&_svg]:w-7">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Avatar({ name, size = 40, online, className }: { name: string; size?: number; online?: boolean; className?: string }) {
  const who = whoFor(name);
  if (who) return <Person who={who} size={size} online={online} className={className} />;
  return (
    <span className={cx("relative inline-grid shrink-0 place-items-center rounded-full bg-violet-100 font-display font-bold text-violet-700", className)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.trim()[0]?.toUpperCase() || "?"}
      {online !== undefined && <span className={cx("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white", online ? "bg-teal" : "bg-ink-3/50")} />}
    </span>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cx("inline-flex rounded-full bg-white p-1 shadow-card", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors", value === o.value ? "bg-violet text-white" : "text-ink-2 hover:text-ink")}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}</label>;
}
const INPUT = "w-full rounded-2xl border border-transparent bg-canvas px-4 py-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet/10";
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(INPUT, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(INPUT, "min-h-[90px]", p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(INPUT, "appearance-none", p.className)} />;

/* ---------- Modal / bottom sheet ---------- */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/40 backdrop-blur-[2px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className={cx("max-h-[90%] w-full overflow-y-auto rounded-t-[32px] bg-white px-5 pb-8 pt-3 shadow-lift animate-slidein safe-bottom", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-2" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[20px] font-bold">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-canvas"><X className="h-[18px] w-[18px]" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
type ToastT = { id: number; text: string; tone: "ok" | "sos" | "info" | "warn" };
const ToastCtx = createContext<(text: string, tone?: ToastT["tone"]) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastT[]>([]);
  const n = useRef(0);
  const push = useCallback((text: string, tone: ToastT["tone"] = "info") => {
    const id = ++n.current;
    setList((l) => [...l, { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[2000] flex flex-col items-center gap-2 px-4 safe-top">
        {list.map((t) => (
          <div key={t.id} role="status" className={cx("pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-[14px] font-semibold text-white shadow-pill animate-slidein")}><span className={cx("h-2 w-2 shrink-0 rounded-full", t.tone === "sos" ? "bg-sos" : t.tone === "ok" ? "bg-[#5BE39A]" : t.tone === "warn" ? "bg-[#FFB45C]" : "bg-violet-300")} />{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Misc ---------- */
export function ProgressRing({ value, size = 64, stroke = 7, color = "#6F5CF6", track = "#ECEAF5", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} style={{ transition: "stroke-dashoffset .6s" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "ok" | "warn" | "sos" }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-ink-2">{label}</div>
      <div className={cx("mt-0.5 font-display text-[28px] font-extrabold leading-none tnum", tone === "ok" && "text-teal", tone === "warn" && "text-warn", tone === "sos" && "text-sos")}>{value}</div>
      {sub && <div className="text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-2.5 mt-1 flex items-baseline justify-between gap-3"><h2 className="font-display text-[17px] font-bold text-ink">{children}</h2>{action}</div>;
}

export function Logo({ size = 36, label = true, sub, light }: { size?: number; label?: boolean; sub?: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icons/icon.svg" alt="" width={size} height={size} style={{ borderRadius: size * 0.3 }} />
      {label && <div className="leading-none"><div className={cx("font-display text-[21px] font-extrabold tracking-tight", light && "text-white")}>Saathi</div>{sub && <div className={cx("mt-0.5 text-[12.5px]", light ? "text-white/75" : "text-ink-2")}>{sub}</div>}</div>}
    </div>
  );
}
