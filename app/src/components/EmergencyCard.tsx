// Paati's emergency card: an ID-card style summary of what a paramedic needs, plus a QR that opens the
// public bystander page (/help/:cardToken). Used by the family app (bottom sheet) and Paati's "My card" screen.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Printer, Share2 } from "lucide-react";
import { api } from "../lib/api";
import type { CardInfo } from "../../shared/types";
import { Art, BottomSheet, Person, Pill } from "./kit";
import QR from "./QR";
import { Avatar, Spinner, cx, useToast } from "./ui";

/** The card data for the signed-in family or elder, including the QR token. */
export function useCard(enabled = true) {
  const [card, setCard] = useState<CardInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => api.get<CardInfo>("/api/card").then((c) => { setCard(c); setError(null); }).catch((e) => setError((e as Error).message)), []);
  useEffect(() => { if (enabled) void reload(); }, [enabled, reload]);
  return { card, error, reload };
}

export const helpUrl = (token: string) => `${window.location.origin}/help/${token}`;
const firstName = (c: CardInfo) => c.name.split(" ")[0];

/** Opens the share sheet with the help link, or copies it. Returns false if neither worked. */
export async function shareCard(card: CardInfo): Promise<"shared" | "copied" | false> {
  if (!card.cardToken) return false;
  const url = helpUrl(card.cardToken);
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    try { await nav.share({ title: `${firstName(card)}'s emergency card`, text: `If you find ${firstName(card)} unwell, open this to help her and alert her family.`, url }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "shared"; }
  }
  try { await navigator.clipboard.writeText(url); return "copied"; } catch { return false; }
}

/** Hidden copy of the card that is the only thing printed (it sits outside the phone frame). */
export function PrintableCard({ card }: { card: CardInfo }) {
  return createPortal(
    <div className="saathi-print">
      <style>{`
        @media screen { .saathi-print { display: none !important; } }
        @media print {
          body > *:not(.saathi-print) { display: none !important; }
          html, body { height: auto !important; background: #fff !important; }
          .saathi-print { display: block !important; width: 380px; margin: 0 auto; }
          .saathi-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 12mm; }
        }
      `}</style>
      <EmergencyCardView card={card} />
    </div>,
    document.body,
  );
}

function InfoBlock({ tone, label, ta, children, big }: { tone: string; label: string; ta: string; children: ReactNode; big?: boolean }) {
  return (
    <div className={cx("rounded-2xl px-4 py-3", tone)}>
      <div className={cx("font-bold opacity-90", big ? "text-[14px]" : "text-[12px]")}>{label} · <span className="font-tamil">{ta}</span></div>
      <div className={cx("mt-0.5 font-bold leading-snug text-ink", big ? "text-[19px]" : "text-[16px]")}>{children}</div>
    </div>
  );
}

