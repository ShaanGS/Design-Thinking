// Map of the selected case plus the routing explanation: why this hospital, not the nearest.
import { MapPinned, Route as RouteIcon } from "lucide-react";
import type { Emergency, Hospital } from "../../../shared/types";
import { NEED_LABEL } from "../../../shared/types";
import MapView from "../../components/MapView";
import { Badge, Card, CardHeader, EmptyState, cx } from "../../components/ui";
import type { PatientFile } from "./useNetwork";

const PENALTY = 45;

export default function RoutePanel({ e, file, hospitals }: { e: Emergency | null; file: PatientFile | undefined; hospitals: Hospital[] }) {
  if (!e) {
    return (
      <Card>
        <CardHeader title="Routing" subtitle="Select a case to see its route" icon={<MapPinned className="h-5 w-5" />} />
        <div className="px-5 pb-5"><EmptyState icon={<RouteIcon className="h-6 w-6" />} title="No case selected">Saathi ranks hospitals by time to definitive treatment, not distance. A hospital that would have to refer the patient onward gets a +{PENALTY} min penalty.</EmptyState></div>
      </Card>
    );
  }
  const r = e.route;
  const name = (id: string) => hospitals.find((h) => h.id === id)?.short || id;
  const home = file ? { lat: file.record.patient.lat, lng: file.record.patient.lng, name: `${file.record.patient.nickname}'s home` } : null;
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Why here?"
        subtitle={r ? <>Needs <b className="text-ink">{r.needLabel}</b></> : "Routing as soon as the symptom is known"}
        icon={<RouteIcon className="h-5 w-5" />}
        action={r && r.savedMin > 0 ? <div className="text-right"><div className="font-display text-2xl font-bold leading-none text-teal tnum">~{r.savedMin} min</div><div className="text-[11px] text-ink-2">saved vs nearest</div></div> : undefined}
      />
      <div className="px-4">
        {home ? (
          <MapView home={home} hospitals={hospitals} chosenId={r?.hospitalId} nearestId={r?.nearestId} ambulance={e.ambulance} height={260} />
        ) : e.ambulance ? (
          <MapView home={e.ambulance} hospitals={hospitals} chosenId={r?.hospitalId} nearestId={r?.nearestId} ambulance={e.ambulance} height={260} />
        ) : <div className="grid h-[200px] place-items-center rounded-2xl bg-paper-2 text-sm text-ink-2">Map appears once the ambulance is dispatched</div>}
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1"><i className="inline-block h-1 w-5 rounded bg-teal" /> Chosen route</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-0 w-5 border-t-2 border-dashed border-warn" /> Nearest hospital</span>
          <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-full bg-sos" /> Ambulance</span>
        </div>
      </div>
      {r && (
        <div className="px-4 pb-4 pt-3">
          <ol className="flex flex-col gap-1.5">
            {r.ranking.map((o, i) => {
              const chosen = o.hospitalId === r.hospitalId, nearest = o.hospitalId === r.nearestId;
              return (
                <li key={o.hospitalId} className={cx("grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                  chosen ? "border-teal bg-teal-50" : o.missing.length ? "border-line bg-white" : "border-line bg-paper")}>
                  <span className={cx("font-mono text-xs", chosen ? "font-bold text-teal" : "text-ink-3")}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="truncate">{name(o.hospitalId)}</b>
                      {chosen && <Badge tone="ok">Chosen</Badge>}
                      {nearest && <Badge tone="warn">Nearest</Badge>}
                    </div>
                    <div className="text-xs text-ink-2">
                      {o.km} km · {o.etaMin} min drive
                      {o.missing.length ? <span className="text-sos"> · ✕ no {o.missing.map((m) => NEED_LABEL[m] || m).join(", ")} → +{PENALTY} min transfer</span> : <span className="text-teal"> · ✓ can treat</span>}
                    </div>
                  </div>
                  <span className={cx("font-mono text-sm tnum", chosen && "font-bold text-teal")}>{o.score}′</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-ink-3">Score = drive time + {PENALTY} min if that hospital would have to refer onward (+15 if no ICU bed). The paramedic can always override.</p>
        </div>
      )}
    </Card>
  );
}
