// FaktureOnline service worker — shell cache + offline fallback.
// Versioned to invalidate old caches on deploy.
const CACHE_VERSION = "fo-v1";
const SHELL_URLS = ["/", "/dashboard", "/login", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache auth surfaces or API mutations — always hit the network.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/login" ||
    url.pathname === "/register" ||
    url.pathname === "/forgot-password"
  ) {
    return;
  }

  // Network-first for documents; fallback to cache; offline shell as last resort.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/offline")),
        ),
    );
    return;
  }

  // Cache-first for static assets (Next.js _next/static is content-hashed).
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
