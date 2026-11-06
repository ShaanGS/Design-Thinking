# Crash Check: Design Thinking Dossier

**A Ride Nanba feature.** When a phone goes through a crash, Ride Nanba asks the rider "Are you okay?". If nobody answers, it tells the people they chose, with their location, for one hour. When the phone is only dropped, nobody is told anything.

This document follows the five stages: **Empathize → Define → Ideate → Prototype → Test**. Items marked 🔁 are hypotheses written from desk research. Replace each with what you hear in interviews (scripts in [`02-research-kit.md`](02-research-kit.md)). That swap is the part examiners look for.

Companion documents: [`03-detection-model.md`](03-detection-model.md) (how the phone tells a drop from a crash) and [`04-pitch-and-demo.md`](04-pitch-and-demo.md) (slides and live demo run-sheet).

---

## 0. The problem we started with, and the one we ended with

**Starting brief (ours):** a phone that detects an accident. It should not raise an alarm when the phone simply falls from your hand. It should ask if you are okay for a few seconds, and if you do not answer, call a guardian, send your location and do the other emergency steps, while respecting the rider's privacy.

That brief hides three separate problems:

1. **Telling a crash from a drop.** A single g-force threshold fails. A phone dropped from 1.2 m onto tiles can spike past 6 g, which is more than many real crashes register on a phone inside a pocket or bag. What separates them is everything around the spike: speed before, tumbling, stopping dead, and whether someone picks the phone up.
2. **The minutes after.** A rider thrown off a scooter on GST Road at 7 PM may be conscious and fine, conscious and hurt, or unconscious. The design has to work for all three without crying wolf.
3. **Privacy.** The obvious "safety" design is live location sharing with family at all times. Students we expect to interview 🔁 already refuse that from parents. If the feature feels like tracking, it gets switched off, and then it saves nobody.

### Our point of view

> **College students and young workers in Chennai who ride two-wheelers every day are most at risk on the road, and the people who love them find out last.** Phones already carry the sensors to notice a crash, but a feature that cries wolf gets switched off, and a feature that tracks you gets refused.
>
> **How might we get help to a rider within a minute of a crash, without ever alarming their family over a dropped phone, and without letting anyone see where they are on an ordinary day?**

### Why this problem (evidence)

| Signal | Data point | Source |
|---|---|---|
| Two-wheelers dominate road deaths | In 2022, India recorded **1,68,491 road deaths**; two-wheeler riders were the largest group, about **44.5% (~74,900)**. | MoRTH, *Road Accidents in India 2022* |
| Tamil Nadu is among the worst-hit states | Tamil Nadu recorded the **highest number of road accidents** of any state in 2022 (~64,000) and among the highest deaths. | MoRTH, *Road Accidents in India 2022* |
| The first hour matters | India's own law defines the "golden hour" as the hour after a traumatic injury when prompt care is most likely to prevent death (Motor Vehicles Act, section 2(12A), added 2019). | Motor Vehicles (Amendment) Act 2019 |
| Bystanders hesitate | India passed Good Samaritan protections (2016 guidelines, section 134A of the MV Act 2019) because people feared police and hospital trouble for helping. | MoRTH notification 2015/16; MV (Amendment) Act 2019 |
| Crash detection exists, but not for this rider | Apple's Crash Detection needs an iPhone 14 or later and is built around **car** crashes, using a 256 g accelerometer. Google's Pixel car crash detection covers Pixel phones in a limited set of countries. Most riders here carry mid-range Android phones. | Apple newsroom, Sept 2022; Pixel help centre |
| False alarms are the known failure | After launch, Apple's Crash Detection made news for calling emergency services from roller coasters and ski slopes. | News reports, Oct 2022 to Feb 2023 |

> ⚠️ Open each source and check the exact figure before it goes on a slide. If a judge asks "where is this from?", you need the page.

---

## 1. EMPATHIZE

### 1.1 Who we need to talk to

```
                 ┌──────────────────────────────┐
                 │ RIDER (student or worker,    │  ← primary user
                 │ scooter or bike, daily)      │
                 └──────────────┬───────────────┘
      ┌──────────────┬──────────┼──────────────┬─────────────────┐
  Guardian        Friend /    Bystander       108 EMT         Bike-taxi or
  (parent at      classmate   (first person   (the crew        delivery rider
  home; gets      (nearby,    at the scene)   that arrives)    (rides 8+ hours
  the alert)      can reach                                    a day: the
                  fastest)                                     heaviest user)
```

