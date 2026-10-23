// Sign-in: an app-style welcome screen. One tap opens a demo persona; "?as=elder" does it automatically (used by the stage view).
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MonitorSmartphone, LogOut } from "lucide-react";
import { api } from "../lib/api";
import { homeFor, useAuth } from "../lib/auth";
import { Button, Field, Input, Logo, Modal, Segmented, Select, useToast, cx } from "../components/ui";
import { Art, Person, PhoneFrame, type Who } from "../components/kit";
import type { Hospital, User } from "../../shared/types";

type AuthRes = { token: string; user: User; code?: string };

const PERSONAS: { key: "elder" | "guardian" | "hospital"; who: Who; title: string; person: string; desc: string; tone: string }[] = [
  { key: "elder", who: "paati", title: "Paati's phone", person: "Kamala, 72 · Tambaram", desc: "One big help button, tablets, talk to Saathi", tone: "bg-peach" },
  { key: "guardian", who: "karthik", title: "Family app", person: "Karthik, her son · Bengaluru", desc: "Her day, records, live emergency tracking", tone: "bg-sky" },
  { key: "hospital", who: "priya", title: "Hospital ER", person: "Dr. Priya · Saraswathi", desc: "Patients on the way, with records first", tone: "bg-lilac" },
];

/** Caption shown beside the phone on a laptop. */
export function StageLabel({ who, title, text }: { who: Who; title: string; text: string }) {
  const { signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div>
      <Person who={who} size={88} />
      <h2 className="mt-4 text-[28px] font-extrabold leading-tight">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{text}</p>
      <div className="mt-6 flex flex-col items-start gap-2">
        <Link to="/stage" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13.5px] font-semibold text-white"><MonitorSmartphone className="h-4 w-4" />All three phones at once</Link>
        <button onClick={async () => { await signOut(); nav("/"); }} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-semibold shadow-card"><LogOut className="h-4 w-4" />Switch app</button>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, info, loading, signIn } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState<"join" | "create" | "hospital" | null>(null);
  const auto = useRef(false);

  async function go(p: Promise<AuthRes>, key: string) {
    setBusy(key);
    try { const r = await p; signIn(r.token, r.user); if (r.code) toast(`Family created. Share code ${r.code} with relatives.`, "ok"); nav(homeFor(r.user)); }
    catch (e) { toast((e as Error).message, "warn"); }
    finally { setBusy(null); }
  }

  // ?as=elder|guardian|hospital signs straight in (each stage phone is an iframe with its own session)
  const as = params.get("as");
  useEffect(() => {
    if (loading || user || auto.current || !as || !PERSONAS.some((p) => p.key === as)) return;
    auto.current = true;
    void go(api.post<AuthRes>("/api/auth/demo", { persona: as }), as);
  }, [loading, user, as]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && user) return <Navigate to={homeFor(user)} replace />;

  const side = (
    <div>
      <Logo size={44} sub="Design Thinking · Group 4 · SRM" />
      <h2 className="mt-6 text-[30px] font-extrabold leading-tight">One button. The family, the ambulance and the right hospital move together.</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Pick a phone to open, or show all three side by side and press Paati's help button live.</p>
      <Link to="/stage" className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(91,71,230,.8)]"><MonitorSmartphone className="h-4 w-4" />Open all three phones</Link>
    </div>
  );

  return (
    <PhoneFrame label={side}>
      <div className="min-h-full bg-canvas">
        <div className="hero-violet relative overflow-hidden px-5 pb-16 pt-5 text-white safe-top">
          <div className="flex items-center justify-between">
            <Logo size={34} light />
            {info && <span className="glass rounded-full px-3 py-1 text-[11.5px] font-semibold">{info.ai === "claude" ? "Live AI" : "Demo mode"}</span>}
          </div>
          <div className="relative mx-auto mt-2 h-[270px] w-[270px]">
            <div className="absolute inset-6 rounded-full bg-white/20 blur-2xl" />
            <motion.img src="/art/hero.webp" alt="" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }} className="relative h-full w-full object-contain" />
          </div>
          <h1 className="mt-1 text-[30px] font-extrabold leading-[1.08]">When Paati needs help, everyone moves at once.</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-white/80">Simple daily care, all her medical papers in one place, and a golden-hour emergency network.</p>
        </div>

        <div className="relative -mt-8 rounded-t-[32px] bg-canvas px-4 pb-10 pt-5">
          <h2 className="px-1 text-[17px] font-bold">Open Saathi as</h2>
          <div className="mt-3 flex flex-col gap-3">
            {PERSONAS.map((p, i) => (
              <motion.button key={p.key} disabled={!!busy} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.07 }}
                whileTap={{ scale: 0.98 }} onClick={() => go(api.post<AuthRes>("/api/auth/demo", { persona: p.key }), p.key)}
                className="flex items-center gap-3 rounded-[26px] bg-white p-3 pr-4 text-left shadow-card disabled:opacity-60">
                <Person who={p.who} size={60} />
                <div className="min-w-0 flex-1">
                  <div className="text-[16px] font-extrabold leading-tight">{p.title}</div>
                  <div className="text-[12px] font-semibold text-ink-3">{p.person}</div>
                  <div className="mt-0.5 text-[13px] leading-snug text-ink-2">{p.desc}</div>
                </div>
                <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full", p.tone)}><ArrowRight className={cx("h-[18px] w-[18px]", busy === p.key && "animate-blink")} /></span>
              </motion.button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {([["join", "Join a family", "home"], ["create", "New family", "heart"], ["hospital", "Hospital sign-in", "hospital"]] as const).map(([k, t, a]) => (
              <button key={k} onClick={() => setModal(k)} className="flex flex-col items-center gap-1 rounded-3xl bg-white px-2 py-3 text-[12px] font-bold shadow-card">
                <Art name={a} size={42} />{t}
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-[11.5px] text-ink-3">Design Thinking · Group 4 · SRM</p>
        </div>
      </div>

      <JoinModal open={modal === "join"} onClose={() => setModal(null)} onSubmit={(p, k) => go(p, k)} busy={busy} />
      <CreateModal open={modal === "create"} onClose={() => setModal(null)} onSubmit={(p) => go(p, "create")} busy={busy} />
      <HospitalModal open={modal === "hospital"} onClose={() => setModal(null)} onSubmit={(p) => go(p, "hospital-login")} busy={busy} />
    </PhoneFrame>
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
        <Button type="submit" variant="brand" size="lg" loading={busy === "join"}>{as === "elder" ? "Open the elder's app" : "Join and get alerts"}</Button>
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
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(api.post<AuthRes>("/api/auth/create-family", { ...f, conditions: f.conditions.split(",").map((s) => s.trim()), allergies: f.allergies.split(",").map((s) => s.trim()) })); }}>
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
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="soft" onClick={locate}>Use this phone's location as home</Button>
          <span className="text-sm text-ink-2">{f.lat ? `${(+f.lat).toFixed(4)}, ${(+f.lng).toFixed(4)}` : "Defaults to Tambaram, Chennai"}</span>
        </div>
        <Button type="submit" size="lg" variant="brand" className="" loading={busy === "create"}>Create family</Button>
      </form>
    </Modal>
  );
}

