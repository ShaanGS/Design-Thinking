// Stage view for presenting: Paati's phone, the family app and the ER, side by side and live.
// Each phone is an iframe with its own window name, so each keeps its own signed-in session.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, ArrowLeft } from "lucide-react";
import { api } from "../lib/api";
import { Logo, useToast } from "../components/ui";
import { Person, type Who } from "../components/kit";

const PHONES: { name: "elder" | "guardian" | "hospital"; who: Who; title: string; sub: string }[] = [
  { name: "elder", who: "paati", title: "Paati's phone", sub: "Kamala, 72 · Tambaram" },
  { name: "guardian", who: "karthik", title: "Family app", sub: "Karthik · Bengaluru" },
  { name: "hospital", who: "priya", title: "Hospital ER", sub: "Dr. Priya · Saraswathi" },
];
const W = 375, H = 812;

export default function Stage() {
  const toast = useToast();
  const [gen, setGen] = useState(0);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 150) / (H + 22), (window.innerWidth - 120) / (3 * (W + 22))));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  async function reset() {
    setBusy(true);
    try {
      const s = await api.post<{ token: string }>("/api/auth/demo", { persona: "guardian" });
      await fetch("/api/demo/reset", { method: "POST", headers: { Authorization: `Bearer ${s.token}` } });
      setGen((g) => g + 1);
      toast("Demo reset. All three phones are fresh.", "ok");
    } catch (e) { toast((e as Error).message, "warn"); } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(70%_60%_at_15%_0%,#E7E3FF_0%,transparent_60%),radial-gradient(60%_50%_at_95%_100%,#FFE3D1_0%,transparent_60%)]">
      <header className="flex items-center gap-4 px-8 pt-5">
        <Link to="/" aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-card"><ArrowLeft className="h-5 w-5" /></Link>
        <Logo size={36} sub="Live demo · three phones, one emergency" />
        <p className="ml-6 hidden max-w-md text-[13.5px] text-ink-2 xl:block">Hold the red button on Paati's phone. Watch Karthik's app and the ER react in the same second.</p>
        <button onClick={reset} disabled={busy} className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-bold shadow-card disabled:opacity-60">
          <RotateCcw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />Reset demo
        </button>
      </header>
      <main className="flex flex-1 items-start justify-center gap-6 px-6 pb-6 pt-4">
        {PHONES.map((p) => (
          <div key={p.name} className="flex flex-col items-center">
            <div className="mb-3 flex items-center gap-2.5">
              <Person who={p.who} size={40} />
              <div className="leading-tight"><div className="text-[15px] font-extrabold">{p.title}</div><div className="text-[12px] text-ink-2">{p.sub}</div></div>
            </div>
            <div style={{ width: (W + 22) * scale, height: (H + 22) * scale }}>
              <div className="origin-top-left rounded-[54px] bg-ink p-[11px] shadow-[0_40px_80px_-30px_rgba(23,20,46,.55)]" style={{ width: W + 22, height: H + 22, transform: `scale(${scale})` }}>
                <iframe key={`${p.name}-${gen}`} name={p.name} title={p.title} src={`/?as=${p.name}&g=${gen}`} allow="camera; microphone; geolocation"
                  className="h-full w-full rounded-[44px] bg-canvas" style={{ width: W, height: H }} />
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
