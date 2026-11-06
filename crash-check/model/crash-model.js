/*
 * Crash Check: the detection model.
 *
 * Runs on the phone, on the motion sensor stream. Nothing here touches the network.
 *
 * The question it answers: "did this phone just go through a crash, or was it dropped?"
 * A single g-force threshold cannot answer that. A phone dropped on tiles from 1.2 m can
 * spike past 6 g, more than many bike crashes register on a phone in a pocket. What
 * separates the two is the story around the spike:
 *
 *   1. Were you moving at riding speed just before?      (GPS, or the trip you are on)
 *   2. How hard was the hit, and how long did it last?   (accelerometer, in g)
 *   3. Did the phone tumble?                             (gyroscope, degrees turned)
 *   4. Did you stop dead afterwards?                     (GPS speed after)
 *   5. Is the phone lying still, or was it picked up?    (motion after, screen touch)
 *
 * Each signal adds or takes away points. The total decides what happens next:
 *   >= 60  crash: ask "Are you okay?" with a countdown, then alert family
 *   35-59  fall:  a quiet check, nothing is sent unless you ask for help
 *   < 35   nothing is sent (a drop, a bump, a toss on the bed)
 *
 * Units: time in ms, acceleration in g (1 g = 9.81 m/s^2, includes gravity, so a phone at
 * rest reads 1 g and a phone in free fall reads close to 0 g), rotation in degrees/second,
 * speed in km/h.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CrashModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const G = 9.80665;

  /** Tunable constants. Every number has a reason next to it. */
  const T = {
    triggerG: 2.5, // A hit this hard starts a check. Walking peaks near 1.6 g, braking near 1.3 g.
    freeFallG: 0.4, // Below this the phone is falling (it reads 0 g in true free fall).
    freeFallTriggerMs: 150, // 150 ms of falling is a drop of about 11 cm. Shorter is a jolt.
    hitG: 2.0, // Time spent above 2 g measures how long the hit lasted.
    settleMs: 6000, // Watch for 6 s after the hit before deciding.
    stillG: 0.12, // Within 0.12 g of 1 g, and turning under 25 deg/s, counts as lying still.
    stillRot: 25,
    pickupRot: 70, // Turning faster than 70 deg/s after the hit, or a 0.25 g jolt, is handling.
    pickupG: 0.25,
    ridingKmh: 12, // A cycle or a slow bike in traffic.
    movingKmh: 5, // Faster than walking.
    stoppedKmh: 3,
    askAt: 60,
    quietAt: 35,
    cooldownMs: 4000,
    bufferMs: 12000,
  };

  /** Points for each signal, with the label a rider reads in the app. */
  function scoreFeatures(f) {
    const s = [];
    const add = (key, label, value, points, met) => s.push({ key, label, value, points: met ? points : 0, met });

    const before = f.speedBefore;
    add("moving", "Moving before", before == null ? "Not known" : `${Math.round(before)} km/h`, before >= T.ridingKmh ? 30 : 10, before != null && before >= T.movingKmh);

    const peakPts = f.peakG >= 4 ? 20 : 10;
    add("impact", "Hit", `${f.peakG.toFixed(1)} g`, peakPts, f.peakG >= T.triggerG);

    add("lasted", "Hit lasted", `${Math.round(f.hitMs)} ms above 2 g`, 10, f.hitMs >= 60);

    add("tumble", "Tumbled", `${Math.round(f.rotationDeg)} degrees`, 15, f.rotationDeg >= 270);

    const stoppedDead =
      before != null && before >= T.movingKmh && (f.speedAfter != null ? f.speedAfter < T.stoppedKmh : f.stillMs >= 3000);
    add(
      "stopped",
      "Stopped dead",
      f.speedAfter != null ? `${Math.round(f.speedAfter)} km/h after` : f.stillMs >= 3000 ? "No movement after" : "Still moving",
      15,
      stoppedDead,
    );

    add("still", "Lying still", `${(f.stillMs / 1000).toFixed(1)} s`, 10, f.stillMs >= 3000 && !f.pickedUp);

    // Signals that take points away.
    if (f.pickedUp) s.push({ key: "picked", label: "Picked up", value: f.touched ? "Screen touched" : "Handled after the hit", points: -40, met: true });
    if (f.speedAfter != null && f.speedAfter >= 10)
      s.push({ key: "resumed", label: "Kept going", value: `${Math.round(f.speedAfter)} km/h after`, points: -50, met: true });

    const score = Math.max(0, Math.min(100, s.reduce((n, x) => n + x.points, 0)));
    return { score, signals: s };
  }

  function verdictFor(score, f) {
    if (score >= T.askAt) return "crash";
    const wasMoving = f.speedBefore != null && f.speedBefore >= T.movingKmh;
    if (score >= T.quietAt && wasMoving) return "fall";
    if (f.speedAfter != null && f.speedAfter >= 10) return "bump";
    if (f.freeFallMs >= 200) return "drop";
    return "nothing";
  }

  const WORDS = {
    crash: "Looks like a crash. Asking if you are okay.",
    fall: "Looks like a fall. A quiet check, nothing sent.",
    bump: "A bump on the road. You kept going.",
    drop: "Looks like a dropped phone. Nothing sent.",
    nothing: "Nothing to worry about. Nothing sent.",
  };

  /** Longest run of consecutive samples where test() holds, in ms. */
  function longestRun(samples, test) {
    let best = 0;
    let start = null;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      if (test(s)) {
        if (start == null) start = s.t;
        best = Math.max(best, s.t - start + (samples[i + 1] ? samples[i + 1].t - s.t : 0));
      } else start = null;
    }
    return best;
  }

  /** The run that is still going at the end of the window, in ms. */
  function trailingRun(samples, test) {
    let end = samples.length - 1;
    if (end < 0 || !test(samples[end])) return 0;
    let i = end;
    while (i > 0 && test(samples[i - 1])) i--;
    return samples[end].t - samples[i].t;
  }

  /** Work out the five signals around a hit at time t0. */
  function extract(buffer, speeds, t0, tEnd, touchedAt) {
    const win = (a, b) => buffer.filter((s) => s.t >= a && s.t <= b);
    const hitWin = win(t0 - 500, t0 + 1500);
    const fallWin = win(t0 - 1500, t0 + 500);
    const rotWin = win(t0 - 500, t0 + 2000);
    const afterWin = win(t0 + 1500, tEnd);

    const peakG = hitWin.reduce((m, s) => Math.max(m, s.g), 0);
    let hitMs = 0;
    for (let i = 1; i < hitWin.length; i++) if (hitWin[i].g >= T.hitG) hitMs += hitWin[i].t - hitWin[i - 1].t;
    const freeFallMs = longestRun(fallWin, (s) => s.g < T.freeFallG);
    let rotationDeg = 0;
    for (let i = 1; i < rotWin.length; i++) rotationDeg += (rotWin[i].rot * (rotWin[i].t - rotWin[i - 1].t)) / 1000;

    const isStill = (s) => Math.abs(s.g - 1) < T.stillG && s.rot < T.stillRot;
    const stillMs = trailingRun(afterWin, isStill);
    let handledMs = 0;
    for (let i = 1; i < afterWin.length; i++) {
      const s = afterWin[i];
      if (s.rot > T.pickupRot || Math.abs(s.g - 1) > T.pickupG) handledMs += s.t - afterWin[i - 1].t;
    }
    const touched = touchedAt != null && touchedAt > t0 && touchedAt <= tEnd;
    const pickedUp = touched || (handledMs >= 300 && stillMs < 2000);

    const before = speeds.filter((v) => v.t >= t0 - 8000 && v.t <= t0 - 200);
    const after = speeds.filter((v) => v.t >= t0 + 2000 && v.t <= tEnd);
    const speedBefore = before.length ? Math.max(...before.map((v) => v.kmh)) : null;
    const speedAfter = after.length ? after[after.length - 1].kmh : null;

    return { peakG, hitMs, freeFallMs, rotationDeg, stillMs, pickedUp, touched, speedBefore, speedAfter };
  }

  /**
   * The streaming detector. Feed it motion samples and speed readings as they arrive; it
   * calls onDecision once per event, about 6 s after the hit.
   */
  function createDetector(opts = {}) {
    const onDecision = opts.onDecision || (() => {});
    const onTrigger = opts.onTrigger || (() => {});
    let buffer = [];
    let speeds = [];
    let pending = null; // { t0 }
    let cooldownUntil = 0;
    let touchedAt = null;
    let ffStart = null;

    function prune(now) {
      const cut = now - T.bufferMs;
      if (buffer.length && buffer[0].t < cut) buffer = buffer.filter((s) => s.t >= cut);
      if (speeds.length && speeds[0].t < cut) speeds = speeds.filter((s) => s.t >= cut);
    }

    function decide(now) {
      const t0 = pending.t0;
      const f = extract(buffer, speeds, t0, now, touchedAt);
      const { score, signals } = scoreFeatures(f);
      const verdict = verdictFor(score, f);
      pending = null;
      cooldownUntil = now + T.cooldownMs;
      onDecision({ t0, at: now, score, verdict, words: WORDS[verdict], signals, features: f });
    }

    return {
      /** sample: { t, g } plus optional rot (deg/s). Or pass ax, ay, az in g. */
      push(sample) {
        const s = { t: sample.t, g: sample.g, rot: sample.rot || 0 };
        if (s.g == null) s.g = Math.hypot(sample.ax || 0, sample.ay || 0, sample.az || 0);
        buffer.push(s);
        prune(s.t);

        if (s.g < T.freeFallG) {
          if (ffStart == null) ffStart = s.t;
        } else ffStart = null;

        if (!pending && s.t >= cooldownUntil) {
          const falling = ffStart != null && s.t - ffStart >= T.freeFallTriggerMs;
          if (s.g >= T.triggerG || falling) {
            // Anchor the window on the hit itself, which comes right after a fall.
            pending = { t0: s.t };
            onTrigger({ t: s.t, g: s.g, reason: falling ? "fall" : "hit" });
          }
        } else if (pending && s.g >= T.triggerG && s.t - pending.t0 < 1200) {
          // A fall that ends in a hit: move the anchor onto the hit.
          const peakSoFar = buffer.filter((x) => x.t >= pending.t0 - 50 && x.t < s.t).reduce((m, x) => Math.max(m, x.g), 0);
          if (s.g > peakSoFar && peakSoFar < T.triggerG) pending.t0 = s.t;
        }
        if (pending && s.t - pending.t0 >= T.settleMs) decide(s.t);
      },
      speed(t, kmh) {
        speeds.push({ t, kmh });
        prune(t);
      },
      touch(t) {
        touchedAt = t;
      },
      busy() {
        return pending != null;
      },
      reset() {
        buffer = [];
        speeds = [];
        pending = null;
        cooldownUntil = 0;
        touchedAt = null;
        ffStart = null;
      },
    };
  }

  /** Run a whole recorded trace through a fresh detector. Returns every decision. */
  function replay(trace) {
    const out = [];
    const d = createDetector({ onDecision: (r) => out.push(r) });
    const speeds = (trace.speeds || []).slice();
    let si = 0;
    for (const s of trace.samples) {
      while (si < speeds.length && speeds[si].t <= s.t) {
        d.speed(speeds[si].t, speeds[si].kmh);
        si++;
      }
      if (trace.touchAt != null && s.t >= trace.touchAt && s.t - trace.touchAt < 25) d.touch(trace.touchAt);
      d.push(s);
    }
    return out;
  }

  /** Read a DeviceMotionEvent into a sample. Returns null if the browser gave no data. */
  function fromDeviceMotion(e, t) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return null;
    const r = e.rotationRate || {};
    const rot = Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0);
    return { t, g: Math.hypot(a.x, a.y, a.z) / G, rot };
  }

  return { T, G, createDetector, replay, scoreFeatures, verdictFor, extract, fromDeviceMotion, WORDS };
});
