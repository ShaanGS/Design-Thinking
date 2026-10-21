// Check my pulse: 20-second selfie heart-rate reading, saved to her record.
import { useState } from "react";
import { api } from "../../lib/api";
import { fmtDateTime } from "../../lib/format";
import FacePulse from "../../components/FacePulse";
import { useToast, cx } from "../../components/ui";
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
    catch (e) { toast((e as Error).message, "warn"); }
  }
  const fine = result != null && result >= 50 && result <= 110;

  return (
    <SubScreen ta="நாடித்துடிப்பு பார்" en="Check my pulse">
      <p className="-mt-1 text-[18px] leading-snug"><Bi ta="முகத்தை கோட்டுக்குள் வைத்து 20 விநாடி அசையாமல் இருங்கள்." en="Keep your face inside the outline and stay still for 20 seconds." /></p>
      <FacePulse big onResult={(b) => void save(b)} />

      {result != null && (
        <section className={cx("animate-slidein border-l-4 py-1 pl-4", fine ? "border-teal" : "border-warn")}>
          <p className="text-[24px] font-bold leading-tight">
            {fine ? <Bi ta={`நன்று! உங்கள் நாடி ${result}`} en={`Good. Your pulse is ${result}`} /> : <Bi ta={`உங்கள் நாடி ${result}. குடும்பத்துக்கு சொல்கிறேன்.`} en={`Your pulse is ${result}. I'll let your family know.`} />}
          </p>
          {usual && <p className="mt-1 text-[17px] text-ink-2"><Bi inline ta={`வழக்கமாக சுமார் ${usual}`} en={`Your usual is about ${usual}`} /></p>}
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="text-[20px] font-semibold"><Bi inline ta="முந்தைய அளவீடுகள்" en="Recent readings" /></h2>
          <ul className="mt-2 border-t border-line">
            {history.map((v) => (
              <li key={v.id} className="flex items-baseline gap-2 border-b border-line py-3">
                <span className="font-display text-[28px] font-semibold leading-none tnum">{v.value}</span>
                <span className="text-[15px] text-ink-3">bpm</span>
                <span className="ml-auto text-right text-[15px] text-ink-2">{fmtDateTime(v.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SubScreen>
  );
}