Interview at least: **6 riders** (3 students, 3 working), **4 parents**, **2 bike-taxi or delivery riders**, **1 108 EMT or ER nurse**, and run a **survey of 50+ riders**. Scripts in `02-research-kit.md`.

### 1.2 Personas 🔁 (composites; replace with your interviewees)

The people are the same ones Ride Nanba already designs for, so the feature fits the product.

**Priya, 19, SRM KTR, rides a scooter: the Rider**
- Rides 21 km on GST Road between Potheri and Tambaram, then takes the train. Leaves campus around 6 PM, in heavy traffic.
- Phone: a mid-range Android, in a mount or her jacket pocket. Drops it "about twice a week" 🔁.
- Quote 🔁: *"If my phone fell and it called my mother, she would call me twenty times and then not let me ride for a month."*
- Quote 🔁: *"Live location? No. I'm nineteen."*
- Fear: being stopped from riding; being watched.

**Amma (Lakshmi), 47, Anna Nagar: the Guardian**
- Worries every evening until Priya messages "reached". Does not use apps beyond WhatsApp and YouTube.
- Quote 🔁: *"I don't need to see where she is. I need to know if something happens. And I need to know where to go."*
- Needs: a loud alert that cannot be missed, a place, and one thing to do.

**Murugan, 31, bike-taxi captain: the Heavy Rider**
- 9 hours a day on a bike, phone on the handlebar mount, potholes all day.
- Quote 🔁: *"My phone falls off the mount every week. If this thing panics every time, I will delete it."*
- He is the stress test: high exposure, many bumps, many drops.

**Ravi, 41, 108 EMT: the Responder**
- Quote 🔁: *"Half the time the caller doesn't know the location. 'Near the bridge.' Which bridge?"*
- Needs: an exact location, and the few facts that change treatment (blood group, allergies, blood thinners).

### 1.3 Empathy map: Priya 🔁

| Says | Thinks |
|---|---|
| "I'm careful." "Don't track me." "My phone falls all the time." | "Amma will panic." "If I'm knocked out, who would even know?" |
| **Does** | **Feels** |
| Turns off location sharing her parents set up. Silences notifications while riding. Messages "reached" only when reminded. | Independent, slightly invincible, guilty about her mother's worry, uneasy on GST Road after dark. |

### 1.4 Empathy map: Amma 🔁

| Says | Thinks |
|---|---|
| "Message me when you reach." "Ride slowly." | "Every horn I hear at 7 PM, I think of her." "If something happened I would hear from a stranger." |
| **Does** | **Feels** |
| Calls if the "reached" message is late. Asks friends' mothers. | Anxious every evening, helpless at a distance, does not want to fight with her daughter about tracking. |

### 1.5 Today: a crash at 6:42 PM (illustrative 🔁)

| Time | What happens | Pain point |
|---|---|---|
| 6:42 | Priya's scooter is clipped by a car near Vandalur and she is thrown | Her phone is 3 m away on the road |
| 6:43 | She is conscious but dazed; a crowd gathers | Nobody knows who she is or whom to call |
| 6:49 | A bystander calls 108: "GST Road, near the zoo" | Vague location; the bystander hesitates to get involved |
| 7:05 | Ambulance finds her | 23 minutes from crash to crew |
| 7:20 | Hospital asks her blood group and allergies | She is unsure; nobody else knows |
| 7:45 | Amma calls Priya's phone; a stranger answers | **The guardian finds out last, an hour late**, from a stranger |

The insight: **every piece of information needed already exists on Priya's phone** (that it crashed, where, who to call, her blood group). It just never leaves the phone at the right moment, or leaves it at the wrong moments.

### 1.6 Key insights 🔁 (confirm in interviews)

1. **A false alarm costs more than one bad evening.** One unnecessary call to Amma, and the rider switches the feature off forever. The detector has to be cautious, and the rider must always get the first word.
2. **"Tracking" is the word that kills it.** Riders accept "tell my family if I crash" and refuse "my family can see where I am". The difference is when location leaves the phone.
3. **Guardians want an action, not a dashboard.** A loud alert, a place, "Call her", "I'm going".
4. **The phone often isn't with the body.** It flies off the mount or out of a pocket. The design cannot assume the rider can reach the screen. Silence must be treated as an answer.
5. **Responders need five facts, not a profile.** Location, time, speed before the crash, blood group, allergies.

