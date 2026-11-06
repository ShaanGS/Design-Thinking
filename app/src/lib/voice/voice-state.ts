// Voice-call state, ported from Callvi. The screen only shows states the voice SDK (or the browser, for the
// microphone) actually reports; nothing is simulated.

export type VoicePhase = "idle" | "requesting_mic" | "connecting" | "listening" | "agent_speaking" | "elder_speaking" | "thinking" | "ended" | "error";
export type VoiceErrorKind = "mic_denied" | "mic_missing" | "mic_busy" | "auth" | "rate_limited" | "network" | "not_configured" | "unsupported" | "generic";

export interface TranscriptLine { id: number; role: "elder" | "saathi"; text: string }

export interface VoiceState {
  phase: VoicePhase;
  error: VoiceErrorKind | null;
  muted: boolean;
  transcript: TranscriptLine[];
  nextLineId: number;
  /** When the provider first reported a live connection (epoch ms). Drives the call timer. */
  connectedAt: number | null;
  /** Real input/output amplitude from the SDK, 0..1. */
  level: number;
}

export const initialVoiceState: VoiceState = { phase: "idle", error: null, muted: false, transcript: [], nextLineId: 1, connectedAt: null, level: 0 };

export type VoiceAction =
  | { type: "start_requested" }
  | { type: "mic_granted" }
  | { type: "sdk_state"; state: "listening" | "speaking" | "thinking"; at?: number }
  | { type: "elder_speech"; speaking: boolean }
  | { type: "transcript"; role: TranscriptLine["role"]; text: string }
  | { type: "transcript_corrected"; original: string; corrected: string }
  | { type: "muted"; muted: boolean }
  | { type: "audio_level"; level: number }
  | { type: "ended" }
  | { type: "failed"; error: VoiceErrorKind }
  | { type: "reset" };

const MAX_LINES = 200;
const LIVE: VoicePhase[] = ["listening", "agent_speaking", "elder_speaking", "thinking"];
export const isActivePhase = (p: VoicePhase) => p === "connecting" || LIVE.includes(p);

export function voiceReducer(state: VoiceState, action: VoiceAction): VoiceState {
  switch (action.type) {
    case "start_requested": return { ...initialVoiceState, phase: "requesting_mic" };
    case "mic_granted": return { ...state, phase: "connecting" };
    case "sdk_state": {
      if (state.phase === "ended" || state.phase === "error") return state;
      const connectedAt = state.connectedAt ?? action.at ?? null;
      if (action.state === "speaking") return { ...state, phase: "agent_speaking", connectedAt };
      if (action.state === "thinking") return { ...state, phase: "thinking", connectedAt };
      return { ...state, phase: state.phase === "elder_speaking" ? "elder_speaking" : "listening", connectedAt };
    }
    case "elder_speech":
      if (state.phase !== "listening" && state.phase !== "elder_speaking") return state;
      return { ...state, phase: action.speaking ? "elder_speaking" : "listening" };
    case "transcript": {
      const text = action.text.trim();
      if (!text) return state;
      return { ...state, transcript: [...state.transcript, { id: state.nextLineId, role: action.role, text }].slice(-MAX_LINES), nextLineId: state.nextLineId + 1 };
    }
    case "transcript_corrected": {
      const i = state.transcript.findLastIndex((l) => l.role === "saathi" && l.text === action.original.trim());
      if (i < 0) return state;
      const c = action.corrected.trim();
      return { ...state, transcript: c ? state.transcript.map((l, j) => (j === i ? { ...l, text: c } : l)) : state.transcript.filter((_, j) => j !== i) };
    }
    case "muted": return { ...state, muted: action.muted };
    case "audio_level": return { ...state, level: Math.max(0, Math.min(1, action.level)) };
    case "ended": return state.phase === "error" ? state : { ...state, phase: "ended", level: 0 };
    case "failed": return { ...state, phase: "error", error: action.error, level: 0 };
    case "reset": return initialVoiceState;
  }
}

/** Map a browser or SDK error to an elder-facing category. */
export function classifyVoiceError(error: unknown): VoiceErrorKind {
  if (typeof error === "object" && error !== null) {
    const name = "name" in error && typeof error.name === "string" ? error.name : "";
    const status = "status" in error && typeof error.status === "number" ? error.status : null;
    if (name === "NotAllowedError" || name === "SecurityError") return "mic_denied";
    if (name === "NotFoundError" || name === "OverconstrainedError") return "mic_missing";
    if (name === "NotReadableError" || name === "AbortError") return "mic_busy";
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "rate_limited";
    if (status === 0 || (status && status >= 500) || name === "TypeError" || name === "NetworkError") return "network";
  }
  return "generic";
}

export const VOICE_ERRORS: Record<VoiceErrorKind, string> = {
  mic_denied: "Saathi needs the microphone. Allow it in the browser, then try again.",
  mic_missing: "No microphone was found on this phone.",
  mic_busy: "Another app is using the microphone. Close it and try again.",
  auth: "Saathi couldn't start the call. Please try again.",
  rate_limited: "Too many calls just now. Wait a minute and try again.",
  network: "The call dropped. Check the internet and try again.",
  not_configured: "Saathi's voice isn't set up yet.",
  unsupported: "This browser can't make voice calls. Try Chrome.",
  generic: "Something went wrong with the call. Please try again.",
};

export function formatCallDuration(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
