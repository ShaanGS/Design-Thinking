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
