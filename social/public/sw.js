// The Cardinal service worker — makes the network installable and instant to open.
// Strategy: cache the app shell (HTML/CSS/JS/icons) so the UI loads fast and works
// offline; never cache /api/ responses (those must always be live and per-user), and
// never touch the SSE stream.
const CACHE = "cardinal-social-shell-v1";
const SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Never intercept the API or the live event stream — data must be live.
  if (url.pathname.startsWith("/api/") || e.request.method !== "GET") return;
  // App shell: network-first with cache fallback, so updates arrive but offline still works.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
  );
});
