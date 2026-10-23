# Saathi: full project context (handoff)

> Paste or upload this whole file into a new Claude chat and say: "This is my project context. Help me prepare the pitch."
> Written 23 Oct 2026. Part 1 is the current state (trust it over older docs). Part 2 is the full deck text and speaker script. Parts 3–5 are the complete project documents. Part 6 holds older planning docs, kept for history; where they disagree with Part 1, Part 1 wins.

---

## Part 1. Current state, in one place

### The project
- **Course:** Design Thinking, SRM Institute. **Group 4.**
- **Team (name · register number):** Shaan · RA2511004010247; Shrinavin · RA2511004010230; Kishore · RA2511004010212; Aakash · RA2511004010207; Santhosh Sharma · RA2511004010257; Dhanisha · RA2511004010217.
- **Problem statement given:** "Emergency care is critically delayed by fragmented communication between patients, guardians, and healthcare providers. Vulnerable patients lack easy emergency alerts and centralized health records, guardians miss real-time updates on medication adherence and hospital visits, and hospitals face treatment delays due to uncoordinated, network-wide medicine inventory tracking."
- **Our reframe:** the three problems fail in the same hour. The alert fails (in panic she can't unlock a phone), the records fail (her history is a bag of papers), and the routing fails (the nearest hospital may not be able to treat her). **How might we** turn the golden hour from a chain of broken hand-offs into one coordinated relay?
- **Product:** **Saathi** ("companion"). A working web app (installable on phones) with four sides:
  1. **Paati's phone (elder):** one big Help button you hold for 2 seconds; "What happened?" picker (chest pain, can't breathe, I fell down, slurred speech, snake bite, not sure); calm emergency screen (minutes to arrival, hospital, family who know, "I'm OK, cancel" with countdown); tablets with "I took them"; talk to Saathi (chat/voice); Face Pulse heart-rate check; her emergency card; fall detection toggle. **English only** (Tamil was removed at the team's request).
  2. **Family app (Karthik, son, 350 km away in Bengaluru):** calm home ("Paati is doing well"), live emergency view with the ambulance on a real map and minutes left, "I'm going" / Call, CPR coach, Health Vault (photograph papers → AI reads them, timeline, lab trends, "Ask Saathi" answers that name the source paper, 6 doctor questions found across papers), medicines (doses taken/missed, stock warnings, reorder), visits, family members and invite code, printable emergency card with QR, silent check-in.
  3. **Hospital ER console (Dr Priya, Saraswathi Hospital):** incoming patient card (suspected cause, blood group, allergy, blood thinner, why Saathi chose this hospital, ETA), break-glass record access (logged to the family), "Page cath lab team" → "Patient received" → "Close the case", bed/capability board, network stock and **medicine relay** between hospitals (e.g. anti-venom).
  4. **Bystander page:** anyone scans the QR on her card with any phone camera (no app, no login) → Call 108, alert her family and start an emergency, CPR coach, key facts for the ambulance crew. Never shows address, family code or full records.
- **Need-matched routing (the core idea):** hospitals are ranked by **time to the right treatment**, not distance. Drive times come from OSRM on real OpenStreetMap roads. Demo example (suspected heart attack, Tambaram): nearest = Anbu Nagar PHC, 7 min drive but no cath lab → +45 min transfer (our assumption) = 52 min; Saathi picks Saraswathi Multispeciality, about 9 min, cath lab ready → **43 minutes sooner**. Other hospitals in the demo network: Cauvery Heart & Trauma, Kovil St GH, Lotus General. (In-app wording on some screens may show slightly different minute values because road times vary per run.)
- **AI:** Claude reads uploaded papers, triages free text, writes the ER brief, powers "Ask Saathi" and the daily companion chat. Fixed safety rules override the AI for red-flag words. Runs in **demo mode** (scripted answers, sample papers) unless an API key is set. AI is decision support only; doctors decide.

### Links and where things live
- **Live app:** https://saathi-app-eta.vercel.app ("Try the demo" gives one-tap sign-in as Paati, Karthik or Dr Priya; `/stage` shows all three phones side by side; demo family code: KAMALA).
- **Deck (Claude artifact, private until shared from its Share menu):** https://claude.ai/artifact/SSvRpPpEggBywdMt7wsEPb. 14 slides, dark product keynote, speaker notes on every slide. Exports to .pptx / PDF.
- **Code:** GitHub `ShaanGS/Design-Thinking`, branch `claude/vibrant-mayer-mojciq`. App in `app/` (React + Vite + Tailwind front end; Express + Socket.IO + Node's built-in SQLite back end; Leaflet maps; OSRM routing). Docs in `docs/`.
- **Pitch prep:** `docs/pitch-prep.md` (included in full in Part 3).

### Design history (what changed and why)
1. First version of the app was judged "trash" by the team → rebuilt with a "soft clay" look (violet, pastels, 3D icons from Magnific) and many more features.
2. First deck (27 slides, consulting style) → "looks really bad", asked for under 15 slides.
3. Second deck (14 slides, pastel + 3D clay AI illustrations) → "refer to real PPTs", "no Tamil".
4. Third deck (editorial cream + serif, from studying Behance/Dribbble/Pitch references) → "feels AI, the colours".
5. **Current deck: dark product keynote** (team's choice): near-black (#0A0A0B), white Inter type, red (#FF453A) only for alarm numbers, green (#30D158) for time saved, **real app screenshots and the real map only**, no AI illustrations, no gradients, no purple in the deck design.

### Engineering hardening done before the pitch
- **UI:** automated overlap/clipping check on every screen at 320, 360, 390 and 430 px plus 1280/1920 desktop; fixed colliding route labels ("108 base / Her home") and cut-off medicine names.
- **Function:** 59/59 end-to-end API + live-socket checks (sign-in, join family, create family, meds, doses, vitals, check-ins, visits, chat, vault upload/ask/share/delete, SOS → triage → routing → ER brief → break-glass → page team → admit → close, cancel, bystander alert, beds, stock, relay, demo scripts); 22/22 browser click-through checks on three phones at once, no JavaScript errors.
- **Security (independent review, all fixed, 28/28 checks pass):** hospital accounts now need a staff code (the public demo ER is sandboxed and never sees real families); only the receiving hospital gets the ER brief, can open the record or update the case; hospitals edit only their own beds/stock; family codes are 8 random characters; rate limits on sign-in, code guessing, SOS, AI and bystander alerts (generous enough for a classroom on one Wi-Fi); demo reset only touches the demo family; session tokens are hashed, expire after 30 days, logout closes live connections; uploads checked by real file type; security headers; JSON-only errors.
- **Load:** 60 phones on one IP signed in in under a second; all 48 listening phones got the emergency live.

### Open items and honest caveats (say these out loud if asked)
- **Hosting risk:** Vercel runs the app as autoscaling copies, so live state can split under load. Fix ready but needs a team member: render.com → New → Blueprint → this repo → Apply (`render.yaml` is ready). Free plan sleeps after 15 min idle: open the link a minute before presenting. After moving, update the URL/QR on deck slides 7 and 14.
- **Placeholders to fill:** slide 4 interview counts `[5] [5] [2] [1] [1] [50+]` are placeholders. Replace with real numbers (and in the script).
- **Figures to verify:** 93% (NORIN-STEMI registry, PMC10308105) and "15 h median to reach hospital" (MACE registry) came from search results; check the original papers.
- **Iterations on slide 12** ("v0→v1 hold 2 s", "v1→v2 cancel with countdown", "v2→v3 explains why this hospital") are built into the prototype; confirm each against what was actually observed in user testing.
- **Composite personas:** Paati, Karthik and Dr Priya are composites from interviews and desk research, not real individuals.
- **Simulated:** ambulance movement (20× speed), the five-hospital network and its stock, the 45-minute transfer, sample medical papers. **Not built yet:** 108 integration, ABDM records, pendant, missed-call SOS, real hospital onboarding, other languages.
- **Business numbers are assumptions:** Free ₹0; Family ₹149/month (paid by the son/daughter); Pendant ₹1,499 once; Hospital Pro ₹15,000/month (joining free). Roadmap: now prototype → 0–6 mo pilot (50 families, 1 hospital) → 6–12 mo Chennai (10 hospitals, ABDM) → 12–24 mo Tamil Nadu (108 link).

### About "memory"
There is no hidden memory beyond this conversation and the project files. Everything relevant is in this document.

---

## Part 2. The deck: every slide's text and full speaker script

### Slide 1: cover

**On the slide:**
- [Image: Paati’s phone during an emergency: help is coming]
- DESIGN THINKING  ·  GROUP 4  ·  SRM
- Saathi
- When Paati needs help, everyone moves at once.
- Shaan · Shrinavin · Kishore · Aakash · Santhosh Sharma · Dhanisha

**Speaker script:** Speaker: Shaan · about 0:45. Good morning. We are Group 4. Our brief was about emergency care that gets delayed because the patient, the family and the hospital don’t talk to each other. We built Saathi: a working app that, with one press, alerts the family, sends the patient’s records ahead and routes the ambulance to a hospital that can actually treat her. Over the next fifteen minutes we’ll walk you through how we got there, stage by stage, and show it working live on three phones.

### Slide 2: night

**On the slide:**
- 02  ·  The problem
- An illustrative night, built from our interviews and the studies on the next slide
- 2:10 a.m.
- Paati, 72, lives in Tambaram. This is what happens after her chest starts to hurt, today.
- 02:10
- Chest pain. Her husband is asleep.
- 02:25
- Her son is 350 km away.
- Can’t act
- 02:31
- A neighbour calls 108.
- 03:05
- Nearest hospital: no cath lab, no records.
- Sent on
- 04:15
- She reaches a cardiac centre.
- Golden hour gone
- 2 hours
- before she reaches a team that can treat her. Every hand-off lost time.

**Speaker script:** Speaker: Shaan · about 1:30. Meet Paati, seventy-two, in Tambaram. At ten past two she gets chest pain. Her husband is asleep. Her son Karthik is 350 kilometres away in Bengaluru, so all he can do is call a neighbour, who calls 108. The ambulance does the sensible thing and takes her to the nearest hospital. But that hospital has no cath lab, and nobody there knows she has a stent and is on a blood thinner. She is sent on. By the time she reaches a cardiac centre it is quarter past four: two hours. Nobody did anything wrong. Every person did their job. The failure is in the hand-offs between them. That is the problem we set out to solve.

### Slide 3: evidence

**On the slide:**
- 03  ·  The evidence
- Full links in docs/01-design-thinking-dossier.md
- This isn’t one bad night.
- 93%
- of heart-attack patients in a North Indian registry first reached a hospital that could not open the blocked artery.
- NORIN-STEMI registry, 3,635 patients · PMC10308105
- 22.7 crore
- Indians will be 60 or older by 2036
- India Ageing Report 2023 (UNFPA, IIPS)
- ~50%
- of trauma cases in Karnataka weren’t reached by 108 within the golden hour
- CAG audit 2014–19, via The News Minute
- 15 h
- median time for heart-attack patients to reach a hospital
- MACE registry, Bengaluru
- 58,000
- snakebite deaths a year, many after delays reaching anti-venom
- Suraweera et al., eLife 2020

**Speaker script:** Speaker: Shrinavin · about 1:15. Paati’s night is illustrative, but the numbers behind it are not. The big one: in the NORIN-STEMI registry of 3,635 heart-attack patients in North India, ninety-three percent first went to a hospital that couldn’t open the blocked artery. The nearest hospital is often the wrong one. Around it: India will have 22.7 crore people over sixty by 2036. A CAG audit found 108 missed the golden hour for about half of trauma cases in Karnataka. Heart-attack patients take a median of fifteen hours to reach hospital. And 58,000 people die of snakebite every year, many because the nearest hospital had no anti-venom. Same pattern every time: the right help exists, it just isn’t connected. (Check the 93% and 15-hour figures against the original papers before presenting.)

### Slide 4: listen

**On the slide:**
- 04  ·  Empathize
- Interview scripts and consent form: docs/02-research-kit.md
- We listened before we built.
- [5]
- elders at home
- [5]
- sons and daughters living away
- [2]
- ER doctors and nurses
- [1]
- 108 ambulance EMT
- [1]
- hospital pharmacist
- [50+]
- family survey responses
- 01
- Panic breaks the screen
- An alert that needs unlocking, an app or a typed number fails exactly when it matters.
- 02
- The history is trapped
- It lives in a plastic bag of papers and in her memory. The ER needs five facts.
- 03
- Nearest is the wrong default
- What counts is time to the right treatment, not distance to a building.

**Speaker script:** Speaker: Shrinavin · about 1:30. Before building anything we went and listened. We spoke to [N] elders at home, [N] sons and daughters who live away from their parents, [N] ER doctors and nurses, a 108 EMT and a hospital pharmacist, and [N] families answered our survey. (Replace every bracket with your real counts.) We always took consent first and asked about their day, not our product. Three things came up again and again. One: panic breaks the screen. In an emergency an elder can’t unlock a phone, find an app or remember a number. Two: her history is trapped, in a bag of papers and in her memory, while the ER only needs five facts. Three: the nearest hospital is the wrong default. What matters is the time to the right treatment.

### Slide 5: define

**On the slide:**
- 05  ·  Define
- Composite personas built from our interviews and desk research
- Three people. One emergency.
- Paati, 72
- Tambaram · the patient
- needs to call for help without seeing, unlocking or remembering anything.
- Karthik, 34
- Bengaluru · her son
- needs to know at once, and know enough to act from 350 km away.
- Dr Priya, 29
- ER resident
- needs the five critical facts before the patient arrives.
- HOW MIGHT WE
- …turn the golden hour from a chain of broken hand-offs into one coordinated relay?

**Speaker script:** Speaker: Kishore · about 1:00. We turned what we heard into three personas, one for each person in the brief. Paati needs to call for help without seeing, unlocking or remembering anything. Karthik needs to know immediately, and know enough to act from far away. Dr Priya needs five critical facts before the patient comes through the door. That gave us our point of view, as a How Might We: how might we turn the golden hour from a chain of broken hand-offs into one coordinated relay?

### Slide 6: ideate

**On the slide:**
- 06  ·  Ideate
- Crazy 8s: 40+ ideas, scored on impact, feasibility and novelty
- Forty ideas, joined into one relay.
- More impact ↑
- Easier to build →
- ● Need-matched routing
- ● Medicine relay
- ● Pre-arrival brief
- ● Guardian live view
- ● AI symptom triage
- ● Missed-call SOS
- ● Fridge QR card
- ● SOS pendant
- ● Silent check
- ○ Fall detection
- ○ Smart pill box
- ○ Smartwatch only
- ○ Paid care manager
- Every product we found covers one step. Saathi passes the baton.
- ● In Saathi
- ○ Parked: costly or out of reach

**Speaker script:** Speaker: Kishore · about 1:00. We ran Crazy 8s and got over forty ideas, then scored them on impact, feasibility and novelty. Some were great but out of reach for our users: smartwatches, smart pill boxes, paid care managers. The insight was that every existing product covers one step. 108 sends an ambulance, record apps store papers, pill apps remind. Nobody passes the baton. So instead of picking one idea we joined the strongest ones, routing, the pre-arrival brief, the live family view, the fridge QR card and the medicine relay, into one relay.

### Slide 7: solution

**On the slide:**
- 07  ·  The idea
- Live now: saathi-app-eta.vercel.app
- One press. Everyone moves.
- 01
- Family and neighbour, at once
- Karthik, Divya and Meena are alerted in the same second.
- 02
- The likely cause, from her history
- Chest pain, a stent and a blood thinner: suspected heart attack.
- 03
- An ambulance to the right hospital
- The one with a cath lab ready, not just the nearest.
- 04
- Her records arrive first
- Allergy, blood thinner and kidney function, in one ER brief.
- [Image: Paati’s home screen with the big Help button]

**Speaker script:** Speaker: Aakash · about 1:00, then the live demo (about 3:00). This is Saathi. Paati holds one big button for two seconds. Two seconds, so a press in her pocket never calls an ambulance. Four things then happen in the first minute: her family and neighbour are alerted together; Saathi works out the likely cause from what she taps and her history; the ambulance is sent to a hospital that can treat that cause; and her records reach the ER before she does. Let me show you. LIVE DEMO: put the laptop on the stage view, hold Help on Paati’s phone, tap Chest pain, then point at Karthik’s phone and the ER phone as they update. Run-sheet in docs/pitch-prep.md.

### Slide 8: routing

**On the slide:**
- 08  ·  Need-matched routing
- Drive times: OSRM on OpenStreetMap roads, from the live demo. The 45-minute transfer is our assumption.
- [Image: Map of Tambaram with the ambulance route to Saraswathi on real roads]
- Nearest isn’t right.
- 43 min
- sooner to a cath lab for Paati’s heart attack
- Nearest: Anbu Nagar PHC, no cath lab
- 52 min
- 7 min drive + 45 min transfer to a cardiac centre
- Saathi: Saraswathi, cath lab ready
- 9 min

**Speaker script:** Speaker: Santhosh Sharma · about 1:15. The heart of Saathi is need-matched routing. For a suspected heart attack the hospital needs a cath lab. On real OpenStreetMap roads, the nearest hospital, Anbu Nagar PHC, is a seven-minute drive, but it has no cath lab, so she would be transferred, which we estimate at forty-five more minutes: fifty-two minutes to treatment. Saathi instead sends the ambulance to Saraswathi, nine minutes away with a cath lab ready. Forty-three minutes sooner, in the hour that decides how much heart muscle survives. And the ER sees exactly why it was chosen.

### Slide 9: paati

**On the slide:**
- 09  ·  Paati and Karthik
- Real screens from the live app
- Calm for her, clear for him.
- Minutes to arrival
- In type she can read without glasses.
- She isn’t alone
- The faces of the family who already know.
- [Image: Paati’s emergency screen: help is coming, the hospital and her family]
- Paati
- [Image: Karthik’s live view of the ambulance on a map]
- Karthik, in Bengaluru
- The ambulance, live
- On real roads, with minutes left.
- One tap to act
- Call, or tell the family “I’m going”.

**Speaker script:** Speaker: Santhosh Sharma · about 1:00. Here is the same emergency on two phones. Paati’s screen is designed to calm: the minutes until help arrives in huge type, the hospital’s name, and the faces of her family who already know, plus two simple things to do now, like unlocking the door. Karthik, 350 kilometres away, sees the ambulance moving on real roads with the minutes left, and can call or tell the family he’s going. He stops being the last to know and becomes useful.

### Slide 10: er

**On the slide:**
- 10  ·  The ER and a stranger
- Real screens from the live app; the hospitals are a demo network around Tambaram
- Ready before she arrives.
- The brief comes first
- Likely cause, blood group, allergy, blood thinner.
- Why this hospital
- Cath lab ready, 43 minutes sooner.
- [Image: ER screen with the incoming patient and the reason she was routed here]
- Dr Priya, ER
- [Image: Bystander page opened by scanning Paati’s emergency card]
- A passer-by
- Scan her card
- Any phone camera. No app, no sign-in.
- Call 108, alert family
- Plus a CPR coach that counts the pushes.

**Speaker script:** Speaker: Santhosh Sharma · about 1:00. On the left is what Dr Priya sees: the incoming patient, the likely cause, her blood group, her penicillin allergy and the blood thinner, and why Saathi sent her to this hospital. Her team can be paged and waiting. On the right is the case where Paati collapses outside, at the temple. Anyone can scan the QR on the card in her purse with any phone camera. No app, no sign-in. They can call 108, alert her family, and a CPR coach counts the compressions for them.

### Slide 11: everyday

**On the slide:**
- 11  ·  Every day
- Real screens from the live app
- Useful on ordinary days too.
- [Image: Records screen]
- Records
- Photograph a paper; Saathi reads it and names its source.
- [Image: Medicines screen]
- Medicines
- Doses taken or missed, and a warning before stock runs out.
- [Image: Emergency card screen]
- Emergency card
- A QR card for her purse and the fridge.
- [Image: CPR coach screen]
- CPR coach
- A passer-by gets the rhythm and a count of 30.

**Speaker script:** Speaker: Santhosh Sharma · about 0:45. An emergency app nobody opens is useless on the day it’s needed, so Saathi earns its place every day. The family photographs prescriptions and reports, and Saathi reads them, builds her timeline and answers questions, always naming the paper. Medicines track doses and warn before stock runs out. The emergency card goes in her purse and on the fridge. And the CPR coach is there for anyone.

### Slide 12: tested

**On the slide:**
- 12  ·  Test
- Version changes are built into the prototype; confirm each with what you saw in testing
- Tested, then hardened.
- WHAT TESTING CHANGED
- v0 → v1
- A tap in a pocket could call an ambulance.
- Help needs a 2-second hold.
- v1 → v2
- A false alarm couldn’t be taken back.
- “I’m OK, cancel”, with a countdown.
- v2 → v3
- Routing showed only a hospital name.
- It says why that hospital, in minutes.
- BEFORE THIS PITCH
- 59 / 59
- feature checks pass end to end, SOS to discharge
- 28 / 28
- security checks pass after an independent review
- 60
- phones on one Wi-Fi got the alert live
- 320–430 px
- every screen checked for clashing text

**Speaker script:** Speaker: Dhanisha · about 1:15. Every round of testing changed the product. In version zero one tap could call an ambulance, so help now needs a two-second hold. A false alarm couldn’t be taken back, so there is an “I’m OK, cancel” button with a countdown. Routing showed only a name, so now it explains why that hospital, in minutes. (Confirm each change against what you actually observed.) Before this pitch we also treated it like a real product: 59 end-to-end feature checks from SOS to discharge all pass; an independent security review found real holes, like anyone being able to create a hospital account or wipe the demo, and all 28 security checks now pass; 60 phones on one Wi-Fi received the alert live; and every screen was checked from 320 to 430 pixels wide for clashing text.

### Slide 13: model

**On the slide:**
- 13  ·  Business model and roadmap
- Prices are assumptions to test with families and hospitals
- The family pays. Hospitals join free.
- Saathi Free
- ₹0
- for every family
- SOS to three contacts, QR card, records vault
- Saathi Family
- ₹149
- a month, paid by the son or daughter
- Voice reminders, live emergency view, AI over her records
- Pendant
- ₹1,499
- once, for elders without a smartphone
- One press raises help
- Hospital Pro
- ₹15,000
- a month; joining is free
- Records link, analytics, medicine relay
- Now
- Working prototype
- 0–6 months
- Pilot: 50 families, 1 hospital
- 6–12 months
- Chennai: 10 hospitals, ABDM
- 12–24 months
- Tamil Nadu: 108 link

**Speaker script:** Speaker: Dhanisha · about 1:15. The person who feels this problem most is the son or daughter living away, so they pay: Saathi Free covers the SOS, the QR card and the records vault; Saathi Family is ₹149 a month for voice reminders, the live emergency view and AI over her records. A ₹1,499 pendant covers elders without a smartphone. Hospitals join the network free, because every hospital that joins makes routing better for everyone, and larger hospitals can pay for a records link and analytics. These prices are assumptions we still have to test. Next: a pilot with fifty families and one hospital near campus, then ten hospitals in Chennai with ABDM health records, then a link to 108.

### Slide 14: close

**On the slide:**
- 14  ·  Questions
- Hold the red button.
- Scan to try Saathi on your phone · saathi-app-eta.vercel.app
- [Image: QR code for saathi-app-eta.vercel.app]
- Shaan
- RA2511004010247
- Shrinavin
- RA2511004010230
- Kishore
- RA2511004010212
- Aakash
- RA2511004010207
- Santhosh Sharma
- RA2511004010257
- Dhanisha
- RA2511004010217

**Speaker script:** Speaker: Dhanisha, then the whole team for questions · about 0:30. Paati shouldn’t need a perfect night for the system to work. With Saathi, one press and everyone moves at once. Scan the code to try it yourself: open Paati’s phone and hold the red button. Thank you. We’re happy to take questions. (Q&A answers are in docs/pitch-prep.md.)

---

## Part 3. Pitch prep (docs/pitch-prep.md)

Deck: 14 slides. The full script for each slide is in its speaker notes (open the deck, then Presenter view). This page is the run of show, the live demo run-sheet, the checklist and the Q&A bank.

## Run of show (about 17 minutes + Q&A)

| # | Slide | Speaker | Time | The one line to land |
|---|-------|---------|------|----------------------|
| 1 | Saathi | Shaan | 0:45 | One press alerts the family, sends her records ahead and routes the ambulance to a hospital that can treat her. |
| 2 | 2:10 a.m. | Shaan | 1:30 | Nobody did anything wrong. The failure is in the hand-offs. |
| 3 | This isn't one bad night | Shrinavin | 1:15 | 93% first reached a hospital that couldn't open the artery. |
| 4 | We listened before we built | Shrinavin | 1:30 | Panic breaks the screen; the history is trapped; nearest is the wrong default. |
| 5 | Three people. One emergency. | Kishore | 1:00 | How might we turn the golden hour into one coordinated relay? |
| 6 | Forty ideas, one relay | Kishore | 1:00 | Every product covers one step. Saathi passes the baton. |
| 7 | One press. Everyone moves. | Aakash | 1:00 | Four things happen in the first minute. |
| — | **Live demo** | Aakash (+ Santhosh on phones) | 3:00 | See the run-sheet below. |
| 8 | Nearest isn't right | Santhosh Sharma | 1:15 | 43 minutes sooner to a cath lab. |
| 9 | Paati and Karthik | Santhosh Sharma | 1:00 | Calm for her, clear for him. |
| 10 | The ER and a stranger | Santhosh Sharma | 1:00 | The ER is ready before she arrives; a stranger can help without an app. |
| 11 | Every day | Santhosh Sharma | 0:45 | An emergency app nobody opens is useless on the day it's needed. |
| 12 | Tested, then hardened | Dhanisha | 1:15 | Every test round changed the product; it passed 59 feature and 28 security checks. |
| 13 | Business model and roadmap | Dhanisha | 1:15 | The family pays; hospitals join free. |
| 14 | Hold the red button | Dhanisha + everyone | 0:30 | Scan and try it. Questions. |

Swap speakers freely; keep hand-offs on slide boundaries.

## Live demo run-sheet

**What you need:** the laptop on the projector, one phone as Paati, one phone as Karthik (optional third as the ER), stable internet.

**30 minutes before**
1. Open the live app on the laptop and wait until it loads (a free server can take up to a minute to wake).
2. Open `/stage` on the laptop: three phones side by side (Paati, Karthik, ER).
3. On Karthik's phone: open the app, "Try the demo" → Family app → Settings (Account) → **Reset demo data**. This restores the sample family.
4. On the Paati phone: "Try the demo" → Paati's phone. Check the big red Help button shows.
5. Turn phone volume up (alerts make a sound) and screen timeout to "never".

**On stage (about 3 minutes)**
1. "This is Paati's phone." Hold **Help** for 2 seconds. Point out that a tap does nothing; it needs a hold.
2. Paati's phone asks "What happened?" Tap **Chest pain**.
3. Point at Karthik's phone / the stage view: the alert arrived in the same second, with the hospital and the ambulance on a real map.
4. Point at the ER phone: "Suspected heart attack", her allergy and blood thinner, and **why Saathi chose this hospital** (cath lab, minutes saved). Tap **Page now**.
5. Back on Paati's phone: "The doctors are getting ready", the countdown, her family's faces.
6. Optional (30 s): open the CPR coach from Karthik's emergency screen and let it count a few pushes.
7. Afterwards: reset the demo again so the next run starts clean.

**If something fails**
- *Internet drops:* move straight to slides 9 and 10 (real screenshots of the same moment) and narrate them.
- *The app is slow to wake:* talk through slide 7 for another 30 seconds; it will load.
- *Plan B on the laptop, no internet:* `cd app && npm ci && npm run build && npm start`, then open `http://localhost:3000/stage`.

## Before you present

- [ ] Slide 4: replace every `[N]` with your real interview counts (and say the same numbers in the script).
- [ ] Slide 3: check the 93% (NORIN-STEMI, PMC10308105) and 15 h (MACE registry) figures against the original papers.
- [ ] Slide 12: confirm each "v0 → v1" change against what you actually observed.
- [ ] Share the deck from its Share menu with the team and faculty.
- [ ] If the app moves to Render, update the URL and QR on slides 7 and 14.
- [ ] Two full timed rehearsals, including the demo and one failure drill (pull the Wi-Fi mid-demo).

## What's real and what's simulated (say this if asked; never overclaim)

- **Real:** the three apps, live sync between phones, road routing on OpenStreetMap (OSRM), the ranking of hospitals by what they can treat, the records vault and its answers, the QR card, the bystander page, the CPR coach, the security checks.
- **Simulated:** the ambulance's movement (sped up 20×), the hospital network (five demo hospitals around Tambaram with sample beds and stock), the 45-minute transfer estimate, the sample medical papers. AI runs in demo mode unless an API key is set.
- **Not built yet:** 108 integration, ABDM records, the pendant, the missed-call SOS, real hospital onboarding.

## Q&A bank

**1. What if she doesn't have a smartphone, or can't use one?**
The printed QR card works for anyone who finds her. Next on the roadmap are a ₹1,499 one-button pendant and a missed-call SOS for a basic phone, both linked to the family plan.

**2. What about false alarms?**
Help needs a 2-second hold, so a pocket press never fires. After a press, Paati gets an "I'm OK, cancel" button with a countdown, and the family is told it was a false alarm.

**3. Isn't AI diagnosing patients? What if it's wrong?**
No. Saathi only suggests the likely *category* so the ambulance goes to a hospital with the right facilities. Fixed safety rules override the AI for red-flag words like chest pain or a fall. Doctors make every medical decision. The ER sees why a hospital was chosen and can disagree.

**4. How do hospitals keep bed and stock data up to date?**
One tap per change on their console. COVID bed dashboards showed hospitals will do a short daily update when it brings them patients. We still have to test that with a hospital pharmacist (slide 12, next round).

**5. Why would hospitals join?**
Routing sends patients who need their capabilities, and joining is free. Larger hospitals can pay for the records link, analytics and the medicine relay.

**6. Who pays, and why ₹149?**
The son or daughter living away, who feels the problem most. ₹149 a month is an assumption; our next survey tests whether 60% would pay ₹99 or more.

**7. Privacy: who can see her records?**
Her family always can. A hospital can open them only when an ambulance is bringing her there (break-glass), and every access is logged in the family's feed. The bystander page shows only what an ambulance crew needs: blood group, allergies, blood thinners and emergency contacts. Never her address or full record.

**8. Is it secure?**
We ran an independent security review before the pitch. It found real problems, such as anyone being able to create a hospital account or wipe the demo, and we fixed them. Now only the receiving hospital gets the brief, sign-in is rate-limited, family codes are random, sessions expire and uploads are checked. 28 automated security checks pass.

**9. How is this different from 108/112, a smartwatch, or Emoha/Anvayaa?**
Each does one step well. 108 sends an ambulance; a watch detects a fall; care services check in. None routes by what the hospital can treat, sends the records ahead and keeps the family live at the same time. Saathi connects those steps.

**10. Where does "43 minutes" come from?**
Real road drive times from OSRM on OpenStreetMap: 7 minutes to the nearest PHC plus an assumed 45-minute transfer, against 9 minutes straight to a hospital with a cath lab. The 45 minutes is our assumption.

**11. Does it work in Tamil and other languages?**
The prototype is in English. The interface and voice are built so translations can be added; more languages are on the roadmap.

**12. What happens with bad network?**
The QR card's key facts are printed on the card itself. SMS and missed-call fallbacks are on the roadmap.

**13. Can it scale?**
Today it runs on one server, which is right for a pilot. For a city network the next step is a shared database and managed real-time messaging.

**14. How did you test it?**
User tests with elders on paper and phone prototypes (fill in your counts), plus engineering checks: 59 end-to-end feature checks from SOS to discharge, 28 security checks, 60 phones on one Wi-Fi receiving the alert, and every screen checked at 320–430 px widths.

**15. What's your success metric?**
Minutes from SOS to the right treatment. Supporting metrics: transfers avoided, doses taken on time, and stock-outs solved by relay.

**16. What's next, concretely?**
A pilot with 50 families (SRM staff and students' grandparents) and one partner hospital near campus in the next six months.

---

## Part 4. Design-thinking dossier (docs/01-design-thinking-dossier.md)

> Note: the product is now English-only. Where this dossier says "Tamil first" or "Mother tongue first", the current prototype instead uses plain English with large type; languages are a roadmap item.

# Saathi: Design Thinking Dossier

**Group 4**: Shaan (RA2511004010247) · Shrinavin (RA2511004010230) · Kishore (RA2511004010212) · Aakash (RA2511004010207) · Santhosh Sharma (RA2511004010257) · Dhanisha (RA2511004010217)

> **Saathi** (சாத்தி / साथी, "companion") makes the first hour of an elderly patient's emergency one coordinated hand-off: one press from any phone alerts family, sends the patient's records ahead to the ER, and routes the ambulance to the nearest hospital that actually has the bed, specialist or drug this patient needs.

This document follows the five design thinking stages: **Empathize → Define → Ideate → Prototype → Test**. Items marked 🔁 are hypotheses. Replace them with what you actually hear in your interviews (see `02-research-kit.md`). That swap is the "validated" part of the project, and examiners will look for it.

---

## 0. The original problem statement and why we reframed it

**Original (as submitted):**
> Emergency care is critically delayed by fragmented communication between patients, guardians, and healthcare providers. Vulnerable patients lack easy emergency alerts and centralized health records, guardians miss real-time updates on medication adherence and hospital visits, and hospitals face treatment delays due to uncoordinated, network-wide medicine inventory tracking.

That statement lists three separate problems (alerts, records, inventory) for three separate users. Building three apps would produce a thin prototype. Asking *where these problems collide* gave us the answer: **all three fail at the same moment, in the first 60 minutes of an emergency (the "golden hour").**

- The **alert** fails because the patient can't work a smartphone while in panic.
- The **records** fail because the history is a plastic bag of paper prescriptions that never reaches the ER.
- The **inventory** fails because the ambulance goes to the *nearest* hospital, which may not have the drug or specialist. The patient then has to be re-referred, losing another 30 to 60 minutes.

### Refined problem statement (our POV)

> **Elderly people with chronic illness in India, often living alone or with an ageing spouse while their children work in other cities, lose life-saving minutes in an emergency.** They can't operate a smartphone in a crisis, their medical history never reaches the doctor, and they are taken to the *nearest* hospital instead of the nearest hospital *that can actually treat them*. Their guardians find out last.
>
> **How might we turn the golden hour from a chain of broken hand-offs into one coordinated relay?**

### Why this is the right problem (evidence)

| Signal | Data point | Source |
|---|---|---|
| The elderly population is growing fast | India's 60+ share rises from **10.1% (2021) to ~15% (2036) and 20.8% (2050)**, about 22.7 crore people by 2036. Elders are projected to outnumber children (0–14) around 2046. | UNFPA–IIPS *India Ageing Report 2023* ([summary](https://en.vikaspedia.in/social-welfare/senior-citizens-welfare/india-ageing-report), [The Quint](https://www.thequint.com/fit/unfpa-india-ageing-report-elderly-population-challenges)) |
| Most are managing several diseases | About **1 in 3 Indians aged 60+ has multimorbidity** (two or more chronic diseases), with 30% more having one. Kerala reaches 59%. | LASI Wave 1 analyses ([PMC9885687](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9885687/)) |
| Medicines are often not taken correctly | Only **~50%** of patients with chronic disease take their medicines as prescribed (developed-country average; worse in LMICs). | WHO, *Adherence to Long-Term Therapies* (2003) |
| Ambulances miss the golden hour | A CAG audit in Karnataka found ambulances **did not reach ~50% of trauma cases within the golden hour** (2014–19). | [The News Minute](https://www.thenewsminute.com/article/108-ambulances-failed-reach-50-patients-within-time-karnataka-cag-139331) |
| Wrong-hospital delays cost lives | India has ~**58,000 snakebite deaths/year**, many linked to delays in reaching anti-venom. | Suraweera et al., *eLife* 2020 ([PDF](https://elifesciences.org/articles/54076.pdf)); [Down To Earth](https://www.downtoearth.org.in/health/right-anti-venom-given-on-time-can-reduce-snakebite-deaths-in-india-88507) |
| Many elders have little financial cushion | 18.7% of elderly have **no income**, and over 40% are in the poorest wealth quintile, so the product must work on a ₹1,000 keypad phone. | India Ageing Report 2023 |

> ⚠️ Before you put any number on a slide, open the source and check it yourself. If a judge asks "where is this from?", you need to be able to answer.

---

## 1. EMPATHIZE

### 1.1 Who we need to talk to (stakeholder map)

```
                         ┌───────────────────────┐
                         │   PATIENT (elder, 65+)│  ← primary user
                         └──────────┬────────────┘
        ┌────────────────┬──────────┼───────────┬──────────────────┐
  Guardian (child   Spouse / neighbour  Ambulance (108)   ER doctor / nurse
  in another city)  (first responder)   driver / EMT      (receives patient)
        │                                                          │
   Pays for the product                              Hospital pharmacist /
                                                     store manager (inventory)
```

Interview at least: **5 elders, 5 guardians, 2 doctors or nurses, 1 pharmacist, 1 ambulance driver or EMT**. The full scripts are in `02-research-kit.md`.

### 1.2 Draft personas 🔁 (replace them with your real interviewees)

**Kamala Paati, 72, Tambaram, Chennai: the Patient**
- Type 2 diabetes for 12 years, hypertension, and a cardiac stent placed in 2022. Takes **7 tablets a day**.
- Lives with her husband (78, hard of hearing). Her son lives in Bengaluru and her daughter in Dubai.
- Phones: a keypad phone, plus her son's old Android that she uses only for WhatsApp video.
- Keeps her medical history in a **plastic bag of reports and prescriptions** in the almirah.
- Quote 🔁: *"That night my chest was paining. I couldn't find my spectacles to see the phone. Even after, I couldn't remember Karthik's number."*
- Fears: being a burden; "they will put me in hospital and not let me go home."

**Karthik, 34, Bengaluru: the Guardian (and the buyer)**
- Software engineer who calls his mother every day at 8 pm.
- Quote 🔁: *"I find out everything one day late. Last time Appa fell, I heard from the neighbour."*
- Wants to know without nagging. Feels **guilt**, which is the emotional driver to pay.

**Dr. Priya, 29, ER resident at a private multi-speciality hospital: the Receiver**
- Quote 🔁: *"Patients come with no history. Family says 'some BP tablet, white colour'. We lose 15–20 minutes reconstructing it. If she's on a blood thinner and we don't know, that's dangerous."*
- Quote 🔁: *"Last monsoon we ran out of anti-snake venom and had to refer a patient 40 km."*

**Ravi, 41, 108 ambulance EMT: the Mover**
- Quote 🔁: *"Protocol is the nearest government hospital. Many times they refer again to a bigger hospital."*

### 1.3 Empathy map: Kamala Paati 🔁

| Says | Thinks |
|---|---|
| "I'm fine, don't worry." "These phones are too complicated." | "I don't want to disturb my son at work." "What if something happens at night?" |
| **Does** | **Feels** |
| Keeps pills in a steel box with days written on paper. Sometimes takes the night pill twice or not at all. Keeps reports in a plastic bag. | Anxious at night, lonely, proud and independent, afraid of hospitals. |

### 1.4 Current-state journey: a 2 AM chest pain (illustrative 🔁)

| Time | What happens | Pain point |
|---|---|---|
| 02:10 | Chest pain begins | Alone in the dark, husband asleep |
| 02:18 | Finds the phone, can't read the screen | Smartphone UI fails in panic. **8 min lost** |
| 02:25 | Calls son in Bengaluru | The guardian is 350 km away and can't act directly |
| 02:31 | Son calls the neighbour, who calls 108 | Second-hand information |
| 02:52 | Ambulance arrives and takes her to the nearest hospital | Nearest ≠ capable |
| 03:05 | Small hospital: no cath lab, no history. "Which tablets?" | **Records missing**. Clopidogrel status unknown |
| 03:40 | Referred to a cardiac centre | **Inventory and capability mismatch**. Re-transport |
| 04:15 | Arrives at the cardiac centre | **~2 hours** after onset. The golden hour is gone |
| Next day | Son finds out the full story | Guardian has no visibility |

The insight: each actor did their job, but **nobody had the whole picture.**

### 1.5 Key insights (from research; confirm them in interviews)

1. **Panic kills UI.** Any SOS that needs unlocking, an app, or a typed number will fail. It must be *one physical action* and must work on a keypad phone.
2. **The history exists, but it's trapped** in paper and in the patient's memory. ER doctors don't need the whole file. They need **5 facts**: blood group, conditions, current medicines (especially blood thinners), allergies, and who to call.
3. **"Nearest" is the wrong default.** What matters is the *time to definitive treatment*, not the time to a building.
4. **Guardians don't want more data, they want reassurance.** A green "Amma took her tablets ✓" is worth more than a dashboard.
5. **Hospitals already share bed data when forced to** (as COVID-era bed dashboards showed). A 30-second daily update of ~10 critical items is realistic.

---

## 2. DEFINE

### 2.1 Point-of-view statements

- **Kamala Paati** needs a way to call for help **without seeing, unlocking, or remembering anything**, because in an emergency her hands shake and her eyesight blurs.
- **Karthik** needs to **know immediately and know enough to act**, because distance makes him feel helpless and guilty.
- **Dr. Priya** needs **the 5 critical facts before the patient arrives**, because reconstructing history wastes the first 20 minutes.
- **The ambulance** needs to know **which hospital can actually treat this patient right now**, because transfers between hospitals waste the golden hour.

### 2.2 How Might We (HMW)

1. HMW let an elder raise an alarm with *zero* tech skill, even on a keypad phone?
2. HMW make a patient's critical history travel *ahead* of the patient?
3. HMW route patients to the hospital that can **finish** the treatment, not just start it?
4. HMW give guardians peace of mind about medicines *without* nagging the elder?
5. HMW let hospitals share critical-drug stock (anti-venom, thrombolytics) so one hospital's shortage isn't a patient's death?
6. HMW detect an emergency when the elder *can't* press anything (fall, unconsciousness, missed routine)?

### 2.3 Design principles (our rules for the prototype)

1. **One press, any phone.** Pendant, missed call, voice, or app. Never an unlock or menu.
2. **Mother tongue first.** Tamil voice and text, with English underneath.
3. **Calm, not alarm.** After the SOS, the elder's screen says *what is happening* ("Karthik knows. Ambulance in 14 min. Unlock the door.").
4. **5 facts, not 50 pages.** Every view shows what that person needs in that moment.
5. **Explain every machine decision.** Routing always shows *why* ("nearest has no cath lab; this one saves ~38 min").
6. **Works offline.** The Fridge QR card works with no internet and no app.

---

## 3. IDEATE

### 3.1 Brainstorm (Crazy 8s, 40+ raw ideas, shortlisted)

| # | Idea | Impact | Feasibility | Novelty |
|---|---|---|---|---|
| 1 | SOS pendant (GSM/BLE button) | High | Med | Low |
| 2 | **Missed-call SOS** to a toll-free number (works on any phone, no balance needed) | High | **High** | **High (India-specific)** |
| 3 | Voice SOS in Tamil ("Saathi, udhavi!") | Med | Med | Med |
| 4 | **Fridge / wallet QR "Emergency Passport"** that works offline | High | **High** | Med |
| 5 | ABHA-linked digital health record | High | Med | Low |
| 6 | Photo of the "plastic bag" → OCR → structured history | Med | Med | Med |
| 7 | IVR medicine-reminder call in the mother tongue ("press 1 if you took it") | High | **High** | Med |
| 8 | Smart pill box with weight sensor | Med | Low | Low |
| 9 | **"Silent check" escalation**: missed routine → IVR → neighbour → guardian → 108 | High | High | **High** |
| 10 | **Need-matched routing**: send the patient to the hospital that *has* what they need | **Very high** | Med | **Very high** |
| 11 | Network-wide critical-drug inventory + **inter-hospital "medicine relay"** | High | Med | **High** |
| 12 | **Pre-arrival brief to the ER** (auto-generated from the passport + symptom) | High | High | Med |
| 13 | Guardian live timeline (Swiggy-style tracking for Amma) | High | High | Med |
| 14 | Phone fall detection (accelerometer) | Med | Med | Low |
| 15 | AI symptom triage from free speech ("nenju valikkudhu" → chest pain) | Med | Med | Med |

### 3.2 Concept selection

We combined the top-scoring ideas into **one connected flow** instead of picking just one. The connection itself is what's new. Every existing product (see §6) does *one* of these steps. **None of them pass the baton between all three users.**

### 3.3 The solution: Saathi's five building blocks

| Building block | What it does | Who it serves |
|---|---|---|
| **1. One-Press SOS** | Hold the big button, press the pendant, **give a missed call**, or let the phone's fall sensor fire it. A press-and-hold prevents accidental triggers. | Elder |
| **2. Emergency Passport** | 5 critical facts plus the full ABHA-linked record. Printed as a **Fridge QR** that any phone camera can read **offline**. Pushed to the ER on SOS. | Elder, EMT, ER |
| **3. Pill Pulse** | Mother-tongue IVR or app reminders, one-tap "Taken", 7-day streak for the guardian, refill prediction. **Silent Check**: a missed routine escalates gently (IVR → neighbour → guardian → 108). | Elder, Guardian |
| **4. Need-Matched Routing** ⭐ | Matches the suspected condition (from the symptom and the passport) against live hospital capability (cath lab, CT, neuro, ICU, ventilator) and stock (anti-venom, thrombolytics). Ranks by **time to definitive care** and explains the decision. | EMT, ER, Patient |
| **5. Medicine Relay** | Hospitals share stock of ~10 critical drugs. When one runs out, the network finds the nearest stock and arranges a courier transfer. | Hospitals |

Plus **Guardian Live**: one timeline (SOS → ambulance → admitted → team ready), a one-tap "I'm on it", and a check-in ping.

### 3.4 Future-state journey (same 2 AM chest pain)

| Time | With Saathi |
|---|---|
| 02:10 | Paati holds the pendant / big button (or gives a missed call) |
| 02:10 | Karthik and neighbour Meena are called **at the same time**. 108 is alerted |
| 02:11 | Symptom "நெஞ்சு வலி" (chest pain) + history (stent, clopidogrel) → **suspected cardiac** |
| 02:12 | Routing: nearest is a PHC (no cath lab, so a transfer would be needed). Chosen: Saraswathi Multispeciality, 4.9 km, **cath lab ready**. **~38 min saved** |
| 02:12 | Pre-arrival brief reaches the ER: "72F, CAD with stent, **on clopidogrel**, **penicillin allergy**, diabetic" |
| 02:20 | ER marks "cath lab team ready". Karthik sees it live |
| 02:28 | Arrives. Team waiting. **Door-to-treatment begins inside the golden hour** |

---

## 4. PROTOTYPE

We built a **working, clickable prototype** (`prototype/index.html`) that runs the full flow across **three live screens**:

1. **Paati's phone**: big hold-to-SOS, symptom chips in Tamil and English, medicine card with voice reminder (speech), Fridge QR generator, calm post-SOS screen.
2. **Karthik's phone**: live status stepper, timeline, adherence streak, refill alert, "I'm on it", check-in ping.
3. **Hospital network console**: incoming patient + pre-arrival brief, network map with an ambulance tracking to the chosen hospital, routing explanation, **network inventory table**, medicine relay.

The screens **sync live**: across tabs in the same browser, and across devices on the published claude.ai link. For example, Paati's screen runs on a real phone and the hospital console on the projector. Press SOS on the phone and the projector reacts instantly.

Scenarios built in: **chest pain at 2 AM**, **snake bite in the garden**, **fall while on a blood thinner**, **breathlessness**, and **missed tablets (silent check)**.

Prototype fidelity, by stage:
- **Lo-fi**: paper sketches of the elder's one-button screen. Test them with grandma first (photograph her using them, it's great evidence).
- **Mid-fi**: Figma or the HTML prototype.
- **Hi-fi demo**: the live multi-device prototype.

---

## 5. TEST (validation plan)

### 5.1 What we must prove (riskiest assumptions first)

| # | Assumption | How we test it | Pass criterion |
|---|---|---|---|
| A1 | Elders can trigger SOS without help | Usability test with 5 elders: "Imagine you feel chest pain, call for help" | ≥4/5 succeed in **< 10 s** without coaching |
| A2 | Press-and-hold prevents false alarms but isn't too hard | Same test; count accidental and failed presses | 0 accidental, ≤1 failed |
| A3 | Guardians want this **and would pay** | Survey (n ≥ 50) + 5 interviews | ≥60% "likely to pay" ≥ ₹99/month |
| A4 | ER staff find the 5-fact brief useful | Show the hospital screen to 2 or more doctors or nurses | Average rating ≥ 4/5; they name a real past case |
| A5 | Hospitals would update stock daily | Interview a pharmacist or store manager | "≤ 1 minute a day is acceptable" |
| A6 | Missed-call SOS is understood | Ask elders to "give a missed call" to a number on the fridge card | ≥4/5 can do it |

### 5.2 Test protocol (for the grandma session)
1. Consent (read the script in `02-research-kit.md`). Ask before you photograph or record.
2. Warm-up conversation about her day and medicines. Do **not** mention our product yet.
3. Story questions ("Tell me about the last time you felt suddenly unwell…").
4. Show the **paper prototype**, then the **phone prototype**. Give her tasks; don't help.
5. Measure: time to SOS, errors, facial reactions, and quotes, written verbatim.
6. Ask the 3-question "feelings" check: *Did it feel easy? Did it feel safe? Would you keep it near you?*

### 5.3 Iteration log (fill this in, it shows evidence of design thinking) 🔁

| Version | What we tested | What we learned | What we changed |
|---|---|---|---|
| v0 paper | Single SOS button | e.g. "Paati pressed it by accident while dusting" | Press-and-hold with a progress ring |
| v1 app | English labels | e.g. "Paati read only the Tamil" | Tamil first, large, English small |
| v2 | Routing showed only the hospital name | e.g. "Doctor asked *why* this hospital" | Added the routing explanation |

(The changes in the right-hand column are already built into the prototype. Your job is to capture the real "what we learned" moments that justify them.)

---

## 6. Existing solutions and the gap

| Solution | What it does well | What it misses for our user |
|---|---|---|
| **112 / 108 (ERSS)** | Free national emergency response | Needs a voice call and an explanation. Routes by protocol or nearest. No history travels with the patient |
| **Apple Watch / Pixel** (fall and crash detection, Medical ID) | Great automatic detection | Expensive hardware. Elders in our segment don't own these. No hospital capability routing |
| **ABHA / ABDM PHR apps** | Government-backed health records | Records aren't *pushed* to the ER in an emergency. Smartphone-literate users only |
| **Medisafe, MyTherapy** (pill reminders) | Reminders, adherence tracking | Need a smartphone. No escalation when a dose is missed. Not in Tamil voice |
| **Elder-care services** (e.g. Emoha, Anvayaa, Samvedna) | Human care managers, home visits | Premium pricing. Service-heavy. No hospital-network integration |
| **Ambulance aggregators** (e.g. RED.Health) | Faster private ambulance dispatch | Don't know this patient's history or which hospital has the needed drug |
| **e-Aushadhi / DVDMS** (government drug-inventory systems) | Stock tracking within the government supply chain | Not shared across hospitals in real time for emergency routing |
| **"Vial of Life" / medical ID bracelets** | Offline history for paramedics | Static, no alerting, no routing |

**Our gap (as far as we found; verify this during research):**

| Capability | 108 | Smartwatch | PHR app | Pill app | Elder-care service | **Saathi** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Works on a keypad phone | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Alerts family + neighbour automatically | ❌ | ⚠️ | ❌ | ❌ | ✅ | ✅ |
| History reaches the ER *before* the patient | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| Missed-dose escalation | ❌ | ❌ | ❌ | ⚠️ | ⚠️ | ✅ |
| Routes by hospital **capability and stock** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Shares critical-drug stock across hospitals | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### What is genuinely novel (the pitch line)
1. **Need-matched routing**: "nearest *capable*" instead of "nearest". The decision is explained in plain words.
2. **One baton, three users**: the SOS, the record, and the inventory are *one event*, not three apps.
3. **Missed-call SOS + offline Fridge QR**: inclusion designed for India's keypad-phone elders.
4. **Silent Check**: emergencies where the elder *can't* press anything are caught through a missed routine.

---

## 7. Feasibility

| Layer | How it's built today (all existing tech) |
|---|---|
| Missed-call SOS / IVR reminders | Cloud telephony (Exotel, Twilio, Knowlarity): missed-call numbers and IVR in Indian languages are mature, cheap products |
| Pendant | ESP32 + 4G/GSM module, or a BLE button paired to the phone |
| Records | **ABDM** (Ayushman Bharat Digital Mission) APIs. ABHA ID, FHIR R4 resources, consent manager (sandbox available for developers) |
| Routing | Maps Distance Matrix / OSRM for ETA + our rules engine for capability matching |
| Hospital inventory | Phase 1: 30-second daily web form for ~10 critical items. Phase 2: HMIS integration via FHIR |
| Notifications | FCM push, SMS, WhatsApp Business API, voice calls |
| Triage | Rules (keywords in Tamil and English) + an LLM for free speech. **Decision support only**; the EMT and doctor decide |

**Regulatory and ethics:** consent-based sharing under India's **DPDP Act 2023** and the ABDM consent framework. The QR holds only the 5 facts, with no ID numbers in full. Every ER access is break-glass and logged. Routing is advisory (not a diagnosis), which keeps us out of medical-device classification in phase 1 (to be confirmed with an expert).

**Risks and mitigations**

| Risk | Mitigation |
|---|---|
| Stale hospital stock data | Show "updated X min ago". Prompt staff daily. Fall back to calling the hospital |
| False alarms | Press-and-hold. "I'm OK" cancel within 10 s. Escalation ladder |
| Hospitals refuse to share | Routing *sends them patients* (revenue), so participation pays for itself. Start with private hospitals + one government partner |
| Elder distrust of tech | Physical pendant + fridge card. Family onboarding. Tamil voice |

---

## 8. Market and business model

### 8.1 Market sizing (illustrative; state your assumptions out loud)

- **TAM:** ~14 crore Indians aged 60+ (10.1% of the population, 2021), heading to ~22.7 crore by 2036.
- **SAM:** urban and semi-urban elders with a chronic disease and a working child who pays. *Assumption:* ~2 crore households.
- **SOM (year 3):** 1 lakh families in Tamil Nadu and Karnataka + 300 hospitals.

### 8.2 Revenue streams

| Stream | Who pays | Price (assumed) |
|---|---|---|
| **Saathi Free** | — | SOS to 3 contacts, Emergency Passport, Fridge QR |
| **Saathi Family** | The guardian (the child) | ₹149/month: Pill Pulse IVR, Silent Check, Guardian Live, multiple guardians |
| **Saathi Pendant** | The guardian | ₹1,499 one-time |
| **Hospital Network Pro** | Hospitals | Free to join (they receive routed patients). Pro at ₹15,000/month: HMIS integration, analytics, relay coordination |
| **B2B2C** | Employers (parent-care benefit), health insurers (fewer severe claims through adherence) | Per-member pricing |
| **Government / PPP** | State health departments, 108 operators | Licence for routing + inventory layer |
| **Pharmacy refills** | Partner pharmacies | Commission on refill orders |

### 8.3 Illustrative unit economics (Family plan)
- IVR cost ≈ 2 calls/day × 30 days × ~₹0.75 ≈ **₹45/month**. Cloud and SMS ≈ ₹15. **Cost ≈ ₹60 → margin ≈ 60% at ₹149.**
- Year-3 SOM revenue ≈ 1,00,000 × ₹1,788/yr ≈ **₹17.9 Cr**, plus 300 hospitals × ₹1.8 L/yr (if 1 in 3 go Pro, about ₹1.8 Cr).

### 8.4 Go-to-market
1. **Pilot:** 50 families from SRM staff and students' grandparents + 1 partner hospital near campus.
2. **Channel:** sell to the *children* (LinkedIn, IT companies' employee benefits), not to the elders.
3. **Network effect:** every hospital that joins makes routing smarter, which brings more patients to member hospitals, which brings in more hospitals.

---

## 9. Technical architecture

```
 ┌──────────── Patient side ─────────────┐        ┌──────── Saathi Cloud ─────────┐        ┌──── Hospital side ────┐
 │ Saathi app (Flutter, big UI, Tamil)    │──HTTPS▶│ Alert Orchestrator            │──push─▶│ ER console (web)      │
 │ Keypad phone → missed call / IVR ──────┼─Exotel▶│  (escalation state machine)   │        │  pre-arrival brief    │
 │ Pendant (ESP32 + 4G / BLE)             │        │ Passport service (FHIR R4)    │◀─FHIR─▶│ HMIS / pharmacy       │
 │ Fridge QR (offline, 5 facts)           │        │  ⇄ ABDM consent / ABHA        │        │ Stock update form     │
 └────────────────────────────────────────┘        │ Routing engine                │        └───────────────────────┘
 ┌──────────── Guardian side ────────────┐        │  ETA (OSRM/Maps) + capability │
 │ Guardian app: live timeline, streaks   │◀─FCM──│ Inventory + Relay service     │──▶ 108 / ambulance partner API
 └────────────────────────────────────────┘        │ Postgres+PostGIS · Redis      │
                                                   │ Audit log (break-glass)       │
                                                   └───────────────────────────────┘
```

### Need-matched routing (core algorithm)
```
needs = requirements(condition, passport)     # e.g. cardiac → {cath lab}; snakebite → {ASV ≥ 10 vials}
                                              # fall + on antiplatelet → {CT, neurosurgery}
for each hospital h within 25 km:
    eta = travel_time(home, h)
    missing = needs − capabilities(h)
    score = eta + (45 min if missing else 0)  # 45 min ≈ stabilise + refer + re-transport
              + (15 min if h.icu_beds == 0 and condition is critical)
choose argmin(score); explain(missing for nearest, minutes saved)
```

### Data security
- AES-256 at rest, TLS in transit, role-based access.
- The QR holds only minimal emergency data.
- The ER gets time-limited access on SOS (break-glass), and every access is logged.
- The guardian sees only what the elder consented to share.

---

## 10. Roadmap

| Phase | Months | Milestone |
|---|---|---|
| 0 | Now | Validated prototype (this project) |
| 1 | 0–6 | Pilot: app + missed-call SOS + Fridge QR + 1 hospital, 50 families |
| 2 | 6–12 | ABDM integration, pendant, 10 hospitals, Chennai network inventory |
| 3 | 12–24 | 108 integration (PPP), AI triage in 5 languages, insurer partnerships |

---

## 11. Impact metrics we'd track
- **Time from SOS to definitive care** (the north-star metric)
- Number of inter-hospital transfers avoided
- Medication adherence % (Pill Pulse)
- Guardian "peace of mind" score (monthly survey)
- Critical-drug stock-outs resolved through relay

---

## Part 5. Research kit (docs/02-research-kit.md)

# Research Kit: Interviews, Survey and Usability Test

Use this kit to collect **real evidence**. Real quotes, photos (taken with permission), and survey numbers are what make a design thinking project feel validated rather than invented.

**Golden rules**
- Ask about **past behaviour**, not opinions about the future. "Tell me about the last time…" beats "Would you use…?"
- **Don't pitch** before you've listened. Show the prototype only at the end.
- Write down **exact words** in the original language (Tamil is fine), then add a translation.
- Ask **"why?"** five times when something interesting comes up.
- Always ask **permission** before recording, photographing, or using a name. Offer to use a first name only.

---

## A. Consent script (read aloud)

> "We are students from SRM doing a college project on how elderly people get help during health emergencies. We'd like to talk to you for about 20 minutes. There are no right or wrong answers. Can we take notes? Can we record audio or take a photo? We will only use your first name, and only for our college presentation. You can stop at any time."

Tick: ☐ Notes ☐ Audio ☐ Photo ☐ Video ☐ Name OK, or use a pseudonym: ____

---

## B. Elder interview (Paati / Thatha), about 20 minutes

**Warm-up**
1. Tell us about a normal day. When do you wake up, and what do you do in the morning?
2. Who lives with you? Who visits you most often?

**Health and medicines**
3. What health problems do the doctors say you have?
4. Can you **show us** how you keep your tablets? *(Observe and photograph the pill box.)*
5. How do you remember which tablet to take when? Have you ever forgotten, or taken one twice?
6. Where are your reports and prescriptions kept? *(Ask to see them. The "plastic bag" photo is powerful.)*

**Emergencies (the core)**
7. Tell us about the **last time you suddenly felt unwell** at home. What happened, minute by minute?
8. Who did you call first? How did you call? How long did it take?
9. When you reached the hospital, what did the doctor ask you? Could you answer?
10. Was there a time the hospital said "we don't have this here, go somewhere else"?
11. What worries you most at night?

**Phone**
12. Can you **show us** how you would call your son or daughter right now? *(Time it. Note any difficulty.)*
13. What do you find difficult about the phone? (Small letters? English? Touch?)
14. Do you know what a "missed call" is? Have you given one?

**Feelings**
15. How do you feel about your children knowing every time you're unwell?
16. If there was one thing that could make you feel safer at home, what would it be?

**Prototype test (last)**: see section F.

---

## C. Guardian interview (son, daughter, or grandchild), about 15 minutes

1. Where do you live compared to your parents? How often do you talk?
2. **Tell us about the last health scare** with your parent. How did you find out? How long after it happened?
3. What did you do? What did you wish you could do?
4. How do you know whether they took their medicines today?
5. Do you have their medical details (blood group, medicines, allergies) with you right now? *(Ask them to check. Most won't have them, which is a great insight.)*
6. Have you tried any app or service for this? What did you like or dislike? Why did you stop?
7. What would you pay per month for peace of mind about your parents' safety? *(Ask for a number before showing any price.)*
8. Who else in the family should be alerted?

---

## D. Doctor / nurse (ER) interview, about 10–15 minutes

1. When an elderly patient comes in an emergency, what information do you **need in the first 5 minutes**?
2. How often does the patient arrive with **no history**? What do you do then? How long does that take?
3. Which medicines, if unknown, are most dangerous? (Blood thinners? Insulin? Allergies?)
4. Has your hospital ever had to **refer a patient because a drug or facility wasn't available** (anti-venom, thrombolytics, cath lab, CT, ICU bed)? Tell us about it.
5. How does your ER know a patient is coming? Do ambulances call ahead?
6. *(Show the hospital screen.)* Rate the pre-arrival brief from 1 to 5. What's missing? What's useless?
7. Would your hospital share stock of ~10 critical drugs with a network? What would worry you?

## E. Pharmacist / store manager and ambulance driver (short)

**Pharmacist**
1. How do you track stock of emergency drugs (ASV, tenecteplase, rabies immunoglobulin)?
2. Have you run out? What happened to the patient? Did you borrow from another hospital? How?
3. Could you update a 10-item form once a day? How long would it take?

**Ambulance driver / EMT**
1. How do you decide which hospital to go to?
2. How often is the patient sent on to a second hospital?
3. Do you know the patient's medicines when you pick them up? How?
4. *(Show the Fridge QR.)* Would you scan this?

---

## F. Usability test of the prototype (with an elder)

Setup: a phone with the prototype open on **Paati's phone** view (`index.html#patient`). Don't explain the screen.

| Task | Say this | Measure |
|---|---|---|
| T1 | "Imagine you have strong chest pain and are alone. Get help." | Seconds to SOS ⏱, errors, hesitation |
| T2 | "Tell the phone what's wrong." | Did they find the chips? Tamil or English? |
| T3 | "It's morning. Tell Saathi you took your tablets." | Success Y/N, seconds |
| T4 | "Your son is asking if you're okay. Answer him." | Success Y/N |
| T5 | "Give a missed call to the number on this card." *(paper card)* | Success Y/N |

Then ask:
- "Was that easy or difficult?" (1–5, show fingers)
- "Did you feel safe?" (1–5)
- "Would you keep this near your bed?" (Y/N + why)

**Record table**

| Participant | Age | T1 (s) | T2 | T3 | T4 | T5 | Easy | Safe | Keep? | Best quote |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | | | |
| P2 | | | | | | | | | | |

---

## G. Survey (Google Form): target 50+ responses

Share it in family WhatsApp groups, with SRM faculty and staff, and with hostel friends (ask them to forward it to their parents). **Two short sections**: everyone answers section 1, then guardians answer section 2.

**Section 1: About you**
1. Your role: ☐ I am 60+ ☐ I look after a parent or grandparent aged 60+ ☐ Healthcare worker ☐ Other
2. Does the elder live: ☐ Alone ☐ With spouse only ☐ With children ☐ Other
3. Distance between you and the elder: ☐ Same house ☐ Same city ☐ Different city ☐ Different country
4. Number of chronic conditions (BP, sugar, heart, etc.): ☐ 0 ☐ 1 ☐ 2 ☐ 3+
5. Phone the elder uses: ☐ Keypad phone ☐ Smartphone (basic use) ☐ Smartphone (comfortable) ☐ None

**Section 2: Emergencies**
6. In the last 2 years, has the elder had a medical emergency at home? ☐ Yes ☐ No
7. If yes, how did you find out? ☐ Elder called me ☐ Neighbour or relative ☐ Hospital ☐ Found out later
8. How long after it happened did you find out? ☐ < 10 min ☐ 10–60 min ☐ 1–6 hrs ☐ Next day or later
9. Did the hospital have the elder's medical history? ☐ Yes, full ☐ Partly ☐ No ☐ Don't know
10. Was the patient **referred or shifted to another hospital**? ☐ Yes ☐ No. If yes, why? ☐ No specialist ☐ No bed/ICU ☐ Medicine unavailable ☐ Other
11. Can you right now tell the elder's blood group, all current medicines, and allergies? ☐ All ☐ Some ☐ None
12. How sure are you that the elder took today's medicines? (1 = no idea, 5 = certain)
13. How worried are you about the elder having an emergency when no one is around? (1–5)

**Section 3: Solution check**
14. Rank the features you'd value most: ☐ One-press SOS (works on any phone) ☐ Medical details sent to the ER automatically ☐ Ambulance goes to the hospital that can treat (not just the nearest) ☐ Medicine-taken updates ☐ Live tracking when the elder goes to hospital
15. Would you pay for such a service? ☐ No ☐ ≤ ₹99/mo ☐ ₹100–199/mo ☐ ₹200–499/mo ☐ ₹500+/mo
16. Any story you'd like to share? (open text)

> Turn the results into 3–4 charts for the slides (Q8, Q10, Q11, Q15 are the strongest), and quote 2–3 stories from Q16.

---

## H. Making the emotional piece land (presentation tips)

- **The 60-second video:** film Paati's morning medicine routine. Hands sorting tablets, the steel box, the plastic bag of reports. *No narration, just ambient sound*, then one line of text: "Now imagine it's 2 AM."
- **The "plastic bag" photo:** put a photo of the real bag of reports next to the Fridge QR card. Before and after.
- **Guardian quote slide:** one big quote on a black slide, e.g. *"I found out the next day."*
- **The live test clip:** 10 seconds of Paati pressing the SOS on the prototype and smiling (or struggling, then the improved version working). It shows the iteration.
- **Hand out a physical Fridge QR card** to the judges and let them scan it with their phones during the demo.

---

## Part 5b. App README and design rules (app/README.md, app/DESIGN.md)

# Saathi: the app

A full-stack, installable web app (PWA) for elders, their families and hospitals. One server runs the API, the live updates and the web app. Open it on several phones and laptops at once, and every screen updates live.

| Who | What they get | URL |
|---|---|---|
| **Elder** (Kamala Paati) | Giant buttons: hold-to-SOS, "I took my tablets", talk to Saathi (voice), Face Pulse heart-rate check, offline emergency QR card, fall detection | `/elder` |
| **Family** (Karthik, son) | Live status and activity feed, medicines with safety checks, adherence and vitals charts, **Health Vault**, live emergency tracking on a map, visits, family circle | `/family` |
| **Hospital** (Dr. Priya, ER) | Incoming patients with an AI pre-arrival brief and red flags, "why this hospital" routing, break-glass record access, network beds, medicine stock and relays | `/hospital` |
| **Doctor** (no login) | Read-only lifetime record from a 24-hour share link or QR | `/share/:token` |

## Design

The interface follows [`DESIGN.md`](DESIGN.md): a "signage-grade" system built for a 72-year-old (blue-black ink, turmeric yellow, red only for emergencies), Indian-foundry fonts bundled offline (Anek, Hind Madurai), and doses shown as medicine blister strips.

## What's inside

- **Health Vault.** Photograph or upload prescriptions, lab reports, discharge summaries and scans (images or PDF). Claude reads each paper (handwriting too), builds a dated timeline and lab trends, and **cross-checks every paper together**: falling kidney function versus the metformin dose, interactions between prescriptions from different doctors, duplicate brands, rising cholesterol. Ask questions with source citations. Generate a doctor brief and share link.
- **Daily companion.** Saathi chats with the elder in simple English, remembers context, logs tablets from the conversation, and escalates red-flag phrases ("my chest feels heavy") through **fixed safety rules that override the AI**.
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

# Saathi design system: "soft clay"

Saathi is a **phone app**. Every screen is designed for a 390 px wide phone. On a laptop the app is shown inside a phone frame (`PhoneFrame` in `src/components/kit.tsx`), so screens never get wider than the phone.

Reference look: modern health apps with a violet gradient header, a white sheet rising over it, bento tiles with glossy 3D clay objects, pastel stat cards and a floating pill tab bar.

## Hard rules

1. **No responsive breakpoints** (`sm:` `md:` `lg:` `xl:`) inside app screens. They follow the browser window, not the phone frame, so they break the layout on a laptop. Design for one width.
2. Build from the kit (`src/components/kit.tsx`) and `src/components/ui.tsx`. Do not restyle them per screen. If you need a new shared piece, add it in your own file.
3. **Red (`sos`) is only for emergencies.** Amber or peach is for "needs attention", mint for "done or fine", violet for actions.
4. Use 3D art instead of icon boxes: `<Art name="heart" size={56} />`. Use lucide icons only for small UI glyphs (back, close, phone, plus).
5. People are shown with their 3D portrait: `<Person who="paati" | "karthik" | "priya" />`. `Avatar` from `ui.tsx` does this automatically for those names.
6. Copy is plain and warm. No uppercase eyebrows except the CPR and emergency labels. No lorem. Use real data from the API.
7. Everything tappable is at least 44 px. Elder screens use at least 56 px and 18 px or larger text, in plain English (`Bi` in `pages/elder/shared.tsx`).

## Tokens (tailwind.config.js)

| Token | Use |
|---|---|
| `violet` (DEFAULT #6F5CF6, 50–900) | primary actions, active tab, links (`text-violet-600`) |
| `canvas` #F3F2FA | app background (the sheet) |
| `ink`, `ink-2`, `ink-3` | text: primary, secondary, muted |
| `mint`, `peach`, `butter`, `sky`, `rose`, `lilac` (+ `-ink` text colour) | pastel tiles and stat cards |
| `sos` #FF3B4D | emergencies only |
| radius | tiles and cards `rounded-3xl`, sheets `rounded-t-[32px]`, buttons `rounded-full` |
| shadow | `shadow-card` (cards), `shadow-lift` (floating), `shadow-pill` (tab bar), `shadow-sos` |
| type | Plus Jakarta Sans; headings `font-extrabold` or `font-bold`; numbers `font-display font-extrabold tnum` |
| backgrounds | `.hero-violet` / `.hero-sos` gradients, `.glass` for chips on violet |

## Kit (src/components/kit.tsx)

- `Art`: generated 3D icons in `/public/art`: siren, pills, heart, folder, ambulance, hospital, stethoscope, calendar, home, shield, chat, cpr, qr, blood, bed, brain (plus `hero.webp`).
- `Person`: portraits for paati, karthik and priya.
- `VioletHeader` + `Sheet`: the standard home layout. A violet header, then a canvas sheet with rounded top that overlaps the header by 28 px.
- `TopBar`: sticky sub-page header with a round back button.
- `Tile`: bento tile in a pastel tone, with title, sub and art in the corner. `big` is for the hero tile.
- `QuickTile`: glass tiles in the violet header.
- `StatCard`: pastel number card for vitals and capacity.
- `Section`: heading plus content.
- `Pill`: rounded buttons (`ink`, `violet`, `white`, `sos`, `soft`, `glass`).
- `TabBar`: floating pill tab bar; the active tab grows a label.
- `BottomSheet`: animated sheet. `Modal` in `ui.tsx` also renders as a sheet.
- `PhoneFrame`: wraps a whole app.
- `CprCoach` (`src/components/CprCoach.tsx`): a full-screen CPR metronome.

Motion: `framer-motion`. Use `whileTap={{ scale: .97 }}` on tappables and soft spring entrances. Never animate for longer than 400 ms, except the SOS hold and CPR beat.

---

## Part 6. Older planning docs (historical; Part 1 wins where they disagree)

> These were written earlier. Some details are outdated: Tamil-first UI and Tamil demo beats (now English), "36 min" (now 43 min on real roads), and demo flows that were later changed.

### docs/03-pitch-and-demo.md

# Pitch Deck Outline, Live Demo Script and Q&A

## Slide flow (about 8 minutes + demo)

| # | Slide | What to say / show | Who |
|---|---|---|---|
| 1 | **Hook** | Black screen. Paati's voice (from your interview): *"I couldn't remember my son's number."* Then: "This is my grandmother. This happened." | Shaan |
| 2 | **The golden hour** | One stat per line: 1 in 3 elders have 2+ chronic diseases. Ambulances miss the golden hour in ~50% of trauma cases (Karnataka CAG audit). ~58,000 snakebite deaths a year. | Shrinavin |
| 3 | **Our research** | Photos (with permission): the plastic bag of reports, the steel pill box, the keypad phone. Survey charts: "found out next day", "history unavailable", "referred to another hospital". | Dhanisha |
| 4 | **Journey map** | The 2 AM timeline (current state). Red marks on every broken hand-off. *"Everyone did their job. Nobody had the whole picture."* | Dhanisha |
| 5 | **Reframed problem** | Original statement → our POV + HMW. "We stopped solving 3 problems and solved 1 moment." | Kishore |
| 6 | **Ideation** | Crazy 8s wall photo + the selection matrix. Why we combined ideas. | Kishore |
| 7 | **Saathi** | The 5 building blocks diagram. One-line tagline. | Aakash |
| 8 | **LIVE DEMO** | See the script below. | Aakash + Santhosh |
| 9 | **What's new** | Need-matched routing, one baton for three users, missed-call SOS + offline QR, Silent Check. The gap table vs existing solutions. | Santhosh |
| 10 | **Validation** | Grandma usability test results (seconds to SOS, quotes, before/after iteration). Survey willingness to pay. Doctor feedback score. | Shrinavin |
| 11 | **Business + tech** | Freemium (the child pays ₹149/mo) + hospital network + insurers. Architecture diagram. ABDM, Exotel, FHIR. | Santhosh |
| 12 | **Close** | Video of Paati holding the Fridge QR card and smiling. *"No one should face an emergency alone."* Roadmap + ask. | Shaan |

## Live demo script (about 2.5 minutes)

**Setup before you go on stage**
- Laptop on the projector: open the prototype (the published link, or `prototype/index.html`) on **All screens**.
- One team member's phone: open the same link with `#patient` at the end. This is "Paati's phone". If both devices are signed in to the same claude.ai account, they sync live. Otherwise use two browser tabs on the laptop (they sync too).
- Press **Reset** on the laptop.
- Hand a judge a **printed Fridge QR card** (open "My emergency card" and screenshot it).

**Beat 1, the press (30 s).** "It's 2:10 AM. Paati has chest pain. She doesn't unlock anything. She just holds the button." *Hold SOS on the phone for 2 seconds.* The projector instantly shows Karthik's phone ringing and the hospital console waking up.

**Beat 2, she speaks Tamil (20 s).** On the phone, tap **நெஞ்சு வலி (chest pain)**, or type *"nenju romba valikkudhu"* and send. "Saathi understands Tamil and combines it with her history: stent in 2022, on a blood thinner."

**Beat 3, the routing (40 s).** Point at the hospital console. "The nearest hospital is 1.6 km, but it's a PHC with no cath lab. An ambulance going there means a transfer later. Saathi routes her to Saraswathi, 4.9 km, which has a cath lab ready. About 37 minutes saved." Show the ranked list explaining why.

**Beat 4, the ER is ready (30 s).** "Before she arrives, the ER sees the 5 facts: penicillin allergy, on clopidogrel, diabetic." Click **Page cath lab team**. On Karthik's phone, click **I'm on it**. "Her son in Bengaluru sees everything live. Paati's own screen tells her, in Tamil, that help is coming and to unlock the door."

**Beat 5, the network (20 s).** Point at the stock table: "Saraswathi has 0 anti-snake venom. One click and the network relays 10 vials from Kovil Street GH." Click **Relay**.

**Backup:** if anything fails live, press **Play the 2 AM story**. It runs the whole sequence automatically with captions.

**Bonus beats if time allows**
- **Missed tablets**: shows the Silent Check (IVR call to Paati → neighbour → son).
- **Fall on blood thinner**: routes to the only hospital with a neurosurgeon.
- Have a judge **scan the Fridge QR** with their phone. The details appear with no app and no internet.

## Likely judge questions

| Question | Answer |
|---|---|
| "Why would hospitals share stock data?" | Routing sends them patients, which is revenue. Phase 1 is a 30-second daily form for ~10 items. COVID bed dashboards proved hospitals can do this when the value is clear. |
| "What if the stock data is stale?" | Every entry shows "updated at". The EMT can override. The ER confirms by phone as the fallback. |
| "Isn't this a medical device? AI diagnosing?" | Triage is decision support for **routing**, not diagnosis. The paramedic and doctor decide. AI is optional; rules and the passport work without it. |
| "Privacy?" | Consent-based under the DPDP Act 2023 and the ABDM consent framework. The QR holds only 5 facts. ER access is time-limited break-glass, and every access is logged. |
| "Grandma won't use apps." | That's why SOS works via **pendant, missed call, or fall sensor**, and reminders come as **voice calls in Tamil**. The app is optional for her; it's mainly for the guardian. |
| "How is this different from 108 or Apple Watch?" | Show the gap table. None of them carry the record ahead or route by capability and stock. The watch is out of reach for our users. |
| "Who pays?" | The child (₹149/mo), hospitals for Pro features, insurers and employers as a benefit. The free tier covers SOS, the passport and the QR. |
| "What did you change after testing?" | Point to the iteration log: press-and-hold, Tamil first, routing explanations. |

## Team roles (suggested)

| Member | Owns |
|---|---|
| Shaan | Story, hook, overall pitch, grandma interview |
| Shrinavin | Secondary research + survey analysis |
| Kishore | Define and Ideate artefacts (POV, HMW, Crazy 8s, matrix) |
| Aakash | Prototype demo + Figma/paper prototypes |
| Santhosh Sharma | Business model, market, competitor research, tech architecture slide |
| Dhanisha | Empathy map, personas, journey map, video and photo editing |

### docs/05-features-and-wow-demo.md

# Saathi: Full Feature Set and the Wow Demo

> **Saathi is an AI family member for India's elders.** It calls them every day in their language, keeps their entire medical history in one place, notices when health is drifting, and when something goes wrong, gets the whole family, the ambulance and the right hospital moving in seconds.

Status key: ✅ built in our prototype · 🟡 partly built or simulated · 🔜 planned (on the roadmap slide)

---

## Pillar 1: The Daily Call (the habit)
| Feature | What it does | Status |
|---|---|---|
| AI grandchild call | Calls every morning on any phone (even a keypad phone), in Tamil, Hindi, Telugu… Sounds warm and remembers her life ("how was the temple?") | ✅ `companion.html` (typed / tapped; real phone line 🔜) |
| Medicine check | "Did you take the yellow and white tablets?" Logs yes or no. Calls again if missed | ✅ |
| Mood, sleep, food, pain | Picked up from natural conversation, never a questionnaire | ✅ |
| Family brief | A 3-line daily note to the son or daughter: what matters, nothing more | ✅ |
| Red-flag escalation | Chest pain, breathlessness, a fall or slurred speech → fixed safety rules trigger the emergency, whatever the AI thinks | ✅ |
| Connect to family | "I want to talk to Karthik" → bridges the call | 🟡 |
| Scam shield | Reminds her that banks and police never ask for OTPs on the phone, and flags "digital arrest" style calls she mentions | 🔜 |
| Story keeper | Records her life stories (with consent) and turns them into a family audiobook | 🔜 |
| Festival and occasion memory | Wishes her on Pongal, reminds her of grandchildren's exams and birthdays | 🔜 |

## Pillar 2: Health Vault (the memory) ⭐ *the medical documents and history system*
| Feature | What it does | Status |
|---|---|---|
| Photo → lifetime record | Photograph or WhatsApp-forward any paper (prescriptions, lab reports, discharge summaries, scans). AI reads handwriting and print and builds one record | ✅ `vault.html` (live with Claude on claude.ai) |
| Timeline | Every event dated and linked to the paper it came from (tap to see the original) | ✅ |
| Trends | HbA1c, kidney function, cholesterol and haemoglobin charted across years, with targets | ✅ |
| **"Caught" (cross-doctor check)** | Finds what no single doctor saw: falling kidney function while on full-dose metformin, a statin halved while cholesterol rose, omeprazole weakening clopidogrel, duplicate brands. Each one is phrased as a question for the doctor | ✅ |
| Doctor brief + QR | A one-page summary for the next OPD visit. The doctor scans a QR to open the record; access expires in 24 h | ✅ (QR holds a sample summary) |
| Ask the record | "When was her stent put in?" or "பாட்டிக்கு என்ன அலர்ஜி?" Answers in English or Tamil, citing the source paper | ✅ |
| Read to Paati | The doctor brief read aloud to her in Tamil, so she isn't left out of her own care | ✅ |
| Emergency passport | The vault feeds the ER brief and the fridge QR automatically | ✅ (golden-hour demo) |
| ABHA / ABDM sync | Pull and push records through India's national health ID with consent | 🔜 |
| Screening reminders | Diabetic eye and foot checks, flu and pneumonia vaccines, mammograms | 🔜 |
| Bills and insurance | Hospital bills and policy documents in one place; claim checklist | 🔜 |
| Generic savings | Suggests Jan Aushadhi generic equivalents to ask the doctor about (often much cheaper) | 🔜 |

## Pillar 3: Drift Radar (the early warning)
| Feature | What it does | Status |
|---|---|---|
| 14-day drift | Combines speaking pace, "tired" and "breathless" mentions, and skipped doses into an early warning *before* the 2 AM emergency | 🟡 (sample data) `companion.html#drift` |
| **Face Pulse** | Heart rate from a 20-second selfie (camera rPPG). No device to wear | ✅ `vitals.html` (verified end to end on a synthetic pulsing face: 72 → 72 bpm) |
| Booking agent | "Book Dr. Raman this week" → the agent calls the clinic, books, sends the summary, reminds her | 🟡 (simulated) |
| Voice biomarkers | Slurring (stroke), breathless pauses, word-finding trouble | 🔜 research |
| Pill-box camera check | "Show me today's strip" → "the pink one is missing" | 🔜 |

## Pillar 4: Golden Hour (the emergency)
| Feature | What it does | Status |
|---|---|---|
| One-press SOS | Hold the button, press a pendant, give a missed call, or let a fall trigger it | ✅ `index.html` |
| Family + neighbour + 108 together | Everyone alerted at the same moment, with live tracking | ✅ |
| **Whole-room family alert** | Every family member's phone flashes, rings and vibrates. "I'm on my way" replies show up live | ✅ `live.html` (tested with 4 phones on a local broker) |
| Need-matched routing | Nearest hospital *that can treat her* (cath lab, CT, neuro, ICU, anti-venom), with the reasoning shown | ✅ |
| ER pre-arrival brief | Allergies, blood thinners, history, sent before she arrives | ✅ |
| Medicine relay | Hospitals share critical-drug stock and transfer it between them | ✅ |
| Fridge QR | Works offline with any camera; for paramedics and neighbours | ✅ |
| Silent check | No answer to the morning call → retry, neighbour, son, 108 | ✅ |

## Pillar 5: Family Circle
| Feature | What it does | Status |
|---|---|---|
| Sibling duty roster | Who visits this weekend, who pays the pharmacy bill | 🔜 |
| Weekly digest | One message every Sunday: adherence, mood, upcoming appointments | 🔜 |
| Shared expenses | Medical spend split between siblings, using UPI | 🔜 |

---

## The Wow Demo: run-of-show (10 minutes)

Five moments, each bigger than the last. **Rehearse it 5 times. Have a backup video of every moment.**

| Time | Moment | What happens | Who | Screen |
|---|---|---|---|---|
| 0:00 | **Hook** | Lights dim. Real Paati's voice from your interview. One line on screen: *"I found out the next day."* | Shaan | Slides |
| 0:40 | **Wow 1: "You are Paati's family"** | "Everyone, take out your phone and scan this." 30–60 phones join and their names fill the projector wall. Press **1 · Morning call** and every phone chimes: *"Amma took her tablets ✓"* | Aakash | `live.html?host` |
| 2:00 | **Wow 2: The call** | Saathi calls Paati in Tamil. She mentions temple, tablets, sleep. Karthik's brief fills in live. Then: *"நெஞ்சு கனமா இருக்கு…"* ("my chest feels heavy…") | Kishore (as Paati) + Dhanisha | `companion.html` |
| 3:30 | **Wow 3: The room goes red** | Press **3 · SOS**. **Every phone in the room flashes red, vibrates and rings.** "Tap 'I'm on my way'". Names appear on the projector. Then switch to the golden-hour console: ambulance routed past the PHC to the cath-lab hospital, "~37 min saved", ER brief ready | Aakash + Santhosh | `live.html` → `index.html` |
| 5:00 | **Wow 4: The plastic bag** | Hold up a **real plastic bag of (name-masked) prescriptions**. "Six papers, four years, four doctors." Press build: papers light up one by one, then *"6 things caught"*: kidney function down by a third while on full-dose metformin, statin halved while cholesterol rose, omeprazole weakening clopidogrel. Ask it in Tamil: *"பாட்டிக்கு என்ன அலர்ஜி?"* ("what is Paati allergic to?") | Shrinavin | `vault.html` |
| 6:30 | **Wow 5: Your pulse, no wires** | Invite a judge. A **₹600 pulse oximeter** goes on their finger; they look into the laptop camera for 20 s. Two numbers appear, and they match. *"That's how Paati's daily check will work."* | Santhosh | `vitals.html` |
| 7:30 | **Proof** | Interview quotes, survey charts, pilot numbers (answer rate, "would you miss it?") | Dhanisha | Slides |
| 8:30 | **Business** | Child pays ₹499/mo; diaspora $19/mo; hospitals and insurers B2B. YC's "AI for the Aging Population" request. Moat: daily voice + full medical history | Santhosh | Slides |
| 9:30 | **Close** | Video of real Paati holding her fridge QR card, smiling. *"No one should face an emergency alone."* | Shaan | Slides |

### Equipment checklist
- [ ] Laptop + projector + HDMI adapter. Test the venue's projector a day before
- [ ] **Your own mobile hotspot** for the laptop. College Wi-Fi often blocks the message broker the live room needs
- [ ] A phone on a stand as "Paati's phone" (`index.html#patient`)
- [ ] A real plastic bag with **name-masked** prescriptions and reports (ask a family member)
- [ ] A fingertip pulse oximeter (~₹600) and a desk lamp for the Face Pulse
- [ ] Printed fridge QR cards to hand to judges
- [ ] Big QR on a slide pointing to `live.html?room=CODE` (the code shows on the host screen; generate the slide after opening the host)
- [ ] Backup screen recording of every demo on the laptop *and* a pen drive

### Hosting (one-time, about 10 minutes)
The live room and the Face Pulse need to be served over **https** so phones can open them and the camera works.
1. **GitHub Pages:** repo Settings → Pages → deploy from branch → choose the branch and `/ (root)`. Your demos will be at `https://<username>.github.io/Design-Thinking/prototype/live.html`. Free Pages hosting needs the repo to be public (or a paid GitHub plan).
2. **Or Netlify Drop:** drag the `prototype` folder onto app.netlify.com/drop. You get an https link in seconds.
3. The AI-powered demos (`companion`, `vault`, and AI triage in `index`) run with live Claude on their claude.ai links (in the README). Elsewhere they fall back to prepared demo data automatically.

### Live room notes
- It uses a free public MQTT broker (HiveMQ, with EMQX as fallback). Anyone could technically listen, so use **only sample data**.
- Test it in the venue the morning of the presentation. If the network blocks it, use your hotspot. For a private broker, sign up for HiveMQ Cloud's free tier and open `live.html?host&broker=wss://YOUR-BROKER/mqtt`.
- Rehearse alone with **"Rehearsal: add 8 pretend phones"** on the host screen.
- iPhones don't support web vibration, so they show the red takeover and play the alarm sound instead. Ask the audience to turn the volume up.

### If something fails on stage
| Failure | Fallback |
|---|---|
| Live room won't connect | Say "let's watch it on Paati's family phone" and play the backup video, or use `index.html` across two tabs |
| AI is slow | Every AI demo has a prepared result that appears automatically after the timeout |
| Face Pulse gives a weak signal | Turn on the desk lamp, ask the volunteer to stay still, or measure a teammate who has practised |
| Projector issue | Run the whole demo on the phone and pass it around |

### docs/04-startup-ideation.md

# Ideation Round 2: From Class Project to Startup

Round 1 gave us **Saathi Golden Hour**: one press, and the family, the ER and the right hospital all move together. It is a strong design-thinking answer. As a *startup* it has one fatal flaw, and finding that flaw is what led us to the much bigger idea below.

---

## 1. The flaw in Round 1: emergencies are rare

An emergency product is used **once every few years**. Everything else about it suffers:

- **Nobody builds a habit.** The pendant goes into a drawer and the app gets deleted to free space. When the day comes, it isn't there. *(Interview question to confirm: "Do you know anyone who had an alarm button and stopped wearing it?")*
- **There's no data when it matters.** On SOS day, the system knows nothing new about her since sign-up.
- **There's nothing to pay for monthly.** Families won't pay ₹149 every month for something that does nothing on 364 days of the year.
- **The risk builds on the other 364 days.** Missed tablets, poor sleep, getting breathless on the stairs, loneliness. The 2 AM emergency is usually the *end* of a slope we could have seen.

> **Insight:** whoever owns the *daily relationship* with the elder owns the emergency too. Emergency response should be a *feature* of something she uses every day, not the product itself.

What does an elder already use every day, without learning anything new? **A phone call.** Even a ₹1,000 keypad phone rings.

---

## 2. What the market is asking for

| Signal | What it says |
|---|---|
| **YC Requests for Startups, Fall 2026: "AI for the Aging Population"** | YC is asking for voice interfaces, safety monitoring, home robotics, and software that helps family caregivers coordinate care and emergencies. The care gap: more elders, too few caregivers, and ~53 million unpaid family caregivers in the US alone. ([YC RFS](https://www.ycombinator.com/rfs); summaries: [Founded CEO](https://foundedceo.substack.com/p/y-combinator-just-revealed-13-startup), [Inc.](https://www.inc.com/lucia-auerbach/y-combinator-requests-for-startups-fall-2026/91379840), [WorthvieW](https://www.worthview.com/y-combinators-fall-2026-request-for-startups-all-13-ideas-explained/)) |
| **YC Summer 2026: "AI-native service companies"** | Sell the finished outcome (a parent who is checked on every day), not software the family has to operate. ([VC Corner summary](https://www.thevccorner.com/p/yc-summer-2026-requests-for-startups-ideas)) |
| **Callie Care (US)** | Raised a $500K pre-seed (July 2026) for daily AI wellness check-in calls to older adults. It reports 8,000+ users tried it and 85% of engaged users asked to keep the calls (company figures). Proof that elders *will* talk to an AI caller. ([Healthcare IT Today](https://healthcareittoday.com/2026/07/14/callie-care-raises-500k-pre-seed-sage-crosses-100-million-in-2026-funding)) |
| **ElliQ / Intuition Robotics** | Raised $25M for an AI companion device for seniors. Shows the category is fundable, but it needs a $250+ device and English. ([This Week Health](https://thisweekhealth.com/news/intuition-robotics-scores-25m-to-scale-ai-care-companion-for-seniors/)) |
| **Age Care Labs (Emoha), India** | Raising ₹85 Cr for human-heavy elder care. India's demand is real, but the service model is expensive and slow to scale. ([Inc42](https://inc42.com/buzz/age-care-labs-raises-%e2%82%b985-cr-to-build-senior-living-communities/)) |
| **India's numbers** | 142 million seniors (2021), growing to ~231 million by 2036 (India Ageing Report 2023, via Inc42). Their children have moved to other cities and countries. |

**The gap nobody fills:** an AI caller that speaks **Tamil, Hindi, Telugu, Bengali…** on a **plain phone call**, priced for Indian families, with a real **emergency and hospital layer** behind it. US players don't speak Indian languages or know Indian healthcare. Indian players run on humans.

---

## 3. Diverge: 24 ideas across 6 lenses

AI angle = what modern AI makes possible that wasn't before. Wow = how it looks in a demo.

### A. Voice (the elder's interface)
| # | Idea | AI angle | Demo wow |
|---|---|---|---|
| A1 | **AI grandchild that calls daily** in her language and remembers her life | Realtime voice LLM + long-term memory | A phone rings on stage and speaks Tamil |
| A2 | **Voice biomarkers**: slurred speech (stroke), breathless pauses (heart failure), word-finding trouble (dementia) | Speech features + baseline drift | A 14-day chart of her speaking pace falling |
| A3 | **Scam shield**: screens calls and warns about "digital arrest" and OTP scams aimed at elders | LLM call classification | Plays a fake "CBI officer" call; Saathi interrupts |
| A4 | **Story keeper**: records her life stories during calls and turns them into a family audiobook | Summarisation + TTS | Grandkids hear Paati's wedding story |
| A5 | **Missed-call → AI callback SOS** (works with zero balance) | Voice triage on callback | A missed call triggers a calm Tamil triage call |

### B. Vision (the phone camera)
| # | Idea | AI angle | Demo wow |
|---|---|---|---|
| B1 | **"Scan the bag"**: photos of old prescriptions → one medicine list, brand-to-generic mapping, duplicates and interactions | Vision LLM on handwriting | Catches a double dose across 3 doctors |
| B2 | **Pill-box check**: show today's strips to the camera; "the pink one is missing" | Vision + medicine list | Live camera check |
| B3 | **30-second selfie vitals**: heart rate from the face (rPPG). Validated for heart rate (r = 0.99 in an ED study); weaker for breathing and SpO₂ | Signal processing + ML | A judge looks into the laptop and sees their pulse |
| B4 | **Lab report explainer**: photo of a report → plain Tamil voice note + trend vs. last report | Vision + reasoning | "Your HbA1c went up from 7.1 to 8.4" |

### C. Sensing (no device to wear)
| # | Idea | AI angle | Demo wow |
|---|---|---|---|
| C1 | Phone-only fall detection + "are you OK?" voice check | Accelerometer + voice | Drop the phone, it asks in Tamil |
| C2 | Routine anomaly detection (phone didn't move by 10 AM, TV not on, lights) | Baseline modelling | "Paati hasn't moved since 9" |
| C3 | Smart-meter / Wi-Fi sensing of activity | Anomaly detection | Hardware-heavy; skip for now |

### D. Agents doing the work (AI-native services)
| # | Idea | AI angle | Demo wow |
|---|---|---|---|
| D1 | **Caregiver OS**: an agent books appointments, orders refills, reminds, coordinates siblings | Tool-using agent with phone and WhatsApp | The agent calls a clinic and books |
| D2 | **Doctor visit copilot**: prepares a 1-page summary before an OPD visit, records advice, follows up | Summarisation | 14 days → 1 page for the doctor |
| D3 | **Post-discharge 30-day calls**: hospitals pay to cut readmissions | Voice agent + protocols | Day 3 post-discharge call |
| D4 | **Insurance claim helper** for elders | Document AI | Lower wow |

### E. The network (B2B)
| # | Idea | AI angle | Demo wow |
|---|---|---|---|
| E1 | **Need-matched routing** (Round 1) | Optimisation | Map with "~37 min saved" |
| E2 | Critical-drug relay between hospitals (Round 1) | Forecasting | Anti-venom relay |
| E3 | ER pre-arrival brief (Round 1) | Summarisation | Allergy flag before arrival |
| E4 | Pharmacy refill marketplace | Prediction | Low wow |

### F. Wild cards
| # | Idea | Note |
|---|---|---|
| F1 | AI companion for dementia: reminiscence therapy with family photos | Powerful, clinically sensitive |
| F2 | "Grandparent mode" for WhatsApp: voice-only, AI reads messages aloud | Platform risk |
| F3 | Talking robot (YC mentions home robotics) | Too costly for us |
| F4 | Elder social club via AI-moderated group calls (loneliness) | Nice add-on |

---

## 4. Converge: scoring

1–5 each. **Pain** = how much it hurts the family. **AI** = AI is essential, not decorative. **Wow** = how strong the demo is. **Build** = 6 students can build it in ~10 weeks. **Startup** = market, willingness to pay, moat. **PS fit** = fits our course problem statement.

| Idea | Pain | AI | Wow | Build | Startup | PS fit | **Total** |
|---|---|---|---|---|---|---|---|
| **A1 AI grandchild daily call** | 5 | 5 | 5 | 4 | 5 | 5 | **29** |
| **B1 Scan the bag** | 4 | 5 | 5 | 5 | 4 | 5 | **28** |
| **A2 Voice biomarker drift** | 5 | 5 | 4 | 3 | 5 | 4 | **26** |
| E1–E3 Golden-hour network (Round 1) | 5 | 3 | 5 | 4 | 3 | 5 | 25 |
| D1 Caregiver OS agent | 4 | 5 | 4 | 3 | 5 | 4 | 25 |
| A3 Scam shield | 5 | 5 | 5 | 3 | 4 | 2 | 24 |
| B3 Selfie vitals | 3 | 4 | 5 | 3 | 3 | 4 | 22 |
| D3 Post-discharge calls | 4 | 4 | 3 | 4 | 5 | 3 | 23 |
| C1 Phone fall detection | 4 | 2 | 4 | 4 | 2 | 5 | 21 |

The top three are not competing ideas. They are **layers of one product.** The daily call is the front door, scanning the bag is onboarding, the drift detector is the brain, and the golden-hour network is what happens when things go wrong.

---

## 5. 🚀 The banger: Saathi, the AI grandchild that calls every day

> **One line:** Saathi phones your parents every morning, in their own language, on any phone. It checks their medicines, notices when something is changing, tells you what matters, and when it's serious, runs the emergency for you.

### YC-style answers

**What are you making?**
An AI voice companion for India's elderly that calls once or twice a day over a normal phone line. It speaks Tamil, Hindi and other Indian languages, remembers their life, confirms medicines, and listens for warning signs. Families get a daily brief. Emergencies trigger the golden-hour network: family, neighbour and ambulance together, the medical record sent ahead, and routing to a hospital that can actually treat them.

**Why now?**
1. **Voice AI in Indian languages** finally sounds natural and runs in real time (Indic speech models and multilingual LLMs, 2025–26).
2. **Cost collapse:** a few minutes of AI voice per day now costs rupees, not dollars.
3. **India's health rails exist:** ABHA IDs, ABDM consent and records, UPI recurring payments.
4. **The family is split:** children in Bengaluru, Dubai and the US, parents alone in Chennai and Madurai. The guilt is real and the willingness to pay is real.

**What's the insight others miss?**
- The elder must do **nothing new**. Answering a phone call is the only "UI" every 75-year-old already knows.
- **The buyer is not the user.** The child pays and the parent talks. Sell peace of mind to the child; design dignity for the parent.
- **Daily data beats emergency hardware.** Talking every day builds a baseline per person, so changes stand out.
- **The AI talks, but rules decide emergencies.** Red-flag words always escalate through deterministic rules. That makes it safe enough to deploy now.

**Who pays and how much?** *(Assumptions to test in the survey.)*

| Plan | Price | For |
|---|---|---|
| Saathi Daily | ₹499/month | 1 call a day, family brief, medicine tracking, SOS |
| Saathi Plus | ₹999/month | 2 calls a day, scan the bag, drift alerts, doctor booking agent, emergency network |
| Saathi Abroad | $19/month | Diaspora children paying for parents in India |
| B2B | per member | Hospitals (post-discharge calls), insurers (adherence), employers (parent-care benefit) |

**Unit economics (rough):** a 4-minute call/day ≈ 120 min/month. Telephony ≈ ₹0.5–1/min and AI speech + LLM ≈ ₹1–2/min, so **≈ ₹200–350/month cost** today, falling every year. Margin is ~40% at ₹499 and ~70% for Plus and Abroad. *Validate with real vendor quotes.*

**Market**
- 142M seniors in India today, 231M by 2036.
- Wedge: ~**5M urban families** where the child has moved away, plus the diaspora.
- 1% of that wedge at ₹6,000/yr ≈ **₹30 Cr ARR**. The diaspora and B2B make it much bigger.

**Moat (why we win long-term)**
1. **A longitudinal voice + health record per elder.** Months of daily calls is a dataset no one else has.
2. **Trust and habit.** She knows "Saathi's voice". Switching means losing a friend.
3. **Language depth.** Dialect, respect forms, festival and temple memory, local doctors.
4. **The emergency network.** Hospitals in the routing network, and the integration with 108 and ABDM.

**Competition**

| | Language | Works on keypad phone | Daily habit | Health signals | Emergency network | Price |
|---|---|---|---|---|---|---|
| Callie Care (US) | English | ✅ | ✅ | basic | ❌ | US$ |
| ElliQ | English | ❌ (device) | ✅ | basic | ❌ | $$$ |
| Emoha / Anvayaa (India) | Indian | ✅ (humans) | partial | humans | partial | high |
| Pill apps (Medisafe) | English | ❌ | reminders | ❌ | ❌ | free |
| 108 / 112 | Indian | ✅ | ❌ | ❌ | ✅ | free |
| **Saathi** | **Indian languages** | **✅** | **✅** | **✅ AI drift** | **✅** | **₹499** |

**Biggest risks and our answers**

| Risk | Answer |
|---|---|
| The AI says something medically wrong | Never diagnoses or prescribes. Fixed red-flag rules. Only questions for the doctor. A human nurse line for escalations (phase 2) |
| Elders find AI creepy | Introduced by the child as "your grandson's helper". The first call includes a family voice note. Test this in our interviews |
| False alarms annoy families | Graded alerts: info → nudge → call neighbour → emergency |
| Privacy | DPDP Act consent, family sees only summaries, opt-in recordings, data stays in India |
| Voice quality in Tamil | Pick the speech vendor by blind test with real Paatis (part of our validation) |

---

## 6. The demo (what makes judges remember us)

Built and live: **[Saathi Companion](https://claude.ai/artifact/WLgT3L2tz5EkeaB6ny45VP)** (`prototype/companion.html`) plus **[Golden Hour network](https://claude.ai/artifact/5uTQTy9iL4F7bDeJYHZAc3)** (`prototype/index.html`). On claude.ai, both use **Claude live**: the companion talks in Tamil, writes the family note, and reads the prescription photo. Offline, a scripted engine runs the same flow so the demo never dies.

**The 3-act demo (4 minutes)**
1. **"The call."** The phone rings with Saathi. Paati (a teammate, or real Paati on video) answers. Saathi asks about yesterday's temple visit in Tamil. Paati says she took her tablets, then that she slept badly. On the projector, Karthik's brief fills in live: tablets ✓, sleep poor (3rd time this week). Then: *"நெஞ்சு கனமா இருக்கு, வியர்க்குது"* ("my chest feels heavy, I'm sweating"). The screen turns red and the emergency starts. Click through to the Golden Hour view: ambulance routed to the cath-lab hospital, ER brief ready.
2. **"The bag."** Put a **real plastic bag of prescriptions** on the table. Show the photo. In about 20 seconds Saathi finds that **Glycomet = metformin, so she may be double-dosing**, and that **omeprazole from one doctor may weaken clopidogrel from another**. Two doctors, one dangerous combination, caught.
3. **"The drift."** "But the best emergency is the one that never happens." Show 14 days: speaking pace drops 17%, "breathless" mentions rise. Saathi flagged it on day 14 and the agent booked the cardiologist. *"We didn't wait for 2 AM."*

**Upgrade for the final demo (stretch, weeks 6–9):** a **real phone call**. Connect a voice-agent platform (Twilio or Exotel + speech-to-text + Claude + an Indian-language TTS) so a judge's own phone rings and Saathi speaks to them in Tamil. This is the single biggest "wow" available to us.

---

## 7. 10-week build plan

| Week | Product | Validation | Owner(s) |
|---|---|---|---|
| 1 | Freeze scope. Write Saathi's personality and the safety rules | 5 grandparent interviews (research kit) | All |
| 2 | Voice pipeline spike: phone number → STT → Claude → Tamil TTS | Blind-test 3 Tamil voices with 3 elders | Aakash, Kishore |
| 3 | Daily-call script + memory store (per-elder facts) | "Wizard of Oz" test: a teammate types Saathi's lines live over a real call | Kishore, Dhanisha |
| 4 | Family brief (WhatsApp message or web page) | 5 guardians react to sample briefs | Santhosh, Dhanisha |
| 5 | Scan the bag with real (name-masked) prescriptions | Check output against a pharmacist | Shrinavin |
| 6 | Red-flag rules + escalation ladder + link to the Golden Hour demo | Doctor reviews the rule list | Shaan, Aakash |
| 7 | Drift signals: speaking pace, keyword trends, adherence | 7-day pilot with 3 families | Kishore |
| 8 | Pilot: 10 families, 1 call a day for 7 days | Measure answer rate, call length, "would you miss it?" | All |
| 9 | Polish the demo, film Paati's real call (with consent) | Survey: willingness to pay | Dhanisha, Shaan |
| 10 | Pitch rehearsal ×5, backup video of everything | — | All |

**Success bar for the pilot (what we'll show judges):**
- Answer rate ≥ 70% over 7 days.
- ≥ 6 of 10 families say they'd be "very disappointed" if it stopped (the Sean Ellis test).
- At least one real thing caught (a missed medicine, a duplicate, a symptom).

---

## 8. How this fits the course's design thinking stages
- **Empathize:** the same interviews, plus "how often do you talk to your parents and what do you ask?"
- **Define:** the new POV. *Families need to know their parents are OK every day, not just in emergencies; elders need help that asks nothing new of them.*
- **Ideate:** this document (24 ideas → scoring → layered concept).
- **Prototype:** the two live demos + the Wizard-of-Oz phone call.
- **Test:** the 10-family pilot + voice blind test + pharmacist check.

The Round 1 golden-hour work isn't wasted. It becomes **Saathi's emergency mode**.
