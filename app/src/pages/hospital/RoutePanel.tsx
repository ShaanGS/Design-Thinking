// Live map of the case plus why this hospital: every hospital scored by minutes to definitive care, not distance.
import type { Emergency, Hospital } from "../../../shared/types";
import { NEED_LABEL } from "../../../shared/types";
import MapView from "../../components/MapView";
import { Art } from "../../components/kit";
import { cx } from "../../components/ui";
import type { PatientFile } from "./useNetwork";

const PENALTY = 45;

export function LiveMap({ e, file, hospitals, height = 230 }: { e: Emergency; file: PatientFile | undefined; hospitals: Hospital[]; height?: number }) {
  const r = e.route;
  const home = file ? { lat: file.record.patient.lat, lng: file.record.patient.lng, name: `${file.record.patient.nickname}'s home` } : e.ambulance;
  return (
    <div className="rounded-3xl bg-white p-2 shadow-card">
      {home ? (
        <div className="overflow-hidden rounded-[20px]">
          <MapView home={home} hospitals={hospitals} chosenId={r?.hospitalId} nearestId={r?.nearestId} ambulance={e.ambulance} path={r?.path} nearestPath={r?.nearestPath} height={height} />
        </div>
      ) : (
        <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded-[20px] bg-canvas text-center text-[13.5px] text-ink-2">
          <Art name="ambulance" size={56} />The map appears once the ambulance is dispatched
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 pt-2.5 text-[12px] font-semibold text-ink-2">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[4px] w-5 rounded-full bg-ink" />Ambulance route</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block w-5 border-t-[3px] border-dotted border-peach-ink" />To the nearest</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-full bg-sos" />Ambulance</span>
      </div>
    </div>
  );
}

export function Ranking({ e, hospitals, ownId }: { e: Emergency; hospitals: Hospital[]; ownId: string | null }) {
  const r = e.route;
  const name = (id: string) => hospitals.find((h) => h.id === id)?.short || id;
  if (!r) return <p className="rounded-3xl bg-white p-4 text-[14px] text-ink-2 shadow-card">Each hospital is scored by drive time, plus {PENALTY} minutes if it would have to refer the patient onward. The lowest score wins.</p>;
  return (
    <div className="rounded-3xl bg-white p-2 shadow-card">
      <ol>
        {r.ranking.map((o, i) => {
          const chosen = o.hospitalId === r.hospitalId, nearest = o.hospitalId === r.nearestId, you = o.hospitalId === ownId;
          return (
            <li key={o.hospitalId} className={cx("flex items-center gap-3 rounded-[20px] px-2.5 py-2.5", chosen && "bg-violet-50")}>
              <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[14px] font-extrabold", chosen ? "bg-violet text-white" : "bg-canvas text-ink-2")}>{i + 1}</span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14.5px] font-bold">{name(o.hospitalId)}</span>
                  {you && <span className="shrink-0 rounded-full bg-violet px-2 py-0.5 text-[10.5px] font-bold text-white">You</span>}
                  {nearest && <span className="shrink-0 rounded-full bg-butter px-2 py-0.5 text-[10.5px] font-bold text-butter-ink">Nearest</span>}
                </div>
                <div className="mt-0.5 text-[12px] text-ink-2"><span className="tnum">{o.km} km · {o.etaMin} min drive</span>
                  {o.missing.length
                    ? <span className="text-peach-ink"> · no {o.missing.map((m) => NEED_LABEL[m] || m).join(", ")} +{PENALTY}</span>
                    : <span className="text-mint-ink"> · can treat</span>}
                </div>
              </div>
              <div className="shrink-0 text-right leading-none">
                <div className={cx("font-display text-[20px] font-extrabold tnum", chosen ? "text-violet-700" : "text-ink")}>{o.score}</div>
                <div className="mt-0.5 text-[10.5px] text-ink-3">min to care</div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="px-2.5 pb-1.5 pt-1 text-[12px] leading-snug text-ink-3">Minutes to definitive care: drive time, plus {PENALTY} if that hospital would have to refer onward, plus 15 with no free ICU bed. The paramedic can always override.</p>
    </div>
  );
}
