// Check my pulse: 20-second selfie heart-rate reading, saved to her record.
import { useState } from "react";
import { HeartPulse } from "lucide-react";
import { api } from "../../lib/api";
import { fmtDateTime } from "../../lib/format";
import FacePulse from "../../components/FacePulse";
import { Card, useToast } from "../../components/ui";
import type { Vital } from "../../../shared/types";
import { Bi, SubScreen, useElder, useT } from "./shared";

export default function Pulse() {
  const { data, reload } = useElder();
  const toast = useToast();
  const t = useT();
  const [result, setResult] = useState<number | null>(null);
  const history = (data?.vitals || []).filter((v) => v.type === "hr").slice(0, 5);
  const usual = history.length ? Math.round(history.reduce((n, v) => n + v.value, 0) / history.length) : null;

  async function save(bpm: number) {
    setResult(bpm);
    try { await api.post<Vital>("/api/vitals", { type: "hr", value: bpm, source: "Face Pulse" }); reload(); toast(t("சேமிக்கப்பட்டது. குடும்பத்துக்கு தெரியும்.", "Saved. Your family can see it."), "ok"); }
    catch (e) { toast((e as Error).message, "sos"); }
  }
  const fine = result != null && result >= 50 && result <= 110;

  return (
    <SubScreen ta="நாடித்துடிப்பு பார்" en="Check my pulse">
      <p className="text-lg text-ink-2"><Bi ta="முகத்தை ஓவலுக்குள் வைத்து 20 விநாடி அசையாமல் இருங்கள்" en="Keep your face in the oval and stay still for 20 seconds" /></p>
      <Card className="p-4"><FacePulse big onResult={(b) => void save(b)} /></Card>

      {result != null && (
        <div className={fine ? "rounded-3xl bg-teal p-5 text-white animate-slidein" : "rounded-3xl bg-warn p-5 text-white animate-slidein"}>
          <div className="text-2xl font-bold leading-tight">
            {fine ? <Bi ta={`நன்று! உங்கள் நாடி ${result}`} en={`Good! Your pulse is ${result}`} /> : <Bi ta={`உங்கள் நாடி ${result}. குடும்பத்துக்கு சொல்கிறேன்.`} en={`Your pulse is ${result}. I'll let your family know.`} />}
          </div>
          {usual && <p className="mt-1 text-base opacity-90"><Bi inline ta={`வழக்கமாக ${usual} இருக்கும்`} en={`Your usual is about ${usual}`} /></p>}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3"><Bi inline ta="முந்தைய அளவீடுகள்" en="Recent readings" /></h2>
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {history.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <HeartPulse className="h-6 w-6 text-sos" />
                <span className="font-display text-2xl font-bold tnum">{v.value}</span>
                <span className="text-sm text-ink-2">bpm</span>
                <span className="ml-auto text-right text-sm text-ink-2">{fmtDateTime(v.at)}<br /><span className="text-xs text-ink-3">{v.source}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SubScreen>
  );
}
