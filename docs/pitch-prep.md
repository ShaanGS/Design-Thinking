# Saathi pitch prep (15+ minute review)

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
6. **Saathi on the phone (about 90 s, the new opener for the demo):** open `/stage` (Paati's side shows her **ordinary phone**). In Karthik's app tap **Ring Paati**; Paati's phone rings; tap **Accept**. Saathi greets her in Tamil. Say: "என் gas தீர்ந்து போச்சு, book பண்ணுங்க" (or in English "Please book my gas cylinder"). Point at Karthik's app: Saathi's browser opens the gas agency site and books it live; Saathi tells her the booking number. Then: "Order my tablets, they're running out." The pharmacy cart fills; Karthik's app shows **Approve ₹…**; tap **Approve and pay**; Saathi tells her it's ordered. Use headphones or a quiet corner; speak after Saathi finishes. Say clearly: "Paati has no app. She just talks."
7. Optional (30 s): open the CPR coach from Karthik's emergency screen and let it count a few pushes.
8. Afterwards: reset the demo again so the next run starts clean.

**If something fails**
- *Internet drops:* move straight to slides 9 and 10 (real screenshots of the same moment) and narrate them.
- *The app is slow to wake:* talk through slide 7 for another 30 seconds; it will load.
- *The voice call can't connect* (venue Wi-Fi blocking it): the call switches to the phone's own voice by itself (the screen says "Phone's voice (backup)"). Errands still work from Karthik's app: **New errand** → Book a gas cylinder, and the live browser runs the same way.
- *Plan B on the laptop, no internet:* `cd app && npm ci && npm run build && npm start`, then open `http://localhost:3000/stage`.

## Before you present

- [ ] Slide 4: replace every `[N]` with your real interview counts (and say the same numbers in the script).
- [ ] Slide 3: check the 93% (NORIN-STEMI, PMC10308105) and 15 h (MACE registry) figures against the original papers.
- [ ] Slide 12: confirm each "v0 → v1" change against what you actually observed.
- [ ] Share the deck from its Share menu with the team and faculty.
- [ ] If the app moves to Render, update the URL and QR on slides 7 and 14.
- [ ] Two full timed rehearsals, including the demo and one failure drill (pull the Wi-Fi mid-demo).

## What's real and what's simulated (say this if asked; never overclaim)

- **Real:** the voice call with Saathi (live AI voice in Tamil or English; its actions really update the family app), the errand browser (a real Chromium operating real web pages, live in Karthik's app, with his approval before any payment), the three apps, live sync between phones, road routing on OpenStreetMap (OSRM), the ranking of hospitals by what they can treat, the records vault and its answers, the QR card, the bystander page, the CPR coach, the security checks.
- **Simulated:** the phone line (her "ordinary phone" is a web page standing in for a real number), the four partner businesses (fictional clinic, pharmacy, gas agency and electricity board, with no real bookings or money), the ambulance's movement (sped up 20×), the hospital network (five demo hospitals around Tambaram with sample beds and stock), the 45-minute transfer estimate, the sample medical papers. AI runs in demo mode unless an API key is set.
- **Not built yet:** 108 integration, ABDM records, the pendant, the missed-call SOS, real hospital onboarding, a real phone number (Twilio) so any keypad phone works, and Saathi calling her on a schedule.

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

**17. Is this a medical AI?**
No. Saathi is an assistant for senior citizens on an ordinary phone call: it books, orders, pays (with the family's approval), looks things up and passes messages. It never gives medical advice. The one health job it has is to raise the alarm: if she says chest pain or that she fell, fixed rules start the emergency at once.

**18. Is the voice call real? What does it run on?**
Yes, live. It is the call engine from our other project, Callvi: an ElevenLabs voice agent with a natural Tamil–English voice. We tested several language models on 16 scripted calls in English and Tamil and picked the one that was most decisive and never read its reasoning aloud. The errands themselves are done by Claude operating a real browser. The voice agent can't touch the database: it can only use fourteen narrow actions, each checked by our server with her sign-in. Audio isn't recorded.

**19. How do the errands work? Isn't it risky to let an AI use a browser?**
Each errand runs in a fresh, isolated browser on our server. It only fills in her saved details, never passwords or OTPs. It stops to ask her anything that is her choice, and **every payment waits for Karthik to approve the exact amount** on his phone. The family watches every step live. In the demo the shops are fictional partner sites, so nothing real is bought.

**20. What if the AI misses an emergency on the call?**
It doesn't have to catch it alone. Every line she says also goes through fixed safety rules on our server; words like chest pain, breathless or fell start the emergency even if the AI does nothing.

**21. Why a call and not an app?**
Because an elder already knows how to answer a phone. In our interviews the screen was the barrier. Next is a real phone number, so even a ₹1,000 keypad phone works.
