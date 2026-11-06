// My errands: what Saathi is doing for her, in big type. She can answer a waiting question here too,
// though usually she just says it on the call.
import { useEffect, useState } from "react";
import { Check, Clock } from "lucide-react";
import { api } from "../../lib/api";
import { useLive } from "../../lib/socket";
import { Spinner, cx, useToast } from "../../components/ui";
import type { Errand } from "../../../shared/types";
import { BigButton, SubScreen } from "./shared";

const WORD: Record<string, string> = {
  running: "Saathi is doing it now", needs_choice: "Saathi needs your answer", awaiting_approval: "Waiting for Karthik to approve",
  done: "Done", declined: "Not paid. Karthik said no", failed: "Couldn't be done", cancelled: "Stopped",
};

export default function Errands() {
  const toast = useToast();
  const [list, setList] = useState<Errand[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { api.get<{ errands: Errand[] }>("/api/errands").then((r) => setList(r.errands)).catch(() => setList([])); }, []);
  useLive<Errand>("errand", (e) => setList((l) => [e, ...(l ?? []).filter((x) => x.id !== e.id)].sort((a, b) => b.createdAt.localeCompare(a.createdAt))));

  async function answer(e: Errand, option: string) {
    setBusy(option);
    try { await api.post(`/api/errands/${e.id}/answer`, { answer: option }); } catch (err) { toast((err as Error).message, "warn"); } finally { setBusy(null); }
  }

  return (
    <SubScreen ta="என் வேலைகள்" en="My errands" art="calendar">
      <p className="px-1 text-[18px] leading-snug text-ink-2">Ask Saathi on a call: “Book the doctor”, “Order my tablets”, “Book the gas”, “Pay the electricity bill”.</p>
      {list === null && <div className="grid place-items-center py-10"><Spinner className="h-8 w-8 text-violet" /></div>}
      {list?.length === 0 && <p className="rounded-[24px] bg-white p-5 text-[20px] shadow-card">Nothing yet today.</p>}
      {list?.slice(0, 8).map((e) => (
        <section key={e.id} className="rounded-[28px] bg-white p-4 shadow-card">
          <p className="text-[23px] font-extrabold leading-tight">{e.title}</p>
          <p className={cx("mt-1 flex items-center gap-2 text-[18px] font-bold", e.status === "done" ? "text-mint-ink" : e.status === "needs_choice" ? "text-butter-ink" : "text-ink-2")}>
            {e.status === "done" ? <Check className="h-6 w-6" strokeWidth={3} /> : e.status === "running" ? <Spinner className="h-5 w-5 text-violet" /> : <Clock className="h-5 w-5" />}{WORD[e.status]}
          </p>
          {e.status === "needs_choice" && e.question && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[19px] leading-snug">{e.question.prompt}</p>
              {e.question.options.map((o) => <BigButton key={o} tone="soft" className="!min-h-[64px] !text-[19px]" disabled={!!busy} onClick={() => void answer(e, o)}>{o}</BigButton>)}
            </div>
          )}
          {e.result && e.status !== "running" && <p className="mt-2 text-[18px] leading-snug">{e.result}</p>}
        </section>
      ))}
    </SubScreen>
  );
}
