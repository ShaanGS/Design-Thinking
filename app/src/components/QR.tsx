import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Renders text as a QR code image. Keep text short for dense data (offline emergency cards). */
export default function QR({ text, size = 200, className }: { text: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(text, { width: size * 2, margin: 1, errorCorrectionLevel: "M" }).then((u) => alive && setSrc(u)).catch(() => alive && setSrc(null));
    return () => { alive = false; };
  }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="QR code" className={className} /> : <div style={{ width: size, height: size }} className={className} />;
}
