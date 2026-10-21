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
