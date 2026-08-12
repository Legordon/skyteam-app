/* Service worker — Carnet de vol (Sky Team Companion)
   Stratégie : cache-first pour les fichiers de l'app (shell), réseau direct
   pour tout le reste (ex. Google Fonts). Incrémenter CACHE_VERSION à chaque
   déploiement pour forcer la mise à jour du cache chez l'utilisateur. */

const CACHE_VERSION = "skyteam-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./missions.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // On ne gère que le même-origine (le reste, ex. polices, part directement au réseau)
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // hors-ligne et pas en cache : pour une navigation, on retombe sur l'accueil
          if (req.mode === "navigate") return caches.match("./index.html");
        });
    })
  );
});
