// Run against a fresh server: node tests/<file>.mjs http://localhost:3000 (each suite on its own server, since rate limits are per IP)
const U = process.argv[2];
let pass = 0, failN = 0;
const ok = (name, cond, extra = '') => { if (cond) pass++; else failN++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const req = async (method, p, body, token, raw) => {
  const r = await fetch(U + p, { method, headers: { ...(raw ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  let j = null; const t = await r.text(); try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j, h: r.headers };
};
const demo = async (persona) => (await req('POST', '/api/auth/demo', { persona })).j.token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hospital self-signup is closed
const hs = await req('POST', '/api/auth/hospital', { hospitalId: 'h1', name: 'x' });
ok('hospital signup without staff code is refused', hs.s === 403, hs.s);

const priya = await demo('hospital'), raghu = await demo('pharmacy'), karthik = await demo('guardian'), paati = await demo('elder');
ok('demo hospital login still works', !!priya);
ok('cannot edit another hospital', (await req('PATCH', '/api/hospitals/h4', { icuBeds: 0 }, priya)).s === 403);
ok('can edit own hospital', (await req('PATCH', '/api/hospitals/h3', { icuBeds: 2 }, priya)).s === 200);
ok('cannot change stock of another hospital', (await req('PATCH', '/api/hospitals/h4/inventory/asv', { qty: 0 }, priya)).s === 403);
ok('cannot request a relay for another hospital', (await req('POST', '/api/relays', { item: 'asv', qty: 5, toId: 'h4' }, priya)).s === 403);

// A real (non-demo) family
const cf = await req('POST', '/api/auth/create-family', { elderName: 'Lakshmi Iyer', guardianName: 'Arun', conditions: 'not-an-array', lat: 'Infinity' });
ok('create family survives bad input', cf.s === 200, cf.s + ' ' + JSON.stringify(cf.j).slice(0, 80));
const code = cf.j.code, arun = cf.j.token;
ok('family code is 8 random characters', /^[A-Z2-9]{8}$/.test(code), code);
ok('real family cannot reset the demo', (await req('POST', '/api/demo/reset', {}, arun)).s === 403);
ok('real family cannot run demo scripts', (await req('POST', '/api/demo/missed-dose', {}, arun)).s === 403);

// Real family SOS is invisible to the demo ER
const rsos = await req('POST', '/api/sos', { condition: 'cardiac' }, arun);
await sleep(2500);
const net = await req('GET', '/api/network', null, priya);
ok('demo ER does not see a real family\'s emergency', !net.j.emergencies.some((e) => e.familyId === rsos.j.familyId));
ok('demo ER cannot open a real patient record', (await req('GET', `/api/network/patient/${rsos.j.patientId}`, null, priya)).s === 403);
await req('POST', `/api/sos/${rsos.j.id}/cancel`, {}, arun);

// Demo emergency: destination sees the brief, others don't, others can't act
const sos = await req('POST', '/api/sos', { condition: 'cardiac' }, paati);
await sleep(3000);
const mine = (await req('GET', '/api/network', null, priya)).j.emergencies.find((e) => e.id === sos.j.id);
const other = (await req('GET', '/api/network', null, raghu)).j.emergencies.find((e) => e.id === sos.j.id);
ok('emergency routed to Saraswathi (h3)', mine?.hospitalId === 'h3', mine?.hospitalId);
ok('receiving ER gets the brief', !!mine?.brief);
ok('other hospitals get no brief', other && other.brief === null);
ok('receiving ER can open her record', (await req('GET', `/api/network/patient/${sos.j.patientId}`, null, priya)).s === 200);
ok('other hospital cannot open her record', (await req('GET', `/api/network/patient/${sos.j.patientId}`, null, raghu)).s === 403);
ok('other hospital cannot act on the case', (await req('POST', `/api/emergencies/${sos.j.id}/resolve`, {}, raghu)).s === 403);
ok('receiving ER can mark team ready', (await req('POST', `/api/emergencies/${sos.j.id}/ready`, {}, priya)).s === 200);

// Demo reset keeps real families
ok('demo family can reset the demo', (await req('POST', '/api/demo/reset', {}, karthik)).s === 200);
ok('real family survives a demo reset', (await req('GET', '/api/overview', null, arun)).s === 200);

// Code guessing is rate limited
let limited = false;
for (let i = 0; i < 25; i++) if ((await req('POST', '/api/auth/elder', { code: 'ZZZZ' + i })).s === 429) limited = true;
ok('family-code guessing gets rate limited', limited);

// Uploads: HTML pretending to be a PNG
const k2 = await demo('guardian');
const fd = new FormData(); fd.append('files', new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' }), 'evil.png');
const up = await fetch(U + '/api/vault/upload', { method: 'POST', headers: { authorization: `Bearer ${k2}` }, body: fd });
ok('fake image upload is rejected', up.status === 400, up.status);

// Errors and headers
const bad = await req('POST', '/api/auth/demo', null, null, '{bad json');
ok('malformed JSON gets a JSON error, no stack trace', bad.s === 400 && typeof bad.j === 'object' && !JSON.stringify(bad.j).includes('at '), JSON.stringify(bad.j).slice(0, 60));
const bad2 = await req('GET', '/api/public/help/%E0%A4%A', null);
ok('bad URL encoding gets a JSON error', typeof bad2.j === 'object', bad2.s);
const home = await fetch(U + '/');
ok('security headers are set', home.headers.get('x-content-type-options') === 'nosniff' && home.headers.get('x-frame-options') === 'SAMEORIGIN');

// Logout really ends the session
const t3 = await demo('guardian');
await req('POST', '/api/auth/logout', {}, t3);
ok('logged-out token stops working', (await req('GET', '/api/me', null, t3)).s === 401);

// Bystander alerts can't be spammed
const card = await req('GET', '/api/card', null, await demo('guardian'));
let spam = false;
for (let i = 0; i < 12; i++) if ((await req('POST', `/api/public/help/${card.j.cardToken}/alert`, {})).s === 429) spam = true;
ok('bystander alert spam is rate limited', spam);
await req('POST', '/api/demo/reset', {}, await demo('guardian'));

console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
