// Socket.IO: every family has a room; hospital staff share the "network" room.
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { get } from "./db.ts";
import { toUser } from "./store.ts";
import type { User } from "../shared/types.ts";

let io: Server | null = null;
const online = new Map<string, number>(); // userId → open sockets

export function userForToken(token: string | undefined | null): User | null {
  if (!token) return null;
  const r = get("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?", token);
  return r ? toUser(r) : null;
}

export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: true } });
  io.on("connection", (socket) => {
    const user = userForToken(socket.handshake.auth?.token as string);
    if (!user) { socket.disconnect(true); return; }
    if (user.familyId) socket.join(`family:${user.familyId}`);
    if (user.role === "hospital") { socket.join("network"); if (user.hospitalId) socket.join(`hospital:${user.hospitalId}`); }
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

export const isOnline = (userId: string) => online.has(userId);
export const toFamily = (familyId: string, event: string, payload: unknown) => io?.to(`family:${familyId}`).emit(event, payload);
export const toNetwork = (event: string, payload: unknown) => io?.to("network").emit(event, payload);
