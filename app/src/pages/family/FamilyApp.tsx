// Family app (guardian): left rail / bottom tabs, live overview, and the emergency strip.
import { useEffect, useRef } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate, Link } from "react-router-dom";
import { Home as HomeIcon, FileText, Pill, CalendarDays, Users, ArrowRight, RefreshCw } from "lucide-react";
import { useOverview } from "../../lib/data";
import { useConnected } from "../../lib/socket";
import { useAuth } from "../../lib/auth";
import { Button, Logo, Spinner, cx, useToast } from "../../components/ui";
import { CONDITION_INFO } from "../../../shared/types";
import VaultPage from "../vault/VaultPage";
import { FamilyCtx, ACTIVE_STATUSES } from "./ctx";
import Home from "./Home";
import EmergencyPage from "./Emergency";
import Meds from "./Meds";
import Visits from "./Visits";
import Family from "./Family";

const TABS = [
  { to: "/family", label: "Today", icon: HomeIcon, end: true },
  { to: "/family/vault", label: "Records", icon: FileText },
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
            <p className="font-semibold">Couldn't load the family app</p>
            <p className="text-sm text-ink-2">{error}</p>
            <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => reload()}>Try again</Button>
          </div>
        ) : <Spinner className="h-8 w-8" />}
      </div>
    );
  }

  const p = data.patient;
  const onEmergencyPage = loc.pathname.startsWith("/family/emergency");
  return (
    <FamilyCtx.Provider value={{ data, reload }}>
      <div className="min-h-full lg:flex">
        {/* Desktop rail */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-5 py-6 lg:flex">
          <Logo size={32} sub="Family" />
          <div className="mt-8">
            <div className="text-[13px] text-ink-2">Caring for</div>
            <div className="font-display text-[22px] font-semibold leading-tight">{p.nickname}</div>
            <div className="text-[13px] text-ink-2">{p.name}, {p.age}</div>
          </div>
          <nav className="-mx-2 mt-6 flex flex-col">
            {em && (
              <NavLink to="/family/emergency" className={({ isActive }) => cx("mb-1 flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] font-semibold text-sos", isActive && "bg-sos-50")}>
                <span className="relative flex h-5 w-5 items-center justify-center"><span className="h-2.5 w-2.5 rounded-full bg-sos animate-blink" /></span>Emergency
              </NavLink>
            )}
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end}
                className={({ isActive }) => cx("relative flex items-center gap-3 rounded-lg px-2 py-2 text-[15px] transition-colors",
                  isActive ? "bg-paper font-semibold text-ink before:absolute before:-left-3 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-ink" : "text-ink-2 hover:text-ink")}>
                <t.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />{t.label}
                {t.to === "/family/vault" && data.insightsCount > 0 && <span className="ml-auto text-[13px] text-ink-3 tnum" title="Questions for the doctor">{data.insightsCount}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto border-t border-line pt-4 text-[13px] text-ink-2">
            <div className="flex items-center gap-2"><span className={cx("h-2 w-2 rounded-full", connected ? "bg-teal" : "bg-warn animate-blink")} />{connected ? "Live" : "Reconnecting…"}</div>
            <div className="mt-1 truncate text-ink-3">Signed in as {user?.name}</div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-12">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-[500] flex items-center gap-3 border-b border-line bg-white px-4 py-2.5 safe-top lg:hidden">
            <img src="/icons/icon.svg" alt="" width={28} height={28} style={{ borderRadius: 7 }} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-display text-[19px] font-semibold">{p.nickname}</div>
              <div className="flex items-center gap-1.5 text-[12px] text-ink-2"><span className={cx("h-1.5 w-1.5 rounded-full", connected ? "bg-teal" : "bg-warn")} />{connected ? "Live" : "Reconnecting…"} · {data.family.name}</div>
            </div>
          </header>

          {em && !onEmergencyPage && (
            <Link to="/family/emergency" className="flex items-center gap-3 bg-sos px-4 py-3 text-white sm:px-6 lg:px-10">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white animate-blink" />
              <span className="min-w-0 flex-1 truncate text-[15px]">
                <b>{p.nickname} pressed the help button.</b>{" "}
                {em.triage ? CONDITION_INFO[em.triage.condition]?.label : "Finding the right hospital"}
                {em.etaLeftMin != null && em.status === "dispatched" ? ` · ambulance in ${em.etaLeftMin} min` : ""}
              </span>
              <span className="hidden shrink-0 font-semibold sm:inline">Open live view</span><ArrowRight className="h-5 w-5 shrink-0" />
            </Link>
          )}

          <main className="mx-auto max-w-[72rem] px-4 pt-5 sm:px-6 lg:px-10 lg:pt-10">
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
        <nav className="fixed inset-x-0 bottom-0 z-[600] grid grid-cols-5 border-t border-line bg-white safe-bottom lg:hidden">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end}
              className={({ isActive }) => cx("relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px]", isActive ? "font-semibold text-ink" : "text-ink-3")}>
              {({ isActive }) => (<>
                {isActive && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-ink" />}
                <t.icon className="h-[22px] w-[22px]" strokeWidth={isActive ? 2.1 : 1.75} />
                {t.label}
                {t.to === "/family/vault" && data.insightsCount > 0 && <span className="absolute right-[24%] top-2 h-2 w-2 rounded-full bg-brand ring-2 ring-white" />}
              </>)}
            </NavLink>
          ))}
        </nav>
      </div>
    </FamilyCtx.Provider>
  );
}
