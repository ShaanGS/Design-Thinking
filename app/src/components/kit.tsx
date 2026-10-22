// Saathi "soft clay" kit: 3D art, people, bento tiles, the floating tab bar, sheets and the phone frame.
// Every screen is built from these so the three apps look like one product.
import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, X, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cx } from "./ui";

/* ---------- 3D art (generated clay icons in /public/art) ---------- */
export type ArtName = "siren" | "pills" | "heart" | "folder" | "ambulance" | "hospital" | "stethoscope" | "calendar"
  | "home" | "shield" | "chat" | "cpr" | "qr" | "blood" | "bed" | "brain";
export function Art({ name, size = 56, className, float }: { name: ArtName; size?: number; className?: string; float?: boolean }) {
  return <img src={`/art/${name}.webp`} alt="" width={size} height={size} draggable={false}
    className={cx("pointer-events-none select-none object-contain art-shadow", float && "animate-float", className)} style={{ width: size, height: size }} />;
}

/* ---------- People (3D portraits) ---------- */
export type Who = "paati" | "karthik" | "priya";
const WHO_BY_NAME: Record<string, Who> = { kamala: "paati", paati: "paati", karthik: "karthik", priya: "priya" };
export const whoFor = (name?: string | null): Who | null => {
  const k = (name || "").toLowerCase().replace(/^dr\.?\s*/, "").split(/\s+/)[0];
  return WHO_BY_NAME[k] ?? null;
};
const RING: Record<Who, string> = { paati: "bg-peach", karthik: "bg-sky", priya: "bg-lilac" };
export function Person({ who, size = 44, className, ring = true, online }: { who: Who; size?: number; className?: string; ring?: boolean; online?: boolean }) {
  return (
    <span className={cx("relative inline-block shrink-0 overflow-hidden rounded-full", ring && RING[who], className)} style={{ width: size, height: size }}>
      <img src={`/art/${who}.webp`} alt="" className="h-full w-full object-cover object-top" draggable={false} />
      {online !== undefined && <span className={cx("absolute bottom-[6%] right-[6%] h-[22%] w-[22%] rounded-full border-2 border-white", online ? "bg-teal" : "bg-ink-3")} />}
    </span>
  );
}

/* ---------- Pastel tones ---------- */
export type Tone = "violet" | "mint" | "peach" | "butter" | "sky" | "rose" | "lilac" | "white" | "ink" | "sos";
export const TONE_BG: Record<Tone, string> = {
  violet: "bg-violet text-white", mint: "bg-mint text-ink", peach: "bg-peach text-ink", butter: "bg-butter text-ink", sky: "bg-sky text-ink",
  rose: "bg-rose text-ink", lilac: "bg-lilac text-ink", white: "bg-white text-ink shadow-card", ink: "bg-ink text-white", sos: "bg-sos text-white shadow-sos",
};
export const TONE_INK: Record<Tone, string> = {
  violet: "text-white/80", mint: "text-mint-ink", peach: "text-peach-ink", butter: "text-butter-ink", sky: "text-sky-ink",
  rose: "text-rose-ink", lilac: "text-lilac-ink", white: "text-ink-2", ink: "text-white/70", sos: "text-white/85",
};

/* ---------- Bento tile ---------- */
export function Tile({ tone = "white", title, sub, art, artSize = 76, onClick, to, className, children, big, badge }: {
  tone?: Tone; title: ReactNode; sub?: ReactNode; art?: ArtName; artSize?: number; onClick?: () => void; to?: string;
  className?: string; children?: ReactNode; big?: boolean; badge?: ReactNode;
}) {
  const nav = useNavigate();
  const go = onClick ?? (to ? () => nav(to) : undefined);
  return (
    <motion.button type="button" whileTap={go ? { scale: 0.97 } : undefined} onClick={go} disabled={!go}
      className={cx("relative flex flex-col overflow-hidden rounded-3xl p-4 text-left disabled:cursor-default", TONE_BG[tone], big ? "min-h-[180px]" : "min-h-[112px]", className)}>
      <div className="relative z-[1] max-w-[70%]">
        <div className={cx("font-display font-bold leading-tight", big ? "text-[19px]" : "text-[15px]")}>{title}</div>
        {sub && <div className={cx("mt-1 text-[12.5px] leading-snug", TONE_INK[tone])}>{sub}</div>}
      </div>
      {children && <div className="relative z-[1] mt-auto pt-2">{children}</div>}
      {badge && <div className="absolute right-3 top-3 z-[2]">{badge}</div>}
      {art && <Art name={art} size={artSize} className="absolute -bottom-1 -right-1" />}
    </motion.button>
  );
}

