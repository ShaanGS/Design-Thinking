// A tablet drawn in its real colour, with a soft clay highlight. Used on medicine cards and the doctor's summary.
import { cx } from "./ui";

export default function Capsule({ color, size = 40, className }: { color: string; size?: number; className?: string }) {
  const w = size, h = Math.round(size * 0.46);
  return (
    <span className={cx("relative inline-block shrink-0 -rotate-[24deg]", className)} style={{ width: w, height: h }}>
      <span className="absolute inset-0 rounded-full border border-black/10"
        style={{ background: `linear-gradient(180deg, rgba(255,255,255,.65) 0%, rgba(255,255,255,0) 45%), ${color}`, boxShadow: "inset -3px -4px 0 rgba(0,0,0,.08), 0 6px 12px -6px rgba(73,54,196,.45)" }} />
      <span className="absolute inset-y-[2px] left-1/2 w-px bg-black/10" />
    </span>
  );
}
