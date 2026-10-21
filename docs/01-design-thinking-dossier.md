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
