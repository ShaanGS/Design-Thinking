# Crash Check: pitch and live demo

About 10 minutes plus questions. The wow moment is slide 6: a real phone dropped on stage that does nothing, then thrown, which asks "Are you okay?", then Amma's phone rings on the projector.

## Slides

| # | Slide | On screen | The one line to land |
|---|---|---|---|
| 1 | Crash Check | Priya's "Are you okay?" screen. "A Ride Nanba feature." | When a phone crashes, Ride Nanba asks first. When it is only dropped, nobody is told. |
| 2 | 6:42 PM | The "today" timeline from the dossier, §1.5 | The information to save her was on her phone. It never left it. |
| 3 | The numbers | 1,68,491 road deaths in 2022; ~44.5% on two-wheelers; Tamil Nadu among the worst states | The people most at risk ride two-wheelers. *(verify figures)* |
| 4 | We listened | Interview counts `[N]`, three insights: a false alarm costs trust; "tracking" kills it; guardians want an action | Riders said: don't track me, and don't panic my mother. |
| 5 | How might we | Priya, Amma, Murugan, Ravi; the HMW | Help within a minute, no false alarms, no tracking. |
| 6 | **Live demo** | The prototype, two phones | See the run-sheet below. |
| 7 | How it decides | The five signals and the score table | A drop while standing can never reach 60. |
| 8 | Privacy, by construction | "What leaves your phone"; Amma's "You cannot see where she is" | Location leaves the phone only after a crash she does not answer, for one hour. |
| 9 | Tested, and what's next | The test table (A1 to A7) with results; the roadmap | 0 false alarms in N drops; next, 20 riding hours of real recordings. |
| 10 | Questions | QR to the prototype | Drop your own phone. |

## Live demo run-sheet

**You need:** a laptop on the projector with the prototype open wide (both phones side by side); one phone with the prototype open from its own web address (https) so its motion sensor works; a pillow and a sofa cushion; volume up.

**Before:** on the phone, open Presenter controls, tap "Use this phone's motion sensor", allow motion. Turn on "Short countdown for the stage" (10 s). Check the Crash Check row shows a live reading near 1.0 g.

**On stage (about 3 minutes):**

1. "Priya is stopped at a signal." Presenter controls → **Stopped at a signal**. Hold the phone up and **drop it on the pillow**. Wait. The screen says *"Looks like a dropped phone. Nothing sent."* Amma's phone on the projector stays quiet. "That is the hard part."
2. "Now she's riding at 32 km/h." Tap **Riding at 32 km/h**. **Throw the phone onto the cushion with a spin and step away.** The Crash Check row says *"Something happened. Checking."*, then **"Are you okay?"** fills the screen with an alarm and a countdown.
3. Don't touch it. At zero, **Amma's phone on the projector rings**: "Priya may have crashed", the map, 32 km/h then stopped.
4. On the projector, tap **I'm going** on Amma's phone. Priya's phone shows "Amma: On her way".
5. Tap **I'm safe, stop sharing** on Priya's phone. Amma's phone: "Priya is safe. Her location is no longer shared with you."
6. Open **How Crash Check decides** to show the points behind the throw.

**The phone and the projector are separate devices.** In the claude.ai artifact, open the same artifact on both while signed in to the same account and they talk live. From a plain web address, the two phones on the projector are one page; use the projector's Presenter controls ("Crash at 34 km/h") to show the alert reaching Amma.

**If something fails:**
- *The phone's sensor won't turn on:* use Presenter controls → **Drop from my hand**, then **Crash at 34 km/h**. They play recorded motion through the same model.
- *No sound:* tap anywhere on the page once first; browsers only play sound after a tap.

## Questions you will get

**What if I'm fine and the phone just fell off the mount?** It asks. You tap "I'm okay". That case looks exactly like a crash to any phone, so we never alert without asking first.

**Isn't this tracking?** No. Location stays on the phone. It's sent only after a crash you don't answer, only to people you chose who accepted, for one hour or until you tap "I'm safe". Your family's app says plainly that they cannot see where you are.

**Why not call 108 automatically?** Not until we've measured false alarms on real riders. A wrong 108 call costs an ambulance. Today the rider, family and helpers each get one tap to call 108.

**Why not use AI?** The model is five measurable signals and points anyone can read on screen. Riders trust what they can check. With enough real recordings we can train a small on-phone classifier, and keep the points as its explanation.

**What if the phone is broken in the crash?** Then nothing sends. v2 adds the guardian side noticing a trip that stopped mid-road with no "reached".

**What about no internet?** v2 sends the alert as an SMS.
