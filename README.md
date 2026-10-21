# Saathi: the golden-hour network for elderly emergencies

**Design Thinking course project, Group 4**
Shaan (RA2511004010247) · Shrinavin (RA2511004010230) · Kishore (RA2511004010212) · Aakash (RA2511004010207) · Santhosh Sharma (RA2511004010257) · Dhanisha (RA2511004010217)

> One press from any phone alerts the family, sends the patient's critical history ahead to the ER, and routes the ambulance to the nearest hospital that actually has the bed, specialist or drug this patient needs.

## What's in this repo

| Path | What it is |
|---|---|
| [`docs/01-design-thinking-dossier.md`](docs/01-design-thinking-dossier.md) | The full project: reframed problem, evidence, personas, empathy and journey maps, POV/HMW, ideation, solution, validation plan, competitors and gap, feasibility, market, business model, architecture, roadmap |
| [`docs/02-research-kit.md`](docs/02-research-kit.md) | Interview scripts (elder, guardian, doctor, pharmacist, EMT), consent script, usability-test sheet, Google Form survey, tips for the emotional storytelling |
| [`docs/03-pitch-and-demo.md`](docs/03-pitch-and-demo.md) | Slide-by-slide pitch outline, a live demo script with exact clicks, judge Q&A, team roles |
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
