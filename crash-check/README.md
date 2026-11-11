# Crash Check: a Ride Nanba feature

**Design Thinking project.** When a phone goes through a crash, Ride Nanba asks the rider "Are you okay?". If nobody answers, the people they chose get their location for one hour. When the phone is only dropped, nobody is told anything.

## What's here

| Path | What it is |
|---|---|
| [`docs/01-design-thinking-dossier.md`](docs/01-design-thinking-dossier.md) | The project: reframed problem, evidence, personas, empathy maps, today's journey, POV and HMW, design principles, Crazy 8s scoring, the flow, prototype iterations, validation plan, competitors, feasibility, business fit, roadmap |
| [`docs/02-research-kit.md`](docs/02-research-kit.md) | Consent script, interview guides (riders, parents, bike-taxi riders, 108 EMT), usability test sheet, survey, drop and ride test log |
| [`docs/03-detection-model.md`](docs/03-detection-model.md) | How the phone tells a crash from a drop: the physics, five signals, the points, test results, known limits, privacy |
| [`docs/04-pitch-and-demo.md`](docs/04-pitch-and-demo.md) | 10-slide outline, live demo run-sheet, likely questions |
| [`model/crash-model.js`](model/crash-model.js) | The detection model. Runs in the browser and in Node |
| [`model/signatures.js`](model/signatures.js) | Seven motion signatures (drop, bed toss, pothole, hard braking, crash, phone off the mount, slow skid) |
| [`prototype/index.html`](prototype/index.html) | The working prototype, one file. Built from `prototype/app.html` |

## Live

**https://crash-check.vercel.app** opens on any phone or laptop. On a phone it can read the real motion sensor.

## Run it

```bash
node crash-check/model/test.mjs          # the model against all seven signatures
node crash-check/prototype/build.mjs     # rebuild the prototype after editing app.html
python3 -m http.server 8000              # then open http://localhost:8000/crash-check/prototype/
```

- **Wide screen:** two phones side by side, Priya's (riding) and Amma's (at home). Open Presenter controls (the round button on Priya's map) to act out a drop, a pothole or a crash.
- **On a phone:** the page shows one phone. In Presenter controls, "Make this Amma's phone" switches it. Add `#amma` or `#priya` to the address to open straight into one.
- **Real motion sensor:** phones only share motion with pages served over https (or localhost). Host the `prototype/` folder on GitHub Pages, Netlify Drop or Vercel, open it on a phone, then Presenter controls → "Use this phone's motion sensor".

## The design

The prototype uses Ride Nanba's own design system (`ShaanGS/ride-nanba`, `docs/DESIGN.md`): the white page, `#f3f3f3` tiles, black 56 px buttons, flat rows, bottom sheets, the switch, the map-and-sheet screen, and the 3D art from `public/art`. Red appears only for a crash, green only for live and safe, purple only on the safety shield.

## Real and simulated

- **Real:** the detection model and its scoring, the motion sensor reading on a phone over https, GPS speed when riding, the countdown with sound, vibration and voice, the live link between the two phones in the claude.ai artifact.
- **Simulated:** the trip and the map, the seven recorded signatures (synthetic, from physics), the 32 km/h riding speed on stage, Arjun's text message.
- **Not built yet:** the Android background service, alerts that ring on silent, SMS fallback, real recordings to tune the model.

All people are composite personas. The phone numbers are placeholders.
