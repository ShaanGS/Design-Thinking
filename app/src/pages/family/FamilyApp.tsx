// Family app (guardian): shell with sidebar / bottom tabs, live overview, emergency takeover banner.
import { useEffect, useRef } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate, Link } from "react-router-dom";
import { Home as HomeIcon, FileHeart, Pill, CalendarDays, Users, Siren, ChevronRight, RefreshCw } from "lucide-react";
import { useOverview } from "../../lib/data";
import { useConnected } from "../../lib/socket";
import { useAuth } from "../../lib/auth";
import { Avatar, Button, Logo, Spinner, cx, useToast } from "../../components/ui";
import { CONDITION_INFO } from "../../../shared/types";
import VaultPage from "../vault/VaultPage";
import { FamilyCtx, ACTIVE_STATUSES } from "./ctx";
import Home from "./Home";
import EmergencyPage from "./Emergency";
import Meds from "./Meds";
import Visits from "./Visits";
import Family from "./Family";

const TABS = [
  { to: "/family", label: "Home", icon: HomeIcon, end: true },
  { to: "/family/vault", label: "Vault", icon: FileHeart },
  { to: "/family/meds", label: "Medicines", icon: Pill },
  { to: "/family/visits", label: "Visits", icon: CalendarDays },
  { to: "/family/family", label: "Family", icon: Users },
];

export default function FamilyApp() {
  const { data, error, reload } = useOverview();
  const connected = useConnected();
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const seenEmergency = useRef<string | null | undefined>(undefined);

  const em = data?.emergency && ACTIVE_STATUSES.includes(data.emergency.status) ? data.emergency : null;

  // Jump to the live emergency view the first time a new emergency appears.
  useEffect(() => {
    if (!data) return;
    const id = em?.id ?? null;
    if (seenEmergency.current === undefined) { seenEmergency.current = id; return; }
    if (id && id !== seenEmergency.current) {
      toast(`${data.patient.nickname} needs help. Opening the live emergency view.`, "sos");
      try { navigator.vibrate?.([300, 120, 300]); } catch { /* not supported */ }
      if (!loc.pathname.startsWith("/family/emergency")) nav("/family/emergency");
    }
    seenEmergency.current = id;
  }, [em?.id, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return (
      <div className="grid h-full place-items-center p-6 text-center">
        {error ? (
          <div className="flex flex-col items-center gap-3">
            <p className="font-semibold">Couldn't load the family dashboard</p>
            <p className="text-sm text-ink-2">{error}</p>
            <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => reload()}>Try again</Button>
          </div>
        ) : <Spinner className="h-8 w-8" />}
      </div>
    );
  }

  const p = data.patient;
  return (
    <FamilyCtx.Provider value={{ data, reload }}>
      <div className="min-h-full lg:flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
          <Logo sub="Family" />
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-paper p-3">
            <Avatar name={p.nickname} size={44} />
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.nickname}</div>
              <div className="truncate text-xs text-ink-2">{p.name} · {p.age}</div>
            </div>
          </div>
          <nav className="mt-6 flex flex-col gap-1">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors", isActive ? "bg-ink text-white" : "text-ink-2 hover:bg-ink/5 hover:text-ink")}>
                <t.icon className="h-5 w-5" />{t.label}
                {t.to === "/family/vault" && data.insightsCount > 0 && <span className="ml-auto rounded-full bg-sos px-2 text-xs text-white">{data.insightsCount}</span>}
              </NavLink>
            ))}
            {em && (
              <NavLink to="/family/emergency" className={({ isActive }) => cx("mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold", isActive ? "bg-sos text-white" : "bg-sos-50 text-sos")}>
                <Siren className="h-5 w-5" />Emergency
              </NavLink>
            )}
          </nav>
          <div className="mt-auto flex items-center gap-2 text-xs text-ink-2">
            <span className={cx("h-2 w-2 rounded-full", connected ? "bg-teal" : "bg-warn")} />
            {connected ? "Live updates on" : "Reconnecting…"}
            <span className="ml-auto truncate">{user?.name}</span>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-10">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-[500] flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur safe-top lg:hidden">
            <Avatar name={p.nickname} size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-display text-lg font-bold">{p.nickname}'s care</div>
              <div className="flex items-center gap-1.5 text-xs text-ink-2"><span className={cx("h-1.5 w-1.5 rounded-full", connected ? "bg-teal" : "bg-warn")} />{connected ? "Live" : "Reconnecting…"} · {data.family.name}</div>
            </div>
            <img src="/icons/icon.svg" alt="" width={30} height={30} className="rounded-lg" />
          </header>

          {em && !loc.pathname.startsWith("/family/emergency") && (
            <Link to="/family/emergency" className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-sos px-4 py-3 text-white shadow-card sm:mx-6 lg:mx-8">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 animate-pulsering"><Siren className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{p.nickname} pressed SOS</div>
                <div className="truncate text-sm text-white/85">
                  {em.triage ? CONDITION_INFO[em.triage.condition]?.label : "Finding the right hospital…"}
                  {em.etaLeftMin != null && em.status === "dispatched" ? ` · ambulance in ${em.etaLeftMin} min` : ""}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </Link>
          )}

          <main className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8 lg:pt-8">
            <Routes>
              <Route index element={<Home />} />
              <Route path="vault/*" element={<VaultPage />} />
              <Route path="meds" element={<Meds />} />
              <Route path="visits" element={<Visits />} />
              <Route path="family" element={<Family />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
        </div>

        {/* Mobile bottom tabs */}
        <nav className="fixed inset-x-0 bottom-0 z-[600] grid grid-cols-5 border-t border-line bg-white/95 backdrop-blur safe-bottom lg:hidden">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => cx("relative flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-semibold", isActive ? "text-ink" : "text-ink-3")}>
              {({ isActive }) => (<>
                <t.icon className={cx("h-6 w-6", isActive && "text-brand-600")} strokeWidth={isActive ? 2.4 : 2} />
                {t.label}
                {t.to === "/family/vault" && data.insightsCount > 0 && <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-sos" />}
              </>)}
            </NavLink>
          ))}
        </nav>
      </div>
    </FamilyCtx.Provider>
  );
}
