/** @type {import('tailwindcss').Config} */
// Tokens follow DESIGN.md ("signage-grade": blue-black ink, turmeric, prescription blue; red only for emergencies).
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#14172B", 2: "#4A4F66", 3: "#858AA0" },
        paper: { DEFAULT: "#F2F3F5", 2: "#E8EAEE" },
        line: { DEFAULT: "#E1E3E9", 2: "#CDD1DA" },
        brand: { DEFAULT: "#F5B800", 50: "#FFF8DD", 100: "#FFEDA8", 600: "#D9A200", 700: "#6B4F00" },
        teal: { DEFAULT: "#13804F", 50: "#E6F4EC", 100: "#C9E8D6", 600: "#0E6A41", 700: "#0A4F31" },
        sos: { DEFAULT: "#E0262F", 50: "#FDECEC", 100: "#FAD4D5", 600: "#C01C24" },
        warn: { DEFAULT: "#B25E00", 50: "#FFF3E0" },
        info: { DEFAULT: "#2F49D1", 50: "#EBEEFC", 600: "#2238AE" },
        night: { DEFAULT: "#101433", 2: "#1B2150", 3: "#2A3170" },
      },
      fontFamily: {
        display: ['"Anek Latin Variable"', '"Anek Tamil Variable"', '"Hind Madurai"', "system-ui", "sans-serif"],
        sans: ['"Hind Madurai"', '"Anek Tamil Variable"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "Menlo", "monospace"],
        tamil: ['"Anek Tamil Variable"', '"Hind Madurai"', "system-ui", "sans-serif"],
      },
      borderRadius: { DEFAULT: "6px", lg: "8px", xl: "10px", "2xl": "14px", "3xl": "18px" },
      boxShadow: {
        card: "none",
        lift: "0 1px 2px rgba(20,23,43,.06), 0 12px 32px -12px rgba(20,23,43,.28)",
      },
      keyframes: {
        breathe: { "0%,100%": { transform: "scale(.88)" }, "50%": { transform: "scale(1)" } },
        slidein: { from: { transform: "translateY(-6px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" }, "100%": { transform: "scale(0)", opacity: "0" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".35" } },
        pulsering: { "0%": { boxShadow: "0 0 0 0 rgba(224,38,47,.45)" }, "100%": { boxShadow: "0 0 0 14px rgba(224,38,47,0)" } },
      },
      animation: { breathe: "breathe 6s ease-in-out infinite", slidein: "slidein .3s ease-out", pop: "pop .45s ease-in forwards", blink: "blink 1.6s ease-in-out infinite", pulsering: "pulsering 1.6s infinite" },
    },
  },
  plugins: [],
};