/* ---------- Quick action chip (the row of glass tiles under the header) ---------- */
export function QuickTile({ art, label, onClick, to, dot }: { art: ArtName; label: ReactNode; onClick?: () => void; to?: string; dot?: boolean }) {
  const nav = useNavigate();
  return (
    <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={onClick ?? (to ? () => nav(to) : undefined)}
      className="glass relative flex h-[92px] flex-col justify-between overflow-hidden rounded-[22px] p-3 text-left text-white">
      <span className="relative z-[1] text-[12.5px] font-semibold leading-tight">{label}</span>
      <Art name={art} size={50} className="absolute -bottom-1 -right-1" />
      {dot && <span className="absolute left-3 top-3 hidden" />}
      {dot && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-butter ring-2 ring-violet-500" />}
    </motion.button>
  );
}

/* ---------- Screen header (violet, with the white sheet rising over it) ---------- */
export function VioletHeader({ children, sos, className }: { children: ReactNode; sos?: boolean; className?: string }) {
  return <div className={cx("relative px-5 pb-12 pt-5 text-white safe-top", sos ? "hero-sos" : "hero-violet", className)}>{children}</div>;
}
export function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("relative -mt-7 rounded-t-[32px] bg-canvas px-4 pb-32 pt-5", className)}>{children}</div>;
}

