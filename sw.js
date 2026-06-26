// GRAVEWAKE service worker — makes the game installable + offline.
// Cache-first for everything in scope (the wasm shell + the on-demand 3D GLBs +
// portraits-in-wasm). First visit fetches over the network and caches as it
// goes; after that the game runs fully offline from the home-screen icon.
// Bump CACHE on every deploy to invalidate the old cache.
const CACHE = "gravewake-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // only handle same-origin requests
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      // ignoreSearch so the ?cb= cache-buster still hits the cached asset
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req)
          .then((resp) => {
            if (resp && resp.ok && resp.status === 200) {
              cache.put(req, resp.clone());
            }
            return resp;
          })
          .catch(() => hit);
      })
    )
  );
});
