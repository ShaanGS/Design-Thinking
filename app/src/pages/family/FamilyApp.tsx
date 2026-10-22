// Family app (guardian): a phone app with a floating tab bar; jumps to the live emergency view when one starts.
import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home as HomeIcon, FileText, Pill, Users, Plus, RefreshCw, ChevronRight } from "lucide-react";
import { useOverview } from "../../lib/data";
import { Button, Spinner, useToast } from "../../components/ui";
import { Art, PhoneFrame, TabBar } from "../../components/kit";
import { CONDITION_INFO } from "../../../shared/types";
import VaultPage from "../vault/VaultPage";
import { FamilyCtx, ACTIVE_STATUSES } from "./ctx";
import Home from "./Home";
import EmergencyPage from "./Emergency";
import Meds from "./Meds";
import Visits from "./Visits";
import Family from "./Family";
import AddSheet from "./AddSheet";
import { StageLabel } from "../Landing";

export default function FamilyApp() {
  const { data, error, reload } = useOverview();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const seenEmergency = useRef<string | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  const em = data?.emergency && ACTIVE_STATUSES.includes(data.emergency.status) ? data.emergency : null;

  // Jump to the live emergency view the first time a new emergency appears.
  useEffect(() => {
    if (!data) return;
    const id = em?.id ?? null;
    if (seenEmergency.current === undefined) { seenEmergency.current = id; return; }
    if (id && id !== seenEmergency.current) {
      toast(`${data.patient.nickname} needs help. Opening the live view.`, "sos");
      try { navigator.vibrate?.([300, 120, 300]); } catch { /* not supported */ }
      if (!loc.pathname.startsWith("/family/emergency")) nav("/family/emergency");
    }
    seenEmergency.current = id;
  }, [em?.id, data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each tab starts at the top
  useEffect(() => { document.querySelector(".phone-scroll")?.scrollTo(0, 0); window.scrollTo(0, 0); }, [loc.pathname]);

  const label = <StageLabel who="karthik" title="Family app" text="Karthik in Bengaluru sees how Paati is doing, her medicines and records, and follows any emergency live." />;

  if (!data) {
    return (
      <PhoneFrame label={label}>
        <div className="grid h-full min-h-[60vh] place-items-center p-6 text-center">
          {error ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-bold">Couldn't load the family app</p>
              <p className="text-sm text-ink-2">{error}</p>
              <Button variant="outline" icon={<RefreshCw className="h-4 w-4" />} onClick={() => reload()}>Try again</Button>
            </div>
          ) : <Spinner className="h-8 w-8 text-violet" />}
        </div>
      </PhoneFrame>
    );
  }

  const p = data.patient;
  const onEmergencyPage = loc.pathname.startsWith("/family/emergency");
  return (
    <FamilyCtx.Provider value={{ data, reload }}>
      <PhoneFrame label={label}>
        <div className="relative min-h-full">
          {em && !onEmergencyPage && (
            <Link to="/family/emergency" className="fixed inset-x-3 top-3 z-[700] safe-top">
              <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="flex items-center gap-3 rounded-[22px] bg-sos px-3 py-2.5 text-white shadow-sos">
                <Art name="siren" size={40} className="shrink-0" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[14px] font-bold">{p.nickname} pressed help</div>
                  <div className="truncate text-[12px] text-white/85">
                    {em.triage ? CONDITION_INFO[em.triage.condition]?.label : "Finding the right hospital"}
                    {em.etaLeftMin != null && em.status === "dispatched" ? ` · ambulance in ${em.etaLeftMin} min` : ""}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0" />
              </motion.div>
            </Link>
          )}

          <Routes>
            <Route index element={<Home onAdd={() => setAdding(true)} />} />
            <Route path="vault/*" element={<VaultPage />} />
            <Route path="meds" element={<Meds />} />
            <Route path="visits" element={<Visits />} />
            <Route path="family" element={<Family />} />
            <Route path="emergency" element={<EmergencyPage />} />
            <Route path="*" element={<Home onAdd={() => setAdding(true)} />} />
          </Routes>

          {!onEmergencyPage && (
            <TabBar
              items={[
                { to: "/family", label: "Home", icon: HomeIcon, end: true },
                { to: "/family/vault", label: "Records", icon: FileText, dot: data.insightsCount > 0 },
                { to: "/family/meds", label: "Meds", icon: Pill },
                { to: "/family/family", label: "Family", icon: Users },
              ]}
              center={
                <motion.button whileTap={{ scale: 0.9 }} aria-label="Add" onClick={() => setAdding(true)}
                  className="grid h-12 w-12 place-items-center rounded-full bg-violet text-white shadow-[0_10px_20px_-6px_rgba(91,71,230,.8)]">
                  <Plus className="h-6 w-6" strokeWidth={2.4} />
                </motion.button>
              }
            />
          )}
          <AddSheet open={adding} onClose={() => setAdding(false)} />
        </div>
      </PhoneFrame>
    </FamilyCtx.Provider>
  );
}
