// Saathi design system: small, consistent building blocks used by every screen.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { X, Loader2 } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Button ---------- */
type Variant = "primary" | "brand" | "teal" | "sos" | "outline" | "ghost" | "soft";
type Size = "sm" | "md" | "lg" | "xl";
const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90",
  brand: "bg-brand text-[#1d1300] hover:bg-brand-600 hover:text-white",
  teal: "bg-teal text-white hover:bg-teal-600",
  sos: "bg-sos text-white hover:bg-sos-600",
  outline: "border border-line bg-white text-ink hover:border-ink-3",
  ghost: "text-ink-2 hover:bg-ink/5",
  soft: "bg-ink/5 text-ink hover:bg-ink/10",
};
const SIZE: Record<Size, string> = { sm: "h-8 px-3 text-sm rounded-lg", md: "h-10 px-4 text-sm rounded-xl", lg: "h-12 px-5 text-base rounded-xl", xl: "min-h-16 px-6 py-3 text-lg rounded-2xl" };
export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }) {
  return (
    <button {...rest} disabled={disabled || loading}
      className={cx("inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none", VARIANT[variant], SIZE[size], className)}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ---------- Card ---------- */
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx("rounded-2xl border border-line bg-white shadow-card", className)}>{children}</div>;
}
export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-paper-2 text-ink-2">{icon}</div>}
        <div className="min-w-0"><h3 className="text-lg font-semibold leading-tight">{title}</h3>{subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}</div>
      </div>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */
type Tone = "ok" | "warn" | "sos" | "info" | "mute" | "brand" | "dark";
const TONE: Record<Tone, string> = {
  ok: "bg-teal-50 text-teal", warn: "bg-warn-50 text-warn", sos: "bg-sos-50 text-sos", info: "bg-info-50 text-info",
  mute: "bg-paper-2 text-ink-2", brand: "bg-brand-100 text-brand-700", dark: "bg-ink text-white",
};
export function Badge({ tone = "mute", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[tone], className)}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>;
}

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cx("h-5 w-5 animate-spin text-ink-3", className)} />;

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-1 grid h-12 w-12 place-items-center rounded-2xl bg-paper-2 text-ink-2">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-sm text-sm text-ink-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const AVATAR_COLORS = ["bg-brand-100 text-brand-700", "bg-teal-100 text-teal-700", "bg-info-50 text-info", "bg-sos-50 text-sos", "bg-paper-2 text-ink"];
export function Avatar({ name, size = 40, online, className }: { name: string; size?: number; online?: boolean; className?: string }) {
  const i = [...name].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <span className={cx("relative inline-grid shrink-0 place-items-center rounded-full font-display font-bold", AVATAR_COLORS[i], className)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.trim()[0]?.toUpperCase() || "?"}
      {online !== undefined && <span className={cx("absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white", online ? "bg-teal" : "bg-ink-3/50")} />}
    </span>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cx("inline-flex rounded-xl bg-paper-2 p-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors", value === o.value ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink")}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---------- Form fields ---------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-semibold text-ink-2">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}</label>;
}
const INPUT = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-3 focus:border-ink-3 focus:outline-none";
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
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-slidein safe-bottom sm:rounded-3xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Toasts ---------- */
type ToastT = { id: number; text: string; tone: "ok" | "sos" | "info" };
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
          <div key={t.id} role="status" className={cx("pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl animate-slidein", t.tone === "sos" ? "bg-sos text-white" : t.tone === "ok" ? "bg-teal text-white" : "bg-ink text-white")}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Misc ---------- */
export function ProgressRing({ value, size = 64, stroke = 7, color = "#0F6E5A", track = "#E9EFEC", children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
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
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cx("mt-0.5 font-display text-2xl font-bold tnum", tone === "ok" && "text-teal", tone === "warn" && "text-warn", tone === "sos" && "text-sos")}>{value}</div>
      {sub && <div className="text-xs text-ink-2">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="mb-2 mt-1 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink-3">{children}</h2>{action}</div>;
}

export function Logo({ size = 36, label = true, sub }: { size?: number; label?: boolean; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/icons/icon.svg" alt="" width={size} height={size} className="rounded-xl" />
      {label && <div className="leading-none"><div className="font-display text-2xl font-bold">Saathi</div>{sub && <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">{sub}</div>}</div>}
    </div>
  );
}
