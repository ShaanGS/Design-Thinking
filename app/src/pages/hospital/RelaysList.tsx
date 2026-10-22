// Relays tab: critical medicines sent between hospitals when one runs short, live.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Truck } from "lucide-react";
import type { Hospital, Relay } from "../../../shared/types";
import { cx } from "../../components/ui";
import { Art, Pill, Section, Sheet, VioletHeader } from "../../components/kit";
import { timeAgo } from "../../lib/format";
import { useNavigate } from "react-router-dom";
import { useHospital } from "./ctx";

export default function RelaysPage() {
  const { net, ownId, own, stats, demoSpeed } = useHospital();
  const nav = useNavigate();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const relays = net.relays;
  const hospitals = net.hospitals;
  const moving = relays.filter((r) => r.status !== "delivered");
  const today = new Date().toDateString();
  const deliveredToday = relays.filter((r) => r.status === "delivered" && new Date(r.createdAt).toDateString() === today).length;
  const toYou = relays.filter((r) => r.toId === ownId);
  const fromYou = relays.filter((r) => r.fromId === ownId);
  const rest = relays.filter((r) => r.toId !== ownId && r.fromId !== ownId);
  const list = (rs: Relay[]) => <div className="flex flex-col gap-3">{rs.slice(0, 8).map((r) => <RelayCard key={r.id} r={r} hospitals={hospitals} ownId={ownId} now={now} speed={demoSpeed} />)}</div>;

  return (
    <div>
      <VioletHeader>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[24px] font-extrabold leading-tight">Medicine relays</h1>
            <p className="mt-0.5 text-[13px] leading-snug text-white/80">Anti-venom, clot-busters and blood, sent between hospitals before anyone runs out.</p>
          </div>
          <Art name="ambulance" size={80} float className="-my-2 shrink-0" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Glass value={moving.length} label="On the road" />
          <Glass value={deliveredToday} label="Delivered today" />
          <Glass value={stats.ownLow} label={`Low at ${own?.short || "your hospital"}`} dot={stats.ownLow > 0} />
        </div>
      </VioletHeader>

      <Sheet>
        {!relays.length ? (
          <div className="flex flex-col items-center rounded-3xl bg-white px-6 pb-6 pt-4 text-center shadow-card">
            <Art name="pills" size={110} float />
            <p className="mt-1 text-[17px] font-extrabold">No relays yet</p>
            <p className="mt-1 max-w-[280px] text-[13.5px] leading-snug text-ink-2">When stock drops below its minimum, tap Relay on the Network tab. Saathi sends it from the nearest hospital that can spare it.</p>
            <Pill variant="violet" className="mt-4" onClick={() => nav("/hospital/network")}>{stats.ownLow ? `See ${stats.ownLow} low items` : "Open the network"}</Pill>
          </div>
        ) : (
          <>
            {stats.ownLow > 0 && (
              <motion.button whileTap={{ scale: 0.98 }} onClick={() => nav("/hospital/network")} className="mb-2 flex w-full items-center gap-3 rounded-3xl bg-peach p-3 pr-4 text-left">
                <Art name="pills" size={48} />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[15px] font-bold">{stats.ownLow} item{stats.ownLow > 1 ? "s" : ""} below minimum here</div>
                  <div className="text-[12.5px] text-peach-ink">Request a relay from the Network tab</div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-peach-ink" />
              </motion.button>
            )}
            {toYou.length > 0 && <Section title="Coming to you" className={stats.ownLow ? undefined : "!mt-0"}>{list(toYou)}</Section>}
            {fromYou.length > 0 && <Section title="Sent by you" className={stats.ownLow || toYou.length ? undefined : "!mt-0"}>{list(fromYou)}</Section>}
            {rest.length > 0 && <Section title="Across the network" className={stats.ownLow || toYou.length || fromYou.length ? undefined : "!mt-0"}>{list(rest)}</Section>}
          </>
        )}
      </Sheet>
    </div>
  );
}

function Glass({ value, label, dot }: { value: number; label: string; dot?: boolean }) {
  return (
    <div className="glass relative rounded-[22px] p-3 text-white">
      <div className="font-display text-[26px] font-extrabold leading-none tnum">{value}</div>
      <div className="mt-1 text-[12px] font-semibold leading-tight text-white/85">{label}</div>
      {dot && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-butter ring-2 ring-violet-500" />}
    </div>
  );
}

function RelayCard({ r, hospitals, ownId, now, speed }: { r: Relay; hospitals: Hospital[]; ownId: string | null; now: number; speed: number }) {
  const name = (id: string) => hospitals.find((h) => h.id === id)?.short || id;
  const delivered = r.status === "delivered";
  const left = Math.max(0, Math.ceil(r.etaMin - ((now - new Date(r.createdAt).getTime()) / 60000) * speed));
  const pct = delivered ? 100 : Math.min(100, Math.max(4, ((r.etaMin - left) / Math.max(1, r.etaMin)) * 100));
  const blood = /blood/i.test(r.item);
  return (
    <div className="rounded-3xl bg-white p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <span className={cx("grid h-14 w-14 shrink-0 place-items-center rounded-2xl", delivered ? "bg-mint" : "bg-butter")}>
          <Art name={delivered ? (blood ? "blood" : "pills") : "ambulance"} size={46} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-bold"><span className="font-display font-extrabold tnum">{r.qty}</span> × {r.label}</div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">
            <span className={cx("truncate", r.fromId === ownId && "text-violet-700")}>{r.fromId === ownId ? "You" : name(r.fromId)}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            <span className={cx("truncate", r.toId === ownId && "text-violet-700")}>{r.toId === ownId ? "You" : name(r.toId)}</span>
          </div>
        </div>
        <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold tnum", delivered ? "bg-mint text-mint-ink" : "bg-lilac text-lilac-ink")}>
          {delivered ? "Delivered" : `${left} min`}
        </span>
      </div>
      {!delivered && (
        <div className="relative mt-4 h-2 rounded-full bg-canvas">
          <motion.div className="h-full rounded-full bg-violet" animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
          <motion.span className="absolute -top-[9px] grid h-6 w-6 place-items-center rounded-full bg-white text-violet shadow-card" animate={{ left: `clamp(0px, calc(${pct}% - 12px), calc(100% - 24px))` }} transition={{ duration: 0.6 }}>
            <Truck className="h-3.5 w-3.5" />
          </motion.span>
        </div>
      )}
      <div className="mt-2 text-[11.5px] text-ink-3">{delivered ? "Added to their stock" : "In transit"} · requested {timeAgo(r.createdAt)}</div>
    </div>
  );
}
