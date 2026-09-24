/* =========================================================
   SUMANVOLT // GATE 2027 CE COMMAND CENTER
   sw.js — service worker: offline-first caching
   ========================================================= */

const CACHE_VERSION = 'sumanvolt-v1';
const CACHE_NAME = 'sumanvolt-gate2027-' + CACHE_VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

/* ---------- INSTALL: pre-cache the app shell ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SUMANVOLT SW: precache failed', err))
  );
});

/* ---------- ACTIVATE: clean up old cache versions ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('sumanvolt-gate2027-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH: cache-first for app shell, network-first for everything else,
   with a cache fallback so the app keeps working fully offline ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else (POST, etc.) pass through untouched
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Cross-origin requests (e.g. Google Fonts): stale-while-revalidate
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const fetchPromise = fetch(req)
            .then((networkResp) => {
              if (networkResp && networkResp.status === 200) {
                cache.put(req, networkResp.clone());
              }
              return networkResp;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Same-origin: cache-first, falling back to network, falling back to index.html for navigations
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const respClone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
          }
          return networkResp;
        })
        .catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline and not cached' });
        });
    })
  );
});
