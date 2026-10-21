// My emergency card: the five facts a paramedic needs, plus a QR any phone camera reads offline.
import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { api } from "../../lib/api";
import QR from "../../components/QR";
import { Spinner } from "../../components/ui";
import type { Medication } from "../../../shared/types";
import { Bi, SubScreen, useElder } from "./shared";

const ascii = (s: string) => s.replace(/[^\x20-\x7E\n]/g, "-");

export default function Card() {
  const { data } = useElder();
  const [meds, setMeds] = useState<Medication[] | null>(null);
  useEffect(() => { api.get<Medication[]>("/api/meds").then(setMeds).catch(() => setMeds([])); }, []);
  const p = data?.patient;
  if (!p || !data) return <SubScreen ta="என் அவசர அட்டை" en="My emergency card"><div className="grid place-items-center py-16"><Spinner className="h-8 w-8" /></div></SubScreen>;

  const family = data.members.filter((m) => m.role === "guardian" && m.phone);
  const thinners = (meds || []).filter((m) => /clopidogrel|aspirin|warfarin|apixaban|rivaroxaban|dabigatran/i.test(`${m.name} ${m.generic}`));
  const qrText = ascii([
    "SAATHI EMERGENCY CARD",
    `${p.name}, ${p.sex}, ${p.age}. Blood: ${p.blood}`,
    `ALLERGY: ${p.allergies.join(", ") || "none known"}`,
    thinners.length ? `BLOOD THINNER: ${thinners.map((m) => `${m.name} ${m.dose}`).join(", ")}` : "",
    `Conditions: ${p.conditions.join("; ")}`,
    `Meds: ${(meds || []).map((m) => `${m.name} ${m.dose}`).join(", ")}`,
    `Call: ${family.slice(0, 2).map((m) => `${m.name} (${m.relation}) ${m.phone}`).join("; ")}`,
  ].filter(Boolean).join("\n")).slice(0, 700);

  return (
    <SubScreen ta="என் அவசர அட்டை" en="My emergency card">
      <p className="text-base text-ink-2"><Bi ta="இதை குளிர்சாதனப் பெட்டியில் ஒட்டுங்கள். இணையம் இல்லாமலும் எந்த போன் கேமராவும் படிக்கும்." en="Stick this on the fridge. Any phone camera can read the code, even without internet." /></p>

      <article className="overflow-hidden rounded-3xl border-2 border-ink bg-white shadow-card">
        <div className="flex items-center justify-between bg-sos px-4 py-2.5 text-white">
          <span className="font-display text-lg font-bold tracking-wide">EMERGENCY CARD</span>
          <span className="font-tamil text-base font-semibold">அவசர அட்டை</span>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-line bg-white p-1.5">
              {meds ? <QR text={qrText} size={132} /> : <div className="grid h-[132px] w-[132px] place-items-center"><Spinner /></div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-2xl font-extrabold leading-tight">{p.name}</div>
              <div className="mt-1 text-base text-ink-2">{p.sex === "F" ? "Female" : "Male"} · {p.age} yrs</div>
              <div className="mt-3 inline-flex items-baseline gap-2 rounded-2xl bg-sos-50 px-3 py-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-sos">Blood</span>
                <span className="font-display text-3xl font-extrabold leading-none text-sos">{p.blood}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-sos bg-sos-50 p-3">
            <div className="text-xs font-bold uppercase tracking-wide text-sos">Allergies · <span className="font-tamil">ஒவ்வாமை</span></div>
            <div className="mt-0.5 text-xl font-bold text-sos">{p.allergies.join(", ") || "None known"}</div>
          </div>

          {thinners.length > 0 && (
            <div className="rounded-2xl border-2 border-warn bg-warn-50 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-warn">On blood thinner</div>
              <div className="mt-0.5 text-lg font-bold text-warn">{thinners.map((m) => `${m.name} ${m.dose}`).join(", ")}</div>
            </div>
          )}

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-3">Conditions</div>
            <ul className="mt-1 flex flex-col gap-0.5 text-[17px]">{p.conditions.map((c) => <li key={c}>• {c}</li>)}</ul>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-3">Current medicines</div>
            {meds === null ? <Spinner className="mt-2" /> : (
              <ul className="mt-1 grid grid-cols-1 gap-1.5">
                {meds.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-[17px]">
                    <span className="h-3.5 w-6 shrink-0 rounded-full border border-black/15" style={{ background: m.color }} />
                    <span className="font-semibold">{m.name} {m.dose}</span>
                    <span className="truncate text-sm text-ink-2">· {m.slots.join(" + ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink-3">Call · <span className="font-tamil">அழைக்க</span></div>
            <ul className="mt-1 flex flex-col gap-2">
              {family.map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2">
                  <Phone className="h-5 w-5 text-teal" />
                  <span className="min-w-0 flex-1"><span className="font-bold">{m.name}</span> <span className="text-sm text-ink-2">({m.relation})</span></span>
                  <a href={`tel:${m.phone!.replace(/\s/g, "")}`} className="select-all font-mono text-base font-semibold text-teal">{m.phone}</a>
                </li>
              ))}
            </ul>
          </div>
          {p.abha && <div className="border-t border-line pt-3 text-sm text-ink-2">ABHA: <span className="font-mono">{p.abha}</span></div>}
        </div>
      </article>
      <p className="text-center text-sm text-ink-3"><Bi inline ta="படம் எடுத்து அச்சிடுங்கள்" en="Take a screenshot and print it" /></p>
    </SubScreen>
  );
}