/* ---------- Sub-page top bar ---------- */
export function TopBar({ title, sub, back = true, right, onBack, dark }: { title: ReactNode; sub?: ReactNode; back?: boolean; right?: ReactNode; onBack?: () => void; dark?: boolean }) {
  const nav = useNavigate();
  return (
    <div className={cx("sticky top-0 z-[400] flex items-center gap-3 px-4 py-3 safe-top", dark ? "text-white" : "bg-canvas/85 backdrop-blur-xl")}>
      {back && <button aria-label="Back" onClick={onBack ?? (() => nav(-1))} className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full", dark ? "glass" : "bg-white shadow-card")}><ChevronLeft className="h-5 w-5" /></button>}
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate font-display text-[18px] font-bold">{title}</div>
        {sub && <div className={cx("truncate text-[12.5px]", dark ? "text-white/75" : "text-ink-2")}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Section heading ---------- */
export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("mt-6", className)}>
      <div className="mb-3 flex items-center justify-between gap-3 px-1"><h2 className="text-[17px] font-bold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

/* ---------- Pill buttons ---------- */
type PillVariant = "ink" | "violet" | "white" | "sos" | "soft" | "glass";
const PILL: Record<PillVariant, string> = {
  ink: "bg-ink text-white", violet: "bg-violet text-white shadow-[0_10px_24px_-10px_rgba(91,71,230,.8)]", white: "bg-white text-ink shadow-card",
  sos: "bg-sos text-white shadow-sos", soft: "bg-violet-50 text-violet-700", glass: "glass text-white",
};
export function Pill({ variant = "ink", icon: Icon, children, onClick, className, disabled, size = "md", type = "button" }: {
  variant?: PillVariant; icon?: LucideIcon; children?: ReactNode; onClick?: () => void; className?: string; disabled?: boolean; size?: "sm" | "md" | "lg"; type?: "button" | "submit";
}) {
  return (
    <motion.button type={type} whileTap={{ scale: 0.96 }} onClick={onClick} disabled={disabled}
      className={cx("inline-flex items-center justify-center gap-2 rounded-full font-semibold disabled:opacity-50", PILL[variant],
        size === "sm" ? "h-9 px-4 text-[13px]" : size === "lg" ? "h-14 px-7 text-[16px]" : "h-11 px-5 text-[14.5px]", className)}>
      {Icon && <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={2.2} />}{children}
    </motion.button>
  );
}

/* ---------- Floating tab bar ---------- */
export interface TabItem { to: string; label: string; icon: LucideIcon; end?: boolean; dot?: boolean }
export function TabBar({ items, center }: { items: TabItem[]; center?: ReactNode }) {
  const half = Math.ceil(items.length / 2);
  const render = (t: TabItem) => (
    <NavLink key={t.to} to={t.to} end={t.end} aria-label={t.label} className="relative">
      {({ isActive }) => (
        <span className={cx("relative flex h-12 items-center justify-center gap-2 rounded-full transition-colors", isActive ? "bg-violet-100 px-4 text-violet-700" : "w-12 text-ink-3")}>
          <t.icon className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.3 : 1.9} />
          {isActive && <span className="text-[13px] font-bold">{t.label}</span>}
          {t.dot && <span className="absolute right-2 top-2.5 h-2 w-2 rounded-full bg-sos ring-2 ring-white" />}
        </span>
      )}
    </NavLink>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[600] px-4 pb-4 safe-bottom pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full bg-white/95 p-1.5 shadow-pill backdrop-blur-xl">
        {items.slice(0, half).map(render)}
        {center}
        {items.slice(half).map(render)}
      </div>
    </nav>
  );
}

/* ---------- Bottom sheet ---------- */
export function BottomSheet({ open, onClose, title, children, tall }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[1000] flex items-end justify-center bg-ink/40 backdrop-blur-[2px]" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className={cx("w-full max-w-lg overflow-y-auto rounded-t-[32px] bg-white px-5 pb-8 pt-3 safe-bottom", tall ? "max-h-[94%]" : "max-h-[86%]")}>
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-2" />
            {title && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-[20px] font-bold">{title}</h3>
                <button aria-label="Close" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-canvas"><X className="h-[18px] w-[18px]" /></button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Small stat card (pastel, like a health app) ---------- */
export function StatCard({ tone, label, value, unit, note, art, children, onClick }: {
  tone: Tone; label: ReactNode; value: ReactNode; unit?: string; note?: ReactNode; art?: ArtName; children?: ReactNode; onClick?: () => void;
}) {
  return (
    <motion.div whileTap={onClick ? { scale: 0.97 } : undefined} onClick={onClick} className={cx("relative overflow-hidden rounded-3xl p-4", TONE_BG[tone], onClick && "cursor-pointer")}>
      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">{label}</div>
      {children}
      <div className="mt-2 font-display text-[28px] font-extrabold leading-none tnum">{value}{unit && <span className="ml-1 text-[13px] font-semibold opacity-70">{unit}</span>}</div>
      {note && <div className={cx("mt-1.5 text-[12px]", TONE_INK[tone])}>{note}</div>}
      {art && <Art name={art} size={54} className="absolute -right-1 -top-1 opacity-95" />}
    </motion.div>
  );
}

/* ---------- Phone frame: on a laptop the app is shown inside a phone, on a phone it is the phone ---------- */
export function useWide(min = 640) {
  const q = `(min-width: ${min}px)`;
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const f = () => setWide(m.matches); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, [q]);
  return wide;
}
/** Inside an iframe (the stage view) or on a phone the app fills the screen; on a laptop it sits inside a phone. */
export function PhoneFrame({ children, label }: { children: ReactNode; label?: ReactNode }) {
  const wide = useWide();
  const framed = typeof window !== "undefined" && window.self !== window.top;
  if (!wide || framed) return <>{children}</>;
  return (
    <div className="flex min-h-full items-center justify-center gap-12 bg-[radial-gradient(80%_60%_at_20%_10%,#E7E3FF_0%,transparent_60%),radial-gradient(60%_50%_at_90%_90%,#FFE3D1_0%,transparent_60%)] p-6">
      <div className="relative h-[min(844px,calc(100vh-48px))] w-[390px] shrink-0 rounded-[56px] bg-ink p-[11px] shadow-[0_40px_80px_-30px_rgba(23,20,46,.55)]">
        <div className="pointer-events-none absolute left-1/2 top-[22px] z-[3000] h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-ink" />
        {/* transform makes position:fixed children (tab bar, sheets) stick to the phone, not the window */}
        <div className="relative h-full w-full overflow-hidden rounded-[46px] bg-canvas [transform:translateZ(0)]">
          <div className="phone-scroll h-full overflow-y-auto overflow-x-hidden scrollbar-none [&_.safe-top]:pt-10">{children}</div>
        </div>
      </div>
      {label && <div className="hidden max-w-[300px] lg:block">{label}</div>}
    </div>
  );
}
