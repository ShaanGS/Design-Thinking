// The elder's app (Paati's phone): Tamil-first, huge targets, live family and emergency state, in the soft-clay style.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useOverview } from "../../lib/data";
import { Spinner, Button, useToast } from "../../components/ui";
import { PhoneFrame } from "../../components/kit";
import { StageLabel } from "../Landing";
import type { Emergency } from "../../../shared/types";
import { Ctx, readLang, saveLang, ACTIVE, type ElderCtx, type Lang } from "./shared";
import Home from "./Home";
import Talk from "./Talk";
import Pulse from "./Pulse";
import Card from "./Card";
import { SymptomPicker, EmergencyScreen } from "./EmergencyView";
import { EscalationCall, FallWatcher } from "./Overlays";

export default function ElderApp() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, reload } = useOverview();
  const [lang, setLangState] = useState<Lang>(() => readLang());
  const [fallOn, setFallOn] = useState(false);
  const [local, setLocal] = useState<{ e: Emergency; at: number } | null>(null);

  const loc = useLocation();
  // Each screen starts at the top (inside the phone frame the scroller is .phone-scroll)
  useEffect(() => { document.querySelector(".phone-scroll")?.scrollTo(0, 0); window.scrollTo(0, 0); }, [loc.pathname]);

  const setLang = useCallback((l: Lang) => { setLangState(l); saveLang(l); }, []);

  const raiseSOS = useCallback(async (source: string, condition?: string) => {
    try {
      const e = await api.post<Emergency>("/api/sos", condition ? { source, condition } : { source });
      setLocal({ e, at: Date.now() });
      void reload();
      return e;
    } catch (err) { toast((err as Error).message, "warn"); return null; }
  }, [reload, toast]);

  // The server pushes the live emergency; right after pressing SOS we show our own copy until the push arrives.
  const live = data?.emergency && ACTIVE.includes(data.emergency.status) ? data.emergency : null;
  const emergency = live ?? (local && Date.now() - local.at < 5000 && ACTIVE.includes(local.e.status) ? local.e : null);
  useEffect(() => { if (live && local && live.id === local.e.id) setLocal(null); }, [live, local]);
  const overlayOn = !!emergency;
  useEffect(() => {
    if (!overlayOn) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [overlayOn]);
  const needsSymptom = emergency && emergency.status === "triage" && !emergency.symptomText;

  const ctx: ElderCtx = useMemo(() => ({ lang, setLang, data, reload: () => void reload(), raiseSOS, fallOn, setFallOn }), [lang, setLang, data, reload, raiseSOS, fallOn]);

  const label = <StageLabel who="paati" title="Paati's phone" text="Kamala, 72, in Tambaram. Big, simple buttons: hold the red button for help, take her tablets, talk to Saathi, check her pulse. Her emergency card's QR lets a stranger help her too." />;

  if (!data) {
    return (
      <PhoneFrame label={label}>
        <div className="grid h-full min-h-[60vh] place-items-center p-6 text-center">
          {error ? <div className="flex flex-col items-center gap-3"><p className="text-lg">{error}</p><Button variant="brand" size="lg" onClick={() => void reload()}>Try again</Button></div> : <Spinner className="h-10 w-10 text-violet" />}
        </div>
      </PhoneFrame>
    );
  }

  return (
    <Ctx.Provider value={ctx}>
      <PhoneFrame label={label}>
        <div className="relative flex min-h-full flex-col bg-canvas">
          <Routes>
            <Route index element={<Home />} />
            <Route path="talk" element={<Talk />} />
            <Route path="pulse" element={<Pulse />} />
            <Route path="card" element={<Card />} />
            <Route path="*" element={<Navigate to="/elder" replace />} />
          </Routes>
          {emergency && (needsSymptom ? <SymptomPicker key={emergency.id} emergency={emergency} /> : <EmergencyScreen emergency={emergency} />)}
          <EscalationCall />
          <FallWatcher />
        </div>
      </PhoneFrame>
    </Ctx.Provider>
  );
}
