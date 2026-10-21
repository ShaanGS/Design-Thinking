// Heart rate from face video (remote photoplethysmography).
// Each frame gives the mean R, G, B of a skin patch; blood volume changes tint the skin slightly
// with every heartbeat. We use the POS method (Wang et al., 2017), then pick the strongest
// frequency between 42 and 180 beats per minute.
(function (root) {
  "use strict";

  function mean(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; }
  function std(a) { const m = mean(a); let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2; return Math.sqrt(s / a.length) || 1e-9; }

  // POS: project temporally normalised RGB onto a plane orthogonal to skin tone, over sliding windows.
  function pos(r, g, b, fps) {
    const n = r.length, w = Math.max(8, Math.round(1.6 * fps)), h = new Float64Array(n);
    for (let start = 0; start + w <= n; start++) {
      const end = start + w;
      const mr = mean(r.slice(start, end)), mg = mean(g.slice(start, end)), mb = mean(b.slice(start, end));
      const s1 = new Float64Array(w), s2 = new Float64Array(w);
      for (let i = 0; i < w; i++) {
        const cr = r[start + i] / mr, cg = g[start + i] / mg, cb = b[start + i] / mb;
        s1[i] = cg - cb;
        s2[i] = cg + cb - 2 * cr;
      }
      const alpha = std(s1) / std(s2), seg = new Float64Array(w);
      for (let i = 0; i < w; i++) seg[i] = s1[i] + alpha * s2[i];
      const m = mean(seg);
      for (let i = 0; i < w; i++) h[start + i] += seg[i] - m;
    }
    return h;
  }

  // Remove slow drift (lighting, small head movement) with a moving-average subtraction.
  function detrend(x, fps) {
    const k = Math.max(3, Math.round(fps * 1.0)), out = new Float64Array(x.length);
    for (let i = 0; i < x.length; i++) {
      let s = 0, c = 0;
      for (let j = Math.max(0, i - k); j <= Math.min(x.length - 1, i + k); j++) { s += x[j]; c++; }
      out[i] = x[i] - s / c;
    }
    return out;
  }

  // Power at each candidate BPM via a direct DFT (small N, so this is fast enough).
  function spectrum(x, fps, lo = 42, hi = 180, step = 0.5) {
    const n = x.length, out = [];
    // Hann window
    const xw = new Float64Array(n);
    for (let i = 0; i < n; i++) xw[i] = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    for (let bpm = lo; bpm <= hi; bpm += step) {
      const f = bpm / 60, w = (2 * Math.PI * f) / fps;
      let re = 0, im = 0;
      for (let i = 0; i < n; i++) { re += xw[i] * Math.cos(w * i); im -= xw[i] * Math.sin(w * i); }
      out.push({ bpm, p: re * re + im * im });
    }
    return out;
  }

  // Returns {bpm, quality (0..1), signal} or null when there's not enough data.
  function estimate(samples) {
    if (samples.length < 64) return null;
    const t0 = samples[0].t, t1 = samples[samples.length - 1].t;
    const fps = (samples.length - 1) / ((t1 - t0) / 1000);
    if (!(fps > 5)) return null;
    const r = samples.map(s => s.r), g = samples.map(s => s.g), b = samples.map(s => s.b);
    const sig = detrend(pos(r, g, b, fps), fps);
    const sp = spectrum(sig, fps);
    let best = sp[0], total = 0;
    for (const s of sp) { total += s.p; if (s.p > best.p) best = s; }
    // Quality: share of power within ±6 bpm of the peak (and its first harmonic).
    let near = 0;
    for (const s of sp) if (Math.abs(s.bpm - best.bpm) <= 6 || Math.abs(s.bpm - 2 * best.bpm) <= 6) near += s.p;
    return { bpm: Math.round(best.bpm), quality: Math.min(1, near / (total || 1)), fps, signal: Array.from(sig.slice(-Math.round(fps * 8))) };
  }

  const api = { estimate, pos, detrend, spectrum };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.RPPG = api;
})(typeof self !== "undefined" ? self : this);
