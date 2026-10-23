// Security helpers: rate limits, response headers, session-token hashing, upload sniffing and the demo sandbox.
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import type { User } from "../shared/types.ts";

/** The public demo (one-tap sign-in on the landing page) lives in its own sandbox. */
export const DEMO_FAMILY = "fam_ramasamy";
export const DEMO_PATIENT = "pat_kamala";
const DEMO_HOSPITAL_USERS = new Set(["u_priya", "u_raghu"]);
export const isDemoFamily = (familyId: string | null | undefined) => familyId === DEMO_FAMILY;
export const isDemoUser = (u: Pick<User, "id" | "familyId">) => isDemoFamily(u.familyId) || DEMO_HOSPITAL_USERS.has(u.id);

/** Sessions are stored as SHA-256 hashes, so a copy of the database can't be used to sign in. */
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const SESSION_TTL_MS = 30 * 24 * 3600000;

/** Family codes: 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const newFamilyCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");

export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Fixed-window rate limiter kept in memory (one server process). */
const buckets = new Map<string, { n: number; reset: number }>();
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k); }, 60000).unref();
export function limit(name: string, max: number, windowMs: number, keyOf: (req: Request) => string = clientIp) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${name}:${keyOf(req)}`, now = Date.now();
    let b = buckets.get(key);
    if (!b || b.reset < now) { b = { n: 0, reset: now + windowMs }; buckets.set(key, b); }
    if (++b.n > max) {
      res.setHeader("Retry-After", String(Math.ceil((b.reset - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    }
    next();
  };
}
export const clientIp = (req: Request) => req.ip || req.socket.remoteAddress || "unknown";
export const byUser = (req: Request) => (req as Request & { user?: User }).user?.id || clientIp(req);

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=15552000");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  // Camera (Face Pulse), microphone (talk to Saathi) and location (bystander, home) are used by this site only.
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()");
  next();
}

/** Work out a file's real type from its first bytes instead of trusting the browser. */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}
