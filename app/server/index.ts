// Saathi server: REST API + Socket.IO + the built web app, on one port.
import "./db.ts";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import express from "express";
import { UPLOAD_DIR } from "./db.ts";
import { api, publicApi, startWatchers } from "./routes.ts";
import { initRealtime } from "./realtime.ts";
import { startClock, DEMO_SPEED } from "./emergency.ts";
import { seed, isEmpty } from "./seed.ts";
import { aiMode, MODEL } from "./ai.ts";
import { securityHeaders, limit } from "./security.ts";

if (isEmpty()) { seed(); console.log("First run: seeded the demo family and hospital network."); }

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1); // one hosting proxy in front: req.ip is the visitor
app.use(securityHeaders);
app.use("/api", limit("api", 3000, 60000)); // per IP: a classroom on one Wi-Fi shares an address
app.use(express.json({ limit: "1mb" }));
app.use("/api/public", publicApi);
app.use("/api", api);
// Uploaded documents use unguessable file names.
app.use("/uploads", express.static(UPLOAD_DIR, { fallthrough: false, setHeaders: (res) => res.setHeader("Cache-Control", "private, max-age=600") }));

const dist = path.resolve("dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api|\/uploads|\/socket\.io).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

// Bad JSON, missing files and anything else: a short JSON error, never a stack trace
app.use((err: { status?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = Number(err?.status) || 500;
  if (status >= 500) console.error(err);
  res.status(status >= 500 ? 500 : status).json({ error: status === 404 ? "Not found" : status >= 500 ? "Something went wrong on the server" : "Bad request" });
});

const server = http.createServer(app);
initRealtime(server);
startClock();
startWatchers();

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Saathi running on http://localhost:${port}`);
  console.log(`AI: ${aiMode() === "claude" ? `Claude (${MODEL})` : "demo mode (set ANTHROPIC_API_KEY for live AI)"} · demo speed ${DEMO_SPEED}x`);
  if (!fs.existsSync(dist)) console.log("Web app not built yet: run `npm run dev` for development or `npm run build` first.");
});
