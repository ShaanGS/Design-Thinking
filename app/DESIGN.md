# Saathi design system

## The idea: signage-grade

Saathi's most important user is 72, has cataracts and reads Tamil first. So the interface borrows from the most legible design in India: **road signs and auto-rickshaws**, black on turmeric yellow, readable at a glance by anyone. Around that sits the language of the things families already handle: **prescriptions written in blue-black ink** and **medicine strips in blister foil**.

- **Black ink + turmeric yellow** carry the brand and every primary action.
- **Prescription blue** is for links and secondary interaction in the family and hospital apps.
- **Red means an emergency.** Nothing else in the product is red: not errors, not badges, not "low stock".
- **Green means taken or safe.** Amber means "needs attention" (missed dose, low stock).
- **Blister strips** show doses: every dose is a cavity with a pill in it, and taking it pops the pill out. A day's progress *is* the strip emptying.

## Tokens (Tailwind names → values)

| Token | Value | Use |
|---|---|---|
| `paper` | `#F2F3F5` | App background (cool grey, never cream) |
| `paper-2` | `#E8EAEE` | Pressed states, inset wells |
| `white` | `#FFFFFF` | Surfaces |
| `ink` | `#14172B` | Text and primary buttons (blue-black ink) |
| `ink-2` | `#4A4F66` | Secondary text |
| `ink-3` | `#858AA0` | Tertiary text, placeholders |
| `line` | `#E1E3E9` | Hairlines, borders |
| `brand` | `#F5B800` | Turmeric: primary emphasis, the elder's main actions |
| `brand-50/100` | `#FFF8DD` / `#FFEDA8` | Turmeric tints |
| `brand-700` | `#6B4F00` | Text on turmeric tints |
| `teal` | `#13804F` | Taken / safe / delivered (green) |
| `sos` | `#E0262F` | **Emergency only** |
| `warn` | `#B25E00` | Missed, low stock, needs attention |
| `info` | `#2F49D1` | Prescription blue: links, selected tabs, interactive accents |

**Type:** `font-display` = **Anek Latin / Anek Tamil** (Ek Type, an Indian foundry; used semi-condensed for headings and big numbers), `font-sans` = **Hind Madurai** (Indian Type Foundry; Latin + Tamil in one family), `font-mono` = IBM Plex Mono, only for codes, phone numbers and clock times.

Scale (family/hospital): 13 / 15 / 17 / 20 / 26 / 34 / 48. Elder app: everything at least 20 px, primary labels 28–40 px.

**Shape:** radius 10 px for surfaces and buttons, 6 px for small chips, 14 px only for the elder's large buttons. **No shadows** except on modals and the floating SOS slab; separate things with hairlines and whitespace.

## Rules

1. **Answer the user's question in the headline.** The family home opens with a sentence ("Paati is fine. 4 of 6 doses taken. Last heard from at 9:12.") rather than a dashboard of tiles. The ER opens with the next patient arriving.
2. **Summary, then detail.** One headline number or sentence per section; lists below it.
3. **Lists over card grids.** Rows separated by hairlines. A card is used only when something must be lifted out (the active emergency, a modal).
4. **Sentence-case labels.** Uppercase eyebrow labels are banned except one: the "EMERGENCY" label on the SOS takeover.
5. **Icons sit next to text, never inside tinted squares or circles.** Icons are 18–20 px, stroke 1.75, ink-2 colour. Decorative icons are removed.
6. **Badges only for state that changes** (Taken, Missed, Low, En route). At most one badge per row.
7. **Numbers are set in `font-display` with tabular figures.** Units are smaller and ink-3.
8. **Red is reserved.** Validation errors use ink + an underline message; low stock is amber.
9. **No gradients, no glows, no glossy buttons, no emoji, no sparkles icons**, no "AI" hype labels. The AI is described by what it did ("Read 6 papers"), not by what it is.
10. **Motion is functional**: the blister pill popping, the ambulance moving, a new feed row sliding in. Nothing else animates. Respect `prefers-reduced-motion`.

## The elder app

- White background, black text, turmeric for the one thing to do next.
- The **SOS slab** is always at the bottom of the screen (thumb reach): full width, red, 88 px tall, labelled "உதவி · Hold for help". Holding fills it left to right over 2 s. It is never a circle and never glossy.
- Home is one column: time and greeting → "Tablets now" (a blister strip plus one big turmeric "I took them" button) → a short list of big rows (Talk to Saathi, Check pulse, My card, Call family) with chevrons.
- The emergency screen is a calm full-screen **ink-blue** page: large white text, the ETA in turmeric, a checklist of what's happening. It looks like a departure board, not an alarm.
- Tamil is set first at full size; English sits under it at about 60% size in ink-2.

## The family app

- Left rail on desktop (logo, Paati's name, nav, connection), bottom tab bar on mobile. No tinted elder "card" in the rail.
- Home: the headline sentence → today's blister strips by time of day → activity (a timeline list with time on the left) → vitals (one clean chart, its usual range shaded) → next visit, as a row.
- The emergency view leads with the ETA and the hospital name in large type, then the map, then "Why this hospital", set as a ranked table.
- The Vault reads like a medical file: papers as a strip of real thumbnails, findings as a numbered list ("1. Kidney function has fallen by a third"), trends as small multiples sharing one style.

## The hospital console

- Dense information design, light theme, like a good departures board. The incoming queue is a table-like list ordered by ETA, with the patient's danger flags in-line (ALLERGY: Penicillin · ON CLOPIDOGREL · eGFR 42).
- The capacity board is a real table with tabular figures; below-minimum stock is amber with a "Low" label.

## Copy

Plain and specific. "Paati took her morning tablets at 8:14", not "Medication adherence event logged". Buttons say exactly what happens ("Page cath lab team", "I'm on my way").
