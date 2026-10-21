// Map of the selected case plus the routing explanation as a ranked table: why this hospital, not the nearest.
import type { Emergency, Hospital } from "../../../shared/types";
import { NEED_LABEL } from "../../../shared/types";
import MapView from "../../components/MapView";
import { cx } from "../../components/ui";
import type { PatientFile } from "./useNetwork";

const PENALTY = 45;

export default function RoutePanel({ e, file, hospitals }: { e: Emergency | null; file: PatientFile | undefined; hospitals: Hospital[] }) {
  const r = e?.route;
  const name = (id: string) => hospitals.find((h) => h.id === id)?.short || id;
  const home = file ? { lat: file.record.patient.lat, lng: file.record.patient.lng, name: `${file.record.patient.nickname}'s home` } : null;

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold leading-tight">{r ? `Why ${name(r.hospitalId)}` : "Routing"}</h2>
          <p className="text-[14px] text-ink-2">{r ? <>Needs <span className="font-semibold text-ink">{r.needLabel}</span>. Ranked by time to treatment, not distance.</> : e ? "Ranking hospitals as soon as the symptom is known." : "Select a patient to see how they were routed."}</p>
        </div>
        {r && r.savedMin > 0 && (
          <div className="shrink-0 text-right">
            <div className="font-display text-[30px] font-semibold leading-none tnum" style={{ fontStretch: "85%" }}>{r.savedMin}<span className="ml-0.5 text-[15px] font-medium text-ink-3">min</span></div>
            <div className="text-[12px] text-ink-2">saved vs nearest</div>
          </div>
        )}
      </header>

      {e && (
        <div className="px-4 pt-3 sm:px-5">
          {home ? <MapView home={home} hospitals={hospitals} chosenId={r?.hospitalId} nearestId={r?.nearestId} ambulance={e.ambulance} height={240} />
            : e.ambulance ? <MapView home={e.ambulance} hospitals={hospitals} chosenId={r?.hospitalId} nearestId={r?.nearestId} ambulance={e.ambulance} height={240} />
            : <div className="grid h-[180px] place-items-center rounded-[10px] bg-paper-2 text-[14px] text-ink-2">The map appears once the ambulance is dispatched</div>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[3px] w-5 rounded bg-ink" />Route taken</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 border-t-2 border-dashed border-warn" />Nearest hospital</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-sos" />Ambulance</span>
          </div>
        </div>
      )}

      {r ? (
        <div className="overflow-x-auto px-2 pb-3 pt-2 sm:px-3">
          <table className="w-full min-w-[440px] border-separate border-spacing-0 text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-3">
                <th className="px-2 py-2 font-medium">#</th>
                <th className="px-2 py-2 font-medium">Hospital</th>
                <th className="px-2 py-2 text-right font-medium">km</th>
                <th className="px-2 py-2 text-right font-medium">Drive</th>
                <th className="px-2 py-2 font-medium">Can treat</th>
                <th className="px-2 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {r.ranking.map((o, i) => {
                const chosen = o.hospitalId === r.hospitalId, nearest = o.hospitalId === r.nearestId;
                const td = cx("px-2 py-2", chosen ? "bg-ink text-white" : "border-t border-line");
                return (
                  <tr key={o.hospitalId}>
                    <td className={cx(td, "rounded-l-lg font-mono text-[12px] tnum", !chosen && "text-ink-3")}>{i + 1}</td>
                    <td className={cx(td, "font-semibold")}>{name(o.hospitalId)}{nearest && <span className={cx("ml-1.5 text-[12px] font-normal", chosen ? "text-white/70" : "text-ink-3")}>nearest</span>}</td>
                    <td className={cx(td, "text-right tnum")}>{o.km}</td>
                    <td className={cx(td, "text-right tnum")}>{o.etaMin} min</td>
                    <td className={td}>
                      {o.missing.length
                        ? <span className={chosen ? "text-brand" : "text-warn"}>No {o.missing.map((m) => NEED_LABEL[m] || m).join(", ")} → +{PENALTY}</span>
                        : <span className={chosen ? "text-white" : "text-teal"}>Yes</span>}
                    </td>
                    <td className={cx(td, "rounded-r-lg text-right font-display text-[16px] font-semibold tnum")}>{o.score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-2 pt-2 text-[12px] leading-snug text-ink-3">Score is minutes to definitive care: drive time, plus {PENALTY} if that hospital would have to refer her onward, plus 15 if it has no free ICU bed. The paramedic can always override.</p>
        </div>
      ) : (
        <p className="px-4 pb-4 pt-3 text-[14px] text-ink-2 sm:px-5">Each hospital is scored by drive time, plus {PENALTY} minutes if it would have to refer the patient onward. The lowest score wins.</p>
      )}
    </section>
  );
}
