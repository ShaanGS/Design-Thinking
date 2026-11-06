// End-to-end checks for Saathi's voice call API (the Callvi call engine): node tests/voice.mjs http://localhost:3000
const BASE = process.argv[2] || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); } };

async function call(method, path, token, body) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const signIn = async (persona) => (await call("POST", "/api/auth/demo", null, { persona })).body.token;

console.log(`Voice call checks against ${BASE}`);
await call("POST", "/api/demo/reset", await signIn("guardian")); // a reset signs the demo family out
const karthik = await signIn("guardian");
const paati = await signIn("elder");
const meena = await signIn("neighbour");

let r = await call("GET", "/api/info");
ok(r.body.voice === "elevenlabs" || r.body.voice === "device", "info reports the voice mode", r.body.voice);
r = await call("GET", "/api/voice", paati);
ok(r.status === 200 && "lastCall" in r.body, "voice summary for the elder");
r = await call("POST", "/api/voice/calls", null, { lang: "en" });
ok(r.status === 401, "starting a call needs a session");
r = await call("POST", "/api/voice/calls", karthik, { lang: "en" });
ok(r.status === 403, "only the elder's phone can call Saathi");

r = await call("POST", "/api/voice/calls", paati, { lang: "ta" });
ok(r.status === 200 && r.body.callId, "elder starts a Tamil call");
const id = r.body.callId;
ok(r.body.mode !== "elevenlabs" || !!(r.body.agentId || r.body.signedUrl), "connection details for the voice agent");
ok(/வணக்கம்/.test(r.body.dynamicVariables?.greeting || ""), "Tamil greeting");
ok(r.body.toolNames?.length === 11, "eleven client tools offered", String(r.body.toolNames?.length));
const ctx = JSON.parse(r.body.dynamicVariables?.call_context || "{}");
ok(Array.isArray(ctx.today?.tablets) && ctx.today.tablets.length > 0, "call context has today's tablets");
ok(/temple/i.test(ctx.things_to_remember || ""), "call context has her memory");

const tool = (name, args, token = paati, cid = id) => call("POST", `/api/voice/calls/${cid}/tools/${name}`, token, args);
r = await tool("get_today", {});
ok(r.body.ok && r.body.data?.tablets, "get_today");
r = await tool("log_tablets", { slot: "now", elder_confirmed: false });
ok(r.body.ok === false && r.body.saved === false, "log_tablets refuses without her confirmation");
const feedBefore = (await call("GET", "/api/overview", karthik)).body.feed.length;
r = await tool("log_tablets", { slot: "now", elder_confirmed: true });
ok(r.body.ok && (r.body.saved || r.body.data?.logged?.length === 0), "log_tablets records her tablets", JSON.stringify(r.body).slice(0, 160));
r = await tool("share_how_i_feel", { mood: "okay", sleep: "poor", pain: "", note: "She slept badly because of the rain." });
ok(r.body.ok && r.body.saved, "share_how_i_feel");
r = await tool("tell_family", { message: "Tell Karthik to call me tonight.", wants_call: true });
ok(r.body.ok && r.body.saved, "tell_family");
const feed = (await call("GET", "/api/overview", karthik)).body.feed;
ok(feed.length > feedBefore && feed.some((f) => /slept badly/.test(f.title)) && feed.some((f) => /would like a call/.test(f.title)), "family feed shows what she shared");
r = await tool("remember_for_next_time", { fact: "Her favourite song is from Thiruvilaiyadal.", elder_agreed: false });
ok(r.body.ok === false, "remember needs her agreement");
r = await tool("remember_for_next_time", { fact: "Her favourite song is from Thiruvilaiyadal.", elder_agreed: true });
ok(r.body.ok && r.body.saved, "remember_for_next_time with her agreement");
r = await tool("ask_my_records", { question: "What is she allergic to?" });
ok(r.body.ok && /penicillin/i.test(JSON.stringify(r.body.data)), "ask_my_records answers from her papers", JSON.stringify(r.body.data).slice(0, 120));
r = await tool("get_lesson", { topic: "scam_calls", request: "start" });
ok(r.body.ok && r.body.data?.practice_question, "get_lesson");
r = await tool("check_answer", { topic: "scam_calls", answer: "நான் சொல்ல மாட்டேன், போனை வச்சிட்டு கார்த்திக்கு கூப்பிடுவேன்", answer_in_english: "I won't tell, I'll put the phone down and call Karthik" });
ok(r.body.data?.result === "correct", "check_answer: full answer is correct", r.body.data?.result);
r = await tool("check_answer", { topic: "scam_calls", answer: "I won't tell him", answer_in_english: "I won't tell him" });
ok(r.body.data?.result === "partial" && r.body.data.missing.length === 1, "check_answer: partial answer asks for one missing part", r.body.data?.result);
r = await tool("check_answer", { topic: "help_button", answer: "I will wait", answer_in_english: "I will wait" });
ok(r.body.data?.result === "needs_practice" && r.body.data.example_answer, "check_answer: needs practice gives an example");
r = await tool("emergency_status", {});
ok(r.body.ok && r.body.data?.active === false, "emergency_status with no emergency");
r = await tool("not_a_tool", {});
ok(r.status === 404, "unknown tools are refused");
r = await tool("get_today", {}, meena);
ok(r.status === 403, "another family member can't drive her call");

// Fixed safety rule on her own words, whatever the AI does
r = await call("POST", `/api/voice/calls/${id}/lines`, paati, { role: "saathi", text: "How are you feeling?" });
ok(r.body.ok && !r.body.redFlag, "Saathi's lines are relayed");
r = await call("POST", `/api/voice/calls/${id}/lines`, paati, { role: "elder", text: "நெஞ்சு கனமா இருக்கு, வியர்க்குது" });
ok(r.body.redFlag === true && r.body.emergency?.id, "red-flag words start the emergency (safety rule)");
const chats = (await call("GET", "/api/chat", karthik)).body;
ok(chats.some((c) => /நெஞ்சு/.test(c.text) && c.redFlag), "family sees the call lines");
r = await tool("raise_emergency", { what_happened: "cardiac", her_words: "my chest is heavy" });
ok(r.body.ok && r.body.data?.already_active === true, "raise_emergency joins the active emergency");
await new Promise((res) => setTimeout(res, 2500));
r = await tool("emergency_status", {});
ok(r.body.ok && r.body.data?.active && (r.body.data.hospital || r.body.data.status === "triage"), "emergency_status reports where help is", JSON.stringify(r.body.data).slice(0, 200));

r = await tool("save_call_summary", { summary: "Paati slept badly and felt chest heaviness; the emergency was started.", follow_up: "Check on her at the hospital." });
ok(r.body.ok && r.body.saved, "save_call_summary");
r = await call("POST", `/api/voice/calls/${id}/end`, paati);
ok(r.body.ok, "end the call");
r = await tool("get_today", {});
ok(r.status === 409, "tools stop after the call ends");
r = await call("GET", "/api/voice", paati);
ok(/slept badly/.test(r.body.lastCall?.summary || ""), "last call summary is kept");
r = await call("POST", "/api/voice/calls", paati, { lang: "en" });
ok(/again/.test(r.body.dynamicVariables?.greeting || ""), "returning greeting on the next call");
await call("POST", `/api/voice/calls/${r.body.callId}/end`, paati);

await call("POST", "/api/demo/reset", await signIn("guardian"));
r = await call("GET", "/api/voice", await signIn("elder"));
ok(r.body.lastCall === null, "demo reset clears calls");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
