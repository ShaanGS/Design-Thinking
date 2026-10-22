# Saathi: the app

A full-stack, installable web app (PWA) for elders, their families and hospitals. One server runs the API, the live updates and the web app. Open it on several phones and laptops at once, and every screen updates live.

| Who | What they get | URL |
|---|---|---|
| **Elder** (Kamala Paati) | Tamil-first giant buttons: hold-to-SOS, "I took my tablets", talk to Saathi (voice), Face Pulse heart-rate check, offline emergency QR card, fall detection | `/elder` |
| **Family** (Karthik, son) | Live status and activity feed, medicines with safety checks, adherence and vitals charts, **Health Vault**, live emergency tracking on a map, visits, family circle | `/family` |
| **Hospital** (Dr. Priya, ER) | Incoming patients with an AI pre-arrival brief and red flags, "why this hospital" routing, break-glass record access, network beds, medicine stock and relays | `/hospital` |
| **Doctor** (no login) | Read-only lifetime record from a 24-hour share link or QR | `/share/:token` |

## Design

The interface follows [`DESIGN.md`](DESIGN.md): a "signage-grade" system built for a 72-year-old reading Tamil first (blue-black ink, turmeric yellow, red only for emergencies), Indian-foundry fonts bundled offline (Anek, Hind Madurai), and doses shown as medicine blister strips.

## What's inside

- **Health Vault.** Photograph or upload prescriptions, lab reports, discharge summaries and scans (images or PDF). Claude reads each paper (handwriting too), builds a dated timeline and lab trends, and **cross-checks every paper together**: falling kidney function versus the metformin dose, interactions between prescriptions from different doctors, duplicate brands, rising cholesterol. Ask questions in English or Tamil with source citations. Generate a doctor brief and share link.
- **Daily companion.** Saathi chats with the elder in Tamil, remembers context, logs tablets from the conversation, and escalates red-flag phrases ("my chest feels heavy") through **fixed safety rules that override the AI**.
- **Golden-hour emergency.** SOS from the button, the AI chat, a check-in reply or the fall sensor. Then: triage → **need-matched routing** (the nearest hospital *that can treat this patient*, ranked by time to definitive care and explained) → AI pre-arrival brief to the ER → a live ambulance on the map → ER "team ready" / "received" → family notified at every step.
- **Medicines.** Schedules by time of day, one-tap confirmation, stock and refill warnings, 14-day adherence, and a safety check on every new medicine (duplicates, allergy conflicts like penicillin, interactions).
- **Hospital network.** Live ICU and ER beds, capabilities (cath lab, CT, neuro, ventilator), critical-drug stock (anti-snake venom, tenecteplase, rabies IG, blood, oxygen) and **medicine relays** between hospitals.
- **Missed-dose escalation.** Morning dose not confirmed → Saathi calls her → neighbour → family (simulated in the demo with one button).
- **Face Pulse.** Heart rate from a 20-second selfie (camera rPPG, POS method), saved to vitals. Runs entirely on the phone.

## Run it

Needs Node 22.5 or newer.

```bash
cd app
npm install
cp .env.example .env          # optional: add ANTHROPIC_API_KEY for live AI
npm run dev                   # API on :3000 + web on :5173 (hot reload)
```

Open http://localhost:5173 and pick a persona. To use real phones on the same Wi-Fi, open `http://<your-laptop-ip>:5173`.

Production (one port):

```bash
npm run build
npm start                     # http://localhost:3000
```

- **Without `ANTHROPIC_API_KEY`**, Saathi runs in **demo mode**: a rules engine answers chat, triage and questions, and the six sample papers have prepared readings. Uploading *new* papers needs the key.
- **With the key**, all AI runs on Claude (`SAATHI_MODEL`, default `claude-opus-5-5`). Server-side fallback is enabled, so a safety-classifier refusal is retried on Anthropic's recommended fallback model.
- `DEMO_SPEED=20` makes the ambulance simulation run 20× faster, so a 15-minute trip takes about 45 seconds on stage.
- `npm run seed` resets the demo family, hospitals and history.

