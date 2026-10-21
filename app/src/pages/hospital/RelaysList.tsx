// Medicine relays between hospitals, live.
import { ArrowRight, PackageCheck, Truck } from "lucide-react";
import type { Hospital, Relay } from "../../../shared/types";
import { Badge, Card, CardHeader, EmptyState, cx } from "../../components/ui";
import { timeAgo } from "../../lib/format";

export default function RelaysList({ relays, hospitals, ownId, demoSpeed, now }: { relays: Relay[]; hospitals: Hospital[]; ownId: string | null; demoSpeed: number; now: number }) {
  const name = (id: string) => hospitals.find((h) => h.id === id)?.short || id;
  return (
    <Card>
      <CardHeader title="Medicine relays" subtitle="Stock moved between hospitals so a shortage never costs a life" icon={<Truck className="h-5 w-5" />} />
      <div className="flex flex-col gap-2 px-4 pb-4">
        {!relays.length && <EmptyState icon={<Truck className="h-6 w-6" />} title="No relays yet">When stock runs low, request a relay from the capacity board. Saathi picks the nearest hospital that can spare it.</EmptyState>}
        {relays.slice(0, 8).map((r) => {
          const delivered = r.status === "delivered";
          const left = Math.max(0, Math.ceil(r.etaMin - ((now - new Date(r.createdAt).getTime()) / 60000) * demoSpeed));
          const pct = delivered ? 100 : Math.min(100, Math.max(4, ((r.etaMin - left) / Math.max(1, r.etaMin)) * 100));
          const involvesMe = r.toId === ownId || r.fromId === ownId;
          return (
            <div key={r.id} className={cx("rounded-xl border px-3 py-2.5", involvesMe ? "border-brand bg-brand-50" : "border-line bg-white")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{name(r.fromId)}</span><ArrowRight className="h-4 w-4 shrink-0 text-ink-3" /><span className="truncate">{name(r.toId)}</span>
                </div>
                {delivered ? <Badge tone="ok"><PackageCheck className="h-3 w-3" /> Delivered</Badge> : <Badge tone="brand" dot>In transit · ~{left} min</Badge>}
              </div>
              <div className="mt-0.5 text-sm text-ink-2"><b className="font-mono text-ink tnum">{r.qty}</b> × {r.label} <span className="text-xs text-ink-3">· {timeAgo(r.createdAt)}</span></div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-paper-2"><div className={cx("h-full transition-all", delivered ? "bg-teal" : "bg-brand")} style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
