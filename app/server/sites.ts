// Partner websites for the demo: a clinic, a pharmacy, a gas agency and an electricity board. They are fictional
// businesses with real forms and state, so Saathi's browser agent has genuine websites to operate (search, pick,
// fill in, check out) on stage, without logins, captchas or real money. Served publicly under /sites.
import express, { type Request, type Response } from "express";
import crypto from "node:crypto";

export const sites = express.Router();
sites.use(express.urlencoded({ extended: false, limit: "20kb" }));

/* ------------------------------------------------------------------ helpers */
const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const rnd = (n = 4) => crypto.randomBytes(n).toString("hex").toUpperCase().slice(0, n + 2);
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d; };
const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function sid(req: Request, res: Response) {
  const m = /(?:^|;\s*)sid=([a-f0-9]{16})/.exec(req.headers.cookie || "");
  if (m) return m[1];
  const id = crypto.randomBytes(8).toString("hex");
  res.setHeader("Set-Cookie", `sid=${id}; Path=/sites; HttpOnly; SameSite=Lax`);
  return id;
}

function page(o: { title: string; brand: string; tag: string; color: string; accent: string; body: string; font?: string }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title><style>
*{box-sizing:border-box}body{margin:0;font-family:${o.font || "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"};color:#1d2433;background:#f4f6f9;font-size:16px}
header{background:${o.color};color:#fff;padding:14px 20px;display:flex;align-items:center;gap:12px}
header .logo{width:38px;height:38px;border-radius:10px;background:${o.accent};display:grid;place-items:center;font-weight:800;color:${o.color}}
header b{font-size:19px;display:block}header small{opacity:.85}
main{max-width:760px;margin:0 auto;padding:20px}
.card{background:#fff;border-radius:12px;padding:18px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
h1{font-size:22px;margin:0 0 12px}h2{font-size:18px;margin:0 0 8px}
label{display:block;font-weight:600;margin:12px 0 6px}input,select,textarea{width:100%;padding:10px 12px;border:1px solid #c9d1dc;border-radius:8px;font:inherit}
button,.btn{display:inline-block;background:${o.color};color:#fff;border:0;border-radius:8px;padding:11px 18px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none;margin-top:12px}
.btn.alt{background:#fff;color:${o.color};border:2px solid ${o.color}}
.row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eef1f5}.row:last-child{border:0}
.muted{color:#5b6475;font-size:14px}.ok{background:#e7f7ee;color:#11643a;padding:12px 14px;border-radius:10px;font-weight:700}
.err{background:#fdecec;color:#9b1c1c;padding:12px 14px;border-radius:10px}
.slots{display:flex;flex-wrap:wrap;gap:8px}.slots label{display:inline-flex;align-items:center;gap:6px;margin:0;font-weight:500;border:1px solid #c9d1dc;border-radius:8px;padding:8px 10px}
.slots input{width:auto}.slots .taken{opacity:.45;text-decoration:line-through}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:8px 4px;border-bottom:1px solid #eef1f5}
footer{text-align:center;color:#8a93a3;font-size:12px;padding:18px}
</style></head><body><header><div class="logo">${esc(o.brand.slice(0, 1))}</div><div><b>${esc(o.brand)}</b><small>${esc(o.tag)}</small></div></header>
<main>${o.body}</main><footer>${esc(o.brand)} · Demo partner site for Saathi. No real orders or payments.</footer></body></html>`;
}

/* ------------------------------------------------------------------ 1. Clinic: book an appointment */
const CLINIC = { title: "Raman Heart & Diabetes Clinic", brand: "Raman Heart & Diabetes Clinic", tag: "East Tambaram, Chennai · Book an appointment online", color: "#0b6e8a", accent: "#d8f1f7" };
const DOCTORS = [
  { id: "raman", name: "Dr. S. Raman", role: "Cardiologist", fee: 600 },
  { id: "meenakshi", name: "Dr. P. Meenakshi", role: "General physician", fee: 400 },
  { id: "arjun", name: "Dr. K. Arjun", role: "Diabetologist", fee: 500 },
];
const SLOT_TIMES = ["09:30", "10:00", "10:30", "11:30", "17:00", "17:30"];
const clinicBookings = new Map<string, { ref: string; doctor: string; date: string; time: string; name: string; phone: string }>();
const slotTaken = (doc: string, date: string, time: string) =>
  [...clinicBookings.values()].some((b) => b.doctor === doc && b.date === date && b.time === time) || (doc.length + date.charCodeAt(9) + time.charCodeAt(1)) % 4 === 0;

sites.get("/clinic", (_req, res) => {
  res.send(page({ ...CLINIC, body: `<h1>Our doctors</h1>${DOCTORS.map((d) => `<div class="card row"><div><h2>${d.name}</h2><span class="muted">${d.role} · Consultation ${inr(d.fee)}</span></div><a class="btn" href="/sites/clinic/book?doctor=${d.id}">Book appointment with ${d.name}</a></div>`).join("")}` }));
});
sites.get("/clinic/book", (req, res) => {
  const d = DOCTORS.find((x) => x.id === req.query.doctor) ?? DOCTORS[0];
  const days = [1, 2, 3].map(day);
  const grid = days.map((dt) => `<div class="card"><h2>${fmtDay(dt)}</h2><div class="slots">${SLOT_TIMES.map((t) => {
    const taken = slotTaken(d.id, isoDay(dt), t);
    return `<label class="${taken ? "taken" : ""}"><input type="radio" name="slot" value="${isoDay(dt)} ${t}" ${taken ? "disabled" : ""} required aria-label="${fmtDay(dt)} ${t}${taken ? " (booked)" : ""}">${t}${taken ? " (booked)" : ""}</label>`;
  }).join("")}</div></div>`).join("");
  res.send(page({ ...CLINIC, body: `<h1>Book with ${d.name}</h1><p class="muted">${d.role} · Consultation ${inr(d.fee)}, pay at the clinic.</p>
<form method="post" action="/sites/clinic/book"><input type="hidden" name="doctor" value="${d.id}">${grid}
<div class="card"><label for="name">Patient name</label><input id="name" name="name" required>
<label for="phone">Mobile number</label><input id="phone" name="phone" required>
<button type="submit">Confirm booking</button></div></form>` }));
});
sites.post("/clinic/book", (req, res) => {
  const d = DOCTORS.find((x) => x.id === req.body.doctor);
  const [date, time] = String(req.body.slot || "").split(" ");
  if (!d || !date || !time || !req.body.name || !req.body.phone) return res.status(400).send(page({ ...CLINIC, body: `<div class="err">Please choose a time and fill in the patient's name and mobile number.</div><a class="btn" href="/sites/clinic/book?doctor=${esc(req.body.doctor)}">Go back</a>` }));
  if (slotTaken(d.id, date, time)) return res.status(409).send(page({ ...CLINIC, body: `<div class="err">Sorry, that time was just booked. Please choose another.</div><a class="btn" href="/sites/clinic/book?doctor=${d.id}">Choose another time</a>` }));
  const ref = `RHC-${rnd(3)}`;
  clinicBookings.set(ref, { ref, doctor: d.id, date, time, name: String(req.body.name).slice(0, 60), phone: String(req.body.phone).slice(0, 20) });
  res.redirect(303, `/sites/clinic/confirmation?ref=${ref}`);
});
sites.get("/clinic/confirmation", (req, res) => {
  const b = clinicBookings.get(String(req.query.ref)); const d = DOCTORS.find((x) => x.id === b?.doctor);
  if (!b || !d) return res.status(404).send(page({ ...CLINIC, body: `<div class="err">Booking not found.</div>` }));
  res.send(page({ ...CLINIC, body: `<div class="card"><p class="ok">Appointment confirmed</p><table>
<tr><th>Booking reference</th><td id="ref">${b.ref}</td></tr><tr><th>Doctor</th><td>${d.name} (${d.role})</td></tr>
<tr><th>When</th><td>${fmtDay(new Date(b.date))} at ${b.time}</td></tr><tr><th>Patient</th><td>${esc(b.name)}</td></tr>
<tr><th>Fee</th><td>${inr(d.fee)}, pay at the clinic</td></tr></table><p class="muted">Please arrive 10 minutes early with your old prescriptions.</p></div>` }));
});

/* ------------------------------------------------------------------ 2. Pharmacy: reorder medicines */
const PHARMACY = { title: "CarePlus Pharmacy", brand: "CarePlus Pharmacy", tag: "Medicines delivered across Chennai", color: "#1f8a4c", accent: "#e1f5e9" };
const PRODUCTS = [
  { sku: "clop75", name: "Clopidogrel 75 mg", pack: "strip of 10 tablets", price: 68 },
  { sku: "amlo5", name: "Amlodipine 5 mg", pack: "strip of 10 tablets", price: 32 },
  { sku: "glyc500", name: "Glycomet 500 mg (metformin)", pack: "strip of 10 tablets", price: 24 },
  { sku: "omez20", name: "Omez 20 mg (omeprazole)", pack: "strip of 15 capsules", price: 58 },
  { sku: "ator20", name: "Atorvastatin 20 mg", pack: "strip of 10 tablets", price: 96 },
  { sku: "telma40", name: "Telmisartan 40 mg", pack: "strip of 15 tablets", price: 87 },
  { sku: "para650", name: "Paracetamol 650 mg", pack: "strip of 15 tablets", price: 30 },
];
const carts = new Map<string, Map<string, number>>();
const orders = new Map<string, { id: string; items: [string, number][]; total: number; paid: boolean; address: string; phone: string }>();
const cartOf = (id: string) => { let c = carts.get(id); if (!c) { c = new Map(); carts.set(id, c); } return c; };
const cartTotal = (c: Map<string, number>) => [...c].reduce((s, [sku, q]) => s + (PRODUCTS.find((p) => p.sku === sku)?.price ?? 0) * q, 0);
const DELIVERY = 25;

sites.get("/pharmacy", (req, res) => {
  const c = cartOf(sid(req, res));
  res.send(page({ ...PHARMACY, body: `<div class="card"><h1>Search medicines</h1><form method="get" action="/sites/pharmacy/search"><label for="q">Medicine name</label><input id="q" name="q" placeholder="e.g. Clopidogrel"><button type="submit">Search</button></form></div>
<a class="btn alt" href="/sites/pharmacy/cart">View cart (${[...c.values()].reduce((a, b) => a + b, 0)} items)</a>` }));
});
sites.get("/pharmacy/search", (req, res) => {
  sid(req, res);
  const q = String(req.query.q || "").toLowerCase().trim();
  const hits = PRODUCTS.filter((p) => !q || p.name.toLowerCase().includes(q) || q.split(/\s+/).some((w) => w.length > 3 && p.name.toLowerCase().includes(w)));
  res.send(page({ ...PHARMACY, body: `<h1>Results for “${esc(q)}”</h1>${hits.length ? hits.map((p) => `<div class="card row"><div><h2>${p.name}</h2><span class="muted">${p.pack} · ${inr(p.price)}</span></div>
<form method="post" action="/sites/pharmacy/cart/add"><input type="hidden" name="sku" value="${p.sku}"><label for="qty-${p.sku}">Strips</label><select id="qty-${p.sku}" name="qty" aria-label="Number of strips of ${p.name}">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join("")}</select><button type="submit" aria-label="Add ${p.name} to cart">Add to cart</button></form></div>`).join("") : `<div class="err">No medicines found.</div>`}
<a class="btn alt" href="/sites/pharmacy">New search</a> <a class="btn alt" href="/sites/pharmacy/cart">View cart</a>` }));
});
sites.post("/pharmacy/cart/add", (req, res) => {
  const c = cartOf(sid(req, res)); const p = PRODUCTS.find((x) => x.sku === req.body.sku);
  if (p) c.set(p.sku, Math.min(10, (c.get(p.sku) || 0) + Math.max(1, Math.min(6, Number(req.body.qty) || 1))));
  res.redirect(303, "/sites/pharmacy/cart");
});
sites.get("/pharmacy/cart", (req, res) => {
  const c = cartOf(sid(req, res));
  const rows = [...c].map(([sku, q]) => { const p = PRODUCTS.find((x) => x.sku === sku)!; return `<tr><td>${p.name}</td><td>${q} strip${q > 1 ? "s" : ""}</td><td>${inr(p.price * q)}</td></tr>`; }).join("");
  res.send(page({ ...PHARMACY, body: `<div class="card"><h1>Your cart</h1>${c.size ? `<table>${rows}<tr><th>Delivery</th><td></td><td>${inr(DELIVERY)}</td></tr><tr><th>Total</th><td></td><th id="total">${inr(cartTotal(c) + DELIVERY)}</th></tr></table>
<a class="btn" href="/sites/pharmacy/checkout">Proceed to checkout</a>` : `<p class="muted">Your cart is empty.</p>`}</div><a class="btn alt" href="/sites/pharmacy">Add more medicines</a>` }));
});
sites.get("/pharmacy/checkout", (req, res) => {
  const c = cartOf(sid(req, res));
  if (!c.size) return res.redirect(303, "/sites/pharmacy/cart");
  res.send(page({ ...PHARMACY, body: `<form class="card" method="post" action="/sites/pharmacy/checkout"><h1>Delivery details</h1>
<label for="phone">Mobile number</label><input id="phone" name="phone" required><label for="address">Delivery address</label><textarea id="address" name="address" rows="3" required></textarea>
<p class="muted">Total ${inr(cartTotal(c) + DELIVERY)} including delivery.</p><button type="submit">Continue to payment</button></form>` }));
});
sites.post("/pharmacy/checkout", (req, res) => {
  const c = cartOf(sid(req, res));
  if (!c.size || !req.body.phone || !req.body.address) return res.redirect(303, "/sites/pharmacy/checkout");
  const id = `CP${rnd(4)}`;
  orders.set(id, { id, items: [...c], total: cartTotal(c) + DELIVERY, paid: false, address: String(req.body.address).slice(0, 200), phone: String(req.body.phone).slice(0, 20) });
  res.redirect(303, `/sites/pharmacy/pay?order=${id}`);
});
sites.get("/pharmacy/pay", (req, res) => {
  const o = orders.get(String(req.query.order));
  if (!o) return res.status(404).send(page({ ...PHARMACY, body: `<div class="err">Order not found.</div>` }));
  if (o.paid) return res.redirect(303, `/sites/pharmacy/order?order=${o.id}`);
  res.send(page({ ...PHARMACY, body: `<form class="card" method="post" action="/sites/pharmacy/pay"><h1>Payment</h1><input type="hidden" name="order" value="${o.id}">
<p>Order <b>${o.id}</b> · Amount payable <b id="amount">${inr(o.total)}</b></p><label for="upi">UPI ID</label><input id="upi" name="upi" value="family@upi">
<button type="submit">Pay ${inr(o.total)} with UPI</button></form>` }));
});
sites.post("/pharmacy/pay", (req, res) => {
  const o = orders.get(String(req.body.order));
  if (!o) return res.status(404).send(page({ ...PHARMACY, body: `<div class="err">Order not found.</div>` }));
  o.paid = true; carts.delete(sid(req, res));
  res.redirect(303, `/sites/pharmacy/order?order=${o.id}`);
});
sites.get("/pharmacy/order", (req, res) => {
  const o = orders.get(String(req.query.order));
  if (!o?.paid) return res.status(404).send(page({ ...PHARMACY, body: `<div class="err">Order not found.</div>` }));
  res.send(page({ ...PHARMACY, body: `<div class="card"><p class="ok">Order placed and paid</p><table><tr><th>Order number</th><td id="order">${o.id}</td></tr>
${o.items.map(([sku, q]) => `<tr><td>${PRODUCTS.find((p) => p.sku === sku)?.name}</td><td>${q} strip${q > 1 ? "s" : ""}</td></tr>`).join("")}
<tr><th>Paid</th><td>${inr(o.total)}</td></tr><tr><th>Delivery</th><td>${fmtDay(day(1))}, by 7 pm</td></tr></table></div>` }));
});

/* ------------------------------------------------------------------ 3. Gas agency: book a cylinder refill */
const GAS = { title: "Jyothi Gas Agency", brand: "Jyothi Gas Agency", tag: "LPG distributor · Tambaram · Refill booking", color: "#c2410c", accent: "#ffedd5" };
const GAS_ACCOUNTS: Record<string, { name: string; mobile: string; lastRefill: number }> = { "JG48213": { name: "Kamala Ramasamy", mobile: "9000000001", lastRefill: 41 } };
const gasBookings = new Map<string, { no: string; consumer: string; date: string }>();
const normGas = (v: unknown) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

sites.get("/gas", (_req, res) => {
  res.send(page({ ...GAS, body: `<form class="card" method="get" action="/sites/gas/account"><h1>Book your cylinder refill</h1>
<label for="consumer">Consumer number</label><input id="consumer" name="consumer" placeholder="e.g. JG-48213" required>
<label for="mobile">Registered mobile number</label><input id="mobile" name="mobile" required><button type="submit">Continue</button></form>` }));
});
sites.get("/gas/account", (req, res) => {
  const c = normGas(req.query.consumer); const a = GAS_ACCOUNTS[c];
  const mobileOk = a && String(req.query.mobile || "").replace(/\D/g, "").endsWith(a.mobile);
  if (!a || !mobileOk) return res.status(404).send(page({ ...GAS, body: `<div class="err">No connection found for that consumer number and mobile.</div><a class="btn" href="/sites/gas">Try again</a>` }));
  const pending = [...gasBookings.values()].find((b) => b.consumer === c);
  res.send(page({ ...GAS, body: `<div class="card"><h1>${a.name}</h1><table><tr><th>Consumer number</th><td>JG-${c.slice(2)}</td></tr><tr><th>Last refill</th><td>${a.lastRefill} days ago</td></tr><tr><th>Refill price</th><td>${inr(905)}, cash on delivery</td></tr></table>
${pending ? `<p class="ok">A refill is already booked: ${pending.no}</p>` : `<form method="post" action="/sites/gas/book"><input type="hidden" name="consumer" value="${c}"><button type="submit">Book refill</button></form>`}</div>` }));
});
sites.post("/gas/book", (req, res) => {
  const c = normGas(req.body.consumer); if (!GAS_ACCOUNTS[c]) return res.status(404).send(page({ ...GAS, body: `<div class="err">No connection found.</div>` }));
  const no = `JGB${rnd(3)}`; gasBookings.set(no, { no, consumer: c, date: isoDay(day(2)) });
  res.redirect(303, `/sites/gas/booked?no=${no}`);
});
sites.get("/gas/booked", (req, res) => {
  const b = gasBookings.get(String(req.query.no));
  if (!b) return res.status(404).send(page({ ...GAS, body: `<div class="err">Booking not found.</div>` }));
  res.send(page({ ...GAS, body: `<div class="card"><p class="ok">Refill booked</p><table><tr><th>Booking number</th><td id="booking">${b.no}</td></tr><tr><th>Expected delivery</th><td>${fmtDay(new Date(b.date))}</td></tr><tr><th>Pay</th><td>${inr(905)} cash to the delivery person</td></tr></table></div>` }));
});

/* ------------------------------------------------------------------ 4. Electricity board: check and pay a bill */
const POWER = { title: "Chennai Power Board – Pay your bill", brand: "Chennai Power Board", tag: "Electricity bill payment · Online services", color: "#1e3a8a", accent: "#dbeafe" };
const POWER_ACCOUNTS: Record<string, { name: string; units: number; amount: number; due: number }> = { "042213875": { name: "K. Ramasamy", units: 312, amount: 1240, due: 6 } };
const powerReceipts = new Map<string, { no: string; consumer: string; amount: number }>();
const normPower = (v: unknown) => String(v || "").replace(/\D/g, "");
const paidBill = (c: string) => [...powerReceipts.values()].find((r) => r.consumer === c);

sites.get("/power", (_req, res) => {
  res.send(page({ ...POWER, body: `<form class="card" method="get" action="/sites/power/bill"><h1>Check and pay your electricity bill</h1>
<label for="consumer">Service connection number</label><input id="consumer" name="consumer" placeholder="e.g. 04-221-387-5" required><button type="submit">View bill</button></form>` }));
});
sites.get("/power/bill", (req, res) => {
  const c = normPower(req.query.consumer); const a = POWER_ACCOUNTS[c];
  if (!a) return res.status(404).send(page({ ...POWER, body: `<div class="err">No connection found for that number.</div><a class="btn" href="/sites/power">Try again</a>` }));
  const r = paidBill(c);
  res.send(page({ ...POWER, body: `<div class="card"><h1>Bill for ${a.name}</h1><table><tr><th>Connection</th><td>${esc(req.query.consumer)}</td></tr><tr><th>Units used</th><td>${a.units}</td></tr>
<tr><th>Amount due</th><td id="amount">${r ? `${inr(0)} (paid)` : inr(a.amount)}</td></tr><tr><th>Due date</th><td>${fmtDay(day(a.due))}</td></tr></table>
${r ? `<p class="ok">Paid. Receipt ${r.no}</p>` : `<a class="btn" href="/sites/power/pay?consumer=${c}">Pay now</a>`}</div>` }));
});
sites.get("/power/pay", (req, res) => {
  const c = normPower(req.query.consumer); const a = POWER_ACCOUNTS[c];
  if (!a || paidBill(c)) return res.redirect(303, `/sites/power/bill?consumer=${c}`);
  res.send(page({ ...POWER, body: `<form class="card" method="post" action="/sites/power/pay"><h1>Pay ${inr(a.amount)}</h1><input type="hidden" name="consumer" value="${c}">
<label for="upi">UPI ID</label><input id="upi" name="upi" value="family@upi"><button type="submit">Pay ${inr(a.amount)}</button></form>` }));
});
sites.post("/power/pay", (req, res) => {
  const c = normPower(req.body.consumer); const a = POWER_ACCOUNTS[c];
  if (!a) return res.status(404).send(page({ ...POWER, body: `<div class="err">No connection found.</div>` }));
  const no = paidBill(c)?.no ?? `CPB${rnd(4)}`; if (!paidBill(c)) powerReceipts.set(no, { no, consumer: c, amount: a.amount });
  res.redirect(303, `/sites/power/receipt?no=${no}`);
});
sites.get("/power/receipt", (req, res) => {
  const r = powerReceipts.get(String(req.query.no));
  if (!r) return res.status(404).send(page({ ...POWER, body: `<div class="err">Receipt not found.</div>` }));
  res.send(page({ ...POWER, body: `<div class="card"><p class="ok">Payment successful</p><table><tr><th>Receipt number</th><td id="receipt">${r.no}</td></tr><tr><th>Amount</th><td>${inr(r.amount)}</td></tr><tr><th>Paid on</th><td>${fmtDay(new Date())}</td></tr></table></div>` }));
});

/** Clear every partner site's state (demo reset). */
export function resetSites() { clinicBookings.clear(); carts.clear(); orders.clear(); gasBookings.clear(); powerReceipts.clear(); }

/** Paati's details with each partner (fictional), used to fill in forms for her. */
export const PARTNER_PROFILE = {
  name: "Kamala Ramasamy", mobile: "9000000001", address: "12, Kamaraj Street, East Tambaram, Chennai 600059",
  gasConsumer: "JG-48213", powerConnection: "04-221-387-5",
};
