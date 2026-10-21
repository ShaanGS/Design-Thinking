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
