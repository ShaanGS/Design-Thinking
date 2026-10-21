import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import { connectSocket, disconnectSocket } from "./socket";
import type { ServerInfo, User } from "../../shared/types";

interface AuthState {
  user: User | null;
  info: ServerInfo | null;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthState>(null as unknown as AuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<ServerInfo>("/api/info").then(setInfo).catch(() => {});
    if (!getToken()) { setLoading(false); return; }
    api.get<{ user: User; info: ServerInfo }>("/api/me")
      .then((r) => { setUser(r.user); setInfo(r.info); connectSocket(); })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);
  const signIn = useCallback((token: string, u: User) => { setToken(token); setUser(u); connectSocket(); }, []);
  const signOut = useCallback(async () => { await api.post("/api/auth/logout").catch(() => {}); setToken(null); disconnectSocket(); setUser(null); }, []);
  return <Ctx.Provider value={{ user, info, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export const homeFor = (u: User | null) => (!u ? "/" : u.role === "elder" ? "/elder" : u.role === "hospital" ? "/hospital" : "/family");
