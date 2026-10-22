// My emergency card: the same card the family sees, in elder-sized type, with print and share.
// The QR opens the public bystander page, so a stranger who finds her can call 108 and alert the family.
import { Printer, Share2 } from "lucide-react";
import { Spinner, useToast } from "../../components/ui";
import { EmergencyCardView, PrintableCard, shareCard, useCard } from "../../components/EmergencyCard";
import { BigButton, Bi, SubScreen, useT } from "./shared";

export default function Card() {
  const { card, error, reload } = useCard();
  const toast = useToast();
  const t = useT();
  const share = async () => {
    if (!card) return;
    const r = await shareCard(card);
    if (r === "copied") toast(t("இணைப்பு நகலெடுக்கப்பட்டது", "Link copied"), "ok");
    else if (!r) toast(t("பகிர முடியவில்லை", "Couldn't share from this phone"), "warn");
  };
  return (
    <SubScreen ta="என் அவசர அட்டை" en="My emergency card" art="shield">
      <Bi ta="இதை பர்ஸிலும் குளிர்சாதனப் பெட்டியிலும் வையுங்கள். யார் ஸ்கேன் செய்தாலும் உதவி வரும்."
        en="Keep it in your purse and on the fridge. Anyone who scans it can get you help."
        className="px-1 text-[19px] font-bold leading-snug" sub="!text-[15px]" />
      {!card ? (
        <div className="grid place-items-center py-16 text-center">
          {error ? <div className="flex flex-col items-center gap-3"><p className="text-[17px] text-ink-2">{error}</p><BigButton tone="soft" onClick={() => void reload()}><Bi inline ta="மீண்டும் முயற்சி" en="Try again" /></BigButton></div> : <Spinner className="h-8 w-8 text-violet" />}
        </div>
      ) : (
        <>
          <EmergencyCardView card={card} big />
          <div className="grid grid-cols-2 gap-3">
            <BigButton tone="violet" className="!text-[20px]" onClick={() => window.print()} icon={<Printer className="h-6 w-6 shrink-0" strokeWidth={2.2} />}>
              <Bi ta="அச்சிடு" en="Print" />
            </BigButton>
            <BigButton tone="white" className="!text-[20px]" onClick={() => void share()} icon={<Share2 className="h-6 w-6 shrink-0" strokeWidth={2.2} />}>
              <Bi ta="பகிர்" en="Share" />
            </BigButton>
          </div>
          <PrintableCard card={card} />
        </>
      )}
    </SubScreen>
  );
}
