// My emergency card: the facts a paramedic needs, laid out like a printed card, plus a QR any phone camera reads offline.
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import QR from "../../components/QR";
import { Spinner } from "../../components/ui";
import type { Medication } from "../../../shared/types";
import { Bi, SubScreen, useElder } from "./shared";

const ascii = (s: string) => s.replace(/[^\x20-\x7E\n]/g, "-");

function Row({ label, ta, children }: { label: string; ta: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 border-b border-line py-3 last:border-b-0">
      <div className="pt-0.5 text-[13px] leading-tight text-ink-2">{label}<br /><span className="font-tamil">{ta}</span></div>
      <div className="min-w-0 text-[17px] leading-snug">{children}</div>
    </div>
  );
}

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
      <p className="-mt-1 text-[17px] leading-snug text-ink-2"><Bi ta="இதை குளிர்சாதனப் பெட்டியில் ஒட்டுங்கள். இணையம் இல்லாமலும் எந்த போன் கேமராவும் படிக்கும்." en="Stick this on the fridge. Any phone camera can read the code, even without internet." sub="text-[14px]" /></p>

      <article className="rounded-lg border-[1.5px] border-ink bg-white">
        <header className="flex items-center justify-between border-b-[1.5px] border-ink px-4 py-2.5">
          <span className="font-display text-[17px] font-bold" style={{ fontStretch: "90%" }}>EMERGENCY CARD</span>
          <span className="font-tamil text-[15px] font-semibold">அவசர அட்டை</span>
        </header>
        <div className="flex items-start gap-4 border-b border-line px-4 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[24px] font-bold leading-tight">{p.name}</div>
            <div className="mt-0.5 text-[15px] text-ink-2">{p.sex === "F" ? "Female" : "Male"}, {p.age} years</div>
            <div className="mt-3 text-[13px] text-ink-2">Blood group</div>
            <div className="font-display text-[34px] font-bold leading-none">{p.blood}</div>
          </div>
          <div className="shrink-0">
            {meds ? <QR text={qrText} size={128} /> : <div className="grid h-[128px] w-[128px] place-items-center"><Spinner /></div>}
          </div>
        </div>
        <div className="px-4">
          <Row label="Allergy" ta="ஒவ்வாமை"><span className="font-bold text-sos">{p.allergies.join(", ") || "None known"}</span></Row>
          {thinners.length > 0 && <Row label="Blood thinner" ta="இரத்தம் மெலிதல்"><span className="font-bold">{thinners.map((m) => `${m.name} ${m.dose}`).join(", ")}</span></Row>}
          <Row label="Conditions" ta="நோய்கள்">
            <ul>{p.conditions.map((c) => <li key={c}>{c}</li>)}</ul>
          </Row>
          <Row label="Medicines" ta="மாத்திரைகள்">
            {meds === null ? <Spinner /> : (
              <ul className="flex flex-col gap-1">
                {meds.map((m) => (
                  <li key={m.id} className="flex items-start gap-2">
                    <span className="mt-[7px] h-3 w-5 shrink-0 rounded-full border border-black/15" style={{ background: m.color }} />
                    <span className="min-w-0 leading-tight"><span className="font-semibold">{m.name}</span> <span className="whitespace-nowrap">{m.dose}</span>
                      <span className="block text-[13px] text-ink-3">{m.slots.join(" + ")}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
          <Row label="Call" ta="அழைக்க">
            <ul className="flex flex-col gap-1.5">
              {family.map((m) => (
                <li key={m.id}>
                  <span className="font-semibold">{m.name}</span> <span className="text-ink-2">({m.relation})</span><br />
                  <a href={`tel:${m.phone!.replace(/\s/g, "")}`} className="select-all font-mono text-[16px] text-info">{m.phone}</a>
                </li>
              ))}
            </ul>
          </Row>
          {p.abha && <Row label="ABHA ID" ta="ஆபா"><span className="font-mono text-[15px]">{p.abha}</span></Row>}
        </div>
      </article>
      <p className="text-center text-[15px] text-ink-3"><Bi inline ta="ஸ்கிரீன்ஷாட் எடுத்து அச்சிடுங்கள்" en="Take a screenshot and print it" /></p>
    </SubScreen>
  );
}
