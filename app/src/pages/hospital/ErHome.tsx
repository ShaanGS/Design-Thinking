// ER home: who's on duty and where, the incoming patient (the big red card), the network at a glance, then everything the ER needs before arrival.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { useConnected } from "../../lib/socket";
import { fmtTime } from "../../lib/format";
import { Avatar, cx } from "../../components/ui";
import { Art, BottomSheet, Section, Sheet, StatCard, Tile, VioletHeader } from "../../components/kit";
import { STATUS_LABEL, useHospital } from "./ctx";
import { BriefCard, CaseRow, CaseSteps, IncomingHero, QuietCard, RedFlags } from "./IncomingCard";
import { LiveMap, Ranking } from "./RoutePanel";

export default function ErHome() {
  const c = useHospital();
  const { user, signOut } = useAuth();
  const connected = useConnected();
  const nav = useNavigate();
  const { mine, elsewhere, closedToday, own, ownId, lead, stats, net } = c;
  const hospitals = net.hospitals;
  const file = lead ? c.fileFor(lead.patientId) : undefined;
  const others = mine.filter((e) => e.id !== lead?.id);
  const [peekId, setPeekId] = useState<string | null>(null);
  const peek = elsewhere.find((e) => e.id === peekId) || null;

  const displayName = (user?.name || "Doctor").replace(/\s*\(.*\)/, "");
  const shortName = /^dr\.?\s/i.test(displayName) ? displayName.split(" ").slice(0, 2).join(" ") : displayName.split(" ")[0];
  const enRoute = mine.filter((e) => e.status !== "admitted").length;
  const nextEta = mine.find((e) => e.status === "dispatched")?.etaLeftMin;

  return (
    <div>
      <VioletHeader>
        <div className="flex items-center gap-3">
          <Avatar name={user?.name || "Dr. Priya"} size={46} className="ring-2 ring-white/40" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[17px] font-bold">{shortName}</div>
            <div className="flex items-center gap-1.5 text-[12.5px] text-white/75">
              <span className={cx("h-1.5 w-1.5 rounded-full", connected ? "bg-[#5BE39A]" : "bg-butter animate-blink")} />{connected ? "Live" : "Reconnecting"} · {user?.relation || "ER"} on duty
            </div>
          </div>
          <button aria-label="Sign out" onClick={async () => { await signOut(); nav("/"); }} className="glass grid h-11 w-11 place-items-center rounded-full"><LogOut className="h-[18px] w-[18px]" /></button>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <Art name="hospital" size={48} className="shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="font-display text-[19px] font-extrabold">{own?.name || "Saathi network"}</div>
            <div className="text-[12.5px] text-white/75">{own?.kind || "Emergency desk"}</div>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {lead && <IncomingHero key={lead.id} e={lead} file={file} hospitals={hospitals} />}
        </AnimatePresence>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard tone={enRoute ? "rose" : "lilac"} label="Coming to you" value={mine.length} note={enRoute ? (nextEta != null ? `next in ${nextEta} min` : `${enRoute} on the way`) : mine.length ? "in your ER" : elsewhere.length ? `${elsewhere.length} elsewhere` : "none right now"} art="ambulance" />
          <StatCard tone="mint" label="Minutes saved" value={stats.savedToday} unit="min" note="today, by need-matched routing" art="heart" />
          <StatCard tone="sky" label="Free ICU beds" value={stats.freeIcu} note={own ? `${own.icuBeds} here · ${hospitals.length} hospitals` : `${hospitals.length} hospitals`} art="bed" onClick={() => nav("/hospital/network")} />
          <StatCard tone={stats.ownLow ? "peach" : "butter"} label="Below minimum" value={stats.lowCount} unit="items" note={own ? `${stats.ownLow} here · tap to relay` : "across the network"} art="pills" onClick={() => nav("/hospital/network")} />
        </div>
      </VioletHeader>

      <Sheet>
        {net.error && <p className="mb-3 rounded-3xl bg-peach px-4 py-3 text-[13.5px] text-peach-ink"><b>Couldn't refresh the network.</b> {net.error}</p>}

        {lead ? (
          <>
            {others.length > 0 && (
              <Section title={`Also coming to you (${others.length})`} className="!mt-0 mb-6">
                <div className="flex flex-col gap-2.5">{others.map((e) => <CaseRow key={e.id} e={e} hospitals={hospitals} mine file={c.fileFor(e.patientId)} onClick={() => c.select(e.id)} />)}</div>
              </Section>
            )}
            <Section title="Get ready" className="!mt-0">
              <CaseSteps e={lead} file={file} />
            </Section>
            <Section title="Red flags">
              <RedFlags file={file} />
            </Section>
            <Section title="Pre-arrival brief">
              <BriefCard e={lead} file={file} />
            </Section>
            <Section title="Live route" action={lead.route?.roads === false ? <span className="text-[12px] text-ink-3">straight-line estimate</span> : undefined}>
              <LiveMap e={lead} file={file} hospitals={hospitals} />
            </Section>
            <Section title={`Why ${own?.short || "this hospital"}`}>
              <Ranking e={lead} hospitals={hospitals} ownId={ownId} />
            </Section>
          </>
        ) : (
          <>
            <QuietCard hospitalShort={own?.short || "your ER"} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Tile tone="sky" art="hospital" artSize={64} title="Network" sub={`${hospitals.length} hospitals, beds and stock`} to="/hospital/network" />
              <Tile tone="butter" art="pills" artSize={60} title="Relays" sub={stats.ownLow ? `${stats.ownLow} item${stats.ownLow > 1 ? "s" : ""} low here` : "Medicines between hospitals"} to="/hospital/relays" />
            </div>
          </>
        )}

        {elsewhere.length > 0 && (
          <Section title="Elsewhere in the network" action={<span className="text-[12px] text-ink-3">details stay with that ER</span>}>
            <div className="flex flex-col gap-2.5">{elsewhere.map((e) => <CaseRow key={e.id} e={e} hospitals={hospitals} mine={false} onClick={() => setPeekId(e.id)} />)}</div>
          </Section>
        )}

        {closedToday.length > 0 && (
          <Section title="Handled today">
            <ul className="rounded-3xl bg-white px-4 shadow-card">
              {closedToday.map((e) => (
                <li key={e.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mint"><Art name="heart" size={32} /></span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[14px] font-bold">{e.triage?.label || "Emergency"}</div>
                    <div className="text-[12px] text-ink-3 tnum">SOS {fmtTime(e.startedAt)}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[12px] font-bold text-mint-ink tnum">{e.route?.savedMin ?? 0} min saved</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </Sheet>

      <BottomSheet open={!!peek} onClose={() => setPeekId(null)} title={peek ? `Going to ${hospitals.find((h) => h.id === peek.hospitalId)?.short || "a hospital"}` : ""} tall>
        {peek && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-3xl bg-canvas p-3">
              <Art name="ambulance" size={48} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-bold">{peek.triage?.label || "Finding out what happened"}</div>
                <div className="text-[12.5px] text-ink-2">{STATUS_LABEL[peek.status]}{peek.etaLeftMin != null && peek.status === "dispatched" ? ` · ${peek.etaLeftMin} min away` : ""} · SOS {fmtTime(peek.startedAt)}</div>
              </div>
            </div>
            <p className="text-[13px] text-ink-2">Patient details are shared only with the receiving ER. You can see how the network routed this case.</p>
            <LiveMap e={peek} file={undefined} hospitals={hospitals} height={220} />
            <Ranking e={peek} hospitals={hospitals} ownId={ownId} />
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
