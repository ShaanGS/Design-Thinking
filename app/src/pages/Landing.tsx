// Sign-in: one-tap demo personas, join a family by code, create a family, or hospital staff login.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, HeartHandshake, Smartphone, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import { Button, Field, Input, Logo, Modal, Segmented, Select, useToast, cx } from "../components/ui";
import type { Hospital, User } from "../../shared/types";

type AuthRes = { token: string; user: User; code?: string };

const PERSONAS = [
  { key: "elder", title: "Paati's phone", who: "Kamala, 72 · Tambaram", desc: "Large Tamil-first screen: the help button, today's tablets, talking to Saathi.", icon: Smartphone },
  { key: "guardian", title: "Family app", who: "Karthik, her son · Bengaluru", desc: "How she is today, her medicines, her full medical history, and live emergency tracking.", icon: HeartHandshake },
  { key: "hospital", title: "Hospital console", who: "Dr. Priya · Saraswathi ER", desc: "Patients on the way with their records, and beds and medicine stock across the network.", icon: Building2 },
] as const;

export default function Landing() {
  const { user, info, loading, signIn } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<"join" | "create" | "hospital" | null>(null);

  if (!loading && user) return <Navigate to={homeFor(user)} replace />;

  async function go(p: Promise<AuthRes>, key: string) {
    setBusy(key);
    try { const r = await p; signIn(r.token, r.user); if (r.code) toast(`Family created. Share code ${r.code} with relatives.`, "ok"); nav(homeFor(r.user)); }
    catch (e) { toast((e as Error).message, "sos"); }
    finally { setBusy(null); }
  }

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto grid min-h-full max-w-6xl gap-x-16 gap-y-8 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:grid-rows-[auto_1fr] lg:pt-10">
        <section className="flex flex-col lg:col-start-1 lg:row-start-1">
          <header className="flex items-center justify-between safe-top">
            <Logo size={38} sub="Care for your family" />
          </header>

          <div className="mt-10 lg:mt-20">
            <p className="text-[15px] text-ink-2">Design Thinking · Group 4 · SRM</p>
            <h1 className="mt-3 text-[44px] font-bold leading-[0.98] sm:text-[64px]" style={{ fontStretch: "80%" }}>
              When Paati needs help, everyone moves at once.
            </h1>
            <p className="mt-5 max-w-[34rem] text-[17px] leading-relaxed text-ink-2">
              Saathi checks on elders every day in their own language and keeps their medical history in one place. In an emergency it gets the family,
              the neighbour, the ambulance and the right hospital moving in the same minute.
            </p>
          </div>
        </section>

        <ol className="grid max-w-[34rem] content-start gap-0 border-t border-line lg:col-start-1 lg:row-start-2">
            {[
              ["Paati holds the help button", "On her phone, a pendant, or by telling Saathi she feels unwell."],
              ["Everyone hears at the same time", "Her son, the neighbour and 108, in one moment instead of a chain of calls."],
              ["The ambulance goes where she can be treated", "The nearest hospital with a cath lab, not just the nearest building. Her records arrive first."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[2.25rem_1fr] gap-x-2 border-b border-line py-4">
                <span className="font-display text-[22px] font-semibold leading-none text-ink-3 tnum">{i + 1}</span>
                <div><p className="font-semibold">{t}</p><p className="text-[15px] text-ink-2">{d}</p></div>
              </li>
            ))}
        </ol>

        <section className="flex flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-[7.5rem]">
          <div className="rounded-xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[20px] font-semibold">Open Saathi as</h2>
              <p className="text-[15px] text-ink-2">Use a different phone or tab for each. They update each other live.</p>
            </div>
            <ul>
              {PERSONAS.map((p) => (
                <li key={p.key} className="border-b border-line last:border-b-0">
                  <button disabled={!!busy} onClick={() => go(api.post<AuthRes>("/api/auth/demo", { persona: p.key }), p.key)}
                    className="group flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-paper disabled:opacity-60">
                    <p.icon className="mt-1 h-5 w-5 shrink-0 text-ink-2" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2"><span className="text-[17px] font-semibold">{p.title}</span><span className="text-[13px] text-ink-3">{p.who}</span></div>
                      <p className="text-[15px] leading-snug text-ink-2">{p.desc}</p>
                    </div>
                    <ArrowRight className={cx("mt-1 h-5 w-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink", busy === p.key && "animate-blink")} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 px-1 text-[15px]">
            <button className="font-semibold text-info hover:underline" onClick={() => setModal("join")}>Join with a family code</button>
            <button className="font-semibold text-info hover:underline" onClick={() => setModal("create")}>Set up a new family</button>
            <button className="font-semibold text-info hover:underline" onClick={() => setModal("hospital")}>Hospital staff sign-in</button>
          </div>
          {info && <p className="mt-auto pt-10 text-[13px] text-ink-3">AI: {info.ai === "claude" ? `Claude (${info.model})` : "demo mode. Add an API key on the server for live AI."}</p>}
        </section>
      </div>

      <JoinModal open={modal === "join"} onClose={() => setModal(null)} onSubmit={(p, k) => go(p, k)} busy={busy} />
      <CreateModal open={modal === "create"} onClose={() => setModal(null)} onSubmit={(p) => go(p, "create")} busy={busy} />
      <HospitalModal open={modal === "hospital"} onClose={() => setModal(null)} onSubmit={(p) => go(p, "hospital-login")} busy={busy} />
    </div>
  );
}

function JoinModal({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (p: Promise<AuthRes>, key: string) => void; busy: string | null }) {
  const [as, setAs] = useState<"family" | "elder">("family");
  const [code, setCode] = useState("KAMALA");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Grandchild");
  return (
    <Modal open={open} onClose={onClose} title="Join with a family code">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(as === "elder" ? api.post<AuthRes>("/api/auth/elder", { code }) : api.post<AuthRes>("/api/auth/join", { code, name, relation }), "join"); }}>
        <Segmented value={as} onChange={setAs} options={[{ value: "family", label: "I'm family" }, { value: "elder", label: "This is the elder's phone" }]} />
        <Field label="Family code" hint="The demo family's code is KAMALA"><Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={10} className="font-mono tracking-widest" /></Field>
        {as === "family" && <>
          <Field label="Your name"><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Divya" /></Field>
          <Field label="Relation"><Select value={relation} onChange={(e) => setRelation(e.target.value)}>{["Son", "Daughter", "Grandchild", "Neighbour", "Spouse", "Caregiver", "Friend"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
        </>}
        <Button type="submit" size="lg" loading={busy === "join"}>{as === "elder" ? "Open the elder's app" : "Join and get alerts"}</Button>
      </form>
    </Modal>
  );
}

function CreateModal({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (p: Promise<AuthRes>) => void; busy: string | null }) {
  const [f, setF] = useState({ elderName: "", nickname: "Amma", age: "70", sex: "F", blood: "", address: "", conditions: "", allergies: "", guardianName: "", relation: "Son", lat: "", lng: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setF((x) => ({ ...x, lat: String(p.coords.latitude), lng: String(p.coords.longitude) })));
  return (
    <Modal open={open} onClose={onClose} title="Set up Saathi for your family" wide>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit(api.post<AuthRes>("/api/auth/create-family", { ...f, conditions: f.conditions.split(",").map((s) => s.trim()), allergies: f.allergies.split(",").map((s) => s.trim()) })); }}>
        <Field label="Elder's full name"><Input value={f.elderName} onChange={set("elderName")} required placeholder="Kamala Ramasamy" /></Field>
        <Field label="What the family calls them"><Input value={f.nickname} onChange={set("nickname")} placeholder="Amma, Paati, Thatha…" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Age"><Input type="number" value={f.age} onChange={set("age")} min={40} max={110} /></Field>
          <Field label="Sex"><Select value={f.sex} onChange={set("sex")}><option value="F">F</option><option value="M">M</option></Select></Field>
          <Field label="Blood"><Input value={f.blood} onChange={set("blood")} placeholder="B+" /></Field>
        </div>
        <Field label="Home address" hint="Used to route ambulances"><Input value={f.address} onChange={set("address")} placeholder="Street, area, city" /></Field>
        <Field label="Conditions (comma separated)"><Input value={f.conditions} onChange={set("conditions")} placeholder="Diabetes, Hypertension" /></Field>
        <Field label="Allergies (comma separated)"><Input value={f.allergies} onChange={set("allergies")} placeholder="Penicillin" /></Field>
        <Field label="Your name"><Input value={f.guardianName} onChange={set("guardianName")} required /></Field>
        <Field label="Your relation"><Select value={f.relation} onChange={set("relation")}>{["Son", "Daughter", "Grandchild", "Spouse", "Caregiver"].map((r) => <option key={r}>{r}</option>)}</Select></Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="button" variant="soft" onClick={locate}>Use this phone's location as home</Button>
          <span className="text-sm text-ink-2">{f.lat ? `${(+f.lat).toFixed(4)}, ${(+f.lng).toFixed(4)}` : "Defaults to Tambaram, Chennai"}</span>
        </div>
        <Button type="submit" size="lg" className="sm:col-span-2" loading={busy === "create"}>Create family</Button>
      </form>
    </Modal>
  );
}

function HospitalModal({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (p: Promise<AuthRes>) => void; busy: string | null }) {
  const [list, setList] = useState<Hospital[]>([]);
  const [id, setId] = useState("h3");
  const [name, setName] = useState("");
  useEffect(() => { if (open && !list.length) fetch("/api/public/hospitals").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {}); }, [open, list.length]);
  return (
    <Modal open={open} onClose={onClose} title="Hospital staff sign-in">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(api.post<AuthRes>("/api/auth/hospital", { hospitalId: id, name })); }}>
        <Field label="Hospital"><Select value={id} onChange={(e) => setId(e.target.value)}>{(list.length ? list : [{ id: "h3", name: "Saraswathi Multispeciality Hospital" } as Hospital]).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</Select></Field>
        <Field label="Your name and role"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Priya, ER" required /></Field>
        <Button type="submit" size="lg" loading={busy === "hospital-login"}>Open the console</Button>
      </form>
    </Modal>
  );
}
