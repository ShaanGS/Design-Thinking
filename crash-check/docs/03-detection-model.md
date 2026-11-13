# Crash Check: the detection model

Code: [`model/crash-model.js`](../model/crash-model.js). Test set: [`model/signatures.js`](../model/signatures.js). Run the tests with `node crash-check/model/test.mjs`.

## The problem in one line

Tell **"this phone went through a crash"** from **"this phone was dropped, bumped or tossed"**, on any Android phone, without sending anything off the phone.

## Why one threshold fails

A phone in free fall reads close to **0 g** on its accelerometer, because it is falling with gravity. When it lands, it reads a spike. How high depends on the surface:

| Drop height | Free fall time, t = √(2h/g) |
|---|---|
| 0.5 m (pocket height, sitting) | 0.32 s |
| 0.8 m (table) | 0.40 s |
| 1.2 m (hand, standing) | 0.49 s |
| 1.5 m (raised hand) | 0.55 s |
| 1.8 m (above the head) | 0.61 s |

A 1.2 m drop onto tiles stops the phone in a few milliseconds, which can read well over 6 g. A rider thrown off a scooter, with the phone in a jacket pocket, may register a smaller peak, because the body and the jacket cushion the phone. Most phone accelerometers also stop reading at 8 g or 16 g. So "above X g means a crash" either misses crashes or fires on drops. What differs is **the story around the spike**.

## Five signals

| Signal | What it measures | From | Points |
|---|---|---|---|
| **Moving before** | Fastest speed in the 8 s before the hit | GPS speed (or the Ride Nanba trip) | +30 at 12 km/h or more; +10 at 5 to 12 km/h |
| **Hit** | Highest reading in the 2 s around the hit | Accelerometer | +20 at 4 g or more; +10 at 2.5 to 4 g |
| **Hit lasted** | Time spent above 2 g | Accelerometer | +10 at 60 ms or more (a drop on tiles is a 20 to 40 ms spike; a vehicle impact lasts longer) |
| **Tumbled** | Total degrees turned in the 2.5 s around the hit | Gyroscope | +15 at 270° or more |
| **Stopped dead** | Speed after the hit, when moving before | GPS speed, or no movement for 3 s | +15 below 3 km/h |
| **Lying still** | Time the phone has been still at the end of the check | Accelerometer and gyroscope | +10 at 3 s or more, when not picked up |

Two signals take points away:

| Signal | Means | Points |
|---|---|---|
| **Picked up** | The screen was touched, or the phone was handled for 0.3 s and is no longer still | −40 |
| **Kept going** | Speed after the hit is still 10 km/h or more (a pothole) | −50 |

**Decision, 6 seconds after the hit:**

| Score | What happens |
|---|---|
| 60 or more | "Are you okay?" with a countdown; family are told if there is no answer |
| 35 to 59, and moving before | A quiet check on screen; nothing is sent unless the rider asks |
| Under 35 | Nothing. A short note says why ("Looks like a dropped phone. Nothing sent.") |

A check starts when a reading crosses **2.5 g**, or the phone has been falling for **0.15 s** (a fall of about 11 cm). Walking peaks near 1.6 g and hard braking near 1.3 g, so ordinary riding never starts a check.

## Results on the test set

Output of `node crash-check/model/test.mjs`:

```
PASS  Dropped from your hand         0  drop     Hit +20, Picked up -40
PASS  Tossed on the bed             10  drop     Lying still +10
PASS  Pothole at 30 km/h             0  bump     Moving before +30, Hit +10, Kept going -50
PASS  Hard braking                   -  none     never triggered
PASS  Bike crash at 34 km/h        100  crash    Moving before +30, Hit +20, Hit lasted +10, Tumbled +15, Stopped dead +15, Lying still +10
PASS  Phone fell off the mount     100  crash    Moving before +30, Hit +20, Hit lasted +10, Tumbled +15, Stopped dead +15, Lying still +10
PASS  Slow skid, you got up         40  fall     Moving before +30, Hit +10, Hit lasted +10, Tumbled +15, Stopped dead +15, Picked up -40
```

Two things to notice:

- **A drop while not moving can never reach 60.** Without "Moving before" and "Stopped dead", the most a drop can score is 20 + 10 + 15 + 10 = 55, even if the phone tumbles and is left on the floor. Standing still, Crash Check will never alert anyone.
- **A phone falling off the mount scores the same as a crash.** From the phone's point of view it is the same event: it was moving at riding speed, hit the road, tumbled and lies still. This is why the model only ever *asks*. The rider, who rode on, stops and taps "I'm okay". In v2, a paired Bluetooth helmet or earbuds moving away from the phone could tell these apart.

## Limits we know about

- **The signatures are synthetic**, built from the physics of each situation. They prove the logic, not the thresholds. The next step is real recordings (research kit, section 7).
- **Phone in a bag on the floor of a car or bus** that brakes hard: low risk, since braking does not cross 2.5 g, but needs testing.
- **GPS speed is slow and noisy in Chennai's dense areas.** When GPS speed is missing, "Stopped dead" falls back to "no movement for 3 seconds".
- **Background limits on Android:** the real app must run as a foreground service during the trip only, which also fits the privacy rule.

## Privacy, by construction

- The detector keeps a **12-second rolling buffer** of motion and speed, in memory, and deletes older readings continuously.
- It produces one decision per event. Only the decision and its points are shown on the rider's screen.
- No reading, score or location leaves the phone unless an alert is sent. Then only the location, the time, the speed before the crash and whether the phone has moved since are sent, to the chosen people, for one hour.
