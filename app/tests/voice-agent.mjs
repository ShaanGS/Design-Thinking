// Runs scenario tests against the real Saathi voice agent on ElevenLabs (its prompt, its LLM, its tools):
//   ELEVENLABS_API_KEY=... node tests/voice-agent.mjs [http://localhost:3000]
// Each test gives the agent a short call and checks which tool it calls (or must NOT call). The local server
// supplies the real starting facts for the call. Tests are deleted from ElevenLabs afterwards.
const BASE = process.argv[2] || "http://localhost:3000";
const AGENT = process.env.ELEVENLABS_AGENT_ID || "agent_3301m6qe86rjf4h87b0qkxnh15kz";
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("Set ELEVENLABS_API_KEY"); process.exit(1); }

async function el(path, body, method = body === undefined ? "GET" : "POST") {
  const r = await fetch(`https://api.elevenlabs.io${path}`, { method, headers: { "xi-api-key": KEY, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(d).slice(0, 600)}`);
  return d;
}
async function local(path, token, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body || {}) });
  return r.json();
}

// Real starting facts for an English and a Tamil call
const paati = (await local("/api/auth/demo", null, { persona: "elder" })).token;
const vars = {};
for (const lang of ["en", "ta"]) { const s = await local("/api/voice/calls", paati, { lang }); vars[lang] = s.dynamicVariables; await local(`/api/voice/calls/${s.callId}/end`, paati); }

// Tool name → id on this agent
const agent = await el(`/v1/convai/agents/${AGENT}`);
const toolId = {};
for (const id of agent.conversation_config.agent.prompt.tool_ids) toolId[(await el(`/v1/convai/tools/${id}`)).tool_config.name] = id;

let t = 0;
const turn = (role, message) => ({ role, message, time_in_call_secs: (t += 6) });
const call = (lang, ...lines) => { t = 0; return [turn("agent", vars[lang].greeting), ...lines.map(([r, m]) => turn(r, m))]; };
const expect = (tool, params = {}) => ({ referenced_tool: { id: toolId[tool], type: "client" }, parameters: Object.entries(params).map(([path, v]) => ({ path, eval: typeof v === "boolean" ? { type: "exact", expected_value: String(v) } : { type: "regex", pattern: v } })), verify_absence: false });
const never = (tool) => ({ referenced_tool: { id: toolId[tool], type: "client" }, parameters: [], verify_absence: true });

const SCENARIOS = [
  ["Chest pain (English) raises the emergency", "en", call("en", ["user", "My chest is paining badly and I am sweating."]), expect("raise_emergency", { what_happened: "^cardiac$" })],
  ["Chest pain (Tamil) raises the emergency", "ta", call("ta", ["user", "நெஞ்சு ரொம்ப வலிக்குது, வியர்க்குது."]), expect("raise_emergency", { what_happened: "^cardiac$" })],
  ["A fall raises the emergency", "en", call("en", ["user", "I slipped and fell in the bathroom. My head is hurting."]), expect("raise_emergency", { what_happened: "^fall$" })],
  ["Took tablets → logged", "en", call("en", ["user", "I'm fine."], ["agent", "That's good to hear, Paati. Have you taken your morning tablets?"], ["user", "Yes, I took them just now."]), expect("log_tablets", { elder_confirmed: true })],
  ["Took tablets (Tamil) → logged", "ta", call("ta", ["user", "நல்லா இருக்கேன்."], ["agent", "சந்தோஷம் பாட்டி. காலை மாத்திரை சாப்பிட்டீங்களா?"], ["user", "ஆமா, இப்போதான் சாப்பிட்டேன்."]), expect("log_tablets", { elder_confirmed: true })],
  ["Not taken yet → nothing logged", "en", call("en", ["user", "I'm okay."], ["agent", "Have you taken your morning tablets, Paati?"], ["user", "Not yet, I will take them after breakfast."]), never("log_tablets")],
  ["A plain hello doesn't start a lesson", "en", call("en", ["user", "Hello Saathi."]), never("get_lesson")],
  ["A plain hello isn't an emergency", "en", call("en", ["user", "Hello Saathi, I'm fine today."]), never("raise_emergency")],
  ["Message for Karthik", "en", call("en", ["user", "Please tell Karthik to call me tonight."]), expect("tell_family", { wants_call: true })],
  ["She asks to learn about scams", "en", call("en", ["user", "Can you teach me about scam calls?"]), expect("get_lesson", { topic: "^scam_calls$" })],
  ["Question about her papers", "en", call("en", ["user", "What did the heart doctor write about my sugar in the last report?"]), expect("ask_my_records")],
  ["Doesn't remember without asking", "en", call("en", ["user", "I went to the temple with Meena yesterday."]), never("remember_for_next_time")],
];

const ids = [];
try {
  for (const [name, lang, chat_history, tool_call_parameters] of SCENARIOS) {
    ids.push((await el("/v1/convai/agent-testing/create", { name: `Saathi · ${name}`, type: "tool", chat_history, dynamic_variables: vars[lang], tool_call_parameters })).id);
  }
  const inv = await el(`/v1/convai/agents/${AGENT}/run-tests`, { tests: ids.map((test_id) => ({ test_id })) });
  const invId = inv.id;
  let runs = [];
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    runs = (await el(`/v1/convai/test-invocations/${invId}`)).test_runs || [];
    if (runs.length && runs.every((r) => !["pending", "running"].includes(r.status))) break;
  }
  let pass = 0;
  for (const [i, [name]] of SCENARIOS.entries()) {
    const r = runs.find((x) => x.test_id === ids[i]) || {};
    const good = r.status === "passed";
    if (good) pass++;
    const why = r.condition_result?.rationale?.summary || r.condition_result?.rationale?.messages?.join(" ") || r.error || "";
    const said = (r.agent_responses || []).map((a) => a.message).filter(Boolean).join(" ").slice(0, 160);
    console.log(`${good ? "✓" : "✗"} ${name}${good ? "" : ` [${r.status}] ${String(why).slice(0, 300)}`}${said ? `\n    Saathi: ${said}` : ""}`);
  }
  console.log(`\n${pass}/${SCENARIOS.length} agent scenarios passed`);
  process.exitCode = pass === SCENARIOS.length ? 0 : 1;
} finally {
  for (const id of ids) await el(`/v1/convai/agent-testing/${id}`, undefined, "DELETE").catch(() => undefined);
}
