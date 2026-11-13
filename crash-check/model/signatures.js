/*
 * Seven motion signatures, built from the physics of each situation, sampled at 50 Hz.
 * They are the test set for the model and the replays in the app's "How Crash Check decides"
 * screen. They are synthetic: the next step is to replace them with phone recordings from
 * real drops and from crash-test dummies on a bike (see docs/03-detection-model.md).
 *
 * Each trace: { id, title, sub, expect, samples: [{t, g, rot}], speeds: [{t, kmh}], touchAt? }
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CrashSignatures = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DT = 20; // ms, 50 Hz

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** A small builder: append segments of motion, each a function of time within it. */
  function builder(seed) {
    const r = rng(seed);
    const n = () => (r() - 0.5) * 2; // -1..1
    const samples = [];
    const speeds = [];
    let t = 0;
    let kmh = 0;
    const api = {
      r,
      n,
      get t() {
        return t;
      },
      /** ms long; fn(i, k) returns {g, rot} where k runs 0..1 across the segment. */
      seg(ms, fn) {
        const steps = Math.max(1, Math.round(ms / DT));
        for (let i = 0; i < steps; i++) {
          const v = fn(i, i / steps);
          samples.push({ t, g: Math.max(0, v.g), rot: Math.max(0, v.rot || 0) });
          if (t % 1000 === 0) speeds.push({ t, kmh: Math.max(0, typeof kmh === "function" ? kmh(t) : kmh) });
          t += DT;
        }
        return api;
      },
      speed(v) {
        kmh = v;
        return api;
      },
      // Common motions.
      held(ms) {
        return api.seg(ms, () => ({ g: 1 + n() * 0.05, rot: 12 + r() * 25 }));
      },
      walking(ms) {
        return api.seg(ms, (i) => ({ g: 1 + Math.sin(i * 0.68) * 0.35 + n() * 0.06, rot: 30 + r() * 40 }));
      },
      riding(ms, rough = 0.12) {
        return api.seg(ms, () => ({ g: 1 + n() * rough, rot: 8 + r() * 20 }));
      },
      falling(ms) {
        return api.seg(ms, () => ({ g: 0.04 + r() * 0.08, rot: 60 + r() * 80 }));
      },
      spike(peak, ms, rot = 200) {
        // Rise to peak and back, half a sine.
        return api.seg(ms, (_i, k) => ({ g: 1 + (peak - 1) * Math.sin(Math.PI * k), rot }));
      },
      tumble(ms, degPerS) {
        return api.seg(ms, (i) => ({ g: 1.2 + Math.abs(Math.sin(i * 0.9)) * 1.4 + n() * 0.2, rot: degPerS * (0.8 + r() * 0.4) }));
      },
      still(ms) {
        return api.seg(ms, () => ({ g: 1 + n() * 0.015, rot: r() * 3 }));
      },
      pickup(ms) {
        return api.seg(ms, (i) => ({ g: 1 + Math.sin(i * 0.5) * 0.45 + n() * 0.1, rot: 110 + r() * 90 }));
      },
      done(meta) {
        return { ...meta, samples, speeds };
      },
    };
    return api;
  }

  // Free fall time from a height: t = sqrt(2h / g). 1.2 m (hand, standing) is 0.49 s.
  const fallMs = (metres) => Math.round(Math.sqrt((2 * metres) / 9.81) * 1000);

  function dropFromHand() {
    return builder(11)
      .speed(0)
      .held(3000)
      .falling(fallMs(1.2))
      .spike(6.4, 40, 300) // tiles: short and sharp
      .seg(120, () => ({ g: 0.9, rot: 420 }))
      .spike(2.3, 30, 380) // the bounce
      .seg(240, () => ({ g: 1.05, rot: 260 }))
      .still(1800)
      .pickup(900)
      .held(5000)
      .done({ id: "drop", title: "Dropped from your hand", sub: "1.2 m onto tiles, standing still", expect: ["drop", "nothing"] });
  }

  function tossOnBed() {
    return builder(23)
      .speed(0)
      .held(3000)
      .falling(fallMs(0.4))
      .spike(1.7, 140, 90) // a mattress spreads the stop over 140 ms
      .seg(200, () => ({ g: 1.1, rot: 60 }))
      .still(7000)
      .done({ id: "bed", title: "Tossed on the bed", sub: "Short fall, soft landing", expect: ["drop", "nothing"] });
  }

  function pothole() {
    const b = builder(37).speed(30);
    return b
      .riding(4000)
      .spike(3.3, 40, 90)
      .seg(60, () => ({ g: 0.5, rot: 60 }))
      .spike(2.6, 40, 80)
      .riding(7000)
      .done({ id: "pothole", title: "Pothole at 30 km/h", sub: "Big jolt, then you keep riding", expect: ["bump", "nothing"] });
  }

  function hardBraking() {
    const b = builder(41);
    b.speed((t) => (t < 4000 ? 40 : Math.max(5, 40 - ((t - 4000) / 2200) * 35)));
    return b
      .riding(4000)
      .seg(2200, () => ({ g: Math.hypot(1, 0.72) + b.n() * 0.08, rot: 15 })) // 0.72 g of braking
      .riding(5000, 0.05)
      .done({ id: "brake", title: "Hard braking", sub: "40 to 5 km/h in 2 seconds", expect: ["none"] });
  }

  function crash() {
    const b = builder(53);
    b.speed((t) => (t < 4000 ? 34 : 0));
    return b
      .riding(4000)
      .spike(7.5, 80, 300) // the bike hits the car
      .seg(60, () => ({ g: 3.1, rot: 450 }))
      .falling(260) // thrown
      .spike(5.2, 70, 600) // the road
      .tumble(1100, 640)
      .still(7000)
      .done({ id: "crash", title: "Bike crash at 34 km/h", sub: "Hit, thrown, rolled, then still", expect: ["crash"] });
  }

  function mountFall() {
    const b = builder(61);
    b.speed((t) => (t < 4000 ? 28 : 0)); // the phone's own GPS stops with the phone
    return b
      .riding(4000)
      .falling(fallMs(0.9))
      .spike(5.4, 40, 500)
      .tumble(600, 520)
      .still(7000)
      .done({ id: "mount", title: "Phone fell off the mount", sub: "At 28 km/h. You rode on.", expect: ["crash"] });
  }

  function minorFall() {
    const b = builder(71);
    b.speed((t) => (t < 4000 ? 12 : t < 9000 ? 0 : 2));
    return b
      .riding(4000)
      .spike(3.6, 60, 260)
      .tumble(500, 560)
      .still(1500)
      .pickup(1200)
      .walking(4000)
      .done({ id: "slip", title: "Slow skid, you got up", sub: "12 km/h on sand, phone in pocket", expect: ["fall"], touchAt: 7300 });
  }

  const all = () => [dropFromHand(), tossOnBed(), pothole(), hardBraking(), crash(), mountFall(), minorFall()];

  return { all, fallMs, DT };
});
