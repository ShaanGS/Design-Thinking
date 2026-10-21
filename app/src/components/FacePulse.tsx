// Heart rate from a 20-second selfie video (remote photoplethysmography, POS method).
import { useEffect, useRef, useState } from "react";
import { Camera, Heart } from "lucide-react";
import { estimate, type PulseSample } from "../lib/rppg.js";
import { Button, cx } from "./ui";

const DURATION = 20000;
// Forehead and both cheeks, in a 400x300 overlay space
const ROIS = [{ x: 165, y: 52, w: 70, h: 28 }, { x: 140, y: 140, w: 38, h: 34 }, { x: 222, y: 140, w: 38, h: 34 }];

export default function FacePulse({ onResult, big }: { onResult: (bpm: number, quality: number) => void; big?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const wave = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [bpm, setBpm] = useState<number | null>(null);
  const [quality, setQuality] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [err, setErr] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);

  useEffect(() => () => { cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach((t) => t.stop()); }, []);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
      stream.current = s;
      video.current!.srcObject = s;
      await video.current!.play();
      run();
    } catch (e) {
      setErr((e as Error).name === "NotAllowedError" ? "Camera permission was denied." : "Camera isn't available here. Use https or localhost."); setState("error");
    }
  }

  function run() {
    setState("running"); setBpm(null); setQuality(0);
    const W = 160, H = 120, c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    let samples: PulseSample[] = [], best: { bpm: number; quality: number } | null = null, lastEst = 0;
    const t0 = performance.now();
    const loop = () => {
      const v = video.current; if (!v) return;
      if (v.readyState >= 2) {
        const sc = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * sc, dh = v.videoHeight * sc;
        g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); g.restore();
        let r = 0, gg = 0, b = 0, n = 0;
        for (const roi of ROIS) {
          const d = g.getImageData(Math.round(roi.x / 400 * W), Math.round(roi.y / 300 * H), Math.max(1, Math.round(roi.w / 400 * W)), Math.max(1, Math.round(roi.h / 300 * H))).data;
          for (let i = 0; i < d.length; i += 4) { const s = d[i] + d[i + 1] + d[i + 2]; if (s < 90 || s > 735) continue; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
        }
        const now = performance.now();
        if (n > 20) samples.push({ t: now, r: r / n, g: gg / n, b: b / n });
        samples = samples.filter((s) => now - s.t < 15000);
        setElapsed(now - t0);
        if (now - lastEst > 1000 && now - t0 > 6000) {
          lastEst = now;
          const e = estimate(samples);
          if (e) {
            setQuality(e.quality); drawWave(e.signal);
            if (e.quality > 0.28) { setBpm(e.bpm); if (!best || e.quality >= best.quality - 0.05) best = { bpm: e.bpm, quality: e.quality }; }
          }
        }
        if (now - t0 >= DURATION) {
          stream.current?.getTracks().forEach((t) => t.stop());
          setState("done");
          if (best) onResult(best.bpm, best.quality); else setErr("Couldn't get a clear reading. Try facing a window or lamp and keep still.");
          return;
        }
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  }

  function drawWave(sig: number[]) {
    const cv = wave.current; if (!cv || sig.length < 5) return;
    const s = sig.map((v, i) => (sig[Math.max(0, i - 2)] + sig[Math.max(0, i - 1)] + v + sig[Math.min(sig.length - 1, i + 1)] + sig[Math.min(sig.length - 1, i + 2)]) / 5);
    const g = cv.getContext("2d")!; g.clearRect(0, 0, cv.width, cv.height);
    const lo = Math.min(...s), hi = Math.max(...s);
    g.strokeStyle = "#D62839"; g.lineWidth = 4; g.lineJoin = "round"; g.beginPath();
    s.forEach((v, i) => { const x = (i / (s.length - 1)) * cv.width, y = cv.height - 10 - ((v - lo) / (hi - lo || 1)) * (cv.height - 20); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }

  const q = quality > 0.45 ? "good" : quality > 0.28 ? "fair" : "weak";
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
        <video ref={video} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        <svg viewBox="0 0 400 300" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs><mask id="fp-m"><rect width="400" height="300" fill="#fff" /><ellipse cx="200" cy="140" rx="78" ry="104" fill="#000" /></mask></defs>
          <rect width="400" height="300" fill="rgba(0,0,0,.45)" mask="url(#fp-m)" />
          <ellipse cx="200" cy="140" rx="78" ry="104" fill="none" stroke="#F0B13A" strokeWidth="3" strokeDasharray="6 6" />
          {ROIS.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="6" fill="rgba(60,197,148,.15)" stroke="#3CC594" strokeWidth="2" />)}
        </svg>
        {state === "idle" && (
          <div className="absolute inset-0 grid place-items-center bg-ink/60 p-4 text-center text-white">
            <div className="flex flex-col items-center gap-3">
              <p className={cx(big ? "text-lg" : "text-sm")}>Fit your face in the oval, with light on your face. The video stays on this phone.</p>
              <Button variant="brand" size={big ? "xl" : "lg"} icon={<Camera className="h-5 w-5" />} onClick={start}>Start 20-second check</Button>
            </div>
          </div>
        )}
        {state === "error" && <div className="absolute inset-0 grid place-items-center bg-ink/80 p-6 text-center text-white">{err}</div>}
        {state === "running" && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-sm text-white">Keep still… {Math.min(20, Math.floor(elapsed / 1000))} / 20 s</div>}
      </div>
      <div className="flex items-center gap-4">
        <Heart className={cx("h-9 w-9 text-sos", bpm != null && "animate-pulse")} fill="currentColor" />
        <div className="font-display text-6xl font-bold leading-none text-sos tnum">{bpm ?? "--"}</div>
        <div className="text-ink-2">beats<br />per min</div>
        <div className="ml-auto text-right text-xs text-ink-2">Signal<div className={cx("text-sm font-bold", q === "good" ? "text-teal" : q === "fair" ? "text-warn" : "text-sos")}>{state === "idle" ? "—" : q}</div></div>
      </div>
      <canvas ref={wave} width={800} height={160} className="h-20 w-full rounded-xl bg-paper-2" />
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-2"><div className="h-full bg-brand transition-all" style={{ width: `${Math.min(100, (elapsed / DURATION) * 100)}%` }} /></div>
      {state === "done" && <Button variant="outline" onClick={() => { setErr(""); start(); }}>Measure again</Button>}
      {state === "done" && err && <p className="text-sm text-sos">{err}</p>}
    </div>
  );
}
