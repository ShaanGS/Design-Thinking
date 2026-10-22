// Paati's emergency card as a bottom sheet: the facts a paramedic needs, plus a QR that opens the bystander page.
// (Stub: the elder/bystander work replaces the body; keep this export and its props.)
import { BottomSheet } from "./kit";

export function EmergencyCardSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Emergency card">
      <p className="text-[14px] text-ink-2">Coming soon.</p>
    </BottomSheet>
  );
}
