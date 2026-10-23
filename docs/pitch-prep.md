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
