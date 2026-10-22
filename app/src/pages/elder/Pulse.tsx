// Check my pulse: a 20-second selfie heart-rate reading (Face Pulse), saved to her record for the family.
import { useState } from "react";
import { Check } from "lucide-react";
import { api } from "../../lib/api";
import { fmtDateTime } from "../../lib/format";
import FacePulse from "../../components/FacePulse";
import { useToast, cx } from "../../components/ui";
import { Art } from "../../components/kit";
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
    <SubScreen ta="நாடித்துடிப்பு பார்" en="Check my pulse" art="heart">
      <section className="rounded-[28px] bg-white p-4 shadow-card">
        <Bi ta="முகத்தை கோட்டுக்குள் வைத்து 20 விநாடி அசையாமல் இருங்கள்." en="Keep your face inside the outline and stay still for 20 seconds." className="mb-3 text-[19px] font-bold leading-snug" />
        <FacePulse big onResult={(b) => void save(b)} />
      </section>

      {result != null && (
        <section className={cx("flex items-center gap-3 rounded-[28px] p-4 animate-slidein", fine ? "bg-mint" : "bg-peach")}>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white">
            {fine ? <Check className="h-7 w-7 text-mint-ink" strokeWidth={3} /> : <Art name="heart" size={44} />}
          </span>
          <div className="min-w-0">
            <p className="text-[22px] font-extrabold leading-tight">
              {fine ? <Bi ta={`நன்று! உங்கள் நாடி ${result}`} en={`Good. Your pulse is ${result}`} /> : <Bi ta={`உங்கள் நாடி ${result}. குடும்பத்துக்கு சொல்கிறேன்.`} en={`Your pulse is ${result}. I'll let your family know.`} />}
            </p>
            {usual && <p className={cx("mt-1 text-[16px] font-semibold", fine ? "text-mint-ink" : "text-peach-ink")}><Bi inline ta={`வழக்கமாக சுமார் ${usual}`} en={`Your usual is about ${usual}`} /></p>}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="rounded-[28px] bg-white px-4 pb-2 pt-4 shadow-card">
          <h2 className="text-[20px] font-extrabold"><Bi ta="முந்தைய அளவீடுகள்" en="Recent readings" /></h2>
          <ul className="mt-2">
            {history.map((v) => (
              <li key={v.id} className="flex min-h-[60px] items-center gap-3 border-b border-line py-2 last:border-b-0">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose"><Art name="heart" size={30} /></span>
                <span className="font-display text-[28px] font-extrabold leading-none tnum">{v.value}</span>
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
