// Paati's call with Saathi (Callvi's voice engine inside Saathi).
//
// "elevenlabs": real voice through the ElevenLabs agent; its tools run here and are forwarded to the Saathi
//   server with her own session, so the agent can only do what she could do herself.
// "device": a fallback when that isn't available: the phone's own speech recognition and speech, with
//   replies from Saathi's companion (/api/chat). Same call screen, honestly labelled.
// Either way, every line goes to the server, which relays it to the family and runs the fixed safety rules.
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Conversation } from "@elevenlabs/client";
import { api } from "../api";
import { connectSocket } from "../socket";
import type { Errand } from "../../../shared/types";
import { canListen, listen, stopSpeaking } from "../speech";
import { classifyVoiceError, initialVoiceState, isActivePhase, voiceReducer, type VoiceErrorKind } from "./voice-state";

export type CallLang = "en" | "ta";
interface StartReply {
  callId: string; mode: "elevenlabs" | "device"; lang: CallLang;
  agentId: string | null; signedUrl: string | null; toolNames: string[]; dynamicVariables: Record<string, string>;
}
type ToolResult = { ok: boolean; saved: boolean; data?: unknown; guidance?: string; error?: string };

/** Speak one line with the phone's own voice; resolves when it finishes. */
function sayOnDevice(text: string, lang: CallLang): Promise<void> {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis; if (!synth) return resolve();
      const voices = synth.getVoices();
      const v = lang === "ta" ? voices.find((x) => /^ta/i.test(x.lang)) : voices.find((x) => /en-IN/i.test(x.lang)) || voices.find((x) => /^en/i.test(x.lang));
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v || null; u.lang = v?.lang || (lang === "ta" ? "ta-IN" : "en-IN"); u.rate = 0.92;
      u.onend = () => resolve(); u.onerror = () => resolve();
      synth.cancel(); synth.speak(u);
      setTimeout(resolve, Math.min(20000, 1500 + text.length * 90)); // some browsers never fire onend
    } catch { resolve(); }
  });
}

