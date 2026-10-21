// Family circle: invite code, members, the elder's profile, sign out and demo controls.
import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, LogOut, RotateCcw, Save, X, UserRound, ShieldAlert, Phone } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, SectionTitle, cx, useToast } from "../../components/ui";
import { useFamily } from "./ctx";

export default function Family() {
  const { data } = useFamily();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const p = data.patient;
  const code = data.family.code;
  const shareText = `Join ${p.nickname}'s Saathi circle with code ${code} at ${window.location.origin}`;

  async function copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); toast(ok, "ok"); } catch { toast("Couldn't copy. Select the text instead.", "sos"); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "Saathi", text: shareText }); return; } catch { /* cancelled */ } }
    void copy(shareText, "Invite text copied");
  }

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-3xl font-bold">Family circle</h1><p className="text-ink-2">Everyone here gets {p.nickname}'s alerts and can help.</p></div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="bg-ink p-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/60">Family code</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-4xl font-bold tracking-[0.18em]">{code}</span>
              <button aria-label="Copy family code" onClick={() => copy(code, "Code copied")} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20"><Copy className="h-5 w-5" /></button>
            </div>
            <p className="mt-3 text-sm text-white/80">"{shareText}"</p>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            <Button variant="brand" icon={<Share2 className="h-4 w-4" />} onClick={share}>Share invite</Button>
            <Button variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => copy(shareText, "Invite text copied")}>Copy text</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Members" subtitle={`${data.members.filter((m) => m.online).length} online now`} />
          <ul className="flex flex-col divide-y divide-line px-5 pb-3">
            {data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3">
                <Avatar name={m.role === "elder" ? p.nickname : m.name} size={42} online={!!m.online} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.name}</span>{m.id === user?.id && <Badge tone="brand">You</Badge>}{m.role === "elder" && <Badge tone="info">Cared for</Badge>}</div>
                  <div className="text-xs text-ink-2">{m.relation ?? (m.role === "elder" ? "Elder" : "Family")}{m.phone ? ` · ${m.phone}` : ""}</div>
                </div>
                {m.phone && m.id !== user?.id && <a href={`tel:${m.phone.replace(/\s/g, "")}`} aria-label={`Call ${m.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-paper text-ink-2 hover:text-ink"><Phone className="h-4 w-4" /></a>}
                <span className={cx("text-xs font-semibold", m.online ? "text-teal" : "text-ink-3")}>{m.online ? "Online" : "Offline"}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <ProfileEditor />

      <section>
        <SectionTitle>Account</SectionTitle>
        <div className="flex flex-col gap-4 lg:flex-row">
          <Card className="flex flex-1 items-center gap-3 p-4">
            <UserRound className="h-5 w-5 text-ink-2" />
            <div className="min-w-0 flex-1"><div className="font-semibold">{user?.name}</div><div className="text-xs text-ink-2">{user?.relation} · {data.family.name}</div></div>
            <Button variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await signOut(); nav("/"); }}>Sign out</Button>
          </Card>
          <ResetCard />
        </div>
      </section>
    </div>
  );
}

function ProfileEditor() {
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
    try { await api.patch("/api/patient", { ...f, age: Number(f.age) }); toast("Profile saved. The ER brief uses it in an emergency.", "ok"); }
    catch (err) { toast((err as Error).message, "sos"); } finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader icon={<ShieldAlert className="h-5 w-5" />} title={`${p.nickname}'s profile`} subtitle="This is what paramedics and the ER see first. Keep allergies and conditions current." />
      <form onSubmit={save} className="grid gap-4 px-5 pb-5 md:grid-cols-2">
        <Field label="Full name"><Input value={f.name} onChange={set("name")} required /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Called"><Input value={f.nickname} onChange={set("nickname")} /></Field>
          <Field label="Age"><Input type="number" value={f.age} onChange={set("age")} min={30} max={120} /></Field>
          <Field label="Blood"><Input value={f.blood} onChange={set("blood")} /></Field>
        </div>
        <TagInput label="Allergies" tone="sos" values={f.allergies} onChange={(v) => setF((x) => ({ ...x, allergies: v }))} placeholder="Type and press Enter" />
        <TagInput label="Conditions" tone="info" values={f.conditions} onChange={(v) => setF((x) => ({ ...x, conditions: v }))} placeholder="Type and press Enter" />
        <Field label="Doctors"><Input value={f.doctor} onChange={set("doctor")} placeholder="Dr. Raman (cardiology)" /></Field>
        <Field label="Home address" hint="Ambulances are routed from here"><Input value={f.address} onChange={set("address")} /></Field>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" loading={busy} icon={<Save className="h-4 w-4" />}>Save profile</Button>
          <Button type="button" variant="ghost" onClick={() => setF(initial())}>Undo changes</Button>
        </div>
      </form>
    </Card>
  );
}

function TagInput({ label, values, onChange, placeholder, tone }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; tone: "sos" | "info" }) {
  const [text, setText] = useState("");
  const add = () => { const t = text.trim(); if (t && !values.includes(t)) onChange([...values, t]); setText(""); };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
  };
  return (
    <div>
      <span className="mb-1 block text-sm font-semibold text-ink-2">{label}</span>
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-white px-2 py-1.5 focus-within:border-ink-3">
        {values.map((v) => (
          <span key={v} className={cx("inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-sm font-semibold", tone === "sos" ? "bg-sos-50 text-sos" : "bg-info-50 text-info")}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-black/10"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={values.length ? "" : placeholder}
          aria-label={`Add ${label.toLowerCase()}`} className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-ink-3" />
      </div>
    </div>
  );
}

function ResetCard() {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function reset() {
    setBusy(true);
    try { await api.post("/api/demo/reset"); toast("Demo data reset", "ok"); setTimeout(() => window.location.reload(), 600); }
    catch (e) { toast((e as Error).message, "sos"); setBusy(false); }
  }
  return (
    <Card className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <RotateCcw className="h-5 w-5 shrink-0 text-ink-2" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Reset demo data</div>
        <div className="text-xs text-ink-2">{confirm ? "This restores the sample family for everyone using this server and signs you out." : "Restore the sample family before a presentation."}</div>
      </div>
      {confirm ? (
        <div className="flex gap-2"><Button variant="sos" loading={busy} onClick={reset}>Yes, reset</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div>
      ) : <Button variant="outline" onClick={() => setConfirm(true)}>Reset…</Button>}
    </Card>
  );
}