### Live demo

- **App:** https://saathi-app-eta.vercel.app (open it on a phone, or on a laptop to see it inside a phone frame)
- **All three phones at once:** https://saathi-app-eta.vercel.app/stage. Hold the red button on Paati's phone and watch the family app and the ER react live. "Reset demo" starts fresh.
- Every push to the branch redeploys automatically (Vercel container, `Dockerfile.vercel`).

### Put it online (so any phone can open it)

- **Render (free, always the same link):** open https://render.com/deploy?repo=https://github.com/ShaanGS/Design-Thinking, sign in with GitHub and click *Apply* (it reads `render.yaml` at the repo root). Paste `ANTHROPIC_API_KEY` when asked, or leave it blank for demo mode. The free tier sleeps when idle, so open it 1 minute before the demo.
- Ambulance routes come from OSRM over OpenStreetMap roads (`OSRM_URL` overrides the public server). If the host can't reach it, routing falls back to straight-line estimates.
- **Docker:** `docker build -t saathi . && docker run -p 3000:3000 -e ANTHROPIC_API_KEY=... saathi`.
- Camera (Face Pulse), microphone (voice) and motion sensors (fall detection) need **https** (or localhost).
- Install on a phone: open the link → browser menu → *Add to Home screen*. It opens full-screen like a native app.

## Demo script (5 minutes, 3 devices)

1. **Projector:** Family app (Karthik). **Phone 1:** elder app (Paati). **Laptop 2 / tab:** Hospital console.
2. Paati taps **"I took them"** and Karthik's feed updates instantly. Paati opens **Talk to Saathi** and says *"ராத்திரி சரியா தூக்கம் வரலை"* ("I couldn't sleep properly last night"); the family sees "slept badly again".
3. **Health Vault → Caught:** six papers, four doctors, and Saathi found the kidney/metformin, statin and omeprazole/clopidogrel problems. Ask *"பாட்டிக்கு என்ன அலர்ஜி?"* ("what is Paati allergic to?"). Make a **doctor link** and scan the QR with a judge's phone.
4. Paati **holds SOS** and picks *chest pain*. In seconds: the family gets an alert with the map, the ambulance is routed past the PHC to the cath-lab hospital ("~N min saved"), and the ER console shows the patient with the AI brief, the penicillin allergy and the blood-thinner flag. The ER taps **Team ready**; Karthik taps **I'm on my way**; the ambulance arrives; the ER taps **Patient received**.
5. **Hospital console:** Saraswathi is out of anti-snake venom. **Request relay** and the network finds the nearest donor.
6. Bonus: **Face Pulse** on a judge, next to a pulse oximeter.

## Architecture

```
web (React 18 + Vite + Tailwind, PWA)  ── REST /api ──►  Express server (TypeScript, tsx)
        ▲                                                  ├─ SQLite (node:sqlite) · uploads on disk
        └──────── Socket.IO live events ◄──────────────────┤─ AI layer: Claude (structured outputs) + rules fallback
                                                           ├─ Routing engine (need-matched, haversine + capability)
                                                           └─ Simulation clock (ambulances, relays) · missed-dose watcher
```

| Path | What |
|---|---|
| `server/ai.ts` | Every AI feature: document reading (vision + PDF), cross-document insights, record Q&A, triage, ER brief, the companion, medicine checks, with deterministic fallbacks |
| `server/routing.ts` | Need-matched routing and the transfer-penalty scoring |
| `server/emergency.ts` | SOS lifecycle, ambulance simulation, ER actions, medicine relays |
| `server/routes.ts` | REST API |
| `server/seed.ts` | Demo family, five fictional hospitals, 13 days of history, six sample papers |
| `shared/types.ts` | Types shared by client and server |
| `src/pages/*` | Elder, family, vault, hospital and doctor-share screens |
| `src/components/` | UI kit, live map, QR, Face Pulse |

All people, hospitals and medical documents are fictional sample data. Saathi gives information to discuss with a doctor; it never diagnoses or changes medicines.
