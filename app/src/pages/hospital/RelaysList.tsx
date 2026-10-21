// Medicine relays between hospitals, live.
import { ArrowRight } from "lucide-react";
import type { Hospital, Relay } from "../../../shared/types";
import { cx } from "../../components/ui";
import { timeAgo } from "../../lib/format";

export default function RelaysList({ relays, hospitals, ownId, demoSpeed, now }: { relays: Relay[]; hospitals: Hospital[]; ownId: string | null; demoSpeed: number; now: number }) {
  const name = (id: string) => hospitals.find((h) => h.id === id)?.short || id;
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="text-[20px] font-semibold leading-tight">Medicine relays</h2>
        <p className="text-[14px] text-ink-2">Stock sent between hospitals when one runs short.</p>
      </header>
      {!relays.length ? (
        <p className="px-4 py-4 text-[14px] text-ink-2 sm:px-5">No relays yet. Request one from the capacity table when an item drops below its minimum; Saathi picks the nearest hospital that can spare it.</p>
      ) : (
        <ul>
          {relays.slice(0, 8).map((r) => {
            const delivered = r.status === "delivered";
            const left = Math.max(0, Math.ceil(r.etaMin - ((now - new Date(r.createdAt).getTime()) / 60000) * demoSpeed));
            const pct = delivered ? 100 : Math.min(100, Math.max(4, ((r.etaMin - left) / Math.max(1, r.etaMin)) * 100));
            const mine = r.toId === ownId || r.fromId === ownId;
            return (
              <li key={r.id} className="border-b border-line px-4 py-3 last:border-b-0 sm:px-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold">
                    <span className={cx("truncate", r.fromId === ownId && "underline decoration-brand decoration-2 underline-offset-4")}>{name(r.fromId)}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.75} />
                    <span className={cx("truncate", r.toId === ownId && "underline decoration-brand decoration-2 underline-offset-4")}>{name(r.toId)}</span>
                  </div>
                  <span className={cx("shrink-0 text-[13px] font-semibold tnum", delivered ? "text-teal" : "text-ink-2")}>{delivered ? "Delivered" : `In transit · ${left} min`}</span>
                </div>
                <div className="text-[14px] text-ink-2"><span className="font-display font-semibold text-ink tnum">{r.qty}</span> × {r.label}<span className="text-ink-3"> · {timeAgo(r.createdAt)}{mine ? " · involves you" : ""}</span></div>
                {!delivered && <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-line"><div className="h-full bg-ink transition-all duration-700" style={{ width: `${pct}%` }} /></div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
