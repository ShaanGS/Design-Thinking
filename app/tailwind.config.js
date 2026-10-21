/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#13221E", 2: "#4B5D57", 3: "#7D8F89" },
        paper: { DEFAULT: "#F3F6F4", 2: "#E9EFEC" },
        line: "#DAE3DF",
        brand: { DEFAULT: "#D98E04", 50: "#FEF7E6", 100: "#FCEFD3", 600: "#B57503", 700: "#7A4E00" },
        teal: { DEFAULT: "#0F6E5A", 50: "#E6F4EF", 100: "#CDEADF", 600: "#0B5747", 700: "#073F34" },
        sos: { DEFAULT: "#D62839", 50: "#FDECEE", 100: "#FBE2E5", 600: "#B01E2E" },
        warn: { DEFAULT: "#B4600A", 50: "#FDF3E4" },
        info: { DEFAULT: "#1E5E8A", 50: "#E8F1F8" },
      },
      fontFamily: {
        display: ['"Baloo Thambi 2"', '"Noto Sans Tamil"', "ui-rounded", "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', '"Noto Sans Tamil"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "Menlo", "monospace"],
        tamil: ['"Noto Sans Tamil"', '"Baloo Thambi 2"', "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(19,34,30,.06), 0 8px 24px -12px rgba(19,34,30,.18)" },
      keyframes: {
        pulsering: { "0%": { boxShadow: "0 0 0 0 rgba(214,40,57,.55)" }, "100%": { boxShadow: "0 0 0 22px rgba(214,40,57,0)" } },
        breathe: { "0%,100%": { transform: "scale(.85)" }, "50%": { transform: "scale(1)" } },
        slidein: { from: { transform: "translateY(-8px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
      },
      animation: { pulsering: "pulsering 1.4s infinite", breathe: "breathe 6s ease-in-out infinite", slidein: "slidein .35s ease-out" },
    },
  },
  plugins: [],
};
