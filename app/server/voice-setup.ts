// Creates or updates Saathi's own ElevenLabs voice agent: `npm run voice:setup`.
// It only ever looks up the agent named AGENT_NAME and only edits tools already attached to that agent,
// so other agents in the same ElevenLabs account (such as Callvi's) are never touched.
//
// The agent is public (no key needed in the browser) but ElevenLabs only accepts conversations from the
// sites in ALLOWED_HOSTS. Set ELEVENLABS_API_KEY in the environment to run this script.
import { VOICE_TOOLS, voiceInstructions } from "./voice.ts";

const AGENT_NAME = "Saathi Elder Companion";
const ALLOWED_HOSTS = ["saathi-app-eta.vercel.app", "localhost", "127.0.0.1"];
const KEY = process.env.ELEVENLABS_API_KEY;
const LLM = process.env.SAATHI_VOICE_LLM || "claude-sonnet-5-5";
const VOICE_ID = process.env.SAATHI_VOICE_ID || "wLIQpmGi7jT7aiEmDsE3"; // Janani: natural Tamil and English

if (!KEY) { console.error("Set ELEVENLABS_API_KEY first."); process.exit(1); }

async function api<T = any>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
  const r = await fetch(`https://api.elevenlabs.io${path}`, {
    method, headers: { "xi-api-key": KEY!, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`ElevenLabs ${method} ${path}: HTTP ${r.status}: ${JSON.stringify(data).slice(0, 2000)}`);
  return data as T;
}

const toolConfig = (t: (typeof VOICE_TOOLS)[number]) => ({
  type: "client", name: t.name, description: t.description,
  parameters: {
    type: "object", required: t.parameters.required,
    properties: Object.fromEntries(Object.entries(t.parameters.properties).map(([k, v]) => [k, { ...v, description: String(v.description || k) }])),
  },
  expects_response: true, response_timeout_secs: 20, execution_mode: "immediate", tool_error_handling_mode: "passthrough",
});

const agents = (await api<{ agents: { agent_id: string; name: string }[] }>("/v1/convai/agents?page_size=100")).agents;
const existingId = agents.find((a) => a.name === AGENT_NAME)?.agent_id ?? null;
const attached: string[] = existingId ? (await api(`/v1/convai/agents/${existingId}`)).conversation_config?.agent?.prompt?.tool_ids ?? [] : [];
const attachedByName = new Map<string, string>();
for (const id of attached) {
  const t = await api(`/v1/convai/tools/${id}`).catch(() => null);
  if (t?.tool_config?.name) attachedByName.set(t.tool_config.name, id);
}

const toolIds: string[] = [];
for (const t of VOICE_TOOLS) {
  const id = attachedByName.get(t.name);
  if (id) { await api(`/v1/convai/tools/${id}`, { tool_config: toolConfig(t) }, "PATCH"); toolIds.push(id); }
  else toolIds.push((await api<{ id: string }>("/v1/convai/tools", { tool_config: toolConfig(t) })).id);
}

const definition = {
  name: AGENT_NAME,
  conversation_config: {
    agent: {
      first_message: "{{greeting}}", language: "en",
      dynamic_variables: { dynamic_variable_placeholders: { elder_name: "Paati", elder_language: "English", greeting: "Hello! I'm Saathi, your AI companion. How are you feeling today?", call_context: "{}" } },
      prompt: {
        prompt: voiceInstructions(), llm: LLM, reasoning_effort: "none", temperature: 0.3, max_tokens: 350,
        enable_parallel_tool_calls: false, tool_ids: toolIds,
        built_in_tools: { end_call: { type: "system", name: "end_call", params: { system_tool_type: "end_call" } } },
      },
    },
    tts: { voice_id: VOICE_ID, model_id: "eleven_v4_turbo", agent_output_audio_format: "pcm_24000", speed: 0.92, stability: 0.5, expressive_mode: true },
    turn: { turn_timeout: 20, turn_eagerness: "patient", speculative_turn: true },
    asr: { provider: "scribe_realtime", user_input_audio_format: "pcm_16000" },
    conversation: { max_duration_seconds: 900, client_events: ["audio", "interruption", "user_transcript", "agent_response", "agent_response_correction", "client_tool_call", "vad_score"] },
  },
  platform_settings: {
    auth: { enable_auth: false, allowlist: ALLOWED_HOSTS.map((hostname) => ({ hostname })) },
    overrides: { conversation_config_override: { agent: { language: true }, conversation: { text_only: true } } },
    privacy: { record_voice: false, retention_days: 0, delete_audio: true, delete_transcript_and_pii: true },
  },
};

const res = existingId ? await api(`/v1/convai/agents/${existingId}`, definition, "PATCH") : await api("/v1/convai/agents/create", definition);
const agentId: string = res.agent_id ?? existingId;
const check = await api(`/v1/convai/agents/${agentId}`);
const got = check.conversation_config?.agent?.prompt?.tool_ids?.length ?? 0;
if (got !== VOICE_TOOLS.length) throw new Error(`Expected ${VOICE_TOOLS.length} tools on the agent, found ${got}`);
console.log(`${existingId ? "Updated" : "Created"} ${AGENT_NAME}: ${agentId} (${got} tools, llm ${check.conversation_config.agent.prompt.llm}, allowed: ${ALLOWED_HOSTS.join(", ")})`);
console.log(`Set ELEVENLABS_AGENT_ID=${agentId} (or keep it as the default in server/voice.ts).`);
