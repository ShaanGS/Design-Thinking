// One Socket.IO connection per signed-in session; components subscribe with useLive().
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getToken } from "./api";

let socket: Socket | null = null;
let socketToken: string | null = null;
const statusListeners = new Set<(s: boolean) => void>();

export function connectSocket() {
  const token = getToken();
  if (socket && socketToken === token) return socket;
  socket?.disconnect();
  socketToken = token;
  socket = io({ auth: { token }, transports: ["websocket", "polling"] });
  socket.on("connect", () => statusListeners.forEach((f) => f(true)));
  socket.on("disconnect", () => statusListeners.forEach((f) => f(false)));
  return socket;
}
export function disconnectSocket() { socket?.disconnect(); socket = null; socketToken = null; }

/** Subscribe to a live event for the lifetime of the component. */
export function useLive<T>(event: string, handler: (payload: T) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = connectSocket();
    const fn = (p: T) => ref.current(p);
    s.on(event, fn);
    return () => { s.off(event, fn); };
  }, [event]);
}

export function useConnected() {
  const [on, setOn] = useState(() => !!socket?.connected);
  useEffect(() => { const f = (s: boolean) => setOn(s); statusListeners.add(f); setOn(!!connectSocket().connected); return () => { statusListeners.delete(f); }; }, []);
  return on;
}
