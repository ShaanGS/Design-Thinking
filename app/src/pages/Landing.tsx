// Sign-in: one-tap demo personas, join a family by code, create a family, or hospital staff login.
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Building2, HeartHandshake, Smartphone, ArrowRight, Sparkles, ShieldCheck, Activity, FileHeart, Siren, Users } from "lucide-react";
import { api } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import { Badge, Button, Card, Field, Input, Logo, Modal, Segmented, Select, useToast, cx } from "../components/ui";
import type { Hospital, User } from "../../shared/types";

type AuthRes = { token: string; user: User; code?: string };

const PERSONAS = [
  { key: "elder", title: "Paati's phone", who: "Kamala, 72 · Tambaram", desc: "Huge buttons, Tamil voice. Hold SOS, confirm tablets, talk to Saathi, check her pulse.", icon: Smartphone, tone: "bg-brand-100 text-brand-700" },
  { key: "guardian", title: "Family app", who: "Karthik, son · Bengaluru", desc: "Live status, medicines, Health Vault, emergency tracking on a map.", icon: HeartHandshake, tone: "bg-teal-50 text-teal" },
  { key: "hospital", title: "Hospital console", who: "Dr. Priya · Saraswathi ER", desc: "Incoming patients with pre-arrival brief, network beds and medicine stock.", icon: Building2, tone: "bg-info-50 text-info" },
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
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <header className="flex items-center justify-between py-5 safe-top">
          <Logo sub="Care for your family" />
          {info && <Badge tone={info.ai === "claude" ? "ok" : "mute"} dot>{info.ai === "claude" ? `AI live · ${info.model}` : "Demo mode AI"}</Badge>}
        </header>

        <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:py-14">
          <div>
            <Badge tone="brand" className="mb-4"><Sparkles className="h-3.5 w-3.5" /> Design Thinking · Group 4</Badge>
            <h1 className="text-[40px] font-extrabold leading-[1.02] sm:text-6xl">No one should face an emergency alone.</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Saathi calls elders every day in their language, keeps their whole medical history in one place, and when something goes wrong,
              alerts the family, sends the records ahead and routes the ambulance to the hospital that can actually treat them.
            </p>
            <div className="mt-6 grid max-w-xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[{ i: Siren, t: "One-press SOS" }, { i: FileHeart, t: "Health Vault" }, { i: Activity, t: "Daily AI check-ins" }, { i: ShieldCheck, t: "Hospital network" }].map(({ i: I, t }) => (
                <div key={t} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-semibold shadow-card"><I className="h-4 w-4 text-brand-600" />{t}</div>
              ))}
            </div>
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-bold">Try it as…</h2>
            <p className="mb-4 text-sm text-ink-2">Open each one on a different phone or tab. They update each other live.</p>
            <div className="flex flex-col gap-3">
              {PERSONAS.map((p) => (
                <button key={p.key} disabled={!!busy} onClick={() => go(api.post<AuthRes>("/api/auth/demo", { persona: p.key }), p.key)}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-ink-3 hover:shadow-card disabled:opacity-60">
                  <div className={cx("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", p.tone)}><p.icon className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2"><span className="text-lg font-bold">{p.title}</span><span className="text-xs text-ink-3">{p.who}</span></div>
                    <p className="text-sm text-ink-2">{p.desc}</p>
                  </div>
                  <ArrowRight className={cx("h-5 w-5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5", busy === p.key && "animate-pulse")} />
                </button>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-3">
              <Button variant="outline" icon={<Users className="h-4 w-4" />} onClick={() => setModal("join")}>Join a family</Button>
              <Button variant="outline" icon={<HeartHandshake className="h-4 w-4" />} onClick={() => setModal("create")}>Set up a family</Button>
              <Button variant="outline" icon={<Building2 className="h-4 w-4" />} onClick={() => setModal("hospital")}>Hospital staff</Button>
            </div>
          </Card>
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