export function useSaathiCall(opts: { onEmergency: () => void; onLogged: () => void }) {
  const [state, dispatch] = useReducer(voiceReducer, initialVoiceState);
  const [mode, setMode] = useState<"elevenlabs" | "device" | null>(null);
  const convo = useRef<Conversation | null>(null);
  const callId = useRef<string | null>(null);
  const gen = useRef(0);
  const live = useRef(false);
  const connected = useRef(false);
  const muted = useRef(false);
  const stopListening = useRef<() => void>(() => {});
  const resumeDevice = useRef<() => void>(() => {});
  const greetingRef = useRef("");
  const told = useRef(new Set<string>()); // errand updates the agent already knows ("id:status")
  const pendingNews = useRef<string[]>([]);
  const speaking = useRef(false);
  const cb = useRef(opts); cb.current = opts;

  /** Relay a line to the server (family chat + safety rules). */
  const relay = useCallback(async (role: "elder" | "saathi", text: string) => {
    const id = callId.current; if (!id || !text.trim()) return;
    try {
      const r = await api.post<{ redFlag: boolean; emergency: unknown }>(`/api/voice/calls/${id}/lines`, { role, text });
      if (r.redFlag) cb.current.onEmergency();
    } catch { /* the call carries on even if one line couldn't be relayed */ }
  }, []);

  const endOnServer = useCallback(() => {
    const id = callId.current; callId.current = null;
    if (id) void api.post(`/api/voice/calls/${id}/end`).catch(() => undefined);
  }, []);

  const finish = useCallback(() => {
    if (!live.current) return;
    live.current = false;
    convo.current = null;
    stopListening.current(); stopSpeaking();
    endOnServer();
    dispatch({ type: "ended" });
  }, [endOnServer]);

  const fail = useCallback((error: VoiceErrorKind) => {
    ++gen.current;
    live.current = false;
    const c = convo.current; convo.current = null;
    stopListening.current(); stopSpeaking();
    endOnServer();
    dispatch({ type: "failed", error });
    if (c) void c.endSession().catch(() => undefined);
  }, [endOnServer]);

  /* ---------------- The phone's own voice (fallback) */
  const deviceLoop = useCallback(async (attempt: number, lang: CallLang, greeting: string) => {
    const still = lang === "ta" ? "நான் இங்கேயே இருக்கேன். சொல்லுங்க." : "I'm still here. Take your time.";
    let silences = 0;
    const hear = () => {
      if (attempt !== gen.current || !live.current) return;
      dispatch({ type: "sdk_state", state: "listening" });
      if (muted.current) return; // unmuting listens again
      let got = false;
      stopListening.current = listen(lang === "ta" ? "ta-IN" : "en-IN", async (heard) => {
        got = true; silences = 0;
        if (attempt !== gen.current) return;
        dispatch({ type: "transcript", role: "elder", text: heard });
        dispatch({ type: "sdk_state", state: "thinking" });
        try {
          const r = await api.post<{ reply: { text: string }; action: string; emergency: unknown }>("/api/chat", { text: heard });
          if (r.emergency) cb.current.onEmergency();
          if (r.action === "log_meds") cb.current.onLogged();
          void say(r.reply.text);
        } catch { void say(lang === "ta" ? "மன்னிக்கவும், எனக்கு கேட்கல. இன்னொரு தடவை சொல்லுங்க." : "Sorry, I couldn't hear that properly. Could you say it again?"); }
      }, (err) => {
        if (got || attempt !== gen.current || !live.current) return;
        if (err === "Microphone permission was denied") { fail("mic_denied"); return; }
        silences += 1;
        setTimeout(() => { if (silences % 3 === 0) void say(still); else hear(); }, 300);
      });
    };
    const say = async (saathi: string) => {
      if (attempt !== gen.current) return;
      dispatch({ type: "transcript", role: "saathi", text: saathi });
      dispatch({ type: "sdk_state", state: "speaking", at: Date.now() });
      await sayOnDevice(saathi, lang);
      hear();
    };
    resumeDevice.current = hear;
    await say(greeting);
  }, [fail]);

  /* ---------------- Start */
  const start = useCallback(async (lang: CallLang, o: { textOnly?: boolean } = {}) => {
    if (live.current) return;
    const attempt = ++gen.current;
    dispatch({ type: "start_requested" });
    connected.current = false;
    // If the voice service can't be reached before the call connects (a venue network blocking it, say),
    // carry on with the phone's own voice rather than dropping her call. Runs at most once per call.
    let fellBack = false;
    const fallBack = () => {
      if (fellBack || attempt !== gen.current) return;
      fellBack = true;
      const c = convo.current; convo.current = null;
      if (c) void c.endSession().catch(() => undefined);
      if (o.textOnly || !canListen() || !live.current) { fail("network"); return; }
      console.warn("[saathi] voice service unreachable, using the phone's voice instead");
      setMode("device");
      void deviceLoop(attempt, lang, greetingRef.current);
    };
    try {
      if (!o.textOnly) {
        if (!navigator.mediaDevices?.getUserMedia) { dispatch({ type: "failed", error: "unsupported" }); return; }
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach((t) => t.stop());
        if (attempt !== gen.current) return;
      }
      dispatch({ type: "mic_granted" });
      const s = await api.post<StartReply>("/api/voice/calls", { lang });
      if (attempt !== gen.current) { void api.post(`/api/voice/calls/${s.callId}/end`).catch(() => undefined); return; }
      callId.current = s.callId; live.current = true; greetingRef.current = s.dynamicVariables.greeting;

      if (s.mode === "device" || (!s.agentId && !s.signedUrl)) {
        if (!canListen()) { fail("unsupported"); return; }
        setMode("device");
        void deviceLoop(attempt, lang, s.dynamicVariables.greeting);
        return;
      }

      setMode("elevenlabs");
      const sdk = await import("@elevenlabs/client");
      const clientTools: Record<string, (p: unknown) => Promise<string>> = {};
      for (const name of s.toolNames) {
        clientTools[name] = async (params) => {
          if (attempt !== gen.current || !callId.current) return JSON.stringify({ ok: false, saved: false, error: "The call has ended." });
          try {
            const r = await api.post<ToolResult>(`/api/voice/calls/${callId.current}/tools/${name}`, (params && typeof params === "object") ? params : {});
            if (r.ok && name === "raise_emergency") cb.current.onEmergency();
            for (const d of ([] as { errand_id?: string; status?: string }[]).concat((r.data as never) ?? [])) if (d?.errand_id) told.current.add(`${d.errand_id}:${d.status}`);
            if (r.ok && r.saved && name === "log_tablets") cb.current.onLogged();
            return JSON.stringify(r);
          } catch { return JSON.stringify({ ok: false, saved: false, error: "This action failed. Do not say it was done." }); }
        };
      }
      const common = {
        connectionType: "websocket" as const,
        dynamicVariables: s.dynamicVariables,
        overrides: { agent: { language: lang }, ...(o.textOnly ? { conversation: { textOnly: true } } : {}) },
        clientTools,
        onConnect: () => { if (attempt === gen.current) { connected.current = true; dispatch({ type: "sdk_state", state: "listening", at: Date.now() }); } },
        onModeChange: ({ mode: m }: { mode: string }) => {
          if (attempt !== gen.current) return;
          speaking.current = m === "speaking";
          dispatch({ type: "sdk_state", state: m === "speaking" ? "speaking" : "listening", at: Date.now() });
          if (!speaking.current) flushNews();
        },
        onMessage: (m: { message: string; role?: string; source?: string }) => {
          if (attempt !== gen.current || m.message.startsWith("[Saathi update]")) return;
          const role = (m.role ?? m.source) === "user" ? "elder" : "saathi";
          dispatch({ type: "transcript", role, text: m.message });
          void relay(role, m.message);
        },
        onAgentResponseCorrection: (c: { original_agent_response: string; corrected_agent_response: string }) => {
          if (attempt === gen.current) dispatch({ type: "transcript_corrected", original: c.original_agent_response, corrected: c.corrected_agent_response });
        },
        onInterruption: () => { if (attempt === gen.current) dispatch({ type: "sdk_state", state: "listening" }); },
        onVadScore: ({ vadScore }: { vadScore: number }) => { if (attempt === gen.current) dispatch({ type: "elder_speech", speaking: vadScore > 0.4 }); },
        onDisconnect: (d: { reason: string }) => { if (attempt !== gen.current) return; if (d.reason !== "error") finish(); else if (connected.current) fail("network"); else fallBack(); },
        onError: () => { if (attempt !== gen.current) return; if (connected.current) fail("network"); else fallBack(); },
      };
      const c = s.signedUrl
        ? await sdk.Conversation.startSession({ ...common, signedUrl: s.signedUrl, textOnly: !!o.textOnly })
        : await sdk.Conversation.startSession({ ...common, agentId: s.agentId!, textOnly: !!o.textOnly });
      if (attempt !== gen.current || fellBack) { await c.endSession().catch(() => undefined); return; }
      convo.current = c;
      if (typeof window !== "undefined") (window as unknown as { __saathiCall?: unknown }).__saathiCall = { send: (t: string) => c.sendUserMessage(t), id: s.callId };
    } catch (e) {
      if (attempt !== gen.current) return;
      if (fellBack) return;
      const kind = classifyVoiceError(e);
      if (live.current && !connected.current && (kind === "network" || kind === "generic")) { fallBack(); return; }
      fail(kind);
    }
  }, [deviceLoop, fail, finish, relay]);

  /** Errand news reaches the agent as a clearly marked message, sent when Saathi isn't mid-sentence. */
  const flushNews = useCallback(() => {
    const c = convo.current; if (!c || speaking.current) return;
    const next = pendingNews.current.shift(); if (next) c.sendUserMessage(next);
  }, []);
  useEffect(() => {
    const s = connectSocket();
    const onErrand = (e: Errand) => {
      if (!live.current || !convo.current) return;
      if (!["needs_choice", "awaiting_approval", "done", "declined", "failed"].includes(e.status)) return;
      const key = `${e.id}:${e.status}`;
      if (told.current.has(key)) return;
      told.current.add(key);
      const detail = e.status === "needs_choice" ? `It needs her choice: ${e.question?.prompt} Options: ${e.question?.options.join("; ")}. errand_id ${e.id}.`
        : e.status === "awaiting_approval" ? `Waiting for Karthik to approve ₹${e.approval?.amount} on his phone.`
        : `${e.status === "done" ? "Done" : e.status === "declined" ? "The family declined it" : "It couldn't be done"}: ${e.result ?? ""}`;
      pendingNews.current.push(`[Saathi update] ${e.title}. ${detail}`);
      flushNews();
    };
    s.on("errand", onErrand);
    return () => { s.off("errand", onErrand); };
  }, [flushNews]);

  const stop = useCallback(async () => {
    ++gen.current;
    const c = convo.current; convo.current = null;
    if (c) await c.endSession().catch(() => undefined);
    if (live.current) finish(); else dispatch({ type: "reset" });
  }, [finish]);

  const toggleMute = useCallback(() => {
    muted.current = !muted.current;
    if (convo.current) convo.current.setMicMuted(muted.current);
    else if (muted.current) stopListening.current();
    else resumeDevice.current();
    dispatch({ type: "muted", muted: muted.current });
  }, []);

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  // Real audio level for the orb (ElevenLabs only).
  useEffect(() => {
    if (!isActivePhase(state.phase) || mode !== "elevenlabs") return;
    const t = setInterval(() => {
      const c = convo.current; if (!c || c.type !== "voice") return;
      const lv = state.phase === "agent_speaking" ? c.getOutputVolume() : c.getInputVolume();
      dispatch({ type: "audio_level", level: muted.current && state.phase !== "agent_speaking" ? 0 : lv * 3 });
    }, 70);
    return () => clearInterval(t);
  }, [state.phase, mode]);

  // Leaving the screen ends the call.
  useEffect(() => () => { ++gen.current; const c = convo.current; convo.current = null; if (c) void c.endSession().catch(() => undefined); stopListening.current(); stopSpeaking(); if (live.current) { live.current = false; endOnServer(); } }, [endOnServer]);

  return { state, mode, start, stop, toggleMute, reset };
}
