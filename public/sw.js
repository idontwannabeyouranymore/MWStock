// Service worker básico para MWStock (PWA instalable).
// Estrategia: network-first con respaldo en caché (para soporte offline simple).
const CACHE = "mwstock-v1";
const ASSETS = ["/", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo cacheamos GET; el resto (POST/PATCH/DELETE) pasa directo a la red.
  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copia = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copia));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cacheada) => cacheada || caches.match("/"))
      )
  );
});
