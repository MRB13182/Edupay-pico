/* =========================================================
   EduPay Pico — Service Worker
   Offline-first caching + professional update system
   ========================================================= */

/* Bump CACHE_VERSION on every release (keep in sync with
   APP_VERSION in script.js) so the browser detects a byte
   change in this file and fires the update flow. */
const CACHE_VERSION = "1.0.1";
const CACHE_NAME = "edupay-pico-cache-v" + CACHE_VERSION;
const RUNTIME_CACHE = "edupay-pico-runtime-v" + CACHE_VERSION;

/* Core app shell — always cached on install */
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

/* ---------------- INSTALL ---------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => {
        /* Do NOT auto skipWaiting here — we let the app control
           when to activate so the update popup / flow works. */
      })
      .catch((err) => console.error("[SW] Precache failed:", err))
  );
});

/* ---------------- ACTIVATE ---------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------------- MESSAGE (update control) ---------------- */
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data.type === "GET_VERSION") {
    event.ports &&
      event.ports[0] &&
      event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

/* ---------------- FETCH ---------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  /* Only handle GET requests */
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* App-shell navigation requests -> cache-first, offline fallback to index.html */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", resClone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* Same-origin core assets -> cache-first */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            return res;
          })
          .catch(() => caches.match("./index.html"));
      })
    );
    return;
  }

  /* Cross-origin (fonts, jsPDF CDN, etc.) -> stale-while-revalidate */
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const networkFetch = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
