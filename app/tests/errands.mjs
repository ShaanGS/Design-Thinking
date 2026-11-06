// End-to-end checks for errands (the sandboxed browser operating the partner sites): node tests/errands.mjs http://localhost:3000
const BASE = process.argv[2] || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name} ${extra}`); } };
async function call(method, path, token, body) {
  const r = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
const signIn = async (persona) => (await call("POST", "/api/auth/demo", null, { persona })).body.token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(token, id, statuses, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const e = (await call("GET", "/api/errands", token)).body.errands?.find((x) => x.id === id);
    if (e && statuses.includes(e.status)) return e;
    await sleep(500);
  }
  return (await call("GET", "/api/errands", token)).body.errands?.find((x) => x.id === id);
}

console.log(`Errand checks against ${BASE}`);
await call("POST", "/api/demo/reset", await signIn("guardian"));
const karthik = await signIn("guardian");
const paati = await signIn("elder");
const meena = await signIn("neighbour");

let r = await call("GET", "/sites/clinic".replace("/sites", "/sites"), null).catch(() => null);
const site = await fetch(BASE + "/sites/clinic"); ok(site.status === 200 && /Raman Heart/.test(await site.text()), "partner clinic site is served");

r = await call("POST", "/api/errands", karthik, { kind: "nope", request: "x" });
ok(r.status === 400, "unknown errand kinds are refused");
r = await call("POST", "/api/errands", null, { kind: "book_gas", request: "x" });
ok(r.status === 401, "errands need a session");

// 1. Doctor: stops for her choice of time, then books
r = await call("POST", "/api/errands", paati, { kind: "book_doctor", request: "Book me with the heart doctor this week" });
ok(r.status === 200 && r.body.id, "start: book a doctor");
let e = await until(paati, r.body.id, ["needs_choice", "failed", "done"]);
ok(e?.status === "needs_choice" && e.question?.options?.length >= 1, "asks her which time suits", JSON.stringify(e?.result || e?.question));
const frame = await fetch(`${BASE}/api/errands/${r.body.id}/frame`, { headers: { Authorization: `Bearer ${karthik}` } });
ok(frame.status === 200 && frame.headers.get("content-type")?.includes("jpeg"), "live browser picture for the family");
ok(e?.steps?.length >= 2, "steps are recorded", String(e?.steps?.length));
r = await call("POST", `/api/errands/${e.id}/answer`, paati, { answer: "the second one" });
ok(r.body.ok, "her answer is accepted");
e = await until(paati, e.id, ["done", "failed"]);
ok(e?.status === "done" && /RHC-/.test(e.result || ""), "appointment booked with a reference", e?.result);

// 2. Medicines: waits for a family member to approve the payment
r = await call("POST", "/api/errands", paati, { kind: "order_medicines", request: "Order my Clopidogrel and Amlodipine, 2 strips each" });
e = await until(paati, r.body.id, ["awaiting_approval", "failed", "done"], 90000);
ok(e?.status === "awaiting_approval" && e.approval?.amount > 0, "pharmacy order waits for approval", JSON.stringify(e?.approval || e?.result));
r = await call("POST", `/api/errands/${e.id}/approve`, paati, { approve: true });
ok(r.status === 403, "the elder's phone can't approve payments");
r = await call("POST", `/api/errands/${e.id}/approve`, karthik, { approve: true });
ok(r.body.ok, "Karthik approves");
e = await until(paati, e.id, ["done", "failed"]);
ok(e?.status === "done" && /CP[0-9A-F]+/.test(e.result || "") && /Clopidogrel/.test(e.result || ""), "order placed and paid", e?.result);

// 3. Gas: no payment needed
r = await call("POST", "/api/errands", paati, { kind: "book_gas", request: "Book a gas cylinder" });
e = await until(paati, r.body.id, ["done", "failed"], 60000);
ok(e?.status === "done" && /JGB/.test(e.result || ""), "gas refill booked", e?.result);
r = await call("POST", "/api/errands", paati, { kind: "book_gas", request: "Book a gas cylinder" });
e = await until(paati, r.body.id, ["done", "failed"], 60000);
ok(e?.status === "done" && /already booked/.test(e.result || ""), "a second booking finds the first", e?.result);

// 4. Electricity: asks her, then the family declines
r = await call("POST", "/api/errands", paati, { kind: "electricity_bill", request: "How much is my current bill?" });
e = await until(paati, r.body.id, ["needs_choice", "failed", "done"], 60000);
ok(e?.status === "needs_choice" && /₹1240/.test(e.question?.prompt || ""), "reads the bill and asks whether to pay", e?.question?.prompt);
await call("POST", `/api/errands/${e.id}/answer`, paati, { answer: "yes pay it" });
e = await until(paati, e.id, ["awaiting_approval", "failed"], 30000);
ok(e?.status === "awaiting_approval", "then waits for family approval");
await call("POST", `/api/errands/${e.id}/approve`, karthik, { approve: false });
e = await until(paati, e.id, ["declined", "done", "failed"], 30000);
ok(e?.status === "declined" && /wasn't paid/.test(e.result || ""), "declined: nothing paid", e?.result);

// 5. Cancel while waiting
r = await call("POST", "/api/errands", paati, { kind: "book_doctor", request: "General physician please" });
e = await until(paati, r.body.id, ["needs_choice", "failed"], 60000);
r = await call("POST", `/api/errands/${e.id}/cancel`, karthik);
ok(r.body.ok, "cancel a waiting errand");
await sleep(800);
e = (await call("GET", "/api/errands", paati)).body.errands.find((x) => x.id === e.id);
ok(e?.status === "cancelled", "stays cancelled", e?.status);

// Family can see it all
const feed = (await call("GET", "/api/overview", karthik)).body.feed.map((f) => f.title).join(" | ");
ok(/Approve ₹/.test(feed) && /approved/.test(feed), "family feed shows approvals", feed.slice(0, 200));
r = await call("GET", "/api/errands", meena);
ok(r.body.errands?.length >= 5, "the whole family sees the errands");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
