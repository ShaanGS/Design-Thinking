// Family circle: who's in it and online, the code to invite relatives, Paati's emergency card and medical profile,
// sign out and demo controls. "?card=1" opens the emergency card.
import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Copy, Share2, LogOut, X, Phone, RotateCcw, ChevronRight } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Avatar, Button, Field, Input, cx, useToast } from "../../components/ui";
import { Art, BottomSheet, Person, Pill, Section, Tile, TopBar, whoFor } from "../../components/kit";
import { EmergencyCardSheet } from "../../components/EmergencyCard";
import { pronoun, useFamily } from "./ctx";

export default function Family() {
  const { data } = useFamily();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [card, setCard] = useState(params.get("card") === "1");
  const [profile, setProfile] = useState(false);
  useEffect(() => { if (params.get("card") === "1") setCard(true); }, [params]);
  const closeCard = () => { setCard(false); if (params.has("card")) setParams({}, { replace: true }); };

  const p = data.patient;
  const pr = pronoun(p.sex);
  const code = data.family.code;
  const shareText = `Join ${p.nickname}'s Saathi circle with code ${code} at ${window.location.origin}`;
  const online = data.members.filter((m) => m.online).length;
  const members = [...data.members].sort((a, b) => (a.role === "elder" ? -1 : b.role === "elder" ? 1 : a.id === user?.id ? -1 : b.id === user?.id ? 1 : 0));

  async function copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); toast(ok, "ok"); } catch { toast("Couldn't copy. Select the text instead.", "info"); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "Saathi", text: shareText }); return; } catch { /* cancelled */ } }
    void copy(shareText, "Invite text copied");
  }
  const nameFor = (m: (typeof members)[number]) => (m.role === "elder" ? p.nickname : m.name);

  return (
    <div>
      <TopBar back={false} title="Family" sub={data.family.name} />

      <div className="px-4 pb-32">
        {/* The circle */}
        <div className="rounded-3xl bg-white p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {members.slice(0, 4).map((m) => <Avatar key={m.id} name={nameFor(m)} size={48} className="ring-[3px] ring-white" />)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="font-display text-[18px] font-extrabold">{data.members.length} in the circle</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-2"><span className="h-2 w-2 rounded-full bg-teal" />{online} online now</div>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-snug text-ink-2">Everyone here gets {p.nickname}'s alerts and can follow an emergency live.</p>
        </div>

        {/* Bento: emergency card + medical profile */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Tile tone="sky" art="qr" artSize={72} title="Emergency card" sub="For paramedics" onClick={() => setCard(true)} />
          <Tile tone="lilac" art="shield" artSize={70} title="Medical profile" sub={`${p.allergies.length} allerg${p.allergies.length === 1 ? "y" : "ies"} · ${p.conditions.length} conditions`} onClick={() => setProfile(true)} />
        </div>

        <Section title="Members">
          <ul className="rounded-3xl bg-white px-4 shadow-card">
            {members.map((m) => {
              const me = m.id === user?.id;
              return (
                <li key={m.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                  <Avatar name={nameFor(m)} size={48} online={!!m.online} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-[15px] font-bold">{m.name}{me && <span className="font-medium text-ink-3"> (you)</span>}</div>
                    <div className="mt-0.5 truncate text-[12.5px] text-ink-2">{m.role === "elder" ? "Cared for" : m.relation ?? "Family"}</div>
                    <div className={cx("mt-0.5 text-[11.5px] font-semibold", m.online ? "text-mint-ink" : "text-ink-3")}>{m.online ? "Online" : "Offline"}{m.phone && <span className="font-normal text-ink-3"> · <span className="tnum">{m.phone}</span></span>}</div>
                  </div>
                  {m.phone && !me && (
                    <a href={`tel:${m.phone.replace(/\s/g, "")}`} aria-label={`Call ${m.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700"><Phone className="h-[18px] w-[18px]" /></a>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Invite */}
        <Section title="Invite a relative">
          <div className="hero-violet relative overflow-hidden rounded-[28px] p-5 text-white shadow-lift">
            <Art name="home" size={104} className="absolute -right-3 -top-2" float />
            <div className="relative max-w-[64%] text-[13px] leading-snug text-white/85">They open Saathi, choose "Join a family" and type this code.</div>
            <button onClick={() => copy(code, "Code copied")} aria-label="Copy family code" className="relative mt-4 flex w-full gap-1.5">
              {code.split("").map((c, i) => (
                <span key={i} className="glass grid h-12 min-w-0 max-w-10 flex-1 place-items-center rounded-2xl font-display text-[22px] font-extrabold tnum">{c}</span>
              ))}
            </button>
            <div className="relative mt-4 flex gap-2">
              <Pill variant="white" icon={Share2} className="flex-1" onClick={share}>Share invite</Pill>
              <Pill variant="glass" icon={Copy} onClick={() => copy(shareText, "Invite text copied")}>Copy</Pill>
            </div>
          </div>
        </Section>

        <Section title="Account">
          <div className="overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="flex items-center gap-3 p-4">
              {whoFor(user?.name) ? <Person who={whoFor(user?.name)!} size={48} /> : <Avatar name={user?.name ?? "?"} size={48} />}
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[15px] font-bold">{user?.name}</div>
                <div className="truncate text-[12.5px] text-ink-2">{user?.relation ? `${user.relation} · ` : ""}{data.family.name}</div>
              </div>
              <Pill variant="soft" size="sm" icon={LogOut} onClick={async () => { await signOut(); nav("/"); }}>Sign out</Pill>
            </div>
            <ResetRow />
          </div>
        </Section>

        <p className="mt-6 px-1 text-center text-[12.5px] text-ink-3">{p.name} · {p.age} · {p.address}. Ambulances are routed from {pr.pos} home address.</p>
      </div>

      <EmergencyCardSheet open={card} onClose={closeCard} />
      <BottomSheet open={profile} onClose={() => setProfile(false)} title={`${p.nickname}'s medical profile`} tall>
        <ProfileEditor onSaved={() => setProfile(false)} />
      </BottomSheet>
    </div>
  );
}

/* ---------------------------------------------------------------- Medical profile */

function ProfileEditor({ onSaved }: { onSaved: () => void }) {
  const { data } = useFamily();
  const toast = useToast();
  const p = data.patient;
  const initial = () => ({ name: p.name, nickname: p.nickname, age: String(p.age), blood: p.blood, address: p.address, doctor: p.doctor ?? "", conditions: p.conditions, allergies: p.allergies });
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setF(initial()); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: "name" | "nickname" | "age" | "blood" | "address" | "doctor") => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await api.patch("/api/patient", { ...f, age: Number(f.age) }); toast("Profile saved. The ER brief uses it in an emergency.", "ok"); onSaved(); }
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-3xl bg-lilac p-3">
        <Person who="paati" size={56} />
        <p className="text-[13px] leading-snug text-lilac-ink">Paramedics and the ER see this first. Keep allergies and conditions current.</p>
      </div>
      <Field label="Full name"><Input value={f.name} onChange={set("name")} required /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Called"><Input value={f.nickname} onChange={set("nickname")} /></Field>
        <Field label="Age"><Input type="number" value={f.age} onChange={set("age")} min={30} max={120} /></Field>
        <Field label="Blood"><Input value={f.blood} onChange={set("blood")} /></Field>
      </div>
      <TagInput label="Allergies" values={f.allergies} onChange={(v) => setF((x) => ({ ...x, allergies: v }))} placeholder="Type and press Enter" strong />
      <TagInput label="Conditions" values={f.conditions} onChange={(v) => setF((x) => ({ ...x, conditions: v }))} placeholder="Type and press Enter" />
      <Field label="Doctors"><Input value={f.doctor} onChange={set("doctor")} placeholder="Dr. Raman (cardiology)" /></Field>
      <Field label="Home address" hint="Ambulances are routed from here"><Input value={f.address} onChange={set("address")} /></Field>
      <div className="flex gap-2">
        <Button type="submit" variant="brand" size="lg" className="flex-1" loading={busy}>Save profile</Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => setF(initial())}>Undo</Button>
      </div>
    </form>
  );
}

function TagInput({ label, values, onChange, placeholder, strong }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; strong?: boolean }) {
  const [text, setText] = useState("");
  const add = () => { const t = text.trim(); if (t && !values.includes(t)) onChange([...values, t]); setText(""); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
  };
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div className="flex min-h-[50px] flex-wrap items-center gap-1.5 rounded-2xl bg-canvas px-2 py-2 focus-within:ring-4 focus-within:ring-violet/10">
        {values.map((v) => (
          <span key={v} className={cx("inline-flex items-center gap-0.5 rounded-full py-1 pl-3 pr-1 text-[13px] font-semibold", strong ? "bg-peach text-peach-ink" : "bg-white text-ink shadow-card")}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="grid h-6 w-6 place-items-center rounded-full hover:bg-black/5"><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={values.length ? "" : placeholder}
          aria-label={`Add ${label.toLowerCase()}`} className="min-w-[110px] flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-ink-3" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Demo reset */

function ResetRow() {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function reset() {
    setBusy(true);
    try { await api.post("/api/demo/reset"); toast("Demo data reset", "ok"); setTimeout(() => window.location.reload(), 600); }
    catch (e) { toast((e as Error).message, "warn"); setBusy(false); }
  }
  return (
    <div className={cx("border-t border-line p-4", confirm && "bg-peach")}>
      {!confirm ? (
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setConfirm(true)} className="flex w-full items-center gap-3 text-left">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-canvas text-ink-2"><RotateCcw className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0 flex-1 leading-tight"><div className="text-[14.5px] font-bold">Reset demo data</div><div className="text-[12.5px] text-ink-2">Restore the sample family before a presentation</div></div>
          <ChevronRight className="h-5 w-5 text-ink-3" />
        </motion.button>
      ) : (
        <div>
          <div className="text-[14.5px] font-bold">Reset everything?</div>
          <p className="text-[12.5px] text-peach-ink">This restores the sample family for everyone on this server and signs you out.</p>
          <div className="mt-3 flex gap-2"><Button variant="primary" size="sm" loading={busy} onClick={reset}>Yes, reset</Button><Button variant="outline" size="sm" onClick={() => setConfirm(false)}>Cancel</Button></div>
        </div>
      )}
    </div>
  );
}
