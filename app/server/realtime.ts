// Socket.IO: every family has a room; hospital staff share a network room (the public demo has its own).
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { get } from "./db.ts";
import { toUser } from "./store.ts";
import { hashToken, isDemoFamily, isDemoUser, SESSION_TTL_MS } from "./security.ts";
import type { Emergency, User } from "../shared/types.ts";

let io: Server | null = null;
const online = new Map<string, number>(); // userId → open sockets

export function userForToken(token: string | undefined | null): User | null {
  if (!token || token.length > 128) return null;
  const r = get("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.created_at > ?", hashToken(token), new Date(Date.now() - SESSION_TTL_MS).toISOString());
  return r ? toUser(r) : null;
}

const networkRoom = (demo: boolean) => (demo ? "network:demo" : "network");
const hospitalRoom = (demo: boolean, id: string) => `hospital:${demo ? "demo" : "real"}:${id}`;

export function initRealtime(server: HttpServer) {
  io = new Server(server); // same-origin only: no CORS
  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token as string;
    const user = userForToken(token);
    if (!user) { socket.disconnect(true); return; }
    socket.data.tokenHash = hashToken(token);
    if (user.familyId) socket.join(`family:${user.familyId}`);
    if (user.role === "hospital") { socket.join(networkRoom(isDemoUser(user))); if (user.hospitalId) socket.join(hospitalRoom(isDemoUser(user), user.hospitalId)); }
    online.set(user.id, (online.get(user.id) || 0) + 1);
    if (user.familyId) io!.to(`family:${user.familyId}`).emit("presence", { userId: user.id, online: true });
    socket.on("disconnect", () => {
      const n = (online.get(user.id) || 1) - 1;
      if (n <= 0) online.delete(user.id); else online.set(user.id, n);
      if (user.familyId && n <= 0) io!.to(`family:${user.familyId}`).emit("presence", { userId: user.id, online: false });
    });
  });
  return io;
}

/** Close the live connections opened with one session token (on sign-out). */
export function disconnectToken(token: string) {
  const h = hashToken(token);
  for (const s of io?.sockets.sockets.values() ?? []) if (s.data.tokenHash === h) s.disconnect(true);
}

export const isOnline = (userId: string) => online.has(userId);
export const toFamily = (familyId: string, event: string, payload: unknown) => io?.to(`family:${familyId}`).emit(event, payload);
/** Shared network data (beds, stock, relays) goes to every hospital console. */
export const toNetwork = (event: string, payload: unknown) => { io?.to("network").emit(event, payload); io?.to("network:demo").emit(event, payload); };

/** Other hospitals see that a case exists and where it is going, not the patient's words or medical brief. */
export const redactForOtherHospital = (e: Emergency): Emergency => ({ ...e, brief: null, symptomText: null });
export const canSeeEmergency = (viewer: User, e: Pick<Emergency, "familyId">) => isDemoUser(viewer) === isDemoFamily(e.familyId);

/** An emergency update: the destination hospital gets the full case, the rest of the network a redacted one. */
export function emergencyToNetwork(e: Emergency) {
  if (!io) return;
  const demo = isDemoFamily(e.familyId), room = networkRoom(demo);
  if (!e.hospitalId) { io.to(room).emit("emergency", redactForOtherHospital(e)); return; }
  io.to(room).except(hospitalRoom(demo, e.hospitalId)).emit("emergency", redactForOtherHospital(e));
  io.to(hospitalRoom(demo, e.hospitalId)).emit("emergency", e);
}
