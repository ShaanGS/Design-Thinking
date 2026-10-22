// Thin fetch wrapper: adds the session token, parses JSON, turns API errors into readable Errors.
// Each named window (the three phones on the stage view are iframes named elder / guardian / hospital) keeps its own session.
const TOKEN_KEY = typeof window !== "undefined" && window.name ? `saathi-token:${window.name}` : "saathi-token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  let res: Response;
  try { res = await fetch(url, { method, headers, body: payload }); }
  catch { throw new ApiError(0, "Can't reach Saathi. Check your internet connection."); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body ?? {}),
  del: <T>(url: string) => request<T>("DELETE", url),
};