/** The card itself. `big` uses elder-sized type. `qr` adds the "Scan to help" panel. */
export function EmergencyCardView({ card, big, qr = true, meds = true }: { card: CardInfo; big?: boolean; qr?: boolean; meds?: boolean }) {
  const name = firstName(card);
  const t = (sm: string, lg: string) => (big ? lg : sm);
  return (
    <article className="overflow-hidden rounded-[28px] bg-white shadow-lift">
      {/* Violet ID header */}
      <div className="hero-violet relative overflow-hidden px-5 pb-5 pt-4 text-white">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative flex items-center justify-between gap-3">
          <span className={cx("font-extrabold uppercase tracking-wider text-white/85", t("text-[11.5px]", "text-[13px]"))}>Emergency card</span>
          <span className={cx("font-tamil font-semibold text-white/85", t("text-[13px]", "text-[15px]"))}>அவசர அட்டை</span>
        </div>
        <div className="relative mt-3 flex items-center gap-4">
          <Person who="paati" size={big ? 92 : 80} className="ring-4 ring-white/35" />
          <div className="min-w-0">
            <div className={cx("font-display font-extrabold leading-tight", t("text-[22px]", "text-[26px]"))}>{card.name}</div>
            <div className={cx("text-white/80", t("text-[13.5px]", "text-[17px]"))}>{card.sex === "F" ? "Female" : "Male"} · {card.age} years</div>
            <div className={cx("font-tamil text-white/80", t("text-[13px]", "text-[16px]"))}>{card.sex === "F" ? "பெண்" : "ஆண்"} · {card.age} வயது</div>
          </div>
        </div>
        <div className="relative mt-4 flex gap-2">
          <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white py-2 pl-2 pr-4 text-ink shadow-card">
            <Art name="blood" size={big ? 44 : 38} />
            <div className="leading-none">
              <div className={cx("text-ink-2", t("text-[11px]", "text-[13px]"))}>Blood · <span className="font-tamil">இரத்தம்</span></div>
              <div className={cx("mt-1 font-display font-extrabold tnum", t("text-[24px]", "text-[30px]"))}>{card.blood}</div>
            </div>
          </div>
          {card.doctor && (
            <div className="glass min-w-0 flex-1 rounded-2xl px-3 py-2">
              <div className={cx("text-white/75", t("text-[11px]", "text-[13px]"))}>Doctor · <span className="font-tamil">மருத்துவர்</span></div>
              <div className={cx("mt-0.5 line-clamp-2 font-semibold leading-snug", t("text-[12.5px]", "text-[15px]"))}>{card.doctor}</div>
            </div>
          )}
        </div>
      </div>

      {/* Critical facts */}
      <div className="flex flex-col gap-2.5 px-4 py-4">
        <InfoBlock big={big} tone="bg-rose text-rose-ink" label="Allergy" ta="ஒவ்வாமை">{card.allergies.join(", ") || "None known"}</InfoBlock>
        {card.thinners.length > 0 && (
          <InfoBlock big={big} tone="bg-butter text-butter-ink" label="Blood thinner, may bleed more" ta="இரத்தம் மெலிதாக்கும் மருந்து">
            {card.thinners.map((m) => `${m.name} ${m.dose}`).join(", ")}
          </InfoBlock>
        )}
        <div className="px-1 pt-1">
          <div className={cx("font-bold text-ink-2", t("text-[12px]", "text-[14px]"))}>Conditions · <span className="font-tamil">நோய்கள்</span></div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {card.conditions.map((c) => <span key={c} className={cx("rounded-full bg-lilac px-3 py-1 font-semibold leading-snug text-ink", t("text-[12.5px]", "text-[15px]"))}>{c}</span>)}
            {!card.conditions.length && <span className="text-ink-3">None recorded</span>}
          </div>
        </div>
        {meds && card.meds.length > 0 && (
          <div className="px-1 pt-1">
            <div className={cx("font-bold text-ink-2", t("text-[12px]", "text-[14px]"))}>Medicines · <span className="font-tamil">மாத்திரைகள்</span></div>
            <ul className={cx("mt-1.5 grid gap-x-3 gap-y-1", t("grid-cols-2 text-[13px]", "grid-cols-1 text-[17px]"))}>
              {card.meds.map((m) => (
                <li key={m.name} className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-4 shrink-0 rounded-full border border-black/15" style={{ background: m.color }} />
                  <span className="truncate"><span className="font-semibold">{m.name}</span> <span className="text-ink-2">{m.dose}</span></span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {card.contacts.length > 0 && (
          <div className="px-1 pt-1">
            <div className={cx("font-bold text-ink-2", t("text-[12px]", "text-[14px]"))}>Call family · <span className="font-tamil">குடும்பத்தை அழைக்க</span></div>
            <ul className="mt-1 flex flex-col">
              {card.contacts.slice(0, 3).map((c) => (
                <li key={c.phone} className="flex items-center gap-3 border-b border-line py-2 last:border-b-0">
                  <Avatar name={c.name} size={big ? 44 : 36} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className={cx("font-bold", t("text-[14px]", "text-[17px]"))}>{c.name} <span className="font-medium text-ink-2">· {c.relation}</span></div>
                    <a href={`tel:${c.phone.replace(/\s/g, "")}`} className={cx("font-mono text-violet-600 tnum", t("text-[13px]", "text-[16px]"))}>{c.phone}</a>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Scan to help */}
      {qr && card.cardToken && (
        <div className="flex items-center gap-4 border-t border-dashed border-line-2 bg-canvas/60 px-4 py-4">
          <div className="shrink-0 rounded-2xl bg-white p-1.5 shadow-card"><QR text={helpUrl(card.cardToken)} size={big ? 124 : 108} /></div>
          <div className="min-w-0">
            <div className={cx("font-display font-extrabold leading-tight", t("text-[17px]", "text-[21px]"))}>Scan to help {name}</div>
            <div className={cx("font-tamil font-semibold leading-snug text-ink-2", t("text-[14px]", "text-[17px]"))}>உதவ ஸ்கேன் செய்யுங்கள்</div>
            <div className={cx("mt-1 leading-snug text-ink-3", t("text-[11.5px]", "text-[13px]"))}>Any phone camera. Shows this card and can alert her family and call an ambulance.</div>
          </div>
        </div>
      )}
    </article>
  );
}

/** Family app: the card in a bottom sheet with print and share. */
export function EmergencyCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { card, error, reload } = useCard(open);
  const toast = useToast();
  const share = async () => {
    if (!card) return;
    const r = await shareCard(card);
    if (r === "copied") toast("Help link copied", "ok");
    else if (!r) toast("Couldn't share from this browser", "warn");
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Emergency card" tall>
      {!card ? (
        <div className="grid place-items-center py-16 text-center">
          {error ? <div className="flex flex-col items-center gap-3"><p className="text-[14px] text-ink-2">{error}</p><Pill variant="soft" size="sm" onClick={() => void reload()}>Try again</Pill></div> : <Spinner className="h-8 w-8 text-violet" />}
        </div>
      ) : (
        <>
          <p className="-mt-2 mb-4 text-[14px] leading-snug text-ink-2">Print it for her purse and the fridge, or put the QR on a pendant. Anyone who scans it can call an ambulance and alert you, without signing in.</p>
          <EmergencyCardView card={card} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Pill variant="violet" icon={Printer} onClick={() => window.print()}>Print</Pill>
            <Pill variant="soft" icon={Share2} onClick={() => void share()}>Share link</Pill>
          </div>
          <p className="mt-3 text-center text-[12.5px] text-ink-3">When someone scans it, you get an alert in the app.</p>
          <PrintableCard card={card} />
        </>
      )}
    </BottomSheet>
  );
}