---

## 2. DEFINE

### 2.1 Point-of-view statements

- **Priya** needs help to reach her **within minutes of a crash, even if she cannot touch her phone**, because she may be knocked out or her phone may be on the road, metres away.
- **Priya** also needs the feature to **stay silent when she only drops her phone**, because one false alarm to her mother would make her switch it off.
- **Amma** needs to **know immediately and know exactly where to go**, because finding out late, from a stranger, is her worst fear.
- **Murugan** needs it to **tell potholes and a phone falling off the mount from a crash**, because his day is full of both.
- **Ravi** needs **an exact location and a few medical facts**, because "near the bridge" costs him minutes.

### 2.2 How Might We

1. HMW tell a crash from a drop, using only sensors that every phone already has?
2. HMW let the rider cancel a false alarm with one tap, while still getting help to a rider who cannot tap?
3. HMW share a rider's location **only when it is needed, only with people they chose, and only for as long as needed**?
4. HMW give a guardian one clear thing to do, not a map to stare at?
5. HMW let a stranger at the scene help, without seeing anything private?
6. HMW explain every decision the phone makes, so riders trust it enough to leave it on?

### 2.3 Design principles

1. **Ask first, always.** The phone never alerts anyone until it has asked the rider and waited. "Get help now" skips the wait.
2. **Silence is an answer.** No reply in 30 seconds means help is needed.
3. **Nothing leaves the phone by default.** Motion and speed are processed on the phone and kept for 12 seconds. Location is sent only after a crash with no answer.
4. **Shared for an hour, then gone.** Family see the location for one hour, or until the rider taps "I'm safe".
5. **Explain every decision.** The rider can open "How Crash Check decides" and see the points behind every check.
6. **Look like Ride Nanba.** The same white page, grey tiles, black buttons. Red appears only for a crash. No new visual language for a safety feature.

---

## 3. IDEATE

### 3.1 Crazy 8s: ideas, scored

