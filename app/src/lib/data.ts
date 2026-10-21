// Live family data: fetch the overview once, then apply pushes from the server.
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { useLive } from "./socket";
import type { Emergency, FeedItem, Overview } from "../../shared/types";

export function useOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => api.get<Overview>("/api/overview").then((d) => { setData(d); setError(null); }).catch((e) => setError(e.message)), []);
  useEffect(() => { void reload(); }, [reload]);
  useLive<Overview>("overview", (o) => setData(o));
  useLive<FeedItem>("feed", (f) => setData((d) => (d && !d.feed.some((x) => x.id === f.id) ? { ...d, feed: [f, ...d.feed].slice(0, 60) } : d)));
  useLive<Emergency>("emergency", (e) => setData((d) => {
    if (!d) return d;
    const active = ["triage", "dispatched", "arrived", "admitted"].includes(e.status);
    if (active) return { ...d, emergency: e };
    return d.emergency?.id === e.id ? { ...d, emergency: null } : d;
  }));
  useLive<{ userId: string; online: boolean }>("presence", (p) => setData((d) => (d ? { ...d, members: d.members.map((m) => (m.id === p.userId ? { ...m, online: p.online } : m)) } : d)));
  return { data, error, reload, setData };
}
