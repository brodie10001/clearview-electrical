// Minimal offline cache: app shell + static assets are cache-first with a
// background refresh; everything else (API/data calls) goes straight to the
// network so the app never serves stale business data from cache.
// Bump this on any deploy where you want to force-evict old cached assets
// for users with an already-installed PWA/service worker.
const CACHE_NAME = "clearview-shell-v3";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.json");

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        // Only the app shell route ("/") has a meaningful cached substitute.
        // Serving that same cached shell for a *different* URL (e.g.
        // /jobs/calendar) would silently render the wrong page — so every
        // other route falls back to an honest "you're offline" page
        // instead. Without this, a failed fetch with no exact-URL match
        // falls through to Response.error(), which renders as a
        // completely blank page with no error message at all.
        if (url.pathname === "/") {
          const cachedShell = await cache.match("/");
          if (cachedShell) return cachedShell;
        }
        const offlinePage = await cache.match("/offline.html");
        return offlinePage || Response.error();
      }),
    );
  }
});
