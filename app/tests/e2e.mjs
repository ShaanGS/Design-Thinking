// Run against a fresh server: node tests/<file>.mjs http://localhost:3000 (each suite on its own server, since rate limits are per IP)
import { io } from 'socket.io-client';

const U = process.argv[2];
let pass = 0, failN = 0; const fails = [];
const ok = (name, cond, extra = '') => { if (cond) pass++; else { failN++; fails.push(name); } console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  ' + extra : ''}`); };
const req = async (method, p, body, token) => {
  const r = await fetch(U + p, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j };
};
const demo = async (persona) => (await req('POST', '/api/auth/demo', { persona })).j.token;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listen = (token) => { const s = io(U, { auth: { token }, transports: ['websocket'] }); const got = []; s.onAny((ev, payload) => got.push({ ev, payload })); return { s, got, has: (ev, f = () => true) => got.some((g) => g.ev === ev && f(g.payload)) }; };

const K = await demo('guardian');
ok('reset demo', (await req('POST', '/api/demo/reset', {}, K)).s === 200);
const karthik = await demo('guardian'), paati = await demo('elder'), priya = await demo('hospital'), divya = await demo('granddaughter');

// Accounts
ok('info', (await req('GET', '/api/info')).s === 200);
ok('me', (await req('GET', '/api/me', null, karthik)).j.user?.name === 'Karthik');
const join = await req('POST', '/api/auth/join', { code: 'KAMALA', name: 'Test Cousin', relation: 'Friend', phone: '+91 90000 00009' });
ok('join a family with its code', join.s === 200 && join.j.user.familyId === 'fam_ramasamy');
ok('elder phone sign-in with code', (await req('POST', '/api/auth/elder', { code: 'KAMALA' })).j.user?.role === 'elder');
const cf = await req('POST', '/api/auth/create-family', { elderName: 'Saroja Devi', guardianName: 'Ravi', relation: 'Son', age: 75, conditions: ['Diabetes'], allergies: ['Sulfa'] });
ok('create a new family', cf.s === 200 && !!cf.j.code);
const newOv = await req('GET', '/api/overview', null, cf.j.token);
ok('new family has its own overview', newOv.s === 200 && newOv.j.patient.name === 'Saroja Devi');

// Overview, card, profile
const ov = await req('GET', '/api/overview', null, karthik);
ok('family overview', ov.s === 200 && ov.j.patient.nickname === 'Paati' && ov.j.today.length > 0, `${ov.j.today?.length} doses today`);
const card = await req('GET', '/api/card', null, karthik);
ok('emergency card with token', card.s === 200 && !!card.j.cardToken && card.j.blood === 'B+');
ok('edit profile', (await req('PATCH', '/api/patient', { doctor: 'Dr. S. Raman (cardiology), Dr. P. Meenakshi (GP)' }, karthik)).s === 200);

// Medicines and doses
const meds = (await req('GET', '/api/meds', null, karthik)).j;
ok('list medicines', meds.length === 5, meds.length);
const chk = await req('POST', '/api/meds/check', { name: 'Ecosprin', generic: 'aspirin' }, karthik);
ok('medicine safety check runs', chk.s === 200 && Array.isArray(chk.j), JSON.stringify(chk.j).slice(0, 90));
const add = await req('POST', '/api/meds', { name: 'Vitamin D3', generic: 'cholecalciferol', dose: '1000 IU', purpose: 'Bones', slots: ['morning'], stock: 30 }, karthik);
ok('add a medicine', add.s === 200, add.s);
const medId = add.j.med?.id || add.j.id;
ok('edit a medicine', (await req('PATCH', `/api/meds/${medId}`, { stock: 20 }, karthik)).s === 200);
const due = ov.j.today.find((d) => d.status !== 'taken');
if (due) ok('log one dose', (await req('POST', '/api/doses', { medId: due.med.id, slot: due.slot, status: 'taken' }, karthik)).s === 200);
ok('elder marks a slot taken', (await req('POST', '/api/doses/slot', { slot: 'night' }, paati)).s === 200);

// Vitals, check-ins, visits
ok('add a vital', (await req('POST', '/api/vitals', { type: 'bp', value: 132, value2: 84, source: 'Home BP monitor' }, karthik)).s === 200);
const ci = await req('POST', '/api/checkins', {}, karthik);
ok('silent check-in sent', ci.s === 200, ci.s);
const ciId = ci.j.id || ci.j.checkin?.id;
ok('elder answers check-in', (await req('POST', `/api/checkins/${ciId}/answer`, { answer: 'ok' }, paati)).s === 200);
const vis = await req('POST', '/api/visits', { place: 'Annai Diagnostics', reason: 'HbA1c test', kind: 'lab', at: new Date(Date.now() + 86400000).toISOString() }, karthik);
ok('plan a visit', vis.s === 200, vis.s);
const visId = vis.j.id || vis.j.visit?.id;
ok('check in to a visit', (await req('PATCH', `/api/visits/${visId}`, { status: 'checked_in' }, karthik)).s === 200);
ok('bad visit date is refused cleanly', (await req('POST', '/api/visits', { place: 'X', at: 'not a date' }, karthik)).s === 400);

// Talk to Saathi
ok('chat history', (await req('GET', '/api/chat', null, paati)).s === 200);
const chat = await req('POST', '/api/chat', { text: 'I took my morning tablets' }, paati);
ok('chat reply in English', chat.s === 200 && !/[஀-௿]/.test(chat.j.reply?.text || ''), chat.j.reply?.text);

// Health vault
const vault = await req('GET', '/api/vault', null, karthik);
ok('vault has 6 papers', vault.j.documents?.length === 6, vault.j.documents?.length);
ok('vault has insights', (vault.j.insights?.length || 0) > 0, vault.j.insights?.length);
const ask = await req('POST', '/api/vault/ask', { question: 'What is she allergic to?' }, karthik);
ok('ask the records', ask.s === 200 && /penicillin/i.test(ask.j.answer || ''), (ask.j.answer || '').slice(0, 80));
const share = await req('POST', '/api/vault/share', {}, karthik);
ok('doctor share link', share.s === 200 && (await req('GET', `/api/public/share/${share.j.token}`)).s === 200);
const img = vault.j.documents?.[0]?.url;
if (img) { const r = await fetch(U + img); ok('paper image loads', r.ok && (r.headers.get('content-type') || '').startsWith('image/')); }
const delId = vault.j.documents?.[5]?.id;
ok('delete a paper', (await req('DELETE', `/api/vault/docs/${delId}`, null, karthik)).s === 200);
const samples = await req('POST', '/api/vault/samples', {}, karthik);
ok('add sample papers', samples.s === 200 && samples.j.ids?.length === 6);
await sleep(2500);
const vault2 = await req('GET', '/api/vault', null, karthik);
ok('sample papers get read', vault2.j.documents.filter((d) => d.status === 'done').length >= 6, vault2.j.documents.map((d) => d.status).join(','));

// Emergency, end to end with live sockets
const famSock = listen(karthik), erSock = listen(priya), divSock = listen(divya);
await sleep(800);
const sos = await req('POST', '/api/sos', { source: 'app' }, paati);
ok('SOS starts in triage', sos.s === 200 && sos.j.status === 'triage', sos.j.status);
await sleep(700);
ok('family phone hears the SOS at once', famSock.has('emergency', (e) => e.id === sos.j.id));
ok('second family member hears it too', divSock.has('emergency', (e) => e.id === sos.j.id));
const sym = await req('POST', `/api/sos/${sos.j.id}/symptom`, { condition: 'cardiac' }, paati);
ok('symptom routes the ambulance', sym.j.status === 'dispatched' && !!sym.j.route, sym.j.status);
await sleep(2500);
const ovE = (await req('GET', '/api/overview', null, karthik)).j.emergency;
ok('routed to a cath-lab hospital', ovE?.hospitalId === 'h3', ovE?.hospitalId);
ok('ER brief written', !!ovE?.brief);
ok('ER console gets the case live', erSock.has('emergency', (e) => e.id === sos.j.id && e.status === 'dispatched'));
ok('ambulance moves', ovE.progress > 0 && !!ovE.ambulance, ovE.progress?.toFixed?.(2));
ok('neighbour can respond', (await req('POST', `/api/sos/${sos.j.id}/respond`, {}, divya)).s === 200);
const rec = await req('GET', `/api/network/patient/${ovE.patientId}`, null, priya);
ok('ER opens her record (break-glass)', rec.s === 200 && rec.j.meds?.length >= 5);
ok('ER marks team ready', (await req('POST', `/api/emergencies/${sos.j.id}/ready`, {}, priya)).s === 200);
const bys = await req('GET', `/api/public/help/${card.j.cardToken}/status`);
ok('bystander page shows the live emergency', bys.j.emergency?.id === sos.j.id);
ok('ER admits her', (await req('POST', `/api/emergencies/${sos.j.id}/admit`, {}, priya)).s === 200);
ok('ER closes the case', (await req('POST', `/api/emergencies/${sos.j.id}/resolve`, {}, priya)).s === 200);
const feed = (await req('GET', '/api/overview', null, karthik)).j.feed.map((f) => f.title).join(' | ');
ok('family feed tells the whole story', /team is ready/i.test(feed) && /with the doctors/i.test(feed) && /closed/i.test(feed));

// Cancel path
const sos2 = await req('POST', '/api/sos', { condition: 'fall', source: 'app' }, paati);
ok('second SOS (fall)', sos2.s === 200);
ok('cancel a false alarm', (await req('POST', `/api/sos/${sos2.j.id}/cancel`, {}, paati)).j.status === 'cancelled');

// Bystander: scan card, raise alert
const pub = await req('GET', `/api/public/help/${card.j.cardToken}`);
ok('bystander card shows blood group and allergy', pub.j.blood === 'B+' && pub.j.allergies?.length > 0);
ok('bystander card hides address and family code', !JSON.stringify(pub.j).includes('Kamaraj') && !JSON.stringify(pub.j).includes('KAMALA'));
const alert = await req('POST', `/api/public/help/${card.j.cardToken}/alert`, {});
ok('bystander alert starts an emergency', alert.s === 200 && !!alert.j.emergency, alert.s);
if (alert.j.emergency) await req('POST', `/api/sos/${alert.j.emergency.id}/cancel`, {}, karthik);

// Hospital network
const net = await req('GET', '/api/network', null, priya);
ok('hospital network', net.s === 200 && net.j.hospitals.length === 5, net.j.hospitals?.length);
ok('update own beds', (await req('PATCH', '/api/hospitals/h3', { icuBeds: 3, erBeds: 7 }, priya)).j.icuBeds === 3);
ok('update own stock', (await req('PATCH', '/api/hospitals/h3/inventory/asv', { qty: 0 }, priya)).s === 200);
const relay = await req('POST', '/api/relays', { item: 'asv', qty: 10, toId: 'h3' }, priya);
ok('medicine relay from a nearby hospital', relay.s === 200 && relay.j.status === 'dispatched', relay.j.status || relay.j.error);
ok('relay list', (await req('GET', '/api/relays', null, priya)).j.length >= 1);

// Demo scripts
ok('missed-dose escalation script', (await req('POST', '/api/demo/missed-dose', {}, karthik)).s === 200);
ok('escalation answer', (await req('POST', '/api/demo/escalation-answer', {}, karthik)).s === 200);

famSock.s.close(); erSock.s.close(); divSock.s.close();
await req('POST', '/api/demo/reset', {}, await demo('guardian'));
console.log(`\n${pass} passed, ${failN} failed${failN ? ': ' + fails.join('; ') : ''}`);
process.exit(failN ? 1 : 0);
