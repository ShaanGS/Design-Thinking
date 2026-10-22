/** @type {import('tailwindcss').Config} */
// Tokens follow DESIGN.md ("soft clay": periwinkle violet, pastel tiles, 3D clay art; red only for emergencies).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#17142E", 2: "#5D5A78", 3: "#9C99B4" },
        canvas: { DEFAULT: "#F3F2FA", 2: "#EAE8F6" },
        violet: { 50: "#F3F1FF", 100: "#E7E3FF", 200: "#D2CBFF", 300: "#B3A8FF", 400: "#9384FF", DEFAULT: "#6F5CF6", 500: "#6F5CF6", 600: "#5B47E6", 700: "#4936C4", 800: "#33268F", 900: "#1E175A" },
        mint: { DEFAULT: "#D4F5E2", ink: "#0F7A47" },
        peach: { DEFAULT: "#FFE3D1", ink: "#B54A12" },
        butter: { DEFAULT: "#FFF1BD", ink: "#7E6200" },
        sky: { DEFAULT: "#DDEBFF", ink: "#2257C4" },
        rose: { DEFAULT: "#FFDDE4", ink: "#C3264A" },
        lilac: { DEFAULT: "#ECE7FF", ink: "#5B47E6" },
        sos: { DEFAULT: "#FF3B4D", 50: "#FFEEF0", 100: "#FFD5DA", 600: "#E5263A", 700: "#B8152A" },
        // Older names, remapped to the new palette so every screen stays consistent
        paper: { DEFAULT: "#F3F2FA", 2: "#EAE8F6" },
        line: { DEFAULT: "#ECEAF5", 2: "#DCD9EA" },
        brand: { DEFAULT: "#6F5CF6", 50: "#F3F1FF", 100: "#E7E3FF", 600: "#5B47E6", 700: "#4936C4" },
        teal: { DEFAULT: "#12A05C", 50: "#E3F8EC", 100: "#C5F0D8", 600: "#0F8A4F", 700: "#0B6B3D" },
        warn: { DEFAULT: "#C2600B", 50: "#FFF1E3" },
        info: { DEFAULT: "#5B47E6", 50: "#F3F1FF", 600: "#4936C4" },
        night: { DEFAULT: "#17142E", 2: "#231F45", 3: "#332D60" },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans Variable"', '"Anek Tamil Variable"', "system-ui", "sans-serif"],
        sans: ['"Plus Jakarta Sans Variable"', '"Anek Tamil Variable"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "Menlo", "monospace"],
        tamil: ['"Anek Tamil Variable"', '"Plus Jakarta Sans Variable"', "system-ui", "sans-serif"],
      },
      borderRadius: { DEFAULT: "10px", lg: "12px", xl: "16px", "2xl": "20px", "3xl": "26px", "4xl": "32px" },
      boxShadow: {
        card: "0 1px 2px rgba(23,20,46,.04), 0 8px 24px -12px rgba(73,54,196,.18)",
        lift: "0 2px 6px rgba(23,20,46,.06), 0 24px 48px -16px rgba(73,54,196,.35)",
        pill: "0 10px 30px -8px rgba(23,20,46,.28)",
        sos: "0 18px 40px -10px rgba(255,59,77,.55)",
        glow: "0 0 0 6px rgba(111,92,246,.12)",
      },
      keyframes: {
        breathe: { "0%,100%": { transform: "scale(.9)" }, "50%": { transform: "scale(1)" } },
        slidein: { from: { transform: "translateY(10px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" }, "100%": { transform: "scale(0)", opacity: "0" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
        pulsering: { "0%": { boxShadow: "0 0 0 0 rgba(255,59,77,.5)" }, "100%": { boxShadow: "0 0 0 22px rgba(255,59,77,0)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        ripple: { "0%": { transform: "scale(.8)", opacity: ".6" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
      },
      animation: {
        breathe: "breathe 6s ease-in-out infinite", slidein: "slidein .35s cubic-bezier(.2,.8,.2,1)", pop: "pop .45s ease-in forwards",
        blink: "blink 1.6s ease-in-out infinite", pulsering: "pulsering 1.6s infinite", float: "float 4s ease-in-out infinite", ripple: "ripple 2s ease-out infinite",
      },
    },
  },
  plugins: [],
};
