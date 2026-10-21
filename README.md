# Saathi: the AI grandchild that calls every day

**Design Thinking course project, Group 4**
Shaan (RA2511004010247) · Shrinavin (RA2511004010230) · Kishore (RA2511004010212) · Aakash (RA2511004010207) · Santhosh Sharma (RA2511004010257) · Dhanisha (RA2511004010217)

> Saathi phones your parents every morning, in their own language, on any phone. It checks their medicines, notices when something is changing, tells you what matters, and when it's serious, runs the emergency: family, ambulance, the medical record sent ahead, and routing to a hospital that can actually treat them.

## What's in this repo

| Path | What it is |
|---|---|
| [`docs/01-design-thinking-dossier.md`](docs/01-design-thinking-dossier.md) | The full project: reframed problem, evidence, personas, empathy and journey maps, POV/HMW, ideation, solution, validation plan, competitors and gap, feasibility, market, business model, architecture, roadmap |
| [`docs/02-research-kit.md`](docs/02-research-kit.md) | Interview scripts (elder, guardian, doctor, pharmacist, EMT), consent script, usability-test sheet, Google Form survey, tips for the emotional storytelling |
| [`docs/03-pitch-and-demo.md`](docs/03-pitch-and-demo.md) | Slide-by-slide pitch outline, a live demo script with exact clicks, judge Q&A, team roles |
| [`docs/04-startup-ideation.md`](docs/04-startup-ideation.md) | **Round 2:** 24 startup ideas, scoring, YC alignment, and the chosen direction: Saathi, the AI grandchild that calls every day (business model, moat, risks, 10-week build plan) |
| [`docs/05-features-and-wow-demo.md`](docs/05-features-and-wow-demo.md) | **Full feature set** (5 pillars, what is built vs planned) and the **10-minute wow demo run-of-show**: timings, equipment checklist, hosting steps, fallbacks |
| [`prototype/vault.html`](prototype/vault.html) | **Health Vault:** a bag of prescriptions and reports becomes a lifetime medical record (timeline, trends, cross-doctor warnings, doctor brief with QR, ask in Tamil). Live: https://claude.ai/artifact/4drWh7efxTYg65Yypryn9Y |
| [`prototype/live.html`](prototype/live.html) | **Live room:** the audience scans a QR, becomes Paati's family, and every phone flashes and rings on SOS. Open `live.html?host` on the projector. Needs https hosting (see doc 05) |
| [`prototype/vitals.html`](prototype/vitals.html) | **Face Pulse:** heart rate from a 20-second selfie (camera rPPG, `rppg.js`). Needs https or localhost and camera permission |
| [`prototype/companion.html`](prototype/companion.html) | **AI companion demo:** daily Tamil check-in call, prescription scanning, 14-day drift. Live: https://claude.ai/artifact/WLgT3L2tz5EkeaB6ny45VP |
| [`prototype/index.html`](prototype/index.html) | The working prototype: three live screens (Paati's phone, Karthik's phone, hospital network console) |

## Run the prototype

**Live link:** https://claude.ai/artifact/5uTQTy9iL4F7bDeJYHZAc3 (private to the owner until shared from its Share menu). On this link, devices signed in to the same account sync live, and typed symptoms in any language are understood by Claude.

To run it locally:

Serve the repo folder and open it in Chrome (double-clicking the file also works for a single screen):

```bash
python3 -m http.server 8000
# open http://localhost:8000/prototype/index.html
```

- `#stage` shows all three screens (use this on the projector).
- `#patient`, `#guardian` and `#hospital` show one screen each (use `#patient` on a phone).
- Tabs in the same browser stay in sync. Press SOS in one and the others react.
- **Play the 2 AM story** runs the whole demo automatically, with captions.

### Hosting it for the demo

To open it on a phone, host the `prototype/` folder on GitHub Pages (Settings → Pages → deploy from branch), Netlify Drop or Vercel. The link works on any phone. Fall detection uses the phone's real accelerometer when served over HTTPS: turn it on and drop the phone onto a pillow.

## Built-in scenarios
- **Chest pain at 2 AM**: routes past a nearby PHC to a cath-lab hospital (~37 min saved)
- **Snake bite**: routes to the hospital with enough anti-snake venom; try the medicine relay
- **Fall on a blood thinner**: needs CT + neurosurgeon, so only one hospital qualifies
- **Breathless**: needs an ICU bed + ventilator
- **Missed tablets**: Silent Check escalation (IVR call → neighbour → son)

All patient data is sample data and every hospital is fictional.
