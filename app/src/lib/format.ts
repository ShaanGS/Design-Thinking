export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const isTamil = (s: string) => /[஀-௿]/.test(s);
export function greeting(lang: "ta" | "en" = "ta") {
  const h = new Date().getHours();
  if (lang === "en") return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return h < 12 ? "காலை வணக்கம்" : h < 17 ? "மதிய வணக்கம்" : "மாலை வணக்கம்";
}
