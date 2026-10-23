// Browser text-to-speech and speech-to-text, in Indian English.
export function speak(textTa: string, textEn?: string) {
  try {
    const synth = window.speechSynthesis; if (!synth) return false;
    const voices = synth.getVoices();
    const en = voices.find((v) => /en-IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
    const u = new SpeechSynthesisUtterance(textEn || textTa);
    u.voice = en || null; u.lang = en ? en.lang : "en-IN"; u.rate = 0.95;
    synth.cancel(); synth.speak(u);
    return true;
  } catch { return false; }
}
export const stopSpeaking = () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } };

type SR = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null };
export const canListen = () => !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
export function listen(lang: string, onText: (t: string) => void, onEnd: (err?: string) => void) {
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) { onEnd("Voice input isn't supported in this browser"); return () => {}; }
  const r: SR = new Ctor();
  r.lang = lang; r.interimResults = false; r.maxAlternatives = 1;
  let err: string | undefined;
  r.onresult = (e) => onText(e.results[0][0].transcript);
  r.onerror = (e) => { err = e.error === "not-allowed" ? "Microphone permission was denied" : "Didn't catch that, try again"; };
  r.onend = () => onEnd(err);
  try { r.start(); } catch { onEnd("Couldn't start the microphone"); }
  return () => { try { r.stop(); } catch { /* ignore */ } };
}