| # | Idea | Impact | Feasibility | Privacy | Kept? |
|---|---|---|---|---|---|
| 1 | Phone-only crash detection (accelerometer, gyroscope, GPS speed) | High | **High** | High | ✅ core |
| 2 | "Are you okay?" countdown, then alert | High | **High** | High | ✅ core |
| 3 | Alert chosen contacts with a 1-hour location link | High | High | **High** | ✅ core |
| 4 | Explain the score on screen ("How Crash Check decides") | Med | High | High | ✅ trust |
| 5 | Medical ID on the lock screen for helpers | Med | High | Med (rider picks fields) | ✅ |
| 6 | Only listen during Ride Nanba trips | Med | High | **High** | ✅ |
| 7 | Quiet check for a fall where the rider got up | Med | High | High | ✅ |
| 8 | Auto-dial 108 with no human in the loop | High | Med | Med | ⏸ later, after false-alarm data |
| 9 | Always-on live location for family | Med | High | **Low** | ❌ rejected (the thing riders refuse) |
| 10 | Microphone listens for crash sounds | Med | Med | **Low** | ❌ rejected (always-on mic) |
| 11 | Helmet with an impact sensor | High | Low (cost) | High | ⏸ partner idea |
| 12 | Nearby Ride Nanba riders as first responders | High | Med | Med | ⏸ v2 |
| 13 | SMS fallback with no internet | High | Med | High | ⏸ v2 |
| 14 | Route to a hospital with a trauma bay (link to Saathi's routing) | High | Med | High | ⏸ v2 |
| 15 | Insurance claim filed automatically | Low | Med | **Low** | ❌ rejected (data to insurers) |

### 3.2 Concept

Ideas 1 to 7 form one flow: **notice, ask, tell, explain.** Every competitor does one piece: Apple and Google detect car crashes on their own phones, ride apps like Uber offer an SOS button and RideCheck for long stops, scooter makers add crash alerts to their own vehicles. None of them is built for a student on a ₹15,000 Android phone, riding any two-wheeler, whose family must not be able to track her.

### 3.3 The flow

| Step | What happens | Who sees what |
|---|---|---|
| **Notice** | A hit above 2.5 g, or a fall longer than 0.15 s, starts a 6-second check. The phone scores speed before, the hit, tumbling, stopping dead, and lying still or being picked up. | Nobody. All on the phone. |
| **Ask** (score 60+) | "Are you okay?" fills the screen, with an alarm, vibration and voice, and a 30-second ring counting down. "I'm okay" ends it. "Get help now" skips the wait. | Only the rider. |
| **Quiet check** (35 to 59) | "That looked like a fall." "I'm fine" or "Tell Amma and Arjun". Nothing is sent unless she asks. | Only the rider. |
| **Tell** (no answer) | Amma and Arjun get an alert that rings even on silent: "Priya may have crashed", the place, speed before, whether she has moved since. "Call Priya", "Call 108", "I'm going". | Chosen people, for one hour. |
| **Help at the scene** | Medical ID on the lock screen: blood group, allergies, who to call. | Whoever picks up the phone. Nothing else. |
| **Stop** | "I'm safe, stop sharing" ends the share, tells family she is safe, and logs it. | Everyone is told sharing stopped. |

### 3.4 Tomorrow: the same crash at 6:42 PM

| Time | With Crash Check |
|---|---|
| 6:42:00 | Crash. The phone notes 34 km/h before, a 7.5 g hit, 700° of tumbling. |
| 6:42:06 | Speed 0, phone still. Score 100: "Are you okay?" at full volume. |
| 6:42:36 | No answer. Amma's and Arjun's phones ring: "Priya may have crashed. GST Road, near Vandalur." |
| 6:42:50 | Arjun, 4 km away, taps "I'm going". Amma calls 108 and reads out the exact place. |
| 6:43 | A bystander picks up Priya's phone: Medical ID shows O positive, penicillin allergy, "Call Amma". |
| 6:55 | Ambulance arrives at an exact location. **Amma knew within a minute, not an hour.** |

---

## 4. PROTOTYPE

### 4.1 What we built

A working prototype, [`prototype/index.html`](../prototype/index.html), built in Ride Nanba's own design system (`ride-nanba/docs/DESIGN.md`): the same tokens, art, rows, sheets, switches and "On your way" screen.

- **Two phones on one screen** for the projector: Priya's (riding) and Amma's (at home). They also work on two real phones.
- **The real detection model** ([`model/crash-model.js`](../model/crash-model.js)) runs live in the page.
- **Real sensors:** open the page from its own web address on a phone and turn on "Use this phone's motion sensor". Drop it on a pillow: "Looks like a dropped phone. Nothing sent." Throw it onto a sofa with "Riding at 32 km/h" on and leave it: "Are you okay?"
- **Presenter controls** to act out a drop, a pothole, a crash, a phone falling off the mount, and a slow skid.
- **How Crash Check decides:** a live g-force chart and the points behind the last check.
- **Crash Check settings:** who gets the alert, the wait, Medical ID, "What leaves your phone", and a log of every share.

### 4.2 Fidelity by stage

- **Lo-fi:** paper "Are you okay?" screens, tested by tapping while a teammate shakes your shoulder and counts down out loud. Photograph it.
- **Mid-fi:** the screens above, inside Ride Nanba's look.
- **Hi-fi:** the live prototype with real sensors.

### 4.3 What we changed while building 🔁 (confirm against real test sessions)

| Version | Problem found | Change |
|---|---|---|
| v0 → v1 | Any hit above 3 g asked "Are you okay?". Dropping the phone on tiles set it off every time. | Scoring with five signals. A hit alone scores at most 30 of the 60 needed. |
| v1 → v2 | A phone that fell off the mount while the rider rode on looked exactly like a crash. | Kept it as a crash (it can't be told apart from motion alone) but made "I'm okay" the biggest button. Documented as a known case. |
| v2 → v3 | A rider who skidded and got up was asked the full "Are you okay?" | Added the quiet check for scores 35 to 59, when the phone is picked up after the hit. |
| v3 → v4 | Testers asked "can my mother see me now?" | Added "You cannot see where she is" to the guardian's home screen, and "What leaves your phone" to settings. |

---

## 5. TEST

### 5.1 Riskiest assumptions first

| # | Assumption | How we test it | Pass |
|---|---|---|---|
| A1 | Drops do not raise alerts | 50 drops: 0.5 to 1.8 m, onto tiles, road, bed, carpet; held, pocket, mount | 0 "Are you okay?" from drops while not moving |
| A2 | Riding does not raise alerts | 20 hours of riding on GST Road and campus roads (potholes, speed breakers, braking) | ≤ 1 false "Are you okay?" per 10 riding hours |
| A3 | Crashes are noticed | A phone strapped to a padded dummy on a pushed scooter at 10 to 15 km/h onto grass (never a real rider) | ≥ 9 of 10 noticed |
| A4 | A shaken rider can say "I'm okay" | Testers do 20 jumping jacks, then the screen fires | ≥ 4 of 5 answer within 10 s |
| A5 | Riders understand what is shared | After using it, ask "When can your mother see where you are?" | ≥ 4 of 5 say "only after a crash I don't answer" |
| A6 | Guardians know what to do | Show Amma's alert to 4 parents; ask "what do you do now?" | ≥ 3 of 4 name a concrete action within 10 s |
| A7 | Riders would leave it on | Survey (n ≥ 50) after a 2-minute demo | ≥ 70% "would leave it on" |

### 5.2 Ethics and safety in testing

- Never stage a crash with a person on the vehicle. Dummies, grass, walking speed.
- Consent before every interview and every recording (script in the research kit).
- Use test contacts, not real parents, for alert tests, unless the parent agreed in advance.

### 5.3 Metrics once live

- **False alarms per 1,000 trip-hours** (target under 1). This is the metric that decides whether riders keep it on.
- **Time from crash to first guardian alert** (target under 45 s with a 30 s wait).
- **Share of alerts cancelled by the rider**, and in how many seconds.
- **Share of riders who keep Crash Check on after 30 days.**

---

## 6. Competitors and the gap

| Product | What it does | The gap for Priya |
|---|---|---|
| Apple Crash Detection | Detects severe car crashes on iPhone 14 and later; calls emergency services after a countdown | Car-focused; needs an expensive phone; calls emergency services, not her chosen family |
| Google Pixel car crash detection | Detects car crashes on Pixel phones | Pixel only, limited countries, car-focused |
| Uber RideCheck and safety toolkit | Notices long unexpected stops on a trip; SOS button | Only inside a cab trip; a person must press SOS |
| Scooter makers' crash or fall alerts | Built into some electric scooters | Only that brand; does nothing for a rider on any other vehicle |
| Life360 and family trackers | Live location, some crash detection while driving | Always-on tracking: exactly what young riders refuse |

> ⚠️ Check each product's current features and Indian availability before the pitch; these change often.

**Our gap:** any two-wheeler, any Android phone, built for bumps and drops, and family see nothing until a crash goes unanswered.

---

## 7. Feasibility

- **Sensors:** every Android phone has an accelerometer; nearly all mid-range ones have a gyroscope. Typical phone accelerometers read up to 8 g or 16 g. That is enough, because our model needs "above 2.5 g" and the pattern around it, not the true peak of the impact.
- **On the phone:** the model is about 250 lines of plain code, scoring once per event. No machine learning server, no data upload.
- **Background running:** in the real app this runs as an Android foreground service during a Ride Nanba trip (with the ongoing notification Android requires), and stops when the trip ends.
- **Alerts that ring on silent:** the guardian side needs the Ride Nanba app with a high-priority notification channel, with an SMS fallback for guardians without the app.
- **Next step for the model:** replace synthetic signatures with labelled phone recordings (drops, rides, dummy crashes), then tune the points. If the data grows large, train a small on-device classifier and keep the points as its explanation.

## 8. Business fit

- **Free inside Ride Nanba.** Safety should never sit behind a paywall; it is a reason to install Ride Nanba and to keep it open on every trip.
- **Fleets:** bike-taxi and delivery companies pay per rider per month for crash alerts to their own safety desk, with the rider's consent and the same one-hour rule.
- **Never sold to insurers.** Stated plainly in the product, because it is what makes riders trust it.

## 9. Roadmap

| When | What |
|---|---|
| Now | Working prototype, model with 7 signatures, design-thinking documents |
| Weeks 1 to 4 | Interviews and the survey; 50-drop test; 20 riding hours of recordings |
| Weeks 5 to 8 | Tune the model on real recordings; Android foreground service inside Ride Nanba |
| Months 3 to 6 | Pilot with 100 SRM riders and their families; SMS fallback; nearby responders |
