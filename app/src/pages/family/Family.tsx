// Family circle: invite code, members, the elder's profile, sign out and demo controls.
import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Share2, LogOut, X, Phone } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Avatar, Button, Field, Input, SectionTitle, cx, useToast } from "../../components/ui";
import { useFamily } from "./ctx";

export default function Family() {
  const { data } = useFamily();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const p = data.patient;
  const code = data.family.code;
  const shareText = `Join ${p.nickname}'s Saathi circle with code ${code} at ${window.location.origin}`;
  const online = data.members.filter((m) => m.online).length;

  async function copy(text: string, ok: string) {
    try { await navigator.clipboard.writeText(text); toast(ok, "ok"); } catch { toast("Couldn't copy. Select the text instead.", "info"); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "Saathi", text: shareText }); return; } catch { /* cancelled */ } }
    void copy(shareText, "Invite text copied");
  }

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-[34px] font-semibold leading-tight sm:text-[40px]" style={{ fontStretch: "85%" }}>Family</h1>
        <p className="text-[16px] text-ink-2">{data.members.length} people in {data.family.name}, {online} online now. Everyone here gets {p.nickname}'s alerts.</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section>
          <SectionTitle>Members</SectionTitle>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar name={m.role === "elder" ? p.nickname : m.name} size={40} online={!!m.online} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{m.name}{m.id === user?.id && <span className="font-normal text-ink-3"> (you)</span>}</div>
                  <div className="truncate text-[14px] text-ink-2">
                    {m.role === "elder" ? "Cared for" : m.relation ?? "Family"}
                    {m.phone && <> · <span className="font-mono text-[13px]">{m.phone}</span></>}
                  </div>
                </div>
                <span className={cx("hidden text-[13px] sm:inline", m.online ? "text-teal" : "text-ink-3")}>{m.online ? "Online" : "Offline"}</span>
                {m.phone && m.id !== user?.id && (
                  <a href={`tel:${m.phone.replace(/\s/g, "")}`} aria-label={`Call ${m.name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line text-ink-2 hover:border-ink-3 hover:text-ink"><Phone className="h-4 w-4" /></a>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionTitle>Invite someone</SectionTitle>
          <div className="rounded-xl border border-line bg-white p-5">
            <div className="text-[14px] text-ink-2">Family code</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-mono text-[32px] font-semibold tracking-[0.14em]">{code}</span>
              <button aria-label="Copy family code" onClick={() => copy(code, "Code copied")} className="grid h-10 w-10 place-items-center rounded-[10px] border border-line text-ink-2 hover:border-ink-3 hover:text-ink"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="mt-3 text-[14px] text-ink-2">They open Saathi, choose “Join a family” and type this code.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" icon={<Share2 className="h-4 w-4" />} onClick={share}>Share invite</Button>
              <Button variant="outline" icon={<Copy className="h-4 w-4" />} onClick={() => copy(shareText, "Invite text copied")}>Copy text</Button>
            </div>
          </div>
        </section>
      </div>

      <ProfileEditor />

      <section>
        <SectionTitle>Account</SectionTitle>
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          <li className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1"><div className="font-semibold">{user?.name}</div><div className="text-[14px] text-ink-2">{user?.relation} · {data.family.name}</div></div>
            <Button variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await signOut(); nav("/"); }}>Sign out</Button>
          </li>
          <ResetRow />
        </ul>
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
    catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(false); }
  }
  return (
    <section>
      <SectionTitle>{p.nickname}'s medical profile</SectionTitle>
      <p className="-mt-1 mb-4 max-w-[40rem] text-[15px] text-ink-2">Paramedics and the ER see this first. Keep allergies and conditions current.</p>
      <form onSubmit={save} className="grid gap-x-6 gap-y-4 rounded-xl border border-line bg-white p-4 sm:p-5 md:grid-cols-2">
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
        <div className="flex gap-2 border-t border-line pt-4 md:col-span-2">
          <Button type="submit" loading={busy}>Save profile</Button>
          <Button type="button" variant="ghost" onClick={() => setF(initial())}>Undo changes</Button>
        </div>
      </form>
    </section>
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
      <span className="mb-1 block text-sm font-semibold text-ink-2">{label}</span>
      <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-[10px] border border-line bg-white px-2 py-1.5 focus-within:border-ink-3">
        {values.map((v) => (
          <span key={v} className={cx("inline-flex items-center gap-1 rounded-md border py-0.5 pl-2 pr-0.5 text-[14px] text-ink", strong ? "border-ink font-semibold" : "border-line bg-paper")}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-black/5 hover:text-ink"><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={values.length ? "" : placeholder}
          aria-label={`Add ${label.toLowerCase()}`} className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-ink-3" />
      </div>
    </div>
  );
}

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
    <li className={cx("flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5", confirm && "border-l-[3px] border-l-warn")}>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Reset demo data</div>
        <div className="text-[14px] text-ink-2">{confirm ? "This restores the sample family for everyone on this server and signs you out." : "Restore the sample family before a presentation."}</div>
      </div>
      {confirm ? (
        <div className="flex gap-2"><Button variant="primary" loading={busy} onClick={reset}>Yes, reset</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div>
      ) : <Button variant="ghost" onClick={() => setConfirm(true)}>Reset…</Button>}
    </li>
  );
}