function HospitalModal({ open, onClose, onSubmit, busy }: { open: boolean; onClose: () => void; onSubmit: (p: Promise<AuthRes>) => void; busy: string | null }) {
  const [list, setList] = useState<Hospital[]>([]);
  const [id, setId] = useState("h3");
  const [name, setName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  useEffect(() => { if (open && !list.length) fetch("/api/public/hospitals").then((r) => (r.ok ? r.json() : [])).then(setList).catch(() => {}); }, [open, list.length]);
  return (
    <Modal open={open} onClose={onClose} title="Hospital staff sign-in">
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit(api.post<AuthRes>("/api/auth/hospital", { hospitalId: id, name, staffCode })); }}>
        <Field label="Hospital"><Select value={id} onChange={(e) => setId(e.target.value)}>{(list.length ? list : [{ id: "h3", name: "Saraswathi Multispeciality Hospital" } as Hospital]).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</Select></Field>
        <Field label="Your name and role"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Priya, ER" required /></Field>
        <Field label="Staff code" hint="Issued to each hospital by the Saathi network. To look around, use the demo ER instead."><Input type="password" autoComplete="off" value={staffCode} onChange={(e) => setStaffCode(e.target.value)} required /></Field>
        <Button type="submit" variant="brand" size="lg" loading={busy === "hospital-login"}>Open the console</Button>
      </form>
    </Modal>
  );
}
