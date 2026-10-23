// Run against a fresh server: node tests/<file>.mjs http://localhost:3000 (each suite on its own server, since rate limits are per IP)
import { io } from 'socket.io-client';
const U = process.argv[2]; const N = 60;
const post = (p, b, t) => fetch(U + p, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(b || {}) });
const personas = ['guardian', 'granddaughter', 'neighbour', 'hospital', 'elder'];
const t0 = Date.now(); let bad = 0;
const users = await Promise.all(Array.from({ length: N }, async (_, i) => {
  const r = await post('/api/auth/demo', { persona: personas[i % 5] }); if (!r.ok) { bad++; return null; }
  const { token } = await r.json();
  for (const p of ['/api/me', '/api/overview', '/api/card', '/api/hospitals']) { const x = await fetch(U + p, { headers: { authorization: `Bearer ${token}` } }); if (x.status >= 500 || x.status === 429) bad++; }
  const s = io(U, { auth: { token }, transports: ['websocket'] }); const got = { n: 0 }; s.on('emergency', () => got.n++);
  return { token, s, got, persona: personas[i % 5] };
}));
console.log(`${N} phones signed in and loaded in ${Date.now() - t0} ms, ${bad} errors`);
await new Promise((r) => setTimeout(r, 1500));
const elder = users.find((u) => u && u.persona === 'elder');
const sos = await (await post('/api/sos', { condition: 'cardiac', source: 'app' }, elder.token)).json();
await new Promise((r) => setTimeout(r, 3000));
const listeners = users.filter((u) => u && u.persona !== 'elder');
const heard = listeners.filter((u) => u.got.n > 0).length;
console.log(`${heard}/${listeners.length} phones got the live emergency`);
await post(`/api/sos/${sos.id}/cancel`, {}, elder.token);
users.forEach((u) => u?.s.close());
process.exit(bad || heard < listeners.length ? 1 : 0);
