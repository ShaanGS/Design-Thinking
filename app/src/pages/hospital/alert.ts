// Attention tone and vibration for a new incoming patient. Browsers only allow audio after a user gesture,
// so the context is unlocked on the first tap and the tone is skipped silently until then.
let audioCtx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    void audioCtx.resume();
  } catch { /* no audio */ }
}

/** Two rising "pa-ging" pairs, about one second in all. */
export function alertTone() {
  if (!audioCtx || audioCtx.state !== "running") return;
  const ctx = audioCtx;
  const t = ctx.currentTime;
  [[740, 0], [988, 0.16], [740, 0.5], [988, 0.66]].forEach(([f, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15);
    o.connect(g).connect(ctx.destination); o.start(t + d); o.stop(t + d + 0.16);
  });
}

export function buzz() {
  // Chrome blocks (and logs) vibration before the first tap
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (ua && !ua.hasBeenActive) return;
  try { navigator.vibrate?.([400, 150, 400, 150, 400]); } catch { /* not supported */ }
}
