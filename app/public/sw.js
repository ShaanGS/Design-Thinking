// Minimal service worker: makes Saathi installable and keeps the app shell available offline.
const CACHE = "saathi-shell-v1";
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icons/icon.svg"]))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) return;
  if (e.request.mode === "navigate") { e.respondWith(fetch(e.request).catch(() => caches.match("/"))); return; }
});
